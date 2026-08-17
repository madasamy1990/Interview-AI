const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const authenticate = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');
const { sendWelcomeEmail } = require('../services/email');

const router = express.Router();

const supabaseAnon = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_ANON_KEY || ''
);

// POST /signup — Uses Admin API (bypasses rate limits!)
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email and password are required' });
    }

    // 1. Create user via Admin API (NO rate limit!)
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Auto-confirm, no email verification
      user_metadata: {
        display_name: displayName || ''
      }
    });

    if (adminError) {
      // Check if user already exists
      if (adminError.message.includes('already been registered')) {
        return res.status(409).json({ error: 'Signup Failed', message: 'This email is already registered. Please login.' });
      }
      return res.status(400).json({ error: 'Signup Failed', message: adminError.message });
    }

    // 1b. Send Welcome Email in background immediately
    sendWelcomeEmail(email, displayName).catch(err => {
      console.warn('Welcome email background send error:', err.message);
    });

    // 2. Auto-login the new user
    const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      // User created but login failed — still success
      return res.status(201).json({ 
        user: adminData.user, 
        session: null,
        message: 'Account created! Please login.' 
      });
    }

    // 3. Return user + session + profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credits_remaining, plan')
      .eq('id', adminData.user.id)
      .single();

    res.status(201).json({
      user: loginData.user,
      session: loginData.session,
      profile
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: 'Login Failed', message: error.message });
    }

    // Fetch credits
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credits_remaining, plan')
      .eq('id', data.user.id)
      .single();

    res.status(200).json({
      ...data,
      profile
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.signOut();
    if (error) {
      return res.status(400).json({ error: 'Logout Failed', message: error.message });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(400).json({ error: 'Profile Fetch Failed', message: error.message });
    }

    res.status(200).json(profile);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
