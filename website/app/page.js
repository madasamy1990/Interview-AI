import Link from 'next/link';
import AppDemoSimulator from '../components/AppDemoSimulator';

const testimonials = [
  { name: 'Ravi Kumar', role: 'Senior .NET Developer', company: 'Got ₹32L offer at Infosys', quote: 'Crack It saved my interview! The teleprompter feature let me maintain eye contact while reading AI-generated answers. Cleared 4 rounds effortlessly.', rating: 5 },
  { name: 'Priya Sharma', role: 'Java Full Stack', company: 'Cleared Amazon SDE-2', quote: 'The voice-to-answer feature is incredible. Just whispered my question and got a perfect answer in 2 seconds. Completely invisible to the interviewer.', rating: 5 },
  { name: 'Arjun Patel', role: 'React Developer', company: 'Joined Google via TCS', quote: 'Best investment I made. The 300ms response time means I get answers before I even finish thinking about them. 10/10 recommend!', rating: 5 },
];

export default function Home() {
  return (
    <div className="bg-[#0a0a0f] min-h-screen text-white overflow-hidden">
      {/* Section 1: Hero */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7c3aed] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#0ea5e9] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-float-delay"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10 animate-fade-in-up">
          <div className="inline-block bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6 text-sm text-gray-300 backdrop-blur-sm">
            ⭐⭐⭐⭐⭐ Trusted by 500+ developers
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight whitespace-pre-line gradient-text">
            {"The #1 AI Interview\nCopilot for Developers"}
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-400 mb-10">
            Real-time AI answers during live interviews. 100% invisible to Zoom, Teams & Meet screen share.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link href="/signup" className="bg-[#7c3aed] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all glow-purple hover:bg-purple-600">
              Start Free — 15 Credits
            </Link>
            <a href="#demo-preview" className="bg-transparent border border-white/20 hover:border-white/40 glass-card text-white px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
              ▶ Watch Live Demo
            </a>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm md:text-base text-gray-400 font-medium max-w-4xl mx-auto bg-white/5 py-4 px-6 rounded-2xl border border-white/10 glass-card">
            <span>🎯 500+ Interviews Cracked</span>
            <span className="hidden sm:inline">•</span>
            <span>⭐ 4.8 Rating</span>
            <span className="hidden sm:inline">•</span>
            <span>🛡️ Screen Share Safe</span>
            <span className="hidden sm:inline">•</span>
            <span>⚡ 300ms Response</span>
          </div>

          <div id="demo-preview" className="mt-16 sm:mt-20 scroll-mt-24">
            <AppDemoSimulator />
          </div>
        </div>
      </section>

      {/* Section 2: Features */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🎤', title: 'Voice-to-Answer', desc: 'Press spacebar, speak your question, get AI answer in 2 seconds' },
              { icon: '📸', title: 'Screenshot OCR', desc: 'Capture any screen question, auto-extract text, instant answer' },
              { icon: '🖥️', title: 'Teleprompter', desc: 'Read answers near your webcam for natural eye contact' },
              { icon: '🛡️', title: 'Screen Share Safe', desc: 'Hardware-level invisible — undetectable by Zoom/Teams/Meet' },
              { icon: '🎨', title: '8 Premium Themes', desc: 'Apple Dark, AMOLED, Ocean Blue, Purple Haze & more' },
              { icon: '⚡', title: '300ms Response', desc: 'Groq Llama 3.3 70B — fastest AI on the planet' },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 rounded-2xl hover:scale-105 transition-transform duration-300 hover:border-[#7c3aed]/50 glow-purple-hover cursor-pointer group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 gradient-text">How It Works</h2>
          <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start gap-8 md:gap-4">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 border-t-2 border-dashed border-[#7c3aed]/30 -z-10"></div>
            
            {[
              { num: '1', title: '📧 Sign Up', desc: 'Create account, get 15 free credits instantly' },
              { num: '2', title: '📥 Download', desc: 'Install lightweight Windows app (20MB)' },
              { num: '3', title: '🎯 Crack It!', desc: 'Press spacebar during interview, get answers' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center max-w-xs animate-fade-in-up" style={{animationDelay: `${i * 0.2}s`}}>
                <div className="w-24 h-24 rounded-full glass-card border border-[#7c3aed]/50 flex items-center justify-center text-3xl font-bold text-[#7c3aed] mb-6 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Testimonials */}
      <section className="py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 gradient-text">Wall of Love</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="glass-card p-8 rounded-2xl flex flex-col border border-white/5 hover:border-[#7c3aed]/30 transition-colors">
                <div className="flex text-yellow-500 mb-4 text-sm">{'⭐'.repeat(t.rating)}</div>
                <p className="text-gray-300 italic mb-6 flex-grow">&quot;{t.quote}&quot;</p>
                <div>
                  <div className="font-bold text-white">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.role}</div>
                  <div className="text-sm font-semibold text-[#a78bfa] mt-1">{t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Pricing Preview */}
      <section className="py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-16 gradient-text">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 text-left">
            {[
              { name: 'Free 🚀', price: '₹0', credits: '15 Credits' },
              { name: 'Basic ⚡', price: '₹5,499', credits: '500 Credits' },
              { name: 'Pro 🔥', price: '₹9,999', credits: '1,000 Credits', popular: true },
              { name: 'Ultimate 💎', price: '₹14,999', credits: '2,000 Credits' },
            ].map((plan, i) => (
              <div key={i} className={`glass-card p-8 rounded-2xl border ${plan.popular ? 'border-[#7c3aed] glow-purple' : 'border-white/5'} flex flex-col relative overflow-hidden`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-[#7c3aed] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-300 mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-white mb-1">{plan.price}<span className="text-sm text-gray-500 font-normal">/mo</span></div>
                <p className="text-gray-400 mb-6">{plan.credits} included</p>
                <Link href="/pricing" className={`mt-auto text-center py-3 rounded-xl font-bold transition-all ${plan.popular ? 'bg-[#7c3aed] text-white hover:bg-purple-600' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  Select Plan
                </Link>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="text-[#a78bfa] hover:text-white transition font-bold border-b border-[#a78bfa] pb-1">
            View All Plans →
          </Link>
        </div>
      </section>

      {/* Section 7: Final CTA */}
      <section className="py-32 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] to-[#1e1138] -z-10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8 leading-tight">Ready to Crack Your Next Interview?</h2>
          <Link href="/signup" className="inline-block bg-[#7c3aed] hover:bg-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:scale-105 glow-purple">
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
}
