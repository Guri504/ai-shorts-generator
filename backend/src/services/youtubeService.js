import axios from 'axios';
import cryptoHelper from '../utils/cryptoHelper.js';
import YouTubeAccount from '../models/YouTubeAccount.js';
import Project from '../models/Project.js';
import fs from 'fs';
import { Transform } from 'stream';
import wsManager from '../utils/wsManager.js';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

// Client Credentials from Env
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/youtube/callback';

export const youtubeService = {
  /**
   * Generates authorization URL for a user
   */
  getAuthUrl(userId) {
    if (!CLIENT_ID) {
      console.warn('[YouTube Service] Missing YOUTUBE_CLIENT_ID env variable');
    }
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/userinfo.email',
        'profile',
        'openid'
      ].join(' '),
      access_type: 'offline', // Requests refresh token
      prompt: 'consent', // Forces refresh token retrieval every time
      include_granted_scopes: 'false',
      state: userId.toString() // Pass user ID to associate account on callback
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  /**
   * Exchanges auth code for tokens and registers YouTube connection
   */
  async handleCallback(code, userId) {
    try {
      // 1. Exchange authorization code for tokens
      const res = await axios.post(GOOGLE_TOKEN_URL, {
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_in } = res.data;
      if (!refresh_token) {
        throw new Error('Refresh token not returned. Ensure you revoke access and re-approve the application.');
      }

      // Calculate token expiry
      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

      // 2. Query YouTube channel details
      const channelRes = await axios.get(YOUTUBE_CHANNELS_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
        params: { part: 'snippet', mine: true }
      });

      const channelItems = channelRes.data.items;
      if (!channelItems || channelItems.length === 0) {
        throw new Error('No YouTube channel found for this account.');
      }

      const channel = channelItems[0];
      const channelId = channel.id;
      const channelName = channel.snippet.title;

      // 3. Query user email profile
      const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const email = profileRes.data.email || 'unknown@youtube.com';

      // 4. Encrypt tokens before storing
      const encryptedAccess = cryptoHelper.encrypt(access_token);
      const encryptedRefresh = cryptoHelper.encrypt(refresh_token);

      // 5. Save or update YouTube account in DB
      let account = await YouTubeAccount.findOne({ channelId });
      if (account) {
        account.userId = userId;
        account.email = email;
        account.channelName = channelName;
        account.accessToken = encryptedAccess;
        account.refreshToken = encryptedRefresh;
        account.tokenExpiry = tokenExpiry;
      } else {
        account = new YouTubeAccount({
          userId,
          email,
          channelName,
          channelId,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiry
        });
      }

      await account.save();
      console.log(`[YouTube Service] Connected channel "${channelName}" for user: ${userId}`);
      return account;
    } catch (error) {
      console.error('[YouTube Service] Callback handler failed:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Refreshes dynamic access token using encrypted refresh token
   */
  async refreshAccessToken(account) {
    const decRefresh = cryptoHelper.decrypt(account.refreshToken);
    if (!decRefresh) throw new Error('Failed to decrypt refresh token');

    try {
      const res = await axios.post(GOOGLE_TOKEN_URL, {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: decRefresh,
        grant_type: 'refresh_token'
      });

      const { access_token, expires_in } = res.data;
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + expires_in);

      account.accessToken = cryptoHelper.encrypt(access_token);
      account.tokenExpiry = newExpiry;
      await account.save();

      return access_token;
    } catch (error) {
      console.error('[YouTube Service] Access token refresh failed:', error.response?.data || error.message);
      throw new Error('YouTube access authorization has expired. Please re-authenticate.');
    }
  },

  /**
   * Fetches active access token (refreshes if expired)
   */
  async getValidAccessToken(account) {
    const now = new Date();
    // Refresh 5 minutes before actual expiry
    if (new Date(account.tokenExpiry) <= new Date(now.getTime() + 5 * 60 * 1000)) {
      return this.refreshAccessToken(account);
    }
    return cryptoHelper.decrypt(account.accessToken);
  },

  /**
   * Upload video output to linked YouTube Channel
   */
  async uploadVideo(userId, accountId, projectId, privacyStatus = 'private', uploadType = 'short') {
    const account = await YouTubeAccount.findOne({ _id: accountId, userId });
    if (!account) throw new Error('YouTube connection not found or unauthorized.');

    const project = await Project.findOne({ id: projectId, userId });
    if (!project) throw new Error('Project not found.');

    const videoPath = project.outputPath;
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error('Compiled video file is missing. Please render first.');
    }

    // Set initial project upload status to DB
    project.youtubeUpload = {
      status: 'uploading',
      progress: 0,
      message: 'Authenticating and preparing upload...',
      privacyStatus,
      uploadType,
      error: null
    };
    await project.save();

    const accessToken = await this.getValidAccessToken(account);
    
    // Process title & description dynamically based on upload type
    let title = project.metadata?.title || project.topic || 'AI Generated Short';
    let description = `${project.metadata?.description || ''}\n\nGenerated by AI Shorts Generator`;

    if (uploadType === 'short') {
      if (!title.toLowerCase().includes('#shorts')) {
        title = `${title} #Shorts`;
      }
      if (!description.toLowerCase().includes('#shorts')) {
        description = `${description}\n\n#Shorts`;
      }
    }

    const rawHashtags = project.metadata?.hashtags || [];
    const tags = Array.isArray(rawHashtags)
      ? rawHashtags.map(t => String(t).replace('#', '')).filter(Boolean)
      : String(rawHashtags).split(/\s+/).map(t => t.replace('#', '')).filter(Boolean);

    console.log(`[YouTube Upload] Starting upload of "${title}" to channel: ${account.channelName} (${privacyStatus}, ${uploadType})`);

    const size = fs.statSync(videoPath).size;
    const metadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus, // Dynamic privacy status ('private' or 'public')
        selfDeclaredMadeForKids: false
      }
    };

    try {
      // 1. Initiate Resumable Upload
      const initRes = await axios.post(
        `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
        metadata,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': size,
            'X-Upload-Content-Type': 'video/mp4'
          }
        }
      );

      const uploadUrl = initRes.headers.location;
      if (!uploadUrl) throw new Error('Failed to retrieve resumable upload URL.');

      // 2. Track upload progress through stream piping
      let bytesUploaded = 0;
      let lastPercent = 0;

      const progressTrackingStream = new Transform({
        transform(chunk, encoding, callback) {
          bytesUploaded += chunk.length;
          const progress = Math.min(Math.round((bytesUploaded / size) * 100), 99);
          
          // Emit progress every percentage change
          if (progress > lastPercent) {
            lastPercent = progress;
            
            // Emit log via WebSockets
            wsManager.log(projectId, {
              message: `Uploading to YouTube: ${progress}% (${(bytesUploaded / (1024 * 1024)).toFixed(1)}MB of ${(size / (1024 * 1024)).toFixed(1)}MB)`,
              progress,
              currentStage: 'uploading'
            });

            // Update database progress (asynchronously to avoid blocking stream)
            Project.updateOne(
              { id: projectId },
              { 
                $set: { 
                  'youtubeUpload.progress': progress,
                  'youtubeUpload.message': `Uploading: ${progress}%...`
                } 
              }
            ).catch(err => console.error('[YouTube Upload] DB update error:', err.message));
          }
          callback(null, chunk);
        }
      });

      // Pipe file stream through transform stream
      const fileStream = fs.createReadStream(videoPath);
      const stream = fileStream.pipe(progressTrackingStream);

      // Perform direct stream upload
      const uploadRes = await axios.put(uploadUrl, stream, {
        headers: {
          'Content-Length': size,
          'Content-Type': 'video/mp4'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log(`[YouTube Upload] Successfully uploaded video! YouTube ID: ${uploadRes.data.id}`);

      // Final 100% notification
      wsManager.log(projectId, {
        message: 'Upload complete! Video is processing on YouTube...',
        progress: 100,
        currentStage: 'uploading'
      });

      // Save success status in DB
      project.youtubeUpload = {
        status: 'success',
        progress: 100,
        message: 'Successfully uploaded!',
        videoId: uploadRes.data.id,
        channelName: account.channelName,
        uploadedAt: new Date(),
        privacyStatus,
        uploadType
      };
      await project.save();

      return uploadRes.data;
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || (typeof err.response?.data?.error === 'string' ? err.response.data.error : null) || err.message;
      console.error('[YouTube Upload] Video upload failed:', err.response?.data || err.message);

      // Save failed status in DB
      project.youtubeUpload = {
        status: 'failed',
        progress: lastPercent,
        message: `Failed: ${errMsg}`,
        error: errMsg,
        privacyStatus,
        uploadType
      };
      await project.save();

      // Emit failure log
      wsManager.log(projectId, {
        message: `YouTube Upload failed: ${errMsg}`,
        progress: lastPercent,
        currentStage: 'uploading'
      });

      throw new Error(`YouTube upload failed: ${errMsg}`);
    }
  }
};

export default youtubeService;
