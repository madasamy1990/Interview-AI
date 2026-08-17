const express = require('express');
const authenticate = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');

const router = express.Router();

// GET /credits
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('credits_remaining, credits_used, plan')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(400).json({ error: 'Failed to fetch credits', message: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Credits fetch error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /credits/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(400).json({ error: 'Failed to fetch transactions', message: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Transactions fetch error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /credits/deduct
router.post('/deduct', authenticate, async (req, res) => {
  try {
    const { type, description } = req.body;
    let cost = 1;
    if (type === 'mic' || type === 'screenshot') cost = 2;

    const { data, error } = await supabaseAdmin.rpc('deduct_credits', {
      user_id_param: req.user.id,
      amount: cost,
      desc_text: description || `Deduction for ${type || 'usage'}`
    });

    if (error) {
      return res.status(400).json({ error: 'Deduction failed', message: error.message });
    }

    res.status(200).json({ success: true, message: 'Credits deducted', remaining: data });
  } catch (err) {
    console.error('Credits deduction error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
