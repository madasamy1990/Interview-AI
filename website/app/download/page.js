import Link from 'next/link';

export default function Download() {
  return (
    <div className="bg-[#0a0a0f] min-h-[calc(100vh-64px)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-[#7c3aed] to-purple-600 rounded-3xl mx-auto mb-8 shadow-[0_0_30px_rgba(124,58,237,0.4)] flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Download Crack It</h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">Get the silent, invisible AI assistant for your technical interviews.</p>
        
        <div className="bg-[#13111c] border border-white/10 rounded-2xl p-8 mb-12 max-w-lg mx-auto transform hover:scale-105 transition duration-300">
          <h2 className="text-2xl font-bold text-white mb-2">Windows Version</h2>
          <p className="text-gray-400 mb-6">v1.0.2 (Latest Cloud Audio Fix) • Windows 10/11</p>
          
          <div className="space-y-3">
            <a href="https://github.com/madasamy1990/Interview-AI/releases/download/v1.0.2/Crack-It-v1.0.2-Windows.zip" className="w-full bg-[#7c3aed] hover:bg-purple-600 text-white font-bold py-4 px-6 rounded-xl transition text-lg flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Portable (.zip) — Recommended
            </a>

            <a href="https://github.com/madasamy1990/Interview-AI/releases/download/v1.0.2/Crack.it.Setup.1.0.0.exe" className="w-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition text-sm flex items-center justify-center border border-white/10">
              Download Setup Installer (.exe)
            </a>
          </div>
          
          <div className="mt-6 flex justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center"><svg className="w-4 h-4 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Digitally Signed</div>
            <div className="flex items-center"><svg className="w-4 h-4 mr-1 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 90MB Optimized</div>
          </div>
        </div>

        <div className="flex justify-center space-x-4 mb-16">
           <div className="bg-[#13111c] border border-white/5 px-6 py-4 rounded-xl flex items-center justify-between opacity-70">
              <span className="text-white font-semibold mr-4">Mac OS</span>
              <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded">Coming Soon</span>
           </div>
           <div className="bg-[#13111c] border border-white/5 px-6 py-4 rounded-xl flex items-center justify-between opacity-70">
              <span className="text-white font-semibold mr-4">Linux</span>
              <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded">Coming Soon</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto text-left mb-16">
          <div className="bg-[#13111c] p-6 rounded-xl border border-white/5">
            <h3 className="text-xl font-bold text-white mb-4">Installation Steps</h3>
            <ol className="space-y-3 text-gray-400">
              <li className="flex"><span className="bg-[#7c3aed]/20 text-[#7c3aed] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">1</span> Download the installer above</li>
              <li className="flex"><span className="bg-[#7c3aed]/20 text-[#7c3aed] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">2</span> Run the setup and follow prompts</li>
              <li className="flex"><span className="bg-[#7c3aed]/20 text-[#7c3aed] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">3</span> Launch Crack It and login with your account</li>
              <li className="flex"><span className="bg-[#7c3aed]/20 text-[#7c3aed] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">4</span> Press Spacebar during interview to use!</li>
            </ol>
          </div>
          
          <div className="bg-[#13111c] p-6 rounded-xl border border-white/5">
            <h3 className="text-xl font-bold text-white mb-4">System Requirements</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center"><span className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3"></span> OS: Windows 10 or Windows 11 (64-bit)</li>
              <li className="flex items-center"><span className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3"></span> RAM: Minimum 200MB available</li>
              <li className="flex items-center"><span className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3"></span> Storage: 50MB free space</li>
              <li className="flex items-center"><span className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3"></span> Internet: Required for AI processing</li>
            </ul>
          </div>
        </div>

        <div className="max-w-2xl mx-auto text-left">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div className="bg-[#13111c] p-5 rounded-xl border border-white/5">
              <h4 className="font-semibold text-white mb-1">Is it safe to install?</h4>
              <p className="text-gray-400 text-sm">Yes, the software is completely safe. We don't collect personal data from your computer, only the questions you send for answering.</p>
            </div>
            <div className="bg-[#13111c] p-5 rounded-xl border border-white/5">
              <h4 className="font-semibold text-white mb-1">Will my antivirus block it?</h4>
              <p className="text-gray-400 text-sm">Since it uses global keyboard hooks (for the spacebar shortcut) and hardware overlay (to hide from screen share), some strict antiviruses might show a warning. You can safely whitelist it.</p>
            </div>
            <div className="bg-[#13111c] p-5 rounded-xl border border-white/5">
              <h4 className="font-semibold text-white mb-1">Mac or Linux version?</h4>
              <p className="text-gray-400 text-sm">Currently, we only support Windows because of the specific hardware-level APIs required to make the app invisible to screen sharing software. Mac support is on our roadmap.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
