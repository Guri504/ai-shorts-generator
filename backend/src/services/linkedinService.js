import axios from 'axios';
import cryptoHelper from '../utils/cryptoHelper.js';
import LinkedInAccount from '../models/LinkedInAccount.js';

// LinkedIn OAuth settings
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/api/linkedin/callback';

export const linkedinService = {
  /**
   * Generates authorization URL or triggers instant developer mock
   */
  getAuthUrl(userId) {
    if (!CLIENT_ID) {
      console.warn('[LinkedIn Service] LINKEDIN_CLIENT_ID is missing. Redirecting to Sandbox Developer Mock...');
      // Fallback sandbox mock callback redirect
      return `http://localhost:5000/api/linkedin/callback?code=mock_linkedin_dev_code&state=${userId}`;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: userId.toString(),
      scope: 'openid profile email w_member_social'
    });

    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  },

  /**
   * Exchanges authorization code for access tokens
   */
  async handleCallback(code, userId) {
    try {
      let email = '';
      let profileName = '';
      let linkedinId = '';
      let accessToken = '';
      let expires_in = 5184000; // default 60 days in seconds

      if (code === 'mock_linkedin_dev_code') {
        // Sandbox developer profile details
        email = 'guri504@linkedin-demo.com';
        profileName = 'Gurpreet Singh (LinkedIn Demo)';
        linkedinId = 'urn:li:person:mock_guri504';
        accessToken = 'mock_access_token_linkedin_guri504_secret';
      } else {
        // Real LinkedIn OAuth token exchange
        const params = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET
        });

        const tokenRes = await axios.post(LINKEDIN_TOKEN_URL, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        accessToken = tokenRes.data.access_token;
        expires_in = tokenRes.data.expires_in || 5184000;

        // Query LinkedIn OpenID Connect profile userinfo
        const profileRes = await axios.get(LINKEDIN_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        linkedinId = profileRes.data.sub || `urn:li:person:${profileRes.data.sub}`;
        profileName = profileRes.data.name || `${profileRes.data.given_name} ${profileRes.data.family_name}`;
        email = profileRes.data.email || 'unknown@linkedin.com';
      }

      // Encrypt accessToken before database storage
      const encryptedAccess = cryptoHelper.encrypt(accessToken);
      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

      // Find or create the linked account record
      let account = await LinkedInAccount.findOne({ linkedinId });
      if (account) {
        account.userId = userId;
        account.email = email;
        account.profileName = profileName;
        account.accessToken = encryptedAccess;
        account.tokenExpiry = tokenExpiry;
      } else {
        account = new LinkedInAccount({
          userId,
          email,
          profileName,
          linkedinId,
          accessToken: encryptedAccess,
          tokenExpiry
        });
      }

      await account.save();
      console.log(`[LinkedIn Service] Connected profile "${profileName}" for user: ${userId}`);
      return account;
    } catch (error) {
      console.error('[LinkedIn Service] Callback handler failed:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default linkedinService;
