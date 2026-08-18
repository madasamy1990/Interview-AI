'use client';

import { useState, useEffect } from 'react';

const DEMO_MODES = [
  {
    id: 'voice',
    label: '🎙️ Live Voice Q&A',
    badge: '300ms Ultra-Fast',
    question: 'How do you handle distributed transactions across microservices in .NET?',
    interviewer: 'Can you explain how you handle distributed transactions between your order and inventory services?',
    answer: {
      simple: 'In microservices, I avoid distributed locks and 2-Phase Commit (2PC) because they kill scalability. Instead, I implement the Saga Pattern using MassTransit with RabbitMQ/Azure Service Bus.',
      realUsage: 'In our Mobile Platform, when an OrderPlaced event fires, OrderService coordinates with InventoryService and PaymentService. If payment fails, compensation events roll back inventory automatically.',
      keyPoint: 'Choreography vs Orchestration: Use Choreography for simple flows (2-3 services). Use Orchestration (State Machine) for complex workflows with >4 steps to keep visibility centralized.',
      code: `// MassTransit Saga State Machine
public class OrderState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    public string CurrentState { get; set; }
    public decimal OrderAmount { get; set; }
}`
    }
  },
  {
    id: 'teleprompter',
    label: '📺 Teleprompter Mode',
    badge: 'Near Webcam Eye-Contact',
    question: 'Tell me about a time you optimized a slow query in production.',
    interviewer: 'Tell me about a time a production database was causing high CPU and how you fixed it.',
    answer: {
      simple: 'In our Claims Engine, query latency spiked from 300ms to 12s under 4,000 concurrent users. I analyzed execution plans, identified a missing composite index on (TenantId, CreatedAt DESC), and replaced Entity Framework tracking with AsNoTracking().',
      realUsage: 'Reduced database CPU from 94% to 18%, and response times dropped back down to 140ms.',
      keyPoint: 'Always verify parameter sniffing issues when using EF parameterized queries with varying data distribution.',
      code: `var claims = await _dbContext.Claims
    .AsNoTracking()
    .Where(c => c.TenantId == tenantId && c.Status == ClaimStatus.Pending)
    .OrderByDescending(c => c.CreatedAt)
    .Take(50)
    .ToListAsync();`
    }
  },
  {
    id: 'ocr',
    label: '📸 Screen Question OCR',
    badge: 'Instant Screen Solve',
    question: 'Solve: Reverse Linked List in O(n) time and O(1) space.',
    interviewer: 'Coding Problem Scraped from Screen (LeetCode #206)',
    answer: {
      simple: 'Iterative 3-pointer approach: Maintain prev (null), curr (head), and next pointers. In each step, save curr.next, point curr.next to prev, move prev to curr, and advance curr.',
      realUsage: 'Time Complexity: O(n) single pass | Space Complexity: O(1) in-place without auxiliary memory allocation.',
      keyPoint: 'Edge cases: Empty list (head == null) or single node returns head unchanged immediately.',
      code: `public ListNode ReverseList(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}`
    }
  },
  {
    id: 'resume',
    label: '📄 Resume-Personalized AI',
    badge: 'Your Real Experience',
    question: 'Why should we hire you for this Senior Tech Lead position?',
    interviewer: 'Walk me through your background and why you fit our technical leadership role.',
    answer: {
      simple: 'With 11+ years leading enterprise architecture at top tier firms, I have designed resilient cloud-native platforms handling 15k+ req/sec while mentoring teams of 12+ engineers.',
      realUsage: 'Led migration from legacy .NET Framework monolith to .NET 8 Microservices on Azure AKS, cutting infrastructure costs by 35% and slashing release cycles from bi-weekly to daily CI/CD.',
      keyPoint: 'I combine deep hands-on system design with agile leadership — ensuring technical excellence aligns directly with business revenue metrics.',
      code: null
    }
  }
];

