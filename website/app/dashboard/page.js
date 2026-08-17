'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Fetch profile with credits
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);

      // Fetch transaction history
      const { data: txns } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setTransactions(txns || []);

      setLoading(false);
    };
    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">Loading...</div>;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-[#0a0a0f] min-h-[calc(100vh-64px)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, {profile?.display_name || user?.email}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/download" className="bg-[#7c3aed] hover:bg-purple-600 text-white px-5 py-2 rounded-xl font-semibold transition">
              Download App
            </Link>
            <button onClick={handleLogout} className="bg-[#13111c] hover:bg-[#2c2c2e] border border-white/10 text-white px-5 py-2 rounded-xl font-semibold transition">
              Logout
            </button>
          </div>
        </div>

        {profile?.credits_remaining < 5 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-red-400">⚠️ Low credits! Only {profile.credits_remaining} remaining.</span>
            <Link href="/pricing" className="bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-600 transition">Upgrade Now</Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#13111c] border border-white/5 p-6 rounded-2xl hover:border-[#7c3aed]/30 transition">
            <h3 className="text-gray-400 text-sm font-medium mb-1">💎 Credits Remaining</h3>
            <div className="text-3xl font-bold text-white">{profile?.credits_remaining ?? 0}</div>
          </div>
          <div className="bg-[#13111c] border border-white/5 p-6 rounded-2xl hover:border-[#7c3aed]/30 transition">
            <h3 className="text-gray-400 text-sm font-medium mb-1">📋 Current Plan</h3>
            <div className="text-3xl font-bold text-white capitalize">{profile?.plan || 'Free'}</div>
            <Link href="/pricing" className="text-[#7c3aed] text-sm mt-2 inline-block hover:underline">Upgrade Plan →</Link>
          </div>
          <div className="bg-[#13111c] border border-white/5 p-6 rounded-2xl hover:border-[#7c3aed]/30 transition">
            <h3 className="text-gray-400 text-sm font-medium mb-1">📊 Credits Used</h3>
            <div className="text-3xl font-bold text-white">{profile?.credits_used ?? 0}</div>
          </div>
          <div className="bg-[#13111c] border border-white/5 p-6 rounded-2xl hover:border-[#7c3aed]/30 transition">
            <h3 className="text-gray-400 text-sm font-medium mb-1">📅 Renewal Date</h3>
            <div className="text-3xl font-bold text-white">{formatDate(profile?.subscription_end_date)}</div>
          </div>
        </div>

        <div className="bg-[#13111c] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5">
            <h3 className="text-xl font-semibold text-white">Credit Usage History</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 py-12">
              No credit usage history found yet.<br />Download the app and start cracking interviews!
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">Type</th>
                  <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">Description</th>
                  <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Credits</th>
                  <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Balance</th>
                  <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-6 py-4 text-white capitalize">{txn.type}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {txn.description ? txn.description.replace(/\[SPEECH-TO-TEXT[^\]]*\]:\s*/gi, '') : '-'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{txn.amount > 0 ? '+' : ''}{txn.amount}</td>
                    <td className="px-6 py-4 text-right text-gray-300">{txn.balance_after}</td>
                    <td className="px-6 py-4 text-right text-gray-500 text-sm">{formatDate(txn.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
