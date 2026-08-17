'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Call backend API (uses Admin API — NO rate limit!)
      const res = await fetch('http://localhost:3001/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName: name })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      // If we got a session back, set it in Supabase client
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        router.push('/dashboard');
      } else {
        // Fallback: try manual login
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
          setMessage('🎉 Account created! Please login.');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    }

    setLoading(false);
  };

  return (
    <div className="bg-[#0a0a0f] min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="max-w-md w-full bg-[#13111c] p-8 rounded-2xl border border-white/5 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white">Create Account</h2>
          <p className="text-gray-400 mt-2">Get 15 free credits instantly</p>
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm">{error}</div>}
        {message && <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-xl mb-6 text-sm">{message}</div>}
        
        <form className="space-y-5" onSubmit={handleSignup}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed] transition" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed] transition" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed] transition" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed] transition" placeholder="Repeat password" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-[#7c3aed] hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Sign Up — Get 15 Free Credits'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-400">Already have an account? </span>
          <Link href="/login" className="text-[#7c3aed] hover:text-white font-medium transition">Login</Link>
        </div>
      </div>
    </div>
  );
}
