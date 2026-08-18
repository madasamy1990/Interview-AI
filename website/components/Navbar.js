'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  const ADMIN_EMAILS = ['madasamynagarajan1990@gmail.com'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0a0f]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] bg-clip-text text-transparent">
            Crack It
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-gray-300 hover:text-white transition">Features</Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white transition">Pricing</Link>
            <Link href="/download" className="text-gray-300 hover:text-white transition">Download</Link>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link href="/admin" className="text-[#f59e0b] hover:text-yellow-300 transition text-xs font-semibold flex items-center gap-1 bg-yellow-500/10 hover:bg-yellow-500/20 px-2.5 py-1.5 rounded-lg border border-yellow-500/20">
                    🛡️ Admin
                  </Link>
                )}
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition text-sm font-medium px-2 py-1">
                  Dashboard
                </Link>

                {/* Modern User Pill with Avatar */}
                <div className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 px-2.5 py-1 rounded-xl transition-all" title={user.email}>
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#0ea5e9] flex items-center justify-center text-white text-[11px] font-bold shadow-sm select-none">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs text-gray-300 font-medium max-w-[190px] truncate">
                    {user.email}
                  </span>
                </div>

                <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 border border-transparent text-gray-300 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer">
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white transition">Login</Link>
                <Link href="/signup" className="bg-[#7c3aed] hover:bg-purple-600 text-white px-4 py-2 rounded-xl font-medium transition cursor-pointer">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-white/5 space-y-3">
            <Link href="/#features" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white transition py-2">Features</Link>
            <Link href="/pricing" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white transition py-2">Pricing</Link>
            <Link href="/download" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white transition py-2">Download</Link>
            <hr className="border-white/10" />
            {user ? (
              <>
                <div className="flex items-center gap-2 text-xs text-gray-300 py-1 bg-white/5 px-3 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="truncate">{user.email}</span>
                </div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} className="block text-[#f59e0b] hover:text-yellow-300 transition py-2 font-semibold">🛡️ Admin</Link>
                )}
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white transition py-2">Dashboard</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block w-full text-left text-red-400 hover:text-red-300 transition py-2 cursor-pointer">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white transition py-2">Login</Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)} className="block bg-[#7c3aed] text-white text-center py-2 rounded-xl font-medium hover:bg-purple-600 transition">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