export default function AppDemoSimulator() {
  const [activeTab, setActiveTab] = useState('voice');
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamProgress, setStreamProgress] = useState(100);

  const activeDemo = DEMO_MODES.find(d => d.id === activeTab) || DEMO_MODES[0];

  // Auto-typing animation when switching tabs
  useEffect(() => {
    setIsTyping(true);
    setTypedText('');
    setStreamProgress(0);

    const fullContent = activeDemo.answer.simple;
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullContent.length) {
        setTypedText(fullContent.slice(0, i + 3));
        setStreamProgress(Math.min(100, Math.round((i / fullContent.length) * 100)));
        i += 3;
      } else {
        setTypedText(fullContent);
        setStreamProgress(100);
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="w-full max-w-5xl mx-auto text-left">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {DEMO_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveTab(mode.id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer ${
              activeTab === mode.id
                ? 'bg-[#7c3aed] text-white border-[#8b5cf6] shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-105'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{mode.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === mode.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'
            }`}>
              {mode.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Main Interactive App Window Mockup */}
      <div className="relative rounded-2xl p-1 bg-gradient-to-b from-[#7c3aed]/40 via-white/10 to-[#0ea5e9]/30 shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(124,58,237,0.25)]">
        <div className="bg-[#0f0d19] rounded-[15px] overflow-hidden border border-white/10 font-sans">
          
          {/* Mockup Titlebar */}
          <div className="bg-[#171424] px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block border border-red-600/50"></span>
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block border border-yellow-600/50"></span>
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block border border-green-600/50"></span>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-purple-400 text-sm font-black">⭐</span>
                <span className="text-white text-xs font-bold tracking-wide">Crack It</span>
                <span className="bg-[#7c3aed] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                  💎 15 Credits
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[11px] font-semibold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                🛡️ Screen Share Hidden
              </span>
              <span className="text-gray-400 text-xs font-mono">⚡ 280ms</span>
            </div>
          </div>

          {/* Interviewer Audio Wave Bar */}
          <div className="bg-[#131020] px-4 py-2.5 border-b border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold tracking-wide">Interviewer Speaking:</span>
              <span className="text-gray-300 italic truncate max-w-[280px] sm:max-w-md">
                "{activeDemo.interviewer}"
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {[40, 70, 30, 85, 95, 60, 45, 80, 50, 65, 30].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-purple-500 rounded-full animate-pulse"
                  style={{
                    height: `${h * 0.2}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s'
                  }}
                ></span>
              ))}
            </div>
          </div>

          {/* Chat Content Body */}
          <div className="p-4 sm:p-6 space-y-4 max-h-[460px] overflow-y-auto bg-[#0a0a12]/90">
            {/* User Speech Detection Bubble */}
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-[#7c3aed] to-[#6366f1] text-white text-xs sm:text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-lg shadow-md font-medium">
                🎤 {activeDemo.question}
              </div>
            </div>

            {/* AI Generated Answer Card */}
            <div className="bg-[#151224] border border-purple-500/20 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#7c3aed] flex items-center justify-center text-xs">⭐</span>
                  <span className="text-white text-xs font-bold">🎯 Simple Interview Answer (30 Seconds)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">First Person</span>
                  <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                    📋 Copied
                  </span>
                </div>
              </div>

              {/* Streaming Answer Text */}
              <p className="text-gray-200 text-xs sm:text-sm leading-relaxed font-normal">
                {typedText}
                {isTyping && <span className="inline-block w-2 h-4 ml-1 bg-purple-400 animate-pulse"></span>}
              </p>

              {/* Real Project Usage Section */}
              {streamProgress > 60 && (
                <div className="pt-2 border-t border-white/5 animate-fade-in-up">
                  <div className="text-emerald-400 text-xs font-bold mb-1 flex items-center gap-1.5">
                    <span>🟢</span> Real Project Usage
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                    {activeDemo.answer.realUsage}
                  </p>
                </div>
              )}

              {/* Code Snippet Block (If Present) */}
              {activeDemo.answer.code && streamProgress > 80 && (
                <div className="pt-2 animate-fade-in-up">
                  <div className="bg-[#090810] border border-white/10 rounded-xl p-3 font-mono text-[11px] sm:text-xs text-purple-200 overflow-x-auto">
                    <pre>{activeDemo.answer.code}</pre>
                  </div>
                </div>
              )}

              {/* Senior Trade-Off Point */}
              {streamProgress > 90 && (
                <div className="pt-2 border-t border-white/5 animate-fade-in-up">
                  <div className="text-amber-400 text-xs font-bold mb-1 flex items-center gap-1.5">
                    <span>🔴</span> Interview Point / Trade-off
                  </div>
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                    {activeDemo.answer.keyPoint}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mockup Toolbar Bottom */}
          <div className="bg-[#12101e] px-4 py-3 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-white/5 text-gray-300 flex items-center justify-center text-xs">
                ⚙️
              </button>
              <button className="w-8 h-8 rounded-lg bg-white/5 text-gray-300 flex items-center justify-center text-xs">
                📸
              </button>
              <button className="h-8 px-3 rounded-lg bg-[#7c3aed] text-white font-bold flex items-center gap-1.5 text-xs shadow-md">
                <span>🎙️</span>
                <span className="hidden sm:inline">Spacebar to Talk</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-white/5 text-gray-300 flex items-center justify-center text-xs">
                💬
              </button>
              <button className="w-8 h-8 rounded-lg bg-white/5 text-gray-300 flex items-center justify-center text-xs">
                👁️
              </button>
              <button className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">
                📺
              </button>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-gray-400">
                Mode: <strong className="text-white font-semibold">Senior Technical Interview</strong>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Feature Micro-Badges Below Demo */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
          <div className="text-purple-400 font-extrabold text-sm sm:text-base">300ms</div>
          <div className="text-gray-400 text-xs mt-0.5">Groq Llama 3.3 70B</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
          <div className="text-emerald-400 font-extrabold text-sm sm:text-base">100% Invisible</div>
          <div className="text-gray-400 text-xs mt-0.5">Hardware Window Shield</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
          <div className="text-sky-400 font-extrabold text-sm sm:text-base">Teleprompter</div>
          <div className="text-gray-400 text-xs mt-0.5">Natural Webcam Eyes</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
          <div className="text-amber-400 font-extrabold text-sm sm:text-base">Resume Tailored</div>
          <div className="text-gray-400 text-xs mt-0.5">Your Real Background</div>
        </div>
      </div>
    </div>
  );
}
