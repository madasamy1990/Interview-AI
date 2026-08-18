const express = require('express');
const authenticate = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');

const router = express.Router();

// Admin emails that are allowed to access the admin panel
const ADMIN_EMAILS = [
  'madasamynagarajan1990@gmail.com'
];

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access only' });
  }
  next();
};

// GET /admin/stats — Dashboard overview stats
router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Total payments
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, credits_added, status');

    const totalRevenue = (payments || [])
      .filter(p => p.status === 'captured')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalCreditsIssued = (payments || [])
      .filter(p => p.status === 'captured')
      .reduce((sum, p) => sum + (p.credits_added || 0), 0);

    const totalPayments = (payments || []).filter(p => p.status === 'captured').length;

    // Paid users (users who have made at least one payment)
    const { data: paidUserIds } = await supabaseAdmin
      .from('payments')
      .select('user_id')
      .eq('status', 'captured');

    const uniquePaidUsers = new Set((paidUserIds || []).map(p => p.user_id)).size;

    res.json({
      totalUsers: totalUsers || 0,
      totalPayments,
      totalRevenue: totalRevenue / 100, // Convert paise to rupees
      totalCreditsIssued,
      paidUsers: uniquePaidUsers,
      freeUsers: (totalUsers || 0) - uniquePaidUsers
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /admin/users — All registered users with their credits
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, credits, plan, subscription_status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ users: profiles || [] });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /admin/payments — All payment transactions
router.get('/payments', authenticate, adminOnly, async (req, res) => {
  try {
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with user emails
    const userIds = [...new Set((payments || []).map(p => p.user_id).filter(Boolean))];
    let emailMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      (profiles || []).forEach(p => { emailMap[p.id] = p.email; });
    }

    const enrichedPayments = (payments || []).map(p => ({
      ...p,
      user_email: emailMap[p.user_id] || 'Unknown',
      amount_display: p.amount ? `₹${(p.amount / 100).toLocaleString()}` : '—'
    }));

    res.json({ payments: enrichedPayments });
  } catch (err) {
    console.error('Admin payments error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /admin/add-credits — Manually add credits to a user
router.post('/add-credits', authenticate, adminOnly, async (req, res) => {
  try {
    const { email, credits, plan } = req.body;
    if (!email || !credits) {
      return res.status(400).json({ error: 'Email and credits amount are required' });
    }

    // Find user by email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User not found with that email' });
    }

    // Add credits
    const { error: rpcErr } = await supabaseAdmin.rpc('add_credits', {
      user_id_param: profile.id,
      amount: parseInt(credits),
      plan_name: plan || 'manual'
    });

    if (rpcErr) throw rpcErr;

    // Record as manual payment
    await supabaseAdmin.from('payments').insert({
      user_id: profile.id,
      razorpay_payment_id: `manual_${Date.now()}`,
      razorpay_order_id: `order_manual_${Date.now()}`,
      status: 'captured',
      payment_method: 'admin_manual',
      plan: plan || 'manual',
      amount: 0,
      credits_added: parseInt(credits)
    });

    res.json({ success: true, message: `${credits} credits added to ${email}` });
  } catch (err) {
    console.error('Admin add-credits error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

module.exports = router;
