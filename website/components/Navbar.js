'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

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
              <>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</Link>
                <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white transition">Login</Link>
                <Link href="/signup" className="bg-[#7c3aed] hover:bg-purple-600 text-white px-4 py-2 rounded-xl font-medium transition">
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
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block text-gray-300 hover:text-white transition py-2">Dashboard</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block w-full text-left text-red-400 hover:text-red-300 transition py-2">Logout</button>
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
