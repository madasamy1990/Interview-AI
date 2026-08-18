'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();
  }, []);

  const plans = [
    { name: 'Free', emoji: '🚀', price: 0, period: 'forever', credits: 15, creditLabel: 'one-time', features: ['15 Credits (one-time)', 'Voice-to-Answer', 'Text Chat', 'Standard Support'], cta: 'Start Free', href: '/signup' },
    { name: 'Basic', emoji: '⚡', price: 10, period: '/mo', credits: 500, creditLabel: 'monthly', planId: 'basic', features: ['500 Credits/month', 'Voice + Text + Screenshot', 'Priority Support', 'Screen Share Safe', 'All Themes'], cta: 'Subscribe' },
    { name: 'Pro', emoji: '🔥', price: 9999, period: '/mo', credits: 1000, creditLabel: 'monthly', planId: 'pro', popular: true, features: ['1,000 Credits/month', 'Everything in Basic', 'Teleprompter Mode', '300ms Response', '24/7 Support', 'Custom Themes'], cta: 'Subscribe' },
    { name: 'Ultimate', emoji: '💎', price: 14999, period: '/mo', credits: 2000, creditLabel: 'monthly', planId: 'ultimate', features: ['2,000 Credits/month', 'Everything in Pro', 'VIP Support', 'Early Access Features', '1-on-1 Onboarding', 'Priority Queue'], cta: 'Subscribe' },
  ];

  const [emailInput, setEmailInput] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
    setPaymentStatus(null);
    setUtrInput('');
  };

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://interview-ai-fucx.onrender.com';
  const UPI_ID = 'madasamy.kcet-1@okicici';

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUpiSubmit = async () => {
    if (!selectedPlan) return;
    const targetEmail = user?.email || emailInput.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    if (!utrInput || utrInput.trim().length < 8) {
      alert('Please enter the 12-digit UPI Reference / UTR Number from your payment app (GPay / PhonePe / Paytm)');
      return;
    }

    setLoading(true);
    setPaymentStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${BACKEND_URL}/payment/submit-upi`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: selectedPlan.planId,
          email: targetEmail,
          utr: utrInput.trim(),
          amount: selectedPlan.price * 100
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentStatus('success');
        setTimeout(() => {
          setShowModal(false);
          router.push('/dashboard');
        }, 2500);
      } else {
        setPaymentStatus('failed');
      }
    } catch (err) {
      console.error('UPI submit error:', err);
      setPaymentStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const getUpiUrl = () => {
    if (!selectedPlan) return '';
    return `upi://pay?pa=${UPI_ID}&pn=Crack%20It%20AI&am=${selectedPlan.price}&cu=INR&tn=CrackIt%20${selectedPlan.name}%20Plan`;
  };

  return (
    <div className="bg-[#0a0a0f] pt-24 pb-32 min-h-screen relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-white to-[#7c3aed] bg-clip-text text-transparent mb-6">Pricing Plans</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Choose the perfect plan to crack your interviews without breaking a sweat.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {plans.map((plan, i) => (
            <div key={i} className={`bg-[#13111c] p-8 rounded-2xl border ${plan.popular ? 'border-[#7c3aed] shadow-[0_0_20px_rgba(124,58,237,0.4)]' : 'border-white/5'} flex flex-col hover:border-[#7c3aed]/50 transition-all duration-300 relative`}>
              {plan.popular && <div className="bg-[#7c3aed] text-white text-xs font-bold px-3 py-1 rounded-full w-max mb-4 absolute -top-3 left-1/2 -translate-x-1/2">MOST POPULAR</div>}
              {!plan.popular && <div className="h-5 mb-4"></div>}
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name} {plan.emoji}</h3>
              <div className="text-4xl font-bold text-white mb-1">₹{plan.price}<span className="text-lg text-gray-500 font-normal">{plan.period}</span></div>
              <p className="text-[#7c3aed] font-semibold mb-8">{plan.credits} Credits ({plan.creditLabel})</p>
              
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 text-[#7c3aed] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              {plan.href ? (
                <Link href={plan.href} className={`w-full block text-center py-4 rounded-xl font-bold transition ${plan.popular ? 'bg-[#7c3aed] text-white hover:bg-purple-600' : 'bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20'}`}>
                  {plan.cta}
                </Link>
              ) : (
                <button 
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full block text-center py-4 rounded-xl font-bold transition ${plan.popular ? 'bg-[#7c3aed] text-white hover:bg-purple-600' : 'bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20'}`}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Credit Usage Guide */}
        <div className="bg-[#13111c] border border-white/5 rounded-2xl p-8 mb-24 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Credit Usage Guide</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-[#0a0a0f] rounded-xl border border-white/5">
              <div className="text-2xl mb-2">🎤</div>
              <div className="font-semibold text-white">Voice-to-Answer</div>
              <div className="text-[#7c3aed] font-bold mt-1">2 Credits</div>
            </div>
            <div className="p-4 bg-[#0a0a0f] rounded-xl border border-white/5">
              <div className="text-2xl mb-2">⌨️</div>
              <div className="font-semibold text-white">Text Query</div>
              <div className="text-[#7c3aed] font-bold mt-1">1 Credit</div>
            </div>
            <div className="p-4 bg-[#0a0a0f] rounded-xl border border-white/5">
              <div className="text-2xl mb-2">📸</div>
              <div className="font-semibold text-white">Screenshot OCR</div>
              <div className="text-[#7c3aed] font-bold mt-1">2 Credits</div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              { q: 'Is it really invisible to screen sharing?', a: 'Yes, our app operates at the hardware rendering level and is invisible to Zoom, Teams, Google Meet, and other sharing software.' },
              { q: 'Do credits roll over?', a: 'Unused credits do not roll over to the next month to keep our pricing as low as possible for everyone.' },
              { q: 'Can I cancel anytime?', a: 'Absolutely. You can cancel your subscription at any time from your dashboard without any hidden fees.' },
              { q: 'How fast are the answers?', a: 'We use Groq Llama 3.3 70B, which means you start seeing answers in just 300 milliseconds on average.' }
            ].map((faq, idx) => (
              <div key={idx} className="bg-[#13111c] border border-white/5 rounded-xl overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-[#7c3aed]/5 transition"
                >
                  <h4 className="text-lg font-semibold text-white">{faq.q}</h4>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-gray-400">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Dynamic UPI QR Payment Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#13111c] border border-white/10 rounded-2xl max-w-lg w-full p-6 sm:p-8 my-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-extrabold text-white flex items-center gap-2">
                  Upgrade to {selectedPlan.name} {selectedPlan.emoji}
                </h3>
                <p className="text-gray-400 text-sm mt-0.5">Instant UPI Activation (GPay / PhonePe / Paytm)</p>
              </div>
              <button onClick={() => { setShowModal(false); setPaymentStatus(null); }} className="text-gray-400 hover:text-white text-2xl transition">✕</button>
            </div>
            
            {/* Plan Info */}
            <div className="bg-[#0a0a0f] rounded-xl p-4 mb-6 border border-white/5 space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Selected Plan</span><span className="text-white font-semibold">{selectedPlan.name} {selectedPlan.emoji}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Credits added</span><span className="text-green-400 font-bold">+{selectedPlan.credits.toLocaleString()} Credits</span></div>
              <hr className="border-white/5 my-1" />
              <div className="flex justify-between items-center"><span className="text-gray-300 font-medium">Total Amount</span><span className="text-white font-extrabold text-2xl text-[#a78bfa]">₹{selectedPlan.price.toLocaleString()}</span></div>
            </div>

            {/* Email Field if guest */}
            {!user && (
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  1. Your Email Address <span className="text-[#a78bfa]">*</span> (for your Crack It account)
                </label>
                <input 
                  type="email" 
                  placeholder="e.g. yourname@gmail.com" 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  className="w-full bg-[#0a0a0f] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7c3aed] outline-none transition"
                  required
                />
              </div>
            )}

            {/* Step 2: UPI QR Code Section */}
            <div className="mb-6 bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 text-center">
              <p className="text-xs font-semibold text-gray-300 mb-3">
                {user ? '1.' : '2.'} Scan & Pay <span className="text-white font-bold">₹{selectedPlan.price.toLocaleString()}</span> with any UPI App:
              </p>

              {/* QR Code Container */}
              <div className="bg-white p-3.5 rounded-2xl w-48 h-48 mx-auto mb-3 shadow-lg flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getUpiUrl())}&margin=0`} 
                  alt="UPI QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Supported apps */}
              <div className="flex items-center justify-center gap-3 text-gray-400 text-xs font-medium mb-3">
                <span>⚡ GPay</span>
                <span>•</span>
                <span>📱 PhonePe</span>
                <span>•</span>
                <span>💳 Paytm</span>
                <span>•</span>
                <span>🏛️ CRED / BHIM</span>
              </div>

              {/* Copyable UPI ID */}
              <div className="flex items-center justify-center gap-2 bg-[#13111c] border border-white/10 rounded-xl px-3 py-2 text-xs">
                <span className="text-gray-400 font-mono">UPI ID: <span className="text-white font-semibold">{UPI_ID}</span></span>
                <button 
                  onClick={copyUpiId}
                  className="bg-[#7c3aed]/20 text-[#a78bfa] hover:bg-[#7c3aed] hover:text-white px-2.5 py-1 rounded-md text-[11px] font-bold transition"
                >
                  {copiedUpi ? '✓ Copied!' : 'Copy'}
                </button>
              </div>

              {/* Mobile direct pay link */}
              <a 
                href={getUpiUrl()} 
                className="mt-3 inline-block text-xs text-[#a78bfa] hover:underline font-semibold sm:hidden"
              >
                📱 Click here to Pay directly on GPay / PhonePe App
              </a>
            </div>

            {/* Step 3: Enter UTR */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {user ? '2.' : '3.'} Enter 12-digit UPI Reference / UTR Number <span className="text-[#a78bfa]">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. 423871928371 (shown after payment in GPay/PhonePe)" 
                value={utrInput} 
                onChange={(e) => setUtrInput(e.target.value)} 
                className="w-full bg-[#0a0a0f] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:border-[#7c3aed] outline-none font-mono tracking-wider transition"
                maxLength={20}
              />
              <p className="text-[11px] text-gray-500 mt-1">Found in payment receipt: "UPI Ref No" or "UTR No".</p>
            </div>

            {/* Status alerts */}
            {paymentStatus === 'success' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center animate-bounce">
                <div className="text-3xl mb-1">🎉</div>
                <p className="text-green-400 font-bold">Payment Verified & Activated!</p>
                <p className="text-green-400/70 text-xs mt-0.5">+{selectedPlan.credits.toLocaleString()} credits added. Redirecting to dashboard...</p>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
                <p className="text-red-400 font-bold text-sm">❌ Verification Failed</p>
                <p className="text-red-400/70 text-xs mt-0.5">Please check the UTR number or contact support.</p>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
                <p className="text-red-400 font-bold text-sm">⚠️ Network Error</p>
                <p className="text-red-400/70 text-xs mt-0.5">Please check your connection and try again.</p>
              </div>
            )}

            {!paymentStatus && (
              <button 
                onClick={handleUpiSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#7c3aed] to-purple-600 hover:from-purple-600 hover:to-[#7c3aed] text-white font-bold py-4 rounded-xl transition text-base shadow-[0_0_25px_rgba(124,58,237,0.4)] disabled:opacity-50 mb-3"
              >
                {loading ? '⏳ Verifying...' : `✅ Submit & Activate +${selectedPlan.credits.toLocaleString()} Credits`}
              </button>
            )}
            
            <button onClick={() => { setShowModal(false); setPaymentStatus(null); }} className="block mx-auto text-gray-500 hover:text-gray-300 text-xs transition">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
