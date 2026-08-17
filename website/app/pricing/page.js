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
    { name: 'Basic', emoji: '⚡', price: 2499, period: '/mo', credits: 500, creditLabel: 'monthly', planId: 'basic', features: ['500 Credits/month', 'Voice + Text + Screenshot', 'Priority Support', 'Screen Share Safe', 'All Themes'], cta: 'Subscribe' },
    { name: 'Pro', emoji: '🔥', price: 4999, period: '/mo', credits: 1000, creditLabel: 'monthly', planId: 'pro', popular: true, features: ['1,000 Credits/month', 'Everything in Basic', 'Teleprompter Mode', '300ms Response', '24/7 Support', 'Custom Themes'], cta: 'Subscribe' },
    { name: 'Ultimate', emoji: '💎', price: 7999, period: '/mo', credits: 2000, creditLabel: 'monthly', planId: 'ultimate', features: ['2,000 Credits/month', 'Everything in Pro', 'VIP Support', 'Early Access Features', '1-on-1 Onboarding', 'Priority Queue'], cta: 'Subscribe' },
  ];

  const handleSubscribe = (plan) => {
    if (!user) {
      router.push('/signup');
      return;
    }
    setSelectedPlan(plan);
    setShowModal(true);
    setPaymentStatus(null);
  };

  const handlePayment = async () => {
    if (!selectedPlan || !user) return;
    setLoading(true);
    setPaymentStatus(null);

    try {
      // 1. Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Create Razorpay order via backend
      const orderRes = await fetch('http://localhost:3001/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ plan: selectedPlan.planId })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || 'Failed to create order');

      // 3. Open Razorpay Checkout
      const options = {
        key: 'rzp_test_TQJDcAmNN7WwJK',
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Crack It',
        description: `${selectedPlan.name} Plan — ${selectedPlan.credits} Credits`,
        order_id: orderData.order.id,
        handler: async function (response) {
          // 4. Verify payment on backend
          try {
            const verifyRes = await fetch('http://localhost:3001/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan.planId
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setPaymentStatus('success');
              setTimeout(() => {
                setShowModal(false);
                router.push('/dashboard');
              }, 2000);
            } else {
              setPaymentStatus('failed');
            }
          } catch (err) {
            setPaymentStatus('failed');
          }
        },
        prefill: {
          email: user.email,
          contact: ''
        },
        theme: {
          color: '#7c3aed'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        setPaymentStatus('failed');
        setLoading(false);
      });
      rzp.open();
      setLoading(false);

    } catch (err) {
      console.error('Payment error:', err);
      setPaymentStatus('error');
      setLoading(false);
    }
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
      
      {/* Payment Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13111c] border border-white/10 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Upgrade to {selectedPlan.name} {selectedPlan.emoji}</h3>
                <p className="text-gray-400 text-sm">Monthly billing</p>
              </div>
              <button onClick={() => { setShowModal(false); setPaymentStatus(null); }} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="bg-[#0a0a0f] rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between"><span className="text-gray-400">Plan</span><span className="text-white font-semibold">{selectedPlan.name} {selectedPlan.emoji}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Credits added</span><span className="text-green-400 font-semibold">+{selectedPlan.credits.toLocaleString()}</span></div>
              <hr className="border-white/5" />
              <div className="flex justify-between"><span className="text-gray-400">You pay now</span><span className="text-white font-bold text-2xl">₹{selectedPlan.price.toLocaleString()}</span></div>
            </div>

            {/* Payment Success / Error Messages */}
            {paymentStatus === 'success' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-green-400 font-bold">Payment Successful!</p>
                <p className="text-green-400/70 text-sm mt-1">+{selectedPlan.credits.toLocaleString()} credits added. Redirecting to dashboard...</p>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
                <p className="text-red-400 font-bold">❌ Payment Failed</p>
                <p className="text-red-400/70 text-sm mt-1">Please try again or use a different payment method.</p>
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
                <p className="text-red-400 font-bold">⚠️ Network Error</p>
                <p className="text-red-400/70 text-sm mt-1">Please check your connection and try again.</p>
              </div>
            )}

            {!paymentStatus && (
              <>
                <button 
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-[#7c3aed] hover:bg-purple-600 text-white font-bold py-4 rounded-xl transition text-lg shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-50 mb-4"
                >
                  {loading ? '⏳ Processing...' : `Pay ₹${selectedPlan.price.toLocaleString()} & Upgrade`}
                </button>
                
                <div className="flex items-center justify-center gap-4 text-gray-500 text-xs mb-3">
                  <span>🔒 Secure</span>
                  <span>•</span>
                  <span>💳 Cards, UPI, Net Banking</span>
                  <span>•</span>
                  <span>📱 GPay, PhonePe</span>
                </div>
              </>
            )}
            
            <button onClick={() => { setShowModal(false); setPaymentStatus(null); }} className="block mx-auto text-gray-400 hover:text-white text-sm mt-2 transition">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
