'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/reset-password` 
        : 'http://localhost:3000/reset-password';

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('📬 Password reset link has been sent to your email!');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0f] min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="max-w-md w-full bg-[#13111c] p-8 rounded-2xl border border-white/5 shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white">Reset Password</h2>
          <p className="text-gray-400 mt-2">Enter your email and we'll send you a recovery link</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm">{error}</div>}
        {message && <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-xl mb-6 text-sm">{message}</div>}

        <form className="space-y-6" onSubmit={handleReset}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed] transition" 
              placeholder="you@example.com" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#7c3aed] hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-400">Remember your password? </span>
          <Link href="/login" className="text-[#7c3aed] hover:text-white font-medium transition">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
