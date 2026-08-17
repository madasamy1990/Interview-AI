const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const authenticate = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');

const router = express.Router();

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Optional auth helper
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) req.user = user;
    }
  } catch (e) {
    // continue as guest
  }
  next();
};

// POST /create-order
router.post('/create-order', optionalAuth, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }

    const { plan, email } = req.body;
    let userId = req.user?.id;
    let userEmail = req.user?.email || email;

    if (!userId && !userEmail) {
      return res.status(400).json({ error: 'Email or login required to create order' });
    }

    // If user is not logged in, find or create profile in Supabase
    if (!userId && userEmail) {
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create user in Supabase auth
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: { display_name: userEmail.split('@')[0] }
        });
        if (newUser?.user) {
          userId = newUser.user.id;
        }
      }
    }

    let amount = 249900; // basic (₹2,499)
    if (plan === 'pro') amount = 499900; // pro (₹4,999)
    if (plan === 'ultimate') amount = 799900; // ultimate (₹7,999)

    const options = {
      amount,
      currency: 'INR',
      notes: {
        user_id: userId || '',
        user_email: userEmail || '',
        plan: plan || 'basic'
      }
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ order, userId, userEmail });
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// POST /verify
router.post('/verify', optionalAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, email, userId: passedUserId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Find userId
      let targetUserId = req.user?.id || passedUserId;
      if (!targetUserId && email) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        targetUserId = profile?.id;
      }

      // Add credits based on plan
      let creditsToAdd = 500;
      if (plan === 'pro') creditsToAdd = 1000;
      if (plan === 'ultimate') creditsToAdd = 2000;

      if (targetUserId) {
        const { error } = await supabaseAdmin.rpc('add_credits', {
          user_id_param: targetUserId,
          amount: creditsToAdd,
          plan_name: plan || 'basic'
        });

        if (error) {
          console.error('Error adding credits via RPC:', error);
        }

        // Record payment
        await supabaseAdmin.from('payments').insert({
          user_id: targetUserId,
          razorpay_payment_id,
          razorpay_order_id,
          status: 'captured',
          plan: plan || 'basic',
          credits_added: creditsToAdd
        });
      }

      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Verification failed:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// POST /webhook — Razorpay webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.log('Webhook received but RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(200).json({ status: 'ok' });
    }

    const signature = req.headers['x-razorpay-signature'];
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Webhook signature mismatch');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Webhook event:', event.event);

    // Handle payment captured
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const userId = payment.notes?.user_id;
      const plan = payment.notes?.plan;

      if (userId && plan) {
        const creditsMap = { basic: 500, pro: 1000, ultimate: 2000 };
        const creditsToAdd = creditsMap[plan] || 500;

        // Add credits
        await supabaseAdmin.rpc('add_credits', {
          user_id_param: userId,
          amount: creditsToAdd,
          plan_name: plan
        });

        // Record payment
        await supabaseAdmin.from('payments').insert({
          user_id: userId,
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          amount: payment.amount,
          status: 'captured',
          payment_method: payment.method,
          plan: plan,
          credits_added: creditsToAdd
        });

        console.log(`Credits added: ${creditsToAdd} for user ${userId} (${plan})`);
      }
    }

    // Handle subscription cancelled
    if (event.event === 'subscription.cancelled') {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes?.user_id;
      if (userId) {
        await supabaseAdmin.from('profiles').update({
          subscription_status: 'cancelled',
          plan: 'free'
        }).eq('id', userId);
        console.log(`Subscription cancelled for user ${userId}`);
      }
    }

    res.status(200).json({ status: 'ok' });
// POST /submit-upi — Process Direct UPI Payment
router.post('/submit-upi', optionalAuth, async (req, res) => {
  try {
    const { plan, email, utr, amount } = req.body;
    let userEmail = req.user?.email || email;
    let userId = req.user?.id;

    if (!userEmail || !utr) {
      return res.status(400).json({ error: 'Email and 12-digit UTR/Reference Number are required' });
    }

    // Clean UTR
    const cleanUtr = String(utr).trim();
    if (cleanUtr.length < 8) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UTR/Reference number' });
    }

    // Find or create user
    if (!userId) {
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: { display_name: userEmail.split('@')[0] }
        });
        if (newUser?.user) {
          userId = newUser.user.id;
        }
      }
    }

    // Determine credits
    const creditsMap = { basic: 500, pro: 1000, ultimate: 2000 };
    const creditsToAdd = creditsMap[plan] || 500;

    if (userId) {
      // Add credits to user profile
      const { error: rpcErr } = await supabaseAdmin.rpc('add_credits', {
        user_id_param: userId,
        amount: creditsToAdd,
        plan_name: plan || 'basic'
      });

      if (rpcErr) {
        console.error('Error adding credits for UPI:', rpcErr);
      }

      // Record payment
      await supabaseAdmin.from('payments').insert({
        user_id: userId,
        razorpay_payment_id: `upi_${cleanUtr}`,
        razorpay_order_id: `order_upi_${Date.now()}`,
        status: 'captured',
        payment_method: 'upi_manual',
        plan: plan || 'basic',
        amount: amount || (plan === 'pro' ? 499900 : plan === 'ultimate' ? 799900 : 249900),
        credits_added: creditsToAdd
      });

      console.log(`UPI Payment processed: ${creditsToAdd} credits added for ${userEmail} (UTR: ${cleanUtr})`);
    }

    res.status(200).json({ 
      success: true, 
      message: 'UPI Payment submitted and credits activated successfully!',
      creditsAdded: creditsToAdd,
      email: userEmail
    });

  } catch (err) {
    console.error('UPI submit error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

module.exports = router;
