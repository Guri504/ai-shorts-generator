import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import axios from 'axios';

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' } // Session valid for 7 days
  );
};

export const authController = {
  /**
   * User Signup
   */
  async signup(req, res) {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      // Create new user
      const newUser = new User({
        email,
        password,
        name,
        plan: 'free',
        credits: env.INITIAL_FREE_CREDITS
      });

      await newUser.save();
      const token = generateToken(newUser);

      res.status(201).json({
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          plan: newUser.plan,
          credits: newUser.credits
        }
      });
    } catch (error) {
      console.error('[Auth Controller] Signup error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * User Login
   */
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(user);

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          credits: user.credits
        }
      });
    } catch (error) {
      console.error('[Auth Controller] Login error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get User Profile Details
   */
  async getProfile(req, res) {
    try {
      // req.user is already populated by authMiddleware
      res.json({
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          plan: req.user.plan,
          credits: req.user.credits
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Generates Google Consent URL and redirects user
   */
  googleLoginUrl(req, res) {
    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri = env.GOOGLE_REDIRECT_URI;
    
    if (!clientId) {
      console.error('[Auth Controller] GOOGLE_CLIENT_ID is missing in env configurations.');
      return res.status(400).send('<h3>Google OAuth Error: GOOGLE_CLIENT_ID is not configured.</h3>');
    }

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      prompt: 'select_account'
    });

    res.redirect(`${rootUrl}?${params.toString()}`);
  },

  /**
   * Receives authorization code from Google, exchanges it for profile data, and logs/signs JWT
   */
  async googleCallback(req, res) {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('<h3>Google Login failed: authorization code is missing.</h3>');
    }

    try {
      // 1. Exchange auth code for tokens
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      });

      const { access_token } = tokenRes.data;

      // 2. Fetch user profile from Google using access token
      const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const { sub: googleId, email, name, picture } = userRes.data;
      if (!email) {
        return res.status(400).send('<h3>Google Login failed: user profile did not return email address.</h3>');
      }

      // 3. Find or create user
      let user = await User.findOne({
        $or: [{ googleId }, { email: email.toLowerCase() }]
      });

      if (user) {
        let isUpdated = false;
        if (!user.googleId) {
          user.googleId = googleId;
          isUpdated = true;
        }
        if (!user.picture && picture) {
          user.picture = picture;
          isUpdated = true;
        }
        if (!user.name && name) {
          user.name = name;
          isUpdated = true;
        }
        if (isUpdated) {
          await user.save();
        }
      } else {
        // Create new user enqueued with free initial credits
        user = new User({
          email: email.toLowerCase(),
          name,
          googleId,
          picture,
          plan: 'free',
          credits: env.INITIAL_FREE_CREDITS
        });
        await user.save();
      }

      // 4. Generate custom authentication JWT token
      const token = generateToken(user);

      // 5. Redirect browser back to frontend enqueued with JWT token parameter
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/?token=${token}`);
    } catch (err) {
      console.error('[Auth Controller] Google login callback exchange error:', err.response?.data || err.message);
      res.status(500).send(`<h3>Google login callback authentication failed: ${err.message}</h3>`);
    }
  }
};

export default authController;
