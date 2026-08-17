import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0f] border-t border-white/10 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] bg-clip-text text-transparent">
              Crack It
            </Link>
            <p className="mt-4 text-gray-400 max-w-sm">
              Crack any technical interview with AI-powered silent assistant. Invisible to screen share.
            </p>
            <div className="flex gap-4 mt-6">
              <Link href="#" className="text-gray-400 hover:text-[#7c3aed] transition font-medium">
                Twitter
              </Link>
              <Link href="#" className="text-gray-400 hover:text-[#7c3aed] transition font-medium">
                Discord
              </Link>
              <Link href="#" className="text-gray-400 hover:text-[#7c3aed] transition font-medium">
                GitHub
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/#features" className="text-gray-400 hover:text-white transition">Features</Link></li>
              <li><Link href="/pricing" className="text-gray-400 hover:text-white transition">Pricing</Link></li>
              <li><Link href="/download" className="text-gray-400 hover:text-white transition">Download</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition">Support</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">
            &copy; 2026 Crack It AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
