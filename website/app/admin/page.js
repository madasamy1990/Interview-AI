'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['madasamynagarajan1990@gmail.com', 'madasamy1990@gmail.com'];
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://interview-ai-fucx.onrender.com';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalUsers: 0, totalPayments: 0, totalRevenue: 0, totalCreditsIssued: 0, paidUsers: 0, freeUsers: 0 });
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addCreditsEmail, setAddCreditsEmail] = useState('');
  const [addCreditsAmount, setAddCreditsAmount] = useState('');
  const [addCreditsPlan, setAddCreditsPlan] = useState('manual');
  const [addCreditsMsg, setAddCreditsMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = (session?.user?.email || '').toLowerCase().trim();
      const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase().trim() === userEmail);
      if (!session || !isAdmin) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setToken(session.access_token);
      setLoading(false);
    };
    init();
  }, [router]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin/stats`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.totalUsers === 'number') {
          setStats(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend stats API notice, querying database directly...');
    }

    try {
      const [{ count: userCount }, { data: pList }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('*')
      ]);

      const captured = (pList || []).filter(p => p.status === 'captured');
      const rev = captured.reduce((sum, p) => sum + (p.amount || 0), 0);
      const creds = captured.reduce((sum, p) => sum + (p.credits_added || 0), 0);
      const paid = new Set(captured.map(p => p.user_id)).size;

      setStats({
        totalUsers: userCount || 20,
        totalPayments: captured.length,
        totalRevenue: rev > 0 ? (rev > 100 ? rev / 100 : rev) : 0,
        totalCreditsIssued: creds,
        paidUsers: paid,
        freeUsers: Math.max(0, (userCount || 20) - paid)
      });
    } catch (e) {
      console.error('Direct stats calculation error:', e);
    }
  }, [authHeaders]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin/users`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend users API notice, querying database directly...');
    }

    try {
      const { data: supaProfiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, credits_remaining, credits_used, plan, subscription_status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (supaProfiles && supaProfiles.length > 0) {
        setUsers(supaProfiles.map(u => ({ ...u, credits: u.credits_remaining ?? 0 })));
      }
    } catch (e) {
      console.error('Direct users fetch error:', e);
    }
  }, [authHeaders]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/admin/payments`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.payments && data.payments.length > 0) {
          setPayments(data.payments);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend payments API notice, querying database directly...');
    }

    try {
      const { data: supaPayments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (supaPayments && supaPayments.length > 0) {
        const mapped = supaPayments.map(p => ({
          ...p,
          user_email: p.user_id ? 'User ID: ' + p.user_id.substring(0, 8) : 'Unknown',
          amount_display: p.amount ? `₹${(p.amount > 100 ? p.amount / 100 : p.amount).toLocaleString()}` : '—'
        }));
        setPayments(mapped);
      }
    } catch (e) {
      console.error('Direct payments fetch error:', e);
    }
  }, [authHeaders]);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchPayments()]);
    setRefreshing(false);
  }, [fetchStats, fetchUsers, fetchPayments]);

  useEffect(() => {
    if (!token) return;
    fetchAll();
  }, [token, fetchAll]);

  const handleAddCredits = async (e) => {
    e.preventDefault();
    setAddCreditsMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/admin/add-credits`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: addCreditsEmail, credits: parseInt(addCreditsAmount), plan: addCreditsPlan })
      });
      const data = await res.json();
      if (res.ok) {
        setAddCreditsMsg({ type: 'success', text: data.message });
        setAddCreditsEmail('');
        setAddCreditsAmount('');
        fetchAll();
      } else {
        setAddCreditsMsg({ type: 'error', text: data.error || 'Failed' });
      }
    } catch (err) {
      setAddCreditsMsg({ type: 'error', text: 'Network error' });
    }
  };

  // ── Helper functions ──
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // ── Computed reports ──

  // Revenue by plan
  const revenueByPlan = (() => {
    const planMap = {};
    payments.filter(p => p.status === 'captured').forEach(p => {
      const plan = (p.plan || 'unknown').toLowerCase();
      if (!planMap[plan]) planMap[plan] = { count: 0, revenue: 0, credits: 0 };
      planMap[plan].count++;
      planMap[plan].revenue += (p.amount || 0) / 100;
      planMap[plan].credits += (p.credits_added || 0);
    });
    return planMap;
  })();

  // Daily revenue (last 30 days)
  const dailyRevenue = (() => {
    const dayMap = {};
    payments.filter(p => p.status === 'captured').forEach(p => {
      const day = formatDateShort(p.created_at);
      if (!dayMap[day]) dayMap[day] = { revenue: 0, count: 0 };
      dayMap[day].revenue += (p.amount || 0) / 100;
      dayMap[day].count++;
    });
    return Object.entries(dayMap).slice(0, 30);
  })();

  // Recent activity (last 10 events)
  const recentActivity = (() => {
    const activities = [];
    users.slice(0, 10).forEach(u => {
      activities.push({ type: 'signup', email: u.email, date: u.created_at, detail: `Registered (${u.plan || 'free'})` });
    });
    payments.slice(0, 10).forEach(p => {
      activities.push({ type: 'payment', email: p.user_email, date: p.created_at, detail: `Paid ${p.amount_display} → +${p.credits_added} credits (${p.plan})` });
    });
    return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
  })();

  // Users by plan distribution
  const usersByPlan = (() => {
    const planCount = { free: 0, basic: 0, pro: 0, ultimate: 0 };
    users.forEach(u => {
      const plan = (u.plan || 'free').toLowerCase();
      planCount[plan] = (planCount[plan] || 0) + 1;
    });
    return planCount;
  })();

  // Top users by credits
  const topUsersByCredits = [...users].sort((a, b) => (b.credits || 0) - (a.credits || 0)).slice(0, 10);

  // Payment method breakdown
  const paymentMethodBreakdown = (() => {
    const methods = {};
    payments.filter(p => p.status === 'captured').forEach(p => {
      const method = p.payment_method || 'razorpay';
      if (!methods[method]) methods[method] = { count: 0, revenue: 0 };
      methods[method].count++;
      methods[method].revenue += (p.amount || 0) / 100;
    });
    return methods;
  })();

  // Search filters
  const filteredUsers = users.filter(u =>
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = payments.filter(p =>
    (p.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.razorpay_payment_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-[#0a0a0f] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🛡️</div>
          <div className="text-white text-lg font-semibold">Verifying admin access...</div>
          <div className="text-gray-500 text-sm mt-1">Please wait</div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'users', label: '👥 Users' },
    { id: 'payments', label: '💳 Payments' },
    { id: 'revenue', label: '💰 Revenue' },
    { id: 'credits', label: '⚡ Credits' },
    { id: 'activity', label: '📋 Activity' },
    { id: 'add-credits', label: '➕ Add Credits' },
  ];

  return (
    <div className="bg-[#0a0a0f] min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              🛡️ Admin Control Panel
            </h1>
            <p className="text-gray-400 text-sm mt-1">Welcome, {user?.email} · Last refreshed: {new Date().toLocaleTimeString('en-IN')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAll}
              disabled={refreshing}
              className="bg-[#13111c] border border-white/10 text-gray-300 hover:text-white hover:border-[#7c3aed] px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              {refreshing ? '⏳ Refreshing...' : '🔄 Refresh All'}
            </button>
            <Link href="/dashboard" className="text-sm text-[#a78bfa] hover:text-white transition font-medium">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                  : 'bg-[#13111c] text-gray-400 hover:text-white hover:bg-[#1a1825] border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════ OVERVIEW TAB ═══════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stat Cards */}
            {!stats ? (
              <div className="text-gray-400 text-center py-20 animate-pulse">Loading statistics...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard label="Total Users" value={stats.totalUsers} icon="👥" color="blue" />
                  <StatCard label="Paid Users" value={stats.paidUsers} icon="💎" color="purple" />
                  <StatCard label="Free Users" value={stats.freeUsers} icon="🆓" color="gray" />
                  <StatCard label="Total Payments" value={stats.totalPayments} icon="💳" color="green" />
                  <StatCard label="Total Revenue" value={`₹${stats.totalRevenue?.toLocaleString() || 0}`} icon="💰" color="gold" />
                  <StatCard label="Credits Issued" value={stats.totalCreditsIssued?.toLocaleString() || 0} icon="⚡" color="cyan" />
                </div>

                {/* Quick Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Plan Distribution */}
                  <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">📊 Users by Plan</h3>
                    <div className="space-y-3">
                      {Object.entries(usersByPlan).map(([plan, count]) => {
                        const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                        const colors = { free: '#6b7280', basic: '#3b82f6', pro: '#7c3aed', ultimate: '#f59e0b' };
                        return (
                          <div key={plan}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-300 font-medium capitalize">{plan}</span>
                              <span className="text-gray-400">{count} users ({pct}%)</span>
                            </div>
                            <div className="w-full bg-[#0a0a0f] rounded-full h-2.5">
                              <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: colors[plan] || '#6b7280' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">🕐 Recent Activity</h3>
                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {recentActivity.length === 0 ? (
                        <p className="text-gray-500 text-sm">No recent activity</p>
                      ) : (
                        recentActivity.map((act, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-xs">
                            <span className="mt-0.5">{act.type === 'payment' ? '💳' : '👤'}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-white font-medium truncate block">{act.email}</span>
                              <span className="text-gray-400">{act.detail}</span>
                            </div>
                            <span className="text-gray-500 whitespace-nowrap">{formatDateShort(act.date)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════ USERS TAB ═══════════════════════ */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <input
                type="text"
                placeholder="🔍 Search users by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md bg-[#13111c] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7c3aed] outline-none transition"
              />
              <span className="text-gray-400 text-sm">{filteredUsers.length} users</span>
            </div>

            <div className="bg-[#13111c] border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0a0a0f] border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">#</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Email</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Name</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3.5">Credits</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Plan</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Status</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-gray-500 py-12">No users found</td></tr>
                    ) : (
                      filteredUsers.map((u, idx) => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-white font-medium">{u.email || '—'}</td>
                          <td className="px-4 py-3 text-gray-300">{u.display_name || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${(u.credits || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(u.credits || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <PlanBadge plan={u.plan} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${u.subscription_status === 'active' ? 'text-green-400' : 'text-gray-500'}`}>
                              {u.subscription_status || 'inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-[#0a0a0f] border-t border-white/5 text-xs text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ PAYMENTS TAB ═══════════════════════ */}
        {activeTab === 'payments' && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <input
                type="text"
                placeholder="🔍 Search by email or UTR/Payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md bg-[#13111c] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7c3aed] outline-none transition"
              />
              <span className="text-gray-400 text-sm">{filteredPayments.length} transactions</span>
            </div>

            <div className="bg-[#13111c] border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0a0a0f] border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">#</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Email</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Payment ID / UTR</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3.5">Amount</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Plan</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3.5">Credits</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Method</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Status</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr><td colSpan={9} className="text-center text-gray-500 py-12">No payments found</td></tr>
                    ) : (
                      filteredPayments.map((p, idx) => (
                        <tr key={p.id || idx} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-white font-medium">{p.user_email}</td>
                          <td className="px-4 py-3 text-gray-300 font-mono text-xs max-w-[180px] truncate">{p.razorpay_payment_id || '—'}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-bold">{p.amount_display}</td>
                          <td className="px-4 py-3"><PlanBadge plan={p.plan} /></td>
                          <td className="px-4 py-3 text-right text-[#a78bfa] font-bold">+{p.credits_added || 0}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs capitalize">{(p.payment_method || 'razorpay').replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.status === 'captured' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-[#0a0a0f] border-t border-white/5 text-xs text-gray-500">
                Showing {filteredPayments.length} of {payments.length} payments
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ REVENUE TAB ═══════════════════════ */}
        {activeTab === 'revenue' && (
          <div className="space-y-8">
            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-6">
                <div className="text-gray-400 text-sm font-medium mb-1">Total Revenue</div>
                <div className="text-white text-3xl font-extrabold">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-2xl p-6">
                <div className="text-gray-400 text-sm font-medium mb-1">Total Transactions</div>
                <div className="text-white text-3xl font-extrabold">{stats?.totalPayments || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6">
                <div className="text-gray-400 text-sm font-medium mb-1">Avg. Revenue / User</div>
                <div className="text-white text-3xl font-extrabold">
                  ₹{stats?.paidUsers > 0 ? Math.round((stats?.totalRevenue || 0) / stats.paidUsers).toLocaleString() : 0}
                </div>
              </div>
            </div>

            {/* Revenue by Plan */}
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-5 text-lg">💰 Revenue by Plan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Plan</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Subscriptions</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Revenue</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Credits Issued</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">% of Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(revenueByPlan).length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-gray-500 py-8">No revenue data yet</td></tr>
                    ) : (
                      Object.entries(revenueByPlan).map(([plan, data]) => {
                        const totalRev = stats?.totalRevenue || 1;
                        const pct = Math.round((data.revenue / totalRev) * 100);
                        return (
                          <tr key={plan} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                            <td className="px-4 py-3"><PlanBadge plan={plan} /></td>
                            <td className="px-4 py-3 text-right text-white font-semibold">{data.count}</td>
                            <td className="px-4 py-3 text-right text-green-400 font-bold">₹{data.revenue.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-[#a78bfa] font-bold">{data.credits.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{pct}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Revenue */}
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-5 text-lg">📅 Daily Revenue</h3>
              {dailyRevenue.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No daily revenue data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-gray-400 font-semibold px-4 py-3">Date</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3">Transactions</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRevenue.map(([day, data]) => (
                        <tr key={day} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                          <td className="px-4 py-3 text-white font-medium">{day}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{data.count}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-bold">₹{data.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-5 text-lg">🏦 Payment Method Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Method</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Count</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(paymentMethodBreakdown).length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-gray-500 py-8">No data</td></tr>
                    ) : (
                      Object.entries(paymentMethodBreakdown).map(([method, data]) => (
                        <tr key={method} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                          <td className="px-4 py-3 text-white font-medium capitalize">{method.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{data.count}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-bold">₹{data.revenue.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ CREDITS TAB ═══════════════════════ */}
        {activeTab === 'credits' && (
          <div className="space-y-8">
            {/* Credits Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-2xl p-6">
                <div className="text-gray-400 text-sm font-medium mb-1">Total Credits Issued</div>
                <div className="text-white text-3xl font-extrabold">{(stats?.totalCreditsIssued || 0).toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-6">
                <div className="text-gray-400 text-sm font-medium mb-1">Active Credits (in user accounts)</div>
                <div className="text-white text-3xl font-extrabold">{users.reduce((sum, u) => sum + (u.credits || 0), 0).toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <div className="text-gray-400 text-sm font-medium mb-1">Credits Used</div>
                <div className="text-white text-3xl font-extrabold">
                  {((stats?.totalCreditsIssued || 0) - users.reduce((sum, u) => sum + (u.credits || 0), 0)).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Top Users by Credits */}
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-5 text-lg">🏆 Top 10 Users by Credits Balance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Rank</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Email</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Name</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Credits</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsersByCredits.map((u, idx) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                        <td className="px-4 py-3 text-gray-400 font-bold">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</td>
                        <td className="px-4 py-3 text-white font-medium">{u.email}</td>
                        <td className="px-4 py-3 text-gray-300">{u.display_name || '—'}</td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold text-lg">{(u.credits || 0).toLocaleString()}</td>
                        <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Zero Credit Users */}
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-5 text-lg">⚠️ Users with Zero Credits (Potential Upgrades)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Email</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Plan</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => (u.credits || 0) <= 0).length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-gray-500 py-8">All users have credits! 🎉</td></tr>
                    ) : (
                      users.filter(u => (u.credits || 0) <= 0).map((u) => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                          <td className="px-4 py-3 text-white font-medium">{u.email}</td>
                          <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ ACTIVITY TAB ═══════════════════════ */}
        {activeTab === 'activity' && (
          <div className="space-y-8">
            {/* Recent Signups */}
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-5 text-lg">👤 Recent Signups (Last 20)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">#</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Email</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Name</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Credits</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Plan</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 20).map((u, idx) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-white font-medium">{u.email}</td>
                        <td className="px-4 py-3 text-gray-300">{u.display_name || '—'}</td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold">{(u.credits || 0).toLocaleString()}</td>
                        <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-5 text-lg">💳 Recent Payments (Last 20)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">#</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Email</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Amount</th>
                      <th className="text-right text-gray-400 font-semibold px-4 py-3">Credits</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Plan</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Method</th>
                      <th className="text-left text-gray-400 font-semibold px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 20).length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-gray-500 py-8">No payments yet</td></tr>
                    ) : (
                      payments.slice(0, 20).map((p, idx) => (
                        <tr key={p.id || idx} className="border-b border-white/5 hover:bg-[#1a1825] transition">
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-white font-medium">{p.user_email}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-bold">{p.amount_display}</td>
                          <td className="px-4 py-3 text-right text-[#a78bfa] font-bold">+{p.credits_added || 0}</td>
                          <td className="px-4 py-3"><PlanBadge plan={p.plan} /></td>
                          <td className="px-4 py-3 text-gray-400 text-xs capitalize">{(p.payment_method || 'razorpay').replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ ADD CREDITS TAB ═══════════════════════ */}
        {activeTab === 'add-credits' && (
          <div className="max-w-lg">
            <div className="bg-[#13111c] border border-white/5 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-white mb-2">➕ Manually Add Credits</h2>
              <p className="text-gray-400 text-sm mb-6">Add credits to any user's account after verifying their UPI payment in your bank app.</p>

              <form onSubmit={handleAddCredits} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">User Email *</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={addCreditsEmail}
                    onChange={(e) => setAddCreditsEmail(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7c3aed] outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Credits to Add *</label>
                  <input
                    type="number"
                    placeholder="e.g. 500, 1000, 2000"
                    value={addCreditsAmount}
                    onChange={(e) => setAddCreditsAmount(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7c3aed] outline-none transition"
                    required
                    min="1"
                  />
                  <div className="flex gap-2 mt-2">
                    {[500, 1000, 2000].map(n => (
                      <button type="button" key={n} onClick={() => setAddCreditsAmount(String(n))}
                        className="text-xs bg-[#0a0a0f] border border-white/10 text-gray-400 hover:text-white hover:border-[#7c3aed] px-3 py-1.5 rounded-lg transition">
                        +{n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Plan</label>
                  <select
                    value={addCreditsPlan}
                    onChange={(e) => setAddCreditsPlan(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7c3aed] outline-none transition"
                  >
                    <option value="manual">Manual (Admin)</option>
                    <option value="basic">Basic (₹2,499)</option>
                    <option value="pro">Pro (₹4,999)</option>
                    <option value="ultimate">Ultimate (₹7,999)</option>
                  </select>
                </div>

                {addCreditsMsg && (
                  <div className={`rounded-xl p-3 text-sm font-semibold ${
                    addCreditsMsg.type === 'success'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {addCreditsMsg.type === 'success' ? '✅' : '❌'} {addCreditsMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#7c3aed] hover:bg-purple-600 text-white font-bold py-3.5 rounded-xl transition shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                >
                  ⚡ Add Credits
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Reusable components ──

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    gray: 'from-gray-500/10 to-gray-500/5 border-gray-500/20',
    green: 'from-green-500/10 to-green-500/5 border-green-500/20',
    gold: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} border rounded-2xl p-5`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-gray-400 text-xs font-medium mb-0.5">{label}</div>
      <div className="text-white text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function PlanBadge({ plan }) {
  const p = (plan || 'free').toLowerCase();
  const styles = {
    ultimate: 'bg-yellow-500/15 text-yellow-400',
    pro: 'bg-purple-500/15 text-purple-400',
    basic: 'bg-blue-500/15 text-blue-400',
    free: 'bg-white/5 text-gray-400',
    manual: 'bg-emerald-500/15 text-emerald-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${styles[p] || styles.free}`}>
      {p.toUpperCase()}
    </span>
  );
}
