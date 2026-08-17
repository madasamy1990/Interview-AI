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

// POST /create-order
router.post('/create-order', authenticate, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }

    const { plan } = req.body;
    let amount = 249900; // basic (₹2,499)
    if (plan === 'pro') amount = 499900; // pro (₹4,999)
    if (plan === 'ultimate') amount = 799900; // ultimate (₹7,999)

    const options = {
      amount,
      currency: 'INR',
      notes: {
        user_id: req.user.id,
        plan
      }
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ order });
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /verify
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Add credits based on plan
      let creditsToAdd = 500;
      if (plan === 'pro') creditsToAdd = 1000;
      if (plan === 'ultimate') creditsToAdd = 2000;

      const { data, error } = await supabaseAdmin.rpc('add_credits', {
        user_id_param: req.user.id,
        amount: creditsToAdd,
        plan_name: plan
      });

      if (error) {
        console.error('Error adding credits:', error);
        return res.status(500).json({ error: 'Payment verified but failed to add credits' });
      }

      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Verification failed:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
