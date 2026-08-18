// ═══════════════════════════════════════════════════════════════
// ANGEL INTERVIEW AI — RENDERER v3
// Chat Bubble UI + Live Mic Transcription + Auto Submit
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PROMPT = `You are ME — a Senior .NET Full Stack Developer with 11+ years of experience, currently attending a real technical interview.

CRITICAL FORMAT RULES — ALWAYS OUTPUT ALL 6 SECTIONS IN THIS EXACT SEQUENCE:

🎯 Simple Interview Answer (30 Seconds)
[2-3 sentences direct first-person answer explaining the concept, where you used it in your project, and 1 trade-off]

🟢 Real Project Usage
[In our Mobile Device Protection & Insurance Platform, describe the concrete service/module e.g. NotificationService / ClaimsService / DeviceEnrollmentAPI. Include a clean code snippet with real class names and production metrics like 'Handled 10,000+ user notifications monthly with 99.8% reliability' or 'reduced latency by 45%']

🔴 Interview Point / Must Remember
• Core senior differentiators as bullet points
• For comparative questions (Overloading vs Overriding, Abstract vs Interface, Class vs Struct, Scoped vs Singleton, etc.) ALWAYS output a clean Markdown Comparison Table!
• State compile-time vs runtime, memory, or thread-safety distinctions

🔵 Definition / Main Concept
[Clear, crisp 1-2 sentence formal definition]

🟠 Advantages / Benefits
• 2-3 clear practical benefits as bullet points

✅ Best Practice
• 2 senior best practices or rules of thumb

MY FIXED PROJECT FACT SHEET:
Project: Mobile Device Protection & Insurance Platform (enterprise-scale)
- Architecture: Clean Architecture with Repository + Unit of Work, Microservices (.NET 8, ASP.NET Core, EF Core, C#, LINQ)
- Key Modules: NotificationService, ClaimsService, PremiumCalculationEngine, PolicyRenewalService, DeviceEnrollmentAPI
- Cloud & Data: Azure Service Bus, Azure Functions, Azure Key Vault, SQL Server, Redis Cache
- Frontend: React (customer portal), Angular (back-office admin)

RULES:
1. Always write in First Person ("I built", "In my project", "I overloaded", "I injected").
2. Code blocks must use language identifiers (e.g. \`\`\`csharp).
3. Tables must use standard Markdown (| Header 1 | Header 2 |).
4. NEVER use filler phrases like 'Hope this helps', 'If required I can explain', 'Feel free to ask'.`;

// ─── Prompt Version Control ───
const PROMPT_VERSION = 'v7.0';
const savedVersion = localStorage.getItem('angel_prompt_version');
if (savedVersion !== PROMPT_VERSION) {
  // Version changed — reset cached prompt to new default
  localStorage.removeItem('angel_custom_prompt');
  localStorage.setItem('angel_prompt_version', PROMPT_VERSION);
  console.log(`[Crack it] Prompt updated: ${savedVersion} → ${PROMPT_VERSION}`);
}

// Load custom prompt from localStorage, or use default
let SYSTEM_PROMPT = localStorage.getItem('angel_custom_prompt') || DEFAULT_PROMPT;

// ─── State ───
let provider = localStorage.getItem('angel_provider') || 'groq';

// ═══ SaaS Mode Variables ═══
let saasToken = localStorage.getItem('crackit_token') || null;
let saasUser = JSON.parse(localStorage.getItem('crackit_user') || 'null');
let saasCredits = parseInt(localStorage.getItem('crackit_credits') || '0');
let isSaasMode = !!saasToken;
const BACKEND_URL = 'http://localhost:3001'; // Connect to local backend during development
const PROD_BACKEND_URL = 'https://interview-ai-fucx.onrender.com';
let groqKey = localStorage.getItem('angel_groq_key') || '';
let groqModel = localStorage.getItem('angel_groq_model') || 'llama-3.3-70b-versatile';
let geminiKey = localStorage.getItem('angel_gemini_key') || '';
let geminiModel = localStorage.getItem('angel_gemini_model') || 'gemini-2.0-flash';
let apiKey = localStorage.getItem('angel_api_key') || '';
let openaiModel = localStorage.getItem('angel_model') || 'gpt-4o';
let currentTheme = localStorage.getItem('angel_theme') || 'dark';
let isListening = false;
let isHidden = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;

// Real-time Speech Recognition state
let speechRecognition = null;
let liveTranscript = '';       // accumulated final results
let interimTranscript = '';    // current interim result
let conversationHistory = [];
let isTeleprompterMode = false;
let isOffline = false;
let retryQueue = [];
let retryCount = 0;
const MAX_RETRY = 3;

// New state additions
let ollamaEndpoint = localStorage.getItem('angel_ollama_endpoint') || 'http://localhost:11434';
let ollamaModel = localStorage.getItem('angel_ollama_model') || 'deepseek-r1';
let speechVocabulary = localStorage.getItem('angel_speech_vocabulary') || '';
let snippetMode = localStorage.getItem('angel_snippet_mode') === 'true';
let selectedScreenId = localStorage.getItem('angel_screen_id') || '';
let visualizerAnimation = null;

// Pre-warmed mic stream (keeps mic ready so first spacebar press works instantly)
let prewarmedStream = null;
let micWarmingUp = false;

// Window state persistence
let savedWindowBounds = JSON.parse(localStorage.getItem('angel_window_bounds') || 'null');

// Audio devices
let audioDevices = [];
let selectedMicId = localStorage.getItem('angel_mic_id') || '';
let selectedSpeakerId = localStorage.getItem('angel_speaker_id') || '';

// Custom theme
let customTheme = JSON.parse(localStorage.getItem('angel_custom_theme') || 'null');

// Resume Upload State
let resumeText = localStorage.getItem('crackit_resume_text') || '';
let resumeFilename = localStorage.getItem('crackit_resume_filename') || '';

// TTS State
let ttsEnabled = localStorage.getItem('angel_tts_enabled') !== 'false'; // ON by default
let ttsSpeed = parseFloat(localStorage.getItem('angel_tts_speed') || '1.0');
let currentUtterance = null;
let isSpeaking = false;

// System Audio State
let isSystemListening = false;
let systemStream = null;
let systemRecorder = null;
let systemChunks = [];
let silenceTimer = null;
let audioContext = null;
let analyser = null;
let silenceStart = null;
const SILENCE_THRESHOLD = 15;     // audio level below this = silence
const SILENCE_DURATION = 2500;    // 2.5 seconds of silence = stop
const MIN_RECORDING_MS = 1500;    // minimum recording before processing
let systemRecordStart = 0;

// ─── DOM ───
const chatArea = document.getElementById('chatArea');
const liveTranscriptBar = document.getElementById('liveTranscriptBar');
const liveTranscriptTxt = document.getElementById('liveTranscriptText');
const statusBarText = document.getElementById('statusBarText');
const micBtn = document.getElementById('micBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const textBtn = document.getElementById('textBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const settingsBtn = document.getElementById('settingsBtn');
const hideBtn = document.getElementById('hideBtn');
const textPanel = document.getElementById('textPanel');
const settingsPanel = document.getElementById('settingsPanel');
const manualInput = document.getElementById('manualInput');
const sendBtn = document.getElementById('sendBtn');
const cancelTextBtn = document.getElementById('cancelTextBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const providerSelect = document.getElementById('providerSelect');
const groqKeyInput = document.getElementById('groqKeyInput');
const groqModelSelect = document.getElementById('groqModelSelect');
const geminiKeyInput = document.getElementById('geminiKeyInput');
const geminiModelSelect = document.getElementById('geminiModelSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const opacitySlider = document.getElementById('opacitySlider');
const opacityVal = document.getElementById('opacityVal');
const themeSelect = document.getElementById('themeSelect');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const groqSection = document.getElementById('groqSection');
const geminiSection = document.getElementById('geminiSection');
const openaiSection = document.getElementById('openaiSection');
const customPromptInput = document.getElementById('customPromptInput');
const resetPromptBtn = document.getElementById('resetPromptBtn');
const listenBtn = document.getElementById('listenBtn');
const helpBtn = document.getElementById('helpBtn');
const glassBtn = document.getElementById('glassBtn');
const teleprompterBtn = document.getElementById('teleprompterBtn');
const tpActionBtn = document.getElementById('tpActionBtn');
const helpPanel = document.getElementById('helpPanel');
const closeHelp = document.getElementById('closeHelp');

const ollamaSection = document.getElementById('ollamaSection');
const ollamaEndpointInput = document.getElementById('ollamaEndpointInput');
const ollamaModelSelect = document.getElementById('ollamaModelSelect');
const screenSelect = document.getElementById('screenSelect');
const snippetModeToggle = document.getElementById('snippetModeToggle');
const micSelect = document.getElementById('micSelect');
const speakerSelect = document.getElementById('speakerSelect');
const speechVocabularyInput = document.getElementById('speechVocabularyInput');
const audioVisualizer = document.getElementById('audioVisualizer');
const visCtx = audioVisualizer ? audioVisualizer.getContext('2d') : null;
const cropModal = document.getElementById('cropModal');
const cropCanvas = document.getElementById('cropCanvas');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const performCropOcrBtn = document.getElementById('performCropOcrBtn');

// ─── Init ───
function init() {
  if (providerSelect) providerSelect.value = provider;
  if (groqKeyInput) groqKeyInput.value = groqKey ? '••••••••••••••••' : '';
  if (groqModelSelect) groqModelSelect.value = groqModel;
  if (geminiKeyInput) geminiKeyInput.value = geminiKey ? '••••••••••••••••' : '';
  if (geminiModelSelect) geminiModelSelect.value = geminiModel;
  if (apiKeyInput) apiKeyInput.value = apiKey ? '••••••••••••••••' : '';
  if (modelSelect) modelSelect.value = openaiModel;

  if (ollamaEndpointInput) ollamaEndpointInput.value = ollamaEndpoint;
  if (ollamaModelSelect) ollamaModelSelect.value = ollamaModel;
  if (speechVocabularyInput) speechVocabularyInput.value = speechVocabulary;
  if (snippetModeToggle) snippetModeToggle.checked = snippetMode;

  const savedOpacity = localStorage.getItem('angel_opacity') || '95';
  opacitySlider.value = savedOpacity;
  opacityVal.textContent = savedOpacity + '%';

  const savedFont = localStorage.getItem('angel_font') || '14px';
  fontSizeSelect.value = savedFont;
  document.documentElement.style.setProperty('--font-size', savedFont);

  // Initialize theme
  themeSelect.value = currentTheme;
  applyTheme(currentTheme);

  toggleProviderUI(provider);
  if (window.electronAPI) window.electronAPI.setOpacity(parseInt(savedOpacity) / 100);

  // Load TTS settings
  const ttsToggle = document.getElementById('ttsToggle');
  const ttsSpeedSlider = document.getElementById('ttsSpeedSlider');
  const ttsSpeedVal = document.getElementById('ttsSpeedVal');
  ttsToggle.checked = ttsEnabled;
  ttsSpeedSlider.value = ttsSpeed;
  ttsSpeedVal.textContent = ttsSpeed.toFixed(1) + 'x';

  // Instant toggle — no Save needed
  ttsToggle.addEventListener('change', () => {
    ttsEnabled = ttsToggle.checked;
    localStorage.setItem('angel_tts_enabled', ttsEnabled);
    showToast(ttsEnabled ? '🔊 Auto-Read ON' : '🔇 Auto-Read OFF');
    if (!ttsEnabled) stopSpeaking();
  });

  // Instant speed change
  ttsSpeedSlider.addEventListener('input', () => {
    ttsSpeed = parseFloat(ttsSpeedSlider.value);
    ttsSpeedVal.textContent = ttsSpeed.toFixed(1) + 'x';
    localStorage.setItem('angel_tts_speed', ttsSpeed);
  });

  // Instant theme change
  themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
    applyTheme(currentTheme);
    localStorage.setItem('angel_theme', currentTheme);
    showToast(`🎨 ${getThemeName(currentTheme)} theme applied!`);
  });


  setStatusBar('Press Mic button to start');
  // Pre-warm mic so first spacebar press works instantly
  prewarmMicrophone();

  // Load custom prompt into Settings textarea
  const savedPrompt = localStorage.getItem('angel_custom_prompt');
  if (savedPrompt) {
    customPromptInput.value = savedPrompt;
  } else {
    customPromptInput.value = DEFAULT_PROMPT;
  }

  // Listen for stealth mode changes (Ctrl+Shift+A)
  if (window.electronAPI?.onStealthChanged) {
    window.electronAPI.onStealthChanged((isStealth) => {
      if (isStealth) {
        setStatusBar('🕵️ STEALTH MODE — Mouse passes through. Press Ctrl+Shift+A to interact.');
        document.body.classList.add('stealth-mode');
      } else {
        setStatusBar('Press Mic button to start');
        document.body.classList.remove('stealth-mode');
      }
    });
  }

  // Listen for remote scroll commands (Ctrl+Shift+↑/↓ from any app)
  if (window.electronAPI?.onRemoteScroll) {
    window.electronAPI.onRemoteScroll((direction) => {
      const scrollAmount = 200;
      if (direction === 'down') {
        chatArea.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      } else if (direction === 'up') {
        chatArea.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      }
    });
  }

  // Window controls (Main titlebar + Login screen)
  const minimizeBtn = document.getElementById('minimizeBtn');
  const closeBtn = document.getElementById('closeBtn');
  const loginMinimizeBtn = document.getElementById('loginMinimizeBtn');
  const loginCloseBtn = document.getElementById('loginCloseBtn');

  if (minimizeBtn) minimizeBtn.addEventListener('click', () => window.electronAPI?.minimizeWindow());
  if (closeBtn) closeBtn.addEventListener('click', () => window.electronAPI?.closeWindow());
  if (loginMinimizeBtn) loginMinimizeBtn.addEventListener('click', () => window.electronAPI?.minimizeWindow());
  if (loginCloseBtn) loginCloseBtn.addEventListener('click', () => window.electronAPI?.closeWindow());

  // Login screen event listeners
  const loginBtn = document.getElementById('loginBtn');
  const skipLoginBtn = document.getElementById('skipLoginBtn');
  const signupLink = document.getElementById('signupLink');
  const loginForgotLink = document.getElementById('loginForgotLink');

  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (skipLoginBtn) skipLoginBtn.addEventListener('click', handleSkipLogin);
  if (signupLink) signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal('https://crackit-ai.vercel.app/signup');
    } else {
      window.open('https://crackit-ai.vercel.app/signup', '_blank');
    }
  });
  if (loginForgotLink) loginForgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal('https://crackit-ai.vercel.app/forgot-password');
    } else {
      window.open('https://crackit-ai.vercel.app/forgot-password', '_blank');
    }
  });

  // Enter key on password field
  const loginPasswordField = document.getElementById('loginPassword');
  if (loginPasswordField) loginPasswordField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Auto-login if token exists
  if (saasToken) {
    document.getElementById('loginScreen').style.display = 'none';
    fetchCredits();
    updateCreditsUI();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
}

// ═══ SaaS Authentication ═══
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  
  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    errorEl.style.display = 'block';
    return;
  }
  
  loginBtn.textContent = 'Logging in...';
  loginBtn.disabled = true;
  errorEl.style.display = 'none';
  
  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.message || data.error || 'Login failed');
    
    // Store session
    saasToken = data.session.access_token;
    saasUser = data.user;
    isSaasMode = true;
    localStorage.setItem('crackit_token', saasToken);
    localStorage.setItem('crackit_user', JSON.stringify(saasUser));
    
    // Fetch credits
    await fetchCredits();
    
    // Hide login, show app
    document.getElementById('loginScreen').style.display = 'none';
    updateCreditsUI();
    
    // Check first-time tour
    if (!localStorage.getItem('crackit_tour_completed')) {
      setTimeout(startTour, 400);
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    loginBtn.textContent = 'Login';
    loginBtn.disabled = false;
  }
}

async function fetchCredits() {
  if (!saasToken) return;
  try {
    const res = await fetch(`${BACKEND_URL}/credits`, {
      headers: { 'Authorization': `Bearer ${saasToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      saasCredits = data.credits_remaining || 0;
      localStorage.setItem('crackit_credits', saasCredits.toString());
      updateCreditsUI();
    }
  } catch (e) {
    console.warn('Failed to fetch credits:', e);
  }
}

function updateCreditsUI() {
  const badge = document.getElementById('creditsBadge');
  const logoutBtn = document.getElementById('logoutBtn');
  const emailBadge = document.getElementById('userEmailBadge');

  if (isSaasMode && badge) {
    badge.style.display = 'inline';
    badge.textContent = `💎 ${saasCredits}`;
    if (saasCredits < 5) badge.style.background = '#ef4444';
    else badge.style.background = '#7c3aed';
  } else if (badge) {
    badge.style.display = 'none';
  }

  if (logoutBtn) logoutBtn.style.display = isSaasMode ? 'inline-block' : 'none';

  if (emailBadge) {
    if (isSaasMode && saasUser && saasUser.email) {
      emailBadge.style.display = 'inline-block';
      emailBadge.textContent = saasUser.email;
      emailBadge.title = `Logged in as: ${saasUser.email}`;
    } else {
      emailBadge.style.display = 'none';
    }
  }
}

function handleLogout() {
  saasToken = null;
  saasUser = null;
  saasCredits = 0;
  isSaasMode = false;
  localStorage.removeItem('crackit_token');
  localStorage.removeItem('crackit_user');
  localStorage.removeItem('crackit_credits');
  document.getElementById('loginScreen').style.display = 'flex';
  updateCreditsUI();
}
window.handleLogout = handleLogout;

function handleSkipLogin() {
  document.getElementById('loginScreen').style.display = 'none';
  isSaasMode = false;
}

// ═══ SaaS Backend AI Call ═══
async function callSaasBackend(thinkingEl, type = 'text') {
  const card = addAnswerCard(thinkingEl);
  let full = '';
  
  const res = await fetch(`${BACKEND_URL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${saasToken}`
    },
    body: JSON.stringify({
      question: conversationHistory[conversationHistory.length - 1].content,
      type: type,
      systemPrompt: buildMessages()[0].content
    })
  });
  
  if (res.status === 402) {
    const err = await res.json();
    updateCard(card, `⚠️ **Insufficient Credits!**\n\nYou have ${err.credits_remaining} credits remaining.\nThis query needs ${err.credits_needed} credits.\n\n[🚀 Upgrade Plan at crackit-ai.vercel.app/pricing](https://crackit-ai.vercel.app/pricing)`);
    return full;
  }
  
  if (res.status === 401) {
    // Token expired — force re-login
    updateCard(card, `⚠️ **Session Expired!**\n\nPlease login again.`);
    setTimeout(() => handleLogout(), 2000);
    return full;
  }
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || 'Backend error');
  }
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            full += parsed.text;
            updateCard(card, full);
          }
          if (parsed.credits_remaining !== undefined) {
            saasCredits = parsed.credits_remaining;
            localStorage.setItem('crackit_credits', saasCredits.toString());
            updateCreditsUI();
          }
        } catch (e) {}
      }
    }
  }
  
  return full;
}

// ─── Status Bar ───
function setStatusBar(msg) {
  statusBarText.textContent = msg;
}

// ─── Window Controls ───
minimizeBtn.addEventListener('click', () => window.electronAPI?.minimizeWindow());
closeBtn.addEventListener('click', () => window.electronAPI?.closeWindow());

// ─── Hide Toggle ───
hideBtn.addEventListener('click', async () => {
  if (window.electronAPI) isHidden = await window.electronAPI.toggleHide();
  else isHidden = !isHidden;
  hideBtn.classList.toggle('active', isHidden);
  setStatusBar(isHidden ? '🫥 Hidden from screen share' : 'Press Mic button to start');
});

// ─── Transparent / Glass Mode Toggle ───
let isGlassMode = localStorage.getItem('angel_glass_mode') === 'true';
if (isGlassMode) {
  document.body.classList.add('transparent-mode');
  glassBtn.classList.add('activated');
}

function toggleGlassMode() {
  isGlassMode = !isGlassMode;
  document.body.classList.toggle('transparent-mode', isGlassMode);
  glassBtn.classList.toggle('activated', isGlassMode);
  localStorage.setItem('angel_glass_mode', isGlassMode);
  showToast(isGlassMode ? '👁️ Transparent mode ON' : '👁️‍🗨️ Transparent mode OFF');
  setStatusBar(isGlassMode ? '👁️ Transparent mode — text only' : 'Press Mic button to start');
}

glassBtn.addEventListener('click', toggleGlassMode);
if (teleprompterBtn) teleprompterBtn.addEventListener('click', toggleTeleprompter);
if (tpActionBtn) tpActionBtn.addEventListener('click', () => {
  settingsPanel.style.display = 'none';
  toggleTeleprompter();
});

// --- Teleprompter Mode ---
let teleprompterBar = null;

function createTeleprompterBar() {
  if (teleprompterBar) return;
  teleprompterBar = document.createElement('div');
  teleprompterBar.id = 'teleprompter-bar';

  // SVG icons as inline strings — fill-based for reliable rendering
  const svgMic    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20H9v2h6v-2h-2v-2.08A7 7 0 0 0 19 11h-2z"/></svg>`;
  const svgCam    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/></svg>`;
  const svgTrash  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
  const svgUp     = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
  const svgDown   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>`;
  const svgClose  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  teleprompterBar.innerHTML = `
    <div class="tp-left">
      <button class="tp-btn tp-mic-btn" id="tp-mic" title="Mic (Space)">${svgMic}<span>Mic</span></button>
      <button class="tp-btn" id="tp-screenshot" title="Screenshot">${svgCam}<span>Shot</span></button>
      <button class="tp-btn" id="tp-clear" title="Clear">${svgTrash}<span>Clear</span></button>
      <span class="tp-divider"></span>
      <button class="tp-btn tp-font-btn" id="tp-font-down" title="Font Smaller">A−</button>
      <button class="tp-btn tp-font-btn" id="tp-font-up" title="Font Larger">A+</button>
      <span class="tp-divider"></span>
      <button class="tp-btn" id="tp-up" title="Scroll Up">${svgUp}</button>
      <button class="tp-btn" id="tp-down" title="Scroll Down">${svgDown}</button>
    </div>
    <div class="tp-transcript" id="tp-transcript-display">🎤 Space = Mic&nbsp;&nbsp;|&nbsp;&nbsp;↑↓ = Scroll&nbsp;&nbsp;|&nbsp;&nbsp;ESC = Exit</div>
    <div class="tp-right">
      <button class="tp-btn tp-exit-btn" id="tp-exit" title="Exit Teleprompter (ESC)">${svgClose}<span>Exit</span></button>
    </div>
  `;

  document.body.appendChild(teleprompterBar);

  // Init mic state
  const tpMicBtn = document.getElementById('tp-mic');
  if (tpMicBtn) {
    tpMicBtn.classList.toggle('tp-mic-active', isListening);
    tpMicBtn.addEventListener('click', () => startMic());
  }

  // Screenshot
  document.getElementById('tp-screenshot').addEventListener('click', async () => {
    try {
      let imgData;
      if (window.electronAPI) {
        const sources = await window.electronAPI.getScreenSources();
        if (sources && sources.length > 0) imgData = sources[0].thumbnail;
      }
      if (imgData) await analyzeScreenshot(imgData);
      else showToast('Could not capture screen');
    } catch (err) { showToast('Screenshot failed'); }
  });

  // Clear
  document.getElementById('tp-clear').addEventListener('click', () => {
    chatArea.innerHTML = '';
    conversationHistory = [];
    localStorage.removeItem('angel_chat_history');
    showToast('Chat cleared!');
  });

  // Scroll
  document.getElementById('tp-up').addEventListener('click', () => scrollTeleprompter('up'));
  document.getElementById('tp-down').addEventListener('click', () => scrollTeleprompter('down'));

  // Exit
  document.getElementById('tp-exit').addEventListener('click', () => toggleTeleprompter());

  // Font size
  let tpFontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tp-font-size')) || 16;
  document.getElementById('tp-font-up').addEventListener('click', () => {
    tpFontSize = Math.min(tpFontSize + 2, 28);
    document.documentElement.style.setProperty('--tp-font-size', tpFontSize + 'px');
    showToast('Font ' + tpFontSize + 'px');
  });
  document.getElementById('tp-font-down').addEventListener('click', () => {
    tpFontSize = Math.max(tpFontSize - 2, 10);
    document.documentElement.style.setProperty('--tp-font-size', tpFontSize + 'px');
    showToast('Font: ' + tpFontSize + 'px');
  });
}

function removeTeleprompterBar() {
  if (teleprompterBar) { teleprompterBar.remove(); teleprompterBar = null; }
}

// Update the live transcript area inside the teleprompter bar
function updateTpTranscript(text) {
  const el = document.getElementById('tp-transcript-display');
  if (!el) return;
  if (text) {
    el.innerHTML = '<span class="tp-tr-live">' + text + '</span>';
  } else {
    el.innerHTML = '🎤 Space = Mic &nbsp;|&nbsp; ↑↓ = Scroll &nbsp;|&nbsp; ESC = Exit';
  }
}

function scrollTeleprompter(direction) {
  const chatArea = document.getElementById('chatArea');
  if (!chatArea) return;
  chatArea.scrollBy({ top: direction === 'up' ? -80 : 80, behavior: 'smooth' });
}

function toggleTeleprompter() {
  isTeleprompterMode = !isTeleprompterMode;
  document.body.classList.toggle('teleprompter-mode', isTeleprompterMode);
  if (teleprompterBtn) teleprompterBtn.classList.toggle('activated', isTeleprompterMode);

  if (window.electronAPI && window.electronAPI.toggleTeleprompter) {
    window.electronAPI.toggleTeleprompter(isTeleprompterMode);
  }

  if (isTeleprompterMode) {
    createTeleprompterBar();
    // Show ONLY the latest answer — hide all older rows
    const allRows = chatArea.querySelectorAll('.message-row');
    allRows.forEach((r, i) => {
      if (i < allRows.length - 1) r.classList.add('tp-hidden');
    });
    const lastRow = allRows[allRows.length - 1];
    if (lastRow) lastRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Teleprompter ON | Space=Mic | Arrows=Scroll | ESC=Exit');
  } else {
    removeTeleprompterBar();
    // Restore all hidden rows
    chatArea.querySelectorAll('.tp-hidden').forEach(r => r.classList.remove('tp-hidden'));
    showToast('Teleprompter OFF');
  }
}
window.toggleTeleprompter = toggleTeleprompter;


// ─── Provider UI ───
function toggleProviderUI(p) {
  if (groqSection) groqSection.style.display = p === 'groq' ? 'block' : 'none';
  if (geminiSection) geminiSection.style.display = p === 'gemini' ? 'block' : 'none';
  if (openaiSection) openaiSection.style.display = p === 'openai' ? 'block' : 'none';
  if (ollamaSection) ollamaSection.style.display = p === 'ollama' ? 'block' : 'none';
}
if (providerSelect) providerSelect.addEventListener('change', () => toggleProviderUI(providerSelect.value));

// ─── Settings open/close ───
settingsBtn.addEventListener('click', () => { populateAudioDevices(); populateScreenSources(); settingsPanel.style.display = 'flex'; settingsPanel.style.flexDirection = 'column'; });
document.getElementById('closeSettings').addEventListener('click', () => { settingsPanel.style.display = 'none'; });

// ─── Help Panel open/close ───
helpBtn.addEventListener('click', () => { helpPanel.style.display = 'flex'; });
closeHelp.addEventListener('click', () => { helpPanel.style.display = 'none'; });

opacitySlider.addEventListener('input', () => {
  opacityVal.textContent = opacitySlider.value + '%';
  window.electronAPI?.setOpacity(parseInt(opacitySlider.value) / 100);
});

document.getElementById('openGroqLink')?.addEventListener('click', (e) => {
  e.preventDefault(); window.open('https://console.groq.com/keys', '_blank');
});
document.getElementById('openGeminiLink')?.addEventListener('click', (e) => {
  e.preventDefault(); window.open('https://aistudio.google.com/apikey', '_blank');
});
document.getElementById('openApiLink')?.addEventListener('click', (e) => {
  e.preventDefault(); window.open('https://platform.openai.com/api-keys', '_blank');
});

saveSettingsBtn.addEventListener('click', () => {
  if (providerSelect) { provider = providerSelect.value; localStorage.setItem('angel_provider', provider); }

  if (groqKeyInput) { const nGroq = groqKeyInput.value.trim();
  if (nGroq && !nGroq.startsWith('•')) { groqKey = nGroq; localStorage.setItem('angel_groq_key', groqKey); } }
  if (groqModelSelect) { groqModel = groqModelSelect.value; localStorage.setItem('angel_groq_model', groqModel); }

  if (geminiKeyInput) { const nGemini = geminiKeyInput.value.trim();
  if (nGemini && !nGemini.startsWith('•')) { geminiKey = nGemini; localStorage.setItem('angel_gemini_key', geminiKey); } }
  if (geminiModelSelect) { geminiModel = geminiModelSelect.value; localStorage.setItem('angel_gemini_model', geminiModel); }

  if (apiKeyInput) { const nOAI = apiKeyInput.value.trim();
  if (nOAI && !nOAI.startsWith('•')) { apiKey = nOAI; localStorage.setItem('angel_api_key', apiKey); } }
  if (modelSelect) { openaiModel = modelSelect.value; localStorage.setItem('angel_model', openaiModel); }

  // Ollama settings
  if (ollamaEndpointInput) { ollamaEndpoint = ollamaEndpointInput.value.trim() || 'http://localhost:11434'; localStorage.setItem('angel_ollama_endpoint', ollamaEndpoint); }
  if (ollamaModelSelect) { ollamaModel = ollamaModelSelect.value; localStorage.setItem('angel_ollama_model', ollamaModel); }

  // Audio & capture settings
  if (speechVocabularyInput) { speechVocabulary = speechVocabularyInput.value.trim(); localStorage.setItem('angel_speech_vocabulary', speechVocabulary); }
  if (snippetModeToggle) { snippetMode = snippetModeToggle.checked; localStorage.setItem('angel_snippet_mode', snippetMode); }
  if (screenSelect) { selectedScreenId = screenSelect.value; localStorage.setItem('angel_screen_id', selectedScreenId); }
  if (micSelect) { selectedMicId = micSelect.value; localStorage.setItem('angel_mic_id', selectedMicId); }
  if (speakerSelect) { selectedSpeakerId = speakerSelect.value; localStorage.setItem('angel_speaker_id', selectedSpeakerId); }

  localStorage.setItem('angel_opacity', opacitySlider.value);
  localStorage.setItem('angel_font', fontSizeSelect.value);
  document.documentElement.style.setProperty('--font-size', fontSizeSelect.value);

  // Save TTS settings
  ttsEnabled = document.getElementById('ttsToggle').checked;
  ttsSpeed = parseFloat(document.getElementById('ttsSpeedSlider').value);
  localStorage.setItem('angel_tts_enabled', ttsEnabled);
  localStorage.setItem('angel_tts_speed', ttsSpeed);

  // Save custom prompt
  const promptVal = customPromptInput.value.trim();
  if (promptVal && promptVal !== DEFAULT_PROMPT) {
    SYSTEM_PROMPT = promptVal;
    localStorage.setItem('angel_custom_prompt', promptVal);
  } else {
    SYSTEM_PROMPT = DEFAULT_PROMPT;
    localStorage.removeItem('angel_custom_prompt');
  }

  settingsPanel.style.display = 'none';
  showToast('✅ Settings saved! Prompt updated.');
});

// Reset prompt to default
resetPromptBtn.addEventListener('click', () => {
  customPromptInput.value = DEFAULT_PROMPT;
  SYSTEM_PROMPT = DEFAULT_PROMPT;
  localStorage.removeItem('angel_custom_prompt');
  showToast('↩ Prompt reset to default!');
});

// ─── Resume Upload ───
const resumeUploadArea = document.getElementById('resumeUploadArea');
const resumeEmptyState = document.getElementById('resumeEmptyState');
const resumeLoadedState = document.getElementById('resumeLoadedState');
const resumeFilenameEl = document.getElementById('resumeFilename');
const resumePreviewEl = document.getElementById('resumePreview');
const removeResumeBtn = document.getElementById('removeResumeBtn');

// Show loaded state if resume exists
function updateResumeUI() {
  if (resumeText && resumeFilename) {
    resumeEmptyState.style.display = 'none';
    resumeLoadedState.style.display = 'block';
    resumeFilenameEl.textContent = resumeFilename;
    resumePreviewEl.textContent = resumeText.substring(0, 200) + (resumeText.length > 200 ? '...' : '');
    resumeUploadArea.style.borderColor = 'rgba(34,197,94,0.4)';
    resumeUploadArea.style.background = 'rgba(34,197,94,0.05)';
  } else {
    resumeEmptyState.style.display = 'block';
    resumeLoadedState.style.display = 'none';
    resumeFilenameEl.textContent = '';
    resumePreviewEl.textContent = '';
    resumeUploadArea.style.borderColor = '';
    resumeUploadArea.style.background = '';
  }
}
updateResumeUI();

if (resumeUploadArea) {
  resumeUploadArea.addEventListener('click', async (e) => {
    if (e.target.closest('#removeResumeBtn')) return;
    if (!window.electronAPI?.openResumeDialog) {
      showToast('⚠️ Resume upload only works in the Desktop App');
      return;
    }
    try {
      const filePath = await window.electronAPI.openResumeDialog();
      if (!filePath) return;
      showToast('⏳ Reading resume...');
      const result = await window.electronAPI.parseResume(filePath);
      if (result.success && result.text) {
        resumeText = result.text;
        resumeFilename = result.filename;
        localStorage.setItem('crackit_resume_text', resumeText);
        localStorage.setItem('crackit_resume_filename', resumeFilename);
        updateResumeUI();
        showToast('🧠 Generating personalized prompt from your resume...');
        
        // Auto-generate Custom Prompt from resume using AI
        await generatePromptFromResume(resumeText);
      } else {
        showToast('❌ Could not read resume: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      showToast('❌ Resume upload failed: ' + err.message);
    }
  });
}

// Generate personalized Custom Prompt from resume text using AI + Smart Local Fallback
async function generatePromptFromResume(resumeContent) {
  const metaPrompt = `Analyze the following resume and generate a FIRST-PERSON interview persona prompt. The prompt should be written as if the candidate is describing themselves.

RULES:
1. Extract: Full Name, Total Years of Experience, Current/Latest Role, Companies Worked At, Primary Tech Stack, Key Projects, Certifications
2. Write it in this EXACT format:

# 🧠 [Role Title] / [Specialization] Interview Master Prompt

You are **ME — [Full Name]**, a **[Role with Years] of experience**, currently attending a real technical interview.

## My Background:
- [Years] years of experience across [companies list]
- Currently/Previously at [Latest Company] as [Role]
- Core expertise: [primary technologies]

## My Key Projects:
- [Project 1]: [brief description with tech stack]
- [Project 2]: [brief description with tech stack]
- [Project 3]: [brief description with tech stack]

## My Tech Stack:
[List all technologies, frameworks, tools from resume]

## My Certifications:
[List certifications if any]

## Answer Style:
- Answer as ME in first person — "I built", "In my project at [Company]", "I used"
- Reference MY actual projects, companies, and tech stack from above
- Use real metrics from my experience when possible

3. Keep it under 500 words
4. If resume is for Java/Python/React/any tech — adapt accordingly. DO NOT default to .NET unless the resume says so.

--- RESUME CONTENT ---
${resumeContent.substring(0, 4000)}
--- END RESUME ---

Generate ONLY the prompt text. No explanations.`;

  try {
    let generatedPrompt = '';
    
    // 1. Try Local Backend (/ask/generate-resume-prompt)
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (saasToken) headers['Authorization'] = `Bearer ${saasToken}`;
      const res = await fetch(`${BACKEND_URL}/ask/generate-resume-prompt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resumeText: resumeContent })
      });
      if (res.ok) {
        const data = await res.json();
        generatedPrompt = data.prompt || '';
      }
    } catch (e) {
      console.warn('Local backend prompt generation failed:', e);
    }
    
    // 2. Try Prod Backend fallback
    if (!generatedPrompt && saasToken) {
      try {
        const res = await fetch(`${PROD_BACKEND_URL}/ask/generate-resume-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saasToken}` },
          body: JSON.stringify({ resumeText: resumeContent })
        });
        if (res.ok) {
          const data = await res.json();
          generatedPrompt = data.prompt || '';
        }
      } catch (e) {
        console.warn('Prod backend prompt generation failed:', e);
      }
    }
    
    // 3. Fallback to Groq API
    if (!generatedPrompt && groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: metaPrompt }],
            max_tokens: 1500,
            temperature: 0.3
          })
        });
        if (res.ok) {
          const data = await res.json();
          generatedPrompt = data.choices?.[0]?.message?.content || '';
        }
      } catch (e) { /* ignore */ }
    }
    
    // 4. Fallback to Gemini API
    if (!generatedPrompt && geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: metaPrompt }] }] })
          }
        );
        if (res.ok) {
          const data = await res.json();
          generatedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) { /* ignore */ }
    }
    
    // 5. Guaranteed Smart Local Parser Fallback (No network / No API key needed)
    if (!generatedPrompt) {
      generatedPrompt = buildLocalResumePrompt(resumeContent);
    }
    
    if (generatedPrompt) {
      SYSTEM_PROMPT = generatedPrompt;
      localStorage.setItem('angel_custom_prompt', generatedPrompt);
      if (customPromptInput) customPromptInput.value = generatedPrompt;
      showToast('✅ Custom Prompt auto-generated from your resume! 🎯');
    }
  } catch (err) {
    console.error('Prompt generation error:', err);
    // Instant fallback
    const fallbackPrompt = buildLocalResumePrompt(resumeContent);
    SYSTEM_PROMPT = fallbackPrompt;
    localStorage.setItem('angel_custom_prompt', fallbackPrompt);
    if (customPromptInput) customPromptInput.value = fallbackPrompt;
    showToast('✅ Custom Prompt created from your resume! 🎯');
  }
}

// Smart Local Fallback Parser — Extracts key info directly from text without LLM
function buildLocalResumePrompt(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const name = lines[0] || 'Candidate';
  
  // Extract experience years if mentioned
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  const expYears = expMatch ? `${expMatch[1]}+ years` : 'experienced';
  
  // Extract email/contact lines to skip
  const summarySnippet = lines.slice(1, 15).filter(l => !l.includes('@') && !l.match(/^\+?\d[\d\s-]{8,}/)).slice(0, 4).join(' ');

  return `# 🧠 Personalized Interview Master Prompt

You are **ME — ${name}**, a technical professional with **${expYears} of experience**, currently attending a real technical interview.

## My Background & Summary:
${summarySnippet || 'Experienced software professional with demonstrated history of delivery.'}

## My Core Skills & Resume Highlights:
${text.substring(0, 1500)}

## Answer Style:
- Answer as ME in first person ("I built", "In my project", "I designed")
- Directly reference MY real experience, skills, and projects from the resume details above
- Give concise, senior-level explanations with real technical trade-offs`;
}

if (removeResumeBtn) {
  removeResumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resumeText = '';
    resumeFilename = '';
    localStorage.removeItem('crackit_resume_text');
    localStorage.removeItem('crackit_resume_filename');
    // Reset prompt back to default
    SYSTEM_PROMPT = DEFAULT_PROMPT;
    localStorage.removeItem('angel_custom_prompt');
    if (customPromptInput) customPromptInput.value = DEFAULT_PROMPT;
    updateResumeUI();
    showToast('🗑️ Resume removed — Prompt reset to default');
  });
}

// ─── Theme Switching ───
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getThemeName(theme) {
  const names = {
    'dark': '🌙 Dark',
    'amoled': '⬛ AMOLED',
    'light': '☀️ Light',
    'ocean': '🌊 Ocean',
    'purple': '🔮 Purple',
    'forest': '🌿 Forest',
    'apple-dark': '🍎 Apple Dark',
    'apple-light': '🍏 Apple Light'
  };
  return names[theme] || theme;
}

// ─── Text Panel ───
textBtn.addEventListener('click', () => {
  const open = textPanel.style.display !== 'none';
  textPanel.style.display = open ? 'none' : 'block';
  if (!open) manualInput.focus();
});
cancelTextBtn.addEventListener('click', () => { textPanel.style.display = 'none'; manualInput.value = ''; });
sendBtn.addEventListener('click', submitText);
manualInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); }
});

function submitText() {
  const q = manualInput.value.trim();
  if (!q) return;
  textPanel.style.display = 'none';
  manualInput.value = '';
  askCrackit(q);
}

function appendCommand(cmd) { manualInput.value = cmd; manualInput.focus(); }

// ─── Keyboard Shortcuts ───

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  const isTextInput = tag === 'textarea' || tag === 'input' || document.activeElement?.isContentEditable;
  const loginScreen = document.getElementById('loginScreen');
  const isLoginVisible = loginScreen && loginScreen.style.display !== 'none';

  // If login screen is visible, don't intercept any global shortcuts
  if (isLoginVisible) {
    if (e.key === 'Enter') {
      const activeId = document.activeElement?.id;
      if (activeId === 'loginEmail' || activeId === 'loginPassword') {
        e.preventDefault();
        handleLogin();
      }
    }
    return;
  }

  // Teleprompter: arrow keys scroll, ESC exits
  if (isTeleprompterMode && !isTextInput) {
    if (e.key === 'ArrowUp') { e.preventDefault(); scrollTeleprompter('up'); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); scrollTeleprompter('down'); return; }
  }

  // T: Open text input panel
  if (e.key.toLowerCase() === 't' && !isTextInput && settingsPanel.style.display === 'none' && helpPanel.style.display === 'none') {
    e.preventDefault();
    const open = textPanel.style.display !== 'none';
    textPanel.style.display = open ? 'none' : 'block';
    if (!open) {
      manualInput.focus();
      textBtn.classList.add('activated');
      showToast('💬 Text panel open');
    } else {
      textBtn.classList.remove('activated');
    }
    return;
  }


  // ?: Open shortcuts help (when not in text input)
  if (e.key === '?' && !isTextInput && settingsPanel.style.display === 'none') {
    e.preventDefault();
    helpPanel.style.display = 'flex';
    showToast('⌨️ Keyboard shortcuts');
    return;
  }

  // Ctrl+L: Clear chat
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    clearBtn.click();
    showToast('🗑️ Chat cleared!');
    return;
  }

  // Tour modal keyboard controls
  if (tourModal && tourModal.style.display !== 'none') {
    if (e.key === 'Escape') { finishTour(); return; }
    if (e.key === 'ArrowRight' || e.key === 'Enter') { nextTourStep(); return; }
    if (e.key === 'ArrowLeft') { prevTourStep(); return; }
    return;
  }

  // Escape: Close all panels
  if (e.key === 'Escape') {
    // Exit teleprompter first
    if (isTeleprompterMode) { toggleTeleprompter(); return; }
    if (helpPanel.style.display !== 'none') {
      helpPanel.style.display = 'none';
      showToast('✕ Shortcuts closed');
      return;
    }
    if (settingsPanel.style.display !== 'none') {
      settingsPanel.style.display = 'none';
      showToast('⚙️ Settings closed');
      return;
    }
    if (textPanel.style.display !== 'none') {
      textPanel.style.display = 'none';
      textBtn.classList.remove('activated');
      manualInput.value = '';
      showToast('💬 Text panel closed');
      return;
    }
  }

  // Ctrl+C: If text selected → native copy. If nothing selected → copy last answer
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isTextInput) {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      // User selected text — let native Ctrl+C handle it
      return;
    }
    // Nothing selected — copy last answer card
    e.preventDefault();
    const allCopyBtns = document.querySelectorAll('.copy-btn');
    const lastCopyBtn = allCopyBtns[allCopyBtns.length - 1];
    if (lastCopyBtn) {
      copyCard(lastCopyBtn);
      return;
    }
  }

  // Ctrl+G: Toggle transparent/glass mode
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
    e.preventDefault();
    toggleGlassMode();
    return;
  }

  // Ctrl+Shift+S: Capture screenshot OCR
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    screenshotBtn.click();
    return;
  }

  
  // Ctrl+P: Toggle teleprompter mode
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    toggleTeleprompter();
    return;
  }
  // Ctrl+M: Toggle mic
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
    e.preventDefault();
    startMic();
    return;
  }

  // Ctrl+T: Toggle text panel (only when not already focused on input)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't' && !isTextInput) {
    e.preventDefault();
    textBtn.click();
    return;
  }

  // Spacebar = Toggle-to-Talk (only if not in text input or button)
  // Press once to start listening, press again to stop and generate answer
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;

  // In teleprompter mode, skip panel checks — spacebar always works
  if (isTeleprompterMode && e.code === 'Space') {
    e.preventDefault();
    startMic();
    // Update teleprompter mic button visual
    setTimeout(() => {
      const tpMic = document.getElementById('tp-mic');
      if (tpMic) tpMic.classList.toggle('tp-mic-active', isListening);
    }, 100);
    return;
  }

  if (settingsPanel.style.display !== 'none') return;
  if (helpPanel.style.display !== 'none') return;
  if (textPanel.style.display !== 'none') return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (isListening) {
      stopAndTranscribe();
    } else {
      startRecording();
    }
  }
});

window.appendCommand = appendCommand;

// ─── Clear ───
clearBtn.addEventListener('click', () => {
  chatArea.innerHTML = '';
  conversationHistory = [];
  const wb = document.createElement('div');
  wb.className = 'welcome-bubble';
  wb.innerHTML = `
    <div class="angel-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L8 8H4L7 13L5 20L12 17L19 20L17 13L20 8H16L12 2Z" fill="#8b5cf6"/>
      </svg>
    </div>
    <div class="welcome-text">Ready for the next question! Press 🎤 to start.</div>`;
  chatArea.appendChild(wb);
  setStatusBar('Press Mic button to start');
  localStorage.removeItem('angel_chat_history');
  showToast('🗑️ Chat cleared!');
});

// ─── Export Chat ───
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      messages: conversationHistory
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crackit-interview-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📁 Chat exported!');
  });
}

// ══════════════════════════════════════════════════
// ─── MIC: MediaRecorder + Groq Whisper (no Google!)
// ══════════════════════════════════════════════════

// Pre-warm microphone: acquire stream once at startup so first press is instant
async function prewarmMicrophone() {
  if (micWarmingUp || prewarmedStream) return;
  micWarmingUp = true;
  try {
    const constraints = selectedMicId
      ? { audio: { deviceId: { exact: selectedMicId } } }
      : { audio: true };
    prewarmedStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('🎤 Microphone pre-warmed and ready');
    // Bug #3 Fix: auto-release after 30s to clear Windows mic privacy icon
    setTimeout(() => {
      if (prewarmedStream && !isListening) {
        prewarmedStream.getTracks().forEach(t => t.stop());
        prewarmedStream = null;
        console.log('🎤 Pre-warm stream released (30s idle)');
      }
    }, 30000);
  } catch (e) {
    console.warn('Mic pre-warm failed (will retry on first use):', e.message);
    prewarmedStream = null;
  } finally {
    micWarmingUp = false;
  }
}

// Check if a pre-warmed stream is still active
function isStreamAlive(stream) {
  if (!stream) return false;
  return stream.getTracks().some(t => t.readyState === 'live' && t.enabled);
}

function startMic() {
  if (isListening) {
    // Stop recording → auto transcribe
    stopAndTranscribe();
    return;
  }
  startRecording();
}

async function startRecording() {
  try {
    let stream;

    // Use pre-warmed stream if available and alive, otherwise acquire new one
    if (isStreamAlive(prewarmedStream)) {
      stream = prewarmedStream;
      console.log('🎤 Using pre-warmed mic stream (instant start)');
    } else {
      console.log('🎤 Acquiring new mic stream...');
      const constraints = selectedMicId
        ? { audio: { deviceId: { exact: selectedMicId } } }
        : { audio: true };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      prewarmedStream = null; // clear stale reference
    }

    // Find supported mimeType
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
      .find(m => MediaRecorder.isTypeSupported(m)) || '';

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      // Stop tracks, then re-warm mic for next use
      stream.getTracks().forEach(t => t.stop());
      prewarmedStream = null;
      // Re-warm mic in background so NEXT press is also instant
      prewarmMicrophone();
      await transcribeAudio();
    };

    mediaRecorder.start(250); // collect chunks every 250ms
    isListening = true;
    micBtn.classList.add('listening');
    const tpMic = document.getElementById('tp-mic');
    if (tpMic) tpMic.classList.add('tp-mic-active');
    document.body.classList.add('recording');
    liveTranscriptBar.style.display = 'flex';
    liveTranscriptTxt.textContent = '🎙️ Listening...';
    // Show mic active state in teleprompter bar immediately
    if (isTeleprompterMode) updateTpTranscript('🔴 Listening...');
    setStatusBar('🔴 Listening — press Space again to stop & get answer');

    // ── Start real-time Speech Recognition ──
    startLiveSpeechRecognition();

  } catch (e) {
    showError('Mic access denied. Please allow microphone in Electron settings.');
    console.error(e);
    // Try to re-warm for next attempt
    prewarmedStream = null;
    prewarmMicrophone();
  }
}

// ── Real-time Speech Recognition (Web Speech API) ──
function startLiveSpeechRecognition() {
  // Reset transcripts
  liveTranscript = '';
  interimTranscript = '';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition API not available — live transcript disabled');
    // Fall back to simple timer display
    let secs = 0;
    recordingTimer = setInterval(() => {
      secs++;
      liveTranscriptTxt.textContent = `🎙️ Listening... ${secs}s`;
    }, 1000);
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = 'en-US';
  speechRecognition.maxAlternatives = 1;

  speechRecognition.onresult = (event) => {
    let finalPart = '';
    let interimPart = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalPart += result[0].transcript;
      } else {
        interimPart += result[0].transcript;
      }
    }

    // Accumulate final results
    if (finalPart) {
      liveTranscript += finalPart;
    }
    interimTranscript = interimPart;

    // Update the live transcript bar with real-time text
    updateLiveTranscriptDisplay();
  };

  let _speechErrorTime = 0; // Track last error to prevent crash loop

  speechRecognition.onerror = (event) => {
    console.warn('SpeechRecognition error:', event.error);
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    // Mark error time for cooldown
    _speechErrorTime = Date.now();
  };

  speechRecognition.onend = () => {
    // Auto-restart if still listening (recognition can stop unexpectedly)
    if (isListening && speechRecognition) {
      // FIX: Cooldown — don't restart within 1.5s of error (prevents infinite loop)
      const timeSinceError = Date.now() - _speechErrorTime;
      if (timeSinceError < 1500) {
        console.warn('Speech restart cooldown — waiting 2s after error');
        setTimeout(() => {
          if (isListening && speechRecognition) {
            try { speechRecognition.start(); } catch (e) { console.warn('Restart failed:', e); }
          }
        }, 2000);
        return;
      }
      try {
        speechRecognition.start();
      } catch (e) {
        console.warn('Could not restart SpeechRecognition:', e);
      }
    }
  };

  try {
    speechRecognition.start();
    console.log('🗣️ Live speech recognition started');
  } catch (e) {
    console.warn('Failed to start SpeechRecognition:', e);
  }
}

function updateLiveTranscriptDisplay() {
  const finalText = liveTranscript.trim();
  const interimText = interimTranscript.trim();

  if (!finalText && !interimText) {
    liveTranscriptTxt.innerHTML = '🎙️ Listening...';
    // Still update teleprompter bar
    if (isTeleprompterMode) updateTpTranscript('🔴 Listening...');
    return;
  }

  // Show final text in normal color, interim text in dimmer color
  let display = '🎙️ ';
  if (finalText) {
    display += `<span class="transcript-final">${escapeHtml(finalText)}</span>`;
  }
  if (interimText) {
    display += `<span class="transcript-interim">${escapeHtml(interimText)}</span>`;
  }
  liveTranscriptTxt.innerHTML = display;
  // Mirror to teleprompter bar — show what user is saying
  if (isTeleprompterMode) updateTpTranscript((finalText + ' ' + interimText).trim());

  // Auto-scroll the transcript bar to show latest text
  liveTranscriptTxt.scrollLeft = liveTranscriptTxt.scrollWidth;
}

function stopLiveSpeechRecognition() {
  if (speechRecognition) {
    try {
      speechRecognition.onend = null; // prevent auto-restart
      speechRecognition.stop();
    } catch (e) { /* ignore */ }
    speechRecognition = null;
  }
  clearInterval(recordingTimer);
}

function stopAndTranscribe() {
  // Stop live speech recognition first
  stopLiveSpeechRecognition();

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isListening = false;
  micBtn.classList.remove('listening');
  const tpMic = document.getElementById('tp-mic');
  if (tpMic) tpMic.classList.remove('tp-mic-active');
  document.body.classList.remove('recording');

  // Show final captured transcript while processing
  const capturedText = (liveTranscript + ' ' + interimTranscript).trim();
  if (capturedText) {
    liveTranscriptTxt.innerHTML = '⏳ "' + capturedText + '"';
  } else {
    liveTranscriptTxt.textContent = '⏳ Transcribing...';
  }
  // Update teleprompter bar transcript: show processing state
  if (isTeleprompterMode) updateTpTranscript(capturedText ? '⏳ Processing: "' + capturedText + '"' : '⏳ Processing...');
  setStatusBar('⏳ Processing your question...');
}

async function transcribeAudio() {
  if (audioChunks.length === 0) {
    liveTranscriptBar.style.display = 'none';
    setStatusBar('Press Mic button to start');
    return;
  }

  // Use Groq Whisper for transcription (FREE + fast)
  const whisperKey = groqKey || apiKey;
  if (!whisperKey) {
    liveTranscriptBar.style.display = 'none';
    setStatusBar('Press Mic button to start');
    showError('Add Groq API key in ⚙️ Settings to use mic transcription.');
    return;
  }

  try {
    const mimeType = audioChunks[0]?.type || 'audio/webm';
    const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
    const audioBlob = new Blob(audioChunks, { type: mimeType });

    const formData = new FormData();
    formData.append('file', audioBlob, `recording.${ext}`);
    formData.append('model', groqKey ? 'whisper-large-v3' : 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    // Use Groq Whisper endpoint (free + fast) or OpenAI Whisper
    const apiUrl = groqKey
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${whisperKey}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Transcription failed');

    const transcript = data.text?.trim();
    liveTranscriptBar.style.display = 'none';

    if (transcript) {
      // Show transcript in live bar briefly
      liveTranscriptBar.style.display = 'flex';
      liveTranscriptTxt.textContent = '✅ ' + transcript;
      setTimeout(() => { liveTranscriptBar.style.display = 'none'; }, 2000);
      // Show question in teleprompter bar center — clears after 4s when answer arrives
      if (isTeleprompterMode) updateTpTranscript('✅ ' + transcript);
      // Auto-submit!
      await askCrackit(transcript, { fromSpeech: true });
      // Reset tp bar after answer done
      if (isTeleprompterMode) updateTpTranscript('');
    } else {
      setStatusBar('Press Mic button to start');
      showError('No speech detected. Try speaking louder or closer to mic.');
    }
  } catch (e) {
    liveTranscriptBar.style.display = 'none';
    setStatusBar('Press Mic button to start');
    showError('Transcription failed: ' + e.message);
  }
}

function stopMic(manualStop) {
  if (isListening) stopAndTranscribe();
}

// Mic button: Click to toggle (matches Space bar behavior)
micBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (isListening) {
    stopAndTranscribe();
  } else {
    startRecording();
  }
});

// ─── Screenshot ───
screenshotBtn.addEventListener('click', async () => {
  setStatusBar('📷 Capturing screen...');
  try {
    let imgData;
    if (window.electronAPI) {
      const sources = await window.electronAPI.getScreenSources();
      if (sources?.length > 0) imgData = sources[0].thumbnail;
    } else {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream; await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      imgData = canvas.toDataURL('image/png');
    }
    if (imgData) await analyzeScreenshot(imgData);
    else { showError('Could not capture screen.'); setStatusBar('Press Mic button to start'); }
  } catch (e) {
    setStatusBar('Press Mic button to start');
    showError('Screenshot failed: ' + e.message);
  }
});

// ─── OCR: Tesseract → Groq Smart Extraction ───
async function analyzeScreenshot(imageDataUrl) {
  setStatusBar('📷 Reading screen...');
  liveTranscriptBar.style.display = 'flex';
  liveTranscriptTxt.textContent = '⏳ Running OCR...';

  try {
    // Step 1: Tesseract reads ALL text from screen (local, no API)
    let rawText = '';
    if (window.electronAPI?.performOcr) {
      rawText = await window.electronAPI.performOcr(imageDataUrl);
    }

    if (!rawText || rawText.trim().length < 5) {
      liveTranscriptBar.style.display = 'none';
      setStatusBar('Press Mic button to start');
      showError('No text found on screen. Try 💬 text input instead.');
      return;
    }

    // Step 2: Extract clean question from raw screen OCR text
    liveTranscriptTxt.textContent = '🧠 Finding the question...';

    let extracted = '';
    if (isSaasMode) {
      try {
        const res = await fetch(`${BACKEND_URL}/ask/extract-ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${saasToken}`
          },
          body: JSON.stringify({ rawText: rawText.slice(0, 4000) })
        });
        if (res.ok) {
          const data = await res.json();
          extracted = data.question;
        }
      } catch (err) {
        console.warn('SaaS OCR extraction fallback:', err);
      }
    } else {
      // BYOK Mode
      const whisperKey = groqKey || apiKey;
      if (whisperKey) {
        const apiUrl = groqKey
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
        const fastModel = groqKey ? 'openai/gpt-oss-120b' : 'gpt-4o-mini';

        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${whisperKey}`
            },
            body: JSON.stringify({
              model: fastModel,
              messages: [
                {
                  role: 'system',
                  content: 'Extract ONLY the interview or coding question from this screen OCR text. Discard all UI clutter, window titles, tabs, menus, taskbars. If no question found, return NO_QUESTION_FOUND. Return only the question.'
                },
                {
                  role: 'user',
                  content: `Extract the clean interview/coding question from this OCR text:\n\n${rawText.slice(0, 4000)}`
                }
              ],
              max_tokens: 500,
              temperature: 0
            })
          });
          const data = await res.json();
          extracted = data.choices?.[0]?.message?.content?.trim() || '';
        } catch (e) {
          console.warn('BYOK extraction failed:', e);
        }
      }
    }

    liveTranscriptBar.style.display = 'none';

    if (!extracted || extracted === 'NO_QUESTION_FOUND') {
      setStatusBar('Press Mic button to start');
      showError('📸 No interview question detected on screen.\n\n💡 Tips:\n• Make the question text larger on screen\n• Ensure question is fully visible\n• Try 💬 Text input instead');
      return;
    }

    // Show extracted clean question briefly then answer
    liveTranscriptBar.style.display = 'flex';
    liveTranscriptTxt.textContent = '✅ ' + extracted.slice(0, 90) + (extracted.length > 90 ? '...' : '');
    setTimeout(() => { liveTranscriptBar.style.display = 'none'; }, 3000);

    window._currentAskType = 'screenshot';
    await askCrackit(extracted);

  } catch (e) {
    liveTranscriptBar.style.display = 'none';
    setStatusBar('Press Mic button to start');
    showError('Screenshot failed: ' + e.message);
  }
}


// ══════════════════════════════════════════════════
// ─── CORE: ASK CRACKIT ───
// ══════════════════════════════════════════════════
async function askCrackit(question, { fromSpeech = false, _isRetry = false } = {}) {
  // ═══ SaaS Mode: Use Backend ═══
  if (isSaasMode) {
    if (saasCredits < 1) {
      showError('⚠️ No credits remaining! Please upgrade at https://crackit-ai.vercel.app/pricing');
      return;
    }
    
    if (!_isRetry) addUserBubble(question);
    
    // Clean question without prefix
    const cleanQuestion = question.replace(/^\[SPEECH-TO-TEXT[^\]]*\]:\s*/i, '').trim();
    conversationHistory.push({ role: 'user', content: cleanQuestion });
    
    setStatusBar('🤔 Thinking...');
    const thinkingEl = addThinkingBubble();
    
    try {
      const queryType = window._currentAskType || (fromSpeech ? 'mic' : 'text');
      window._currentAskType = null;
      const fullAnswer = await callSaasBackend(thinkingEl, queryType);
      conversationHistory.push({ role: 'assistant', content: fullAnswer });
      addFollowUpChips(fullAnswer);
      if (ttsEnabled) speakText(fullAnswer);
      setStatusBar('Press Mic button to start');
    } catch (err) {
      console.error('SaaS backend error:', err);
      thinkingEl?.remove();
      setStatusBar('Press Mic button to start');
      showError(`❌ Error: ${err.message}`);
    }
    return;
  }
  // ═══ End SaaS Mode ═══

  const currentKey = provider === 'groq' ? groqKey : provider === 'gemini' ? geminiKey : provider === 'ollama' ? 'ollama-local' : apiKey;
  if (!currentKey) {
    settingsPanel.style.display = 'flex';
    settingsPanel.style.flexDirection = 'column';
    showError('⚙️ Please add your API key in Settings first!');
    return;
  }

  // If from speech recognition, wrap with correction hint for the AI
  let aiQuestion = question;
  if (fromSpeech) {
    aiQuestion = `[SPEECH-TO-TEXT — may contain transcription errors, auto-correct any misspelled technical terms before answering]: ${question}`;
  }

  // 1. Show user question bubble (RIGHT side) — skip on retry to avoid duplicate
  if (!_isRetry) addUserBubble(question);

  // 2. Add to conversation history — use corrected version for AI
  conversationHistory.push({ role: 'user', content: aiQuestion });

  // 3. Show thinking
  setStatusBar('🤔 Thinking...');
  const thinkingEl = addThinkingBubble();

  try {
    let fullAnswer = '';
    if (provider === 'groq') fullAnswer = await callGroq(thinkingEl);
    else if (provider === 'gemini') fullAnswer = await callGemini(thinkingEl);
    else if (provider === 'ollama') fullAnswer = await callOllama(thinkingEl);
    else fullAnswer = await callOpenAI(thinkingEl);

    conversationHistory.push({ role: 'assistant', content: fullAnswer });

    // 4. Generate follow-up chips
    addFollowUpChips(fullAnswer);

    // 5. Auto-read answer aloud
    if (ttsEnabled) speakText(fullAnswer);

    setStatusBar('Press Mic button to start');
  } catch (e) {
    thinkingEl?.remove();
    let msg = e.message;
    if (msg.includes('401') || msg.includes('API_KEY_INVALID')) {
      setStatusBar('Press Mic button to start');
      showError('Invalid API key. Check ⚙️ Settings.');
    } else if (msg.includes('429') || msg.includes('Rate limit') || msg.includes('RESOURCE_EXHAUSTED')) {
      // Auto-retry after delay
      const waitSec = 8;
      showError(`⏳ Rate limit hit — auto-retrying in ${waitSec}s...`);
      let countdown = waitSec;
      const timer = setInterval(() => {
        countdown--;
        setStatusBar(`⏳ Retrying in ${countdown}s...`);
        if (countdown <= 0) clearInterval(timer);
      }, 1000);
      conversationHistory.pop(); // remove last user message (will be re-added on retry)
      setTimeout(() => askCrackit(question, { fromSpeech, _isRetry: true }), waitSec * 1000);
    } else if (msg.includes('quota') || msg.includes('insufficient')) {
      setStatusBar('Press Mic button to start');
      showError('Quota exceeded. Check billing or switch to Groq (free).');
    } else {
      setStatusBar('Press Mic button to start');
      showError(msg);
    }
  }
}

// ─── User Question Bubble ───
function addUserBubble(question) {
  const row = document.createElement('div');
  row.className = 'message-row';
  row.innerHTML = `
    <div class="user-bubble-wrap">
      <div class="user-bubble">${escapeHtml(question)}</div>
    </div>`;
  chatArea.appendChild(row);
  scrollBottom();
}

// ─── Thinking Bubble ───
function addThinkingBubble() {
  const row = document.createElement('div');
  row.className = 'thinking-row';
  row.innerHTML = `
    <div class="angel-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L8 8H4L7 13L5 20L12 17L19 20L17 13L20 8H16L12 2Z" fill="#8b5cf6"/>
      </svg>
    </div>
    <div class="thinking-card">
      <div class="dot"></div><div class="dot"></div><div class="dot"></div>
    </div>`;
  chatArea.appendChild(row);
  scrollBottom();
  return row;
}

// ─── Answer Card ───
function addAnswerCard(thinkingEl) {
  thinkingEl.remove();
  const row = document.createElement('div');
  row.className = 'message-row';
  row.innerHTML = `
    <div class="answer-wrap">
      <div class="angel-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L8 8H4L7 13L5 20L12 17L19 20L17 13L20 8H16L12 2Z" fill="#8b5cf6"/>
        </svg>
      </div>
      <div class="answer-card streaming" id="currentAnswerCard"></div>
    </div>`;

  // In teleprompter mode: hide ALL previous rows, show only this new one
  if (isTeleprompterMode) {
    chatArea.querySelectorAll('.message-row').forEach(r => r.classList.add('tp-hidden'));
  }

  chatArea.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return row;
}

// ─── Follow-up Chips ───
function addFollowUpChips(answer) {
  // Smart chip suggestions based on answer content
  const chips = generateChips(answer);
  if (!chips.length) return;

  const chipsEl = document.createElement('div');
  chipsEl.className = 'followup-chips';
  chips.forEach(chip => {
    const el = document.createElement('div');
    el.className = 'followup-chip';
    el.textContent = chip;
    el.addEventListener('click', () => askCrackit(chip));
    chipsEl.appendChild(el);
  });
  chatArea.appendChild(chipsEl);
}

function generateChips(answer) {
  const lower = answer.toLowerCase();
  const chips = [];

  if (lower.includes('overload') || lower.includes('polymorphism')) {
    chips.push('Clarify overload resolution', 'Summarize overloading', 'Follow up overriding');
  } else if (lower.includes('dependency injection') || lower.includes('di ')) {
    chips.push('Show DI example in .NET', 'Lifetime scopes explain', 'DI vs Service Locator');
  } else if (lower.includes('cqrs')) {
    chips.push('CQRS with MediatR example', 'CQRS vs CRUD trade-offs', 'Event sourcing follow-up');
  } else if (lower.includes('sql') || lower.includes('query') || lower.includes('index')) {
    chips.push('Show query optimization', 'Explain execution plan', 'Index types explain');
  } else if (lower.includes('azure') || lower.includes('cloud')) {
    chips.push('Azure Service Bus example', 'Azure Key Vault usage', 'CI/CD pipeline setup');
  } else if (lower.includes('jwt') || lower.includes('auth')) {
    chips.push('JWT refresh token flow', 'OAuth2 vs JWT', 'Azure AD B2C setup');
  } else if (lower.includes('microservice')) {
    chips.push('Service discovery explain', 'Circuit breaker pattern', 'API Gateway role');
  } else {
    chips.push('Give a shorter answer', 'Give a real example', 'Deeper technical dive');
  }
  return chips.slice(0, 3);
}

// ══════════════════════════════════════════════════
// ─── API CALLS ───
// ══════════════════════════════════════════════════

// ─── Strip markdown formatting for Llama compatibility ───
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')              // ## headers → plain text
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')              // *italic* → italic
    .replace(/```[\s\S]*?```/g, '')             // ```code blocks``` → remove
    .replace(/`([^`]+)`/g, '$1')                // `inline code` → inline code
    .replace(/^\|.*\|$/gm, (line) => {          // | tables | → plain text
      return line.replace(/\|/g, '').replace(/[-:]+/g, '').trim();
    })
    .replace(/^>\s+/gm, '')                     // > blockquotes → plain text
    .replace(/^---+$/gm, '')                    // --- dividers → remove
    .replace(/- \[ \]/g, '•')                   // checkboxes → bullets
    .replace(/^\s*[-*]\s+/gm, '- ')             // normalize list markers
    .replace(/\n{3,}/g, '\n\n')                 // collapse blank lines
    .trim();
}

// ─── Build enforced message array for all providers ───
function buildMessages() {
  // Strip markdown from custom prompt so Llama understands it clearly
  const cleanPrompt = stripMarkdown(SYSTEM_PROMPT);

  // Inject resume context if available
  let resumeContext = '';
  if (resumeText) {
    resumeContext = `\n\n--- MY RESUME / BACKGROUND ---\n${resumeText.substring(0, 3000)}\n--- END RESUME ---\n\nIMPORTANT: Use the above resume details to personalize ALL answers. Reference MY actual companies, projects, technologies, certifications, and years of experience from the resume. Answer as if YOU are this person in a real interview.`;
  }

  const enforced = cleanPrompt + resumeContext + `\n\n` +
    `CRITICAL — YOU MUST FOLLOW THIS EXACT ANSWER STYLE:

1. FIRST PERSON ALWAYS: "I built", "In my project", "I used" — you ARE the candidate
2. FIRST SENTENCE = THE ANSWER. No warm-up, no "So basically..."
3. REAL PROJECT EXAMPLES ONLY: Use domains like insurance, e-commerce, banking, healthcare. Use class names like BaseEntity, NotificationService, ClaimsService, CustomerRepository. NEVER use Vehicle/Car, Animal/Dog, Shape/Circle
4. ANSWER ORDER — ALWAYS follow this EXACT sequence, no exceptions:
   🎯 Simple Interview Answer (30 Seconds)  ← FIRST ALWAYS
   🟢 Real Project Usage  ← SECOND (most impressive)
   🔴 Interview Point / Must Remember  ← THIRD (senior thinking)
   🔵 Definition / Main Concept
   🟠 Advantages / Benefits
   ✅ Best Practice
5. Use bullet points (•) for listing items under each section
6. CODE BLOCKS: Use \`\`\`csharp for C# code examples
7. TRADE-OFF: Include in BOTH Simple Answer AND Interview Point section
8. NUMBERS: "reduced by 40%", "handled 5k req/sec", "cut from 12s to 800ms" — Real Project section must have at least one number
9. NATURAL SPEECH: Like you're talking to the interviewer across a table. NO textbook/Wikipedia tone
10. SPEECH CORRECTION: Questions may come from speech-to-text and contain misspelled words. ALWAYS auto-correct the question first. Examples: "Ingeretans" → "Inheritance", "polymorfism" → "Polymorphism", "dependensy injection" → "Dependency Injection", "enity framework" → "Entity Framework". Figure out the ACTUAL intended technical term, then answer THAT topic. NEVER answer the misspelled word literally
11. BANNED PHRASES — NEVER use these, ever:
    ❌ "If required, I can also explain..."
    ❌ "If needed, I can draw the execution flow..."
    ❌ "As per my knowledge..."
    ❌ "To the best of my knowledge..."
    ❌ "Hope this helps"
    ❌ "Feel free to ask"
    — Simple Answer must end with a TRADE-OFF or IMPACT line. Never with an offer to explain more.
12. COMPILE-TIME vs RUNTIME: For any question involving Overloading, Overriding, or Polymorphism — ALWAYS include this distinction as a table in 🔴 Interview Point section:
    • Overloading → Compile-time (compiler picks method by parameters)
    • Overriding → Runtime (object type decides which method runs)`;

  const msgs = [{ role: 'system', content: enforced }];

  // Few-shot: Method Overloading example demonstrating exact 6-section format & comparison table
  {
    msgs.push(
      { role: 'user', content: 'What is method overloading?' },
      {
        role: 'assistant', content: `🎯 Simple Interview Answer (30 Seconds)

Method Overloading is when multiple methods in the same class have the same name but different parameters. In my project, I overloaded a method in the NotificationService to send notifications via SMS, Email, or Push by varying parameters. Trade-off: too many overloads can confuse — I limit to 3-4 overloads max.

🟢 Real Project Usage

In the Mobile Device Protection Platform, the NotificationService had overloaded methods for different notification channels:

\`\`\`csharp
public class NotificationService
{
    public void SendNotification(string message, string email) { /* Email logic */ }
    public void SendNotification(string message, string phoneNumber, bool isSMS) { /* SMS logic */ }
    public void SendNotification(string message, string deviceToken, bool isPush) { /* Push logic */ }
}
\`\`\`

Handled 10,000+ user notifications monthly with 99.8% reliability.

🔴 Interview Point / Must Remember

• Overloading → Compile-time polymorphism (compiler picks method by parameters)
• Overloading improves code readability by using same method name for similar actions
• Too many overloads can lead to ambiguity — keep it clear and intuitive

| Concept | Binding | Explanation |
|---|---|---|
| Overloading | Compile-time | Compiler chooses based on parameter signature |
| Overriding | Runtime | Object type at runtime determines method execution |

🔵 Definition / Main Concept

Method Overloading allows defining multiple methods with the same name but different parameter lists, improving code organization and readability.

🟠 Advantages / Benefits

• Code clarity by grouping similar operations
• Reduced method names — easier to remember and use
• Flexibility in method usage based on parameter needs

✅ Best Practice

• Ensure each overload has a distinct parameter signature
• Avoid excessive overloads to prevent confusion and maintain clarity` }
    );
  }

  msgs.push(...conversationHistory);
  return msgs;
}




// ⚡ GROQ (Free + Instant)
async function callGroq(thinkingEl) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`
    },
    body: JSON.stringify({
      model: groqModel,
      messages: buildMessages(),
      max_tokens: 1200, temperature: 0.6, stream: true
    })
  });

  if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message || 'Groq error ' + response.status); }
  return streamOpenAIFormat(response, thinkingEl, 'Groq ⚡');
}

// ✨ GEMINI
async function callGemini(thinkingEl) {
  // Use buildMessages() to get enforced rules + few-shot examples (same as Groq/OpenAI)
  const allMessages = buildMessages();

  // Extract system message for Gemini's system_instruction
  const systemMsg = allMessages.find(m => m.role === 'system');
  const nonSystemMsgs = allMessages.filter(m => m.role !== 'system');

  // Convert OpenAI format → Gemini format
  // Bug #2 Fix: Gemini requires strictly alternating user/model turns
  // Collapse consecutive same-role messages to prevent 400 errors
  const rawContents = nonSystemMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const contents = rawContents.reduce((acc, cur) => {
    if (acc.length > 0 && acc[acc.length - 1].role === cur.role) {
      // Merge consecutive same-role turns into one
      acc[acc.length - 1].parts[0].text += '\n' + cur.parts[0].text;
    } else {
      acc.push(cur);
    }
    return acc;
  }, []);
  // Gemini must start with 'user'
  if (contents.length > 0 && contents[0].role !== 'user') contents.shift();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemMsg ? systemMsg.content : SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1200 }
      })
    }
  );

  if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message || 'Gemini error ' + response.status); }

  const row = addAnswerCard(thinkingEl);
  const card = row.querySelector('.answer-card');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          const token = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (token) { full += token; updateCard(card, full); }
        } catch (_) { }
      }
    }
  }
  card.classList.remove('streaming');
  return full;
}

// 💳 OPENAI
async function callOpenAI(thinkingEl) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: openaiModel,
      messages: buildMessages(),
      max_tokens: 1200, temperature: 0.6, stream: true
    })
  });

  if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message || 'OpenAI error ' + response.status); }
  return streamOpenAIFormat(response, thinkingEl, 'GPT');
}

async function streamOpenAIFormat(response, thinkingEl, tag) {
  const row = addAnswerCard(thinkingEl);
  const card = row.querySelector('.answer-card');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const token = data.choices?.[0]?.delta?.content || '';
          if (token) { full += token; updateCard(card, full); }
        } catch (_) { }
      }
    }
  }
  card.classList.remove('streaming');
  return full;
}

function updateCard(card, text) {
  // B: In teleprompter — strip emoji section-title lines (waste of space)
  let displayText = text;
  if (isTeleprompterMode) {
    displayText = text
      .split('\n')
      .filter(line => {
        const t = line.trim();
        if (!t) return true; // keep blank lines
        // Strip known section title lines (with or without emoji prefix)
        const sectionKeywords = [
          'Simple Interview Answer',
          'Real Project Usage',
          'Interview Point',
          'Must Remember',
          'Definition / Main Concept',
          'Advantages',
          'Benefits',
          'Best Practice',
          'Trade-off',
          'Key Point',
        ];
        // Match: optional #s + optional emoji + keyword
        const stripped = t.replace(/^#+\s*/, '').replace(/^\p{Emoji}\s*/u, '').trim();
        if (sectionKeywords.some(k => stripped.toLowerCase().startsWith(k.toLowerCase()))) return false;
        return true;
      })
      .join('\n');
  }

  const html = renderMarkdown(displayText);
  card.innerHTML = html;
  // Bug #1 Fix: throttle scrollIntoView with RAF to prevent streaming jitter
  if (isTeleprompterMode && !card._scrollPending) {
    card._scrollPending = true;
    requestAnimationFrame(() => {
      card.parentElement?.scrollIntoView({ behavior: 'instant', block: 'start' });
      card._scrollPending = false;
    });
  }
}

// ─── Markdown Renderer ───
function renderMarkdown(text) {
  if (!text) return '';
  // Normalize line endings first
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 1: Extract code blocks BEFORE HTML escaping
  const codeBlocks = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang.trim(), code: code.trim() });
    return `\n\n%%CODEBLOCK_${idx}%%\n\n`;
  });

  // Step 2: Extract and parse Markdown Tables BEFORE HTML escaping
  const tables = [];
  const tableBlockRegex = /((?:^\|[^\n]+\|\n?)+)/gm;
  text = text.replace(tableBlockRegex, (match) => {
    const lines = match.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;
    const headerCells = lines[0].split('|').slice(1, -1).map(c => c.trim());
    const dataLines = lines.slice(1).filter(l => !l.replace(/[\s|:-]/g, '').length === 0 && !l.includes('---'));
    
    let tableHtml = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
    headerCells.forEach(h => { tableHtml += `<th>${escapeHtml(h)}</th>`; });
    tableHtml += '</tr></thead><tbody>';
    
    dataLines.forEach(row => {
      const cells = row.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length > 0 && !cells.every(c => c.replace(/[-:]/g, '') === '')) {
        tableHtml += '<tr>';
        cells.forEach(cell => { tableHtml += `<td>${escapeHtml(cell)}</td>`; });
        tableHtml += '</tr>';
      }
    });
    tableHtml += '</tbody></table></div>';
    const tIdx = tables.length;
    tables.push(tableHtml);
    return `\n\n%%TABLE_${tIdx}%%\n\n`;
  });

  // Helper for inline styles
  function formatInline(str) {
    let s = escapeHtml(str);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    s = s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" class="md-link" target="_blank" onclick="openExternalLink(event, \'$2\')">$1 ↗</a>');
    return s;
  }

  // Step 3: Split text into logical paragraph blocks
  const rawBlocks = text.split(/\n{2,}/);
  const processedBlocks = [];

  for (let block of rawBlocks) {
    block = block.trim();
    if (!block) continue;

    if (block.startsWith('%%CODEBLOCK_')) {
      processedBlocks.push(block);
      continue;
    }

    if (block.startsWith('%%TABLE_')) {
      processedBlocks.push(block);
      continue;
    }

    // Section Badge only line
    const badgeExact = block.match(/^(🎯|🟢|🔴|🔵|🟠|✅)\s*(.+)$/);
    if (badgeExact && !block.includes('\n')) {
      const emoji = badgeExact[1];
      const title = badgeExact[2];
      let bClass = 'section-target';
      if (emoji === '🟢') bClass = 'section-green';
      else if (emoji === '🔴') bClass = 'section-red';
      else if (emoji === '🔵') bClass = 'section-blue';
      else if (emoji === '🟠') bClass = 'section-orange';
      else if (emoji === '✅') bClass = 'section-check';
      processedBlocks.push(`<div class="section-badge ${bClass}">${emoji} ${escapeHtml(title)}</div>`);
      continue;
    }

    // Markdown Headers
    if (block.startsWith('### ')) {
      processedBlocks.push(`<div class="md-h3">${formatInline(block.slice(4))}</div>`);
      continue;
    }
    if (block.startsWith('## ')) {
      processedBlocks.push(`<div class="md-h2">${formatInline(block.slice(3))}</div>`);
      continue;
    }

    // List items block
    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const isList = blockLines.every(l => /^[-*•\d.]\s+/.test(l));
    if (isList) {
      let listHtml = '<div class="md-list-group">';
      blockLines.forEach(l => {
        const bulletMatch = l.match(/^[-*•]\s+(.*)$/);
        const numMatch = l.match(/^(\d+\.)\s+(.*)$/);
        if (bulletMatch) {
          listHtml += `<div class="md-list-item"><span class="md-list-bullet">•</span><span>${formatInline(bulletMatch[1])}</span></div>`;
        } else if (numMatch) {
          listHtml += `<div class="md-list-item"><span class="md-list-num">${numMatch[1]}</span><span>${formatInline(numMatch[2])}</span></div>`;
        } else {
          listHtml += `<div class="md-list-item">${formatInline(l)}</div>`;
        }
      });
      listHtml += '</div>';
      processedBlocks.push(listHtml);
      continue;
    }

    // Regular paragraph (join single accidental soft-wrap newlines so words flow smoothly)
    let pContent = block;
    let badgeHtml = '';
    const badgeAtTop = pContent.match(/^(🎯|🟢|🔴|🔵|🟠|✅)\s*([^\n]+)\n([\s\S]*)$/);
    if (badgeAtTop) {
      const emoji = badgeAtTop[1];
      const title = badgeAtTop[2];
      pContent = badgeAtTop[3];
      let bClass = 'section-target';
      if (emoji === '🟢') bClass = 'section-green';
      else if (emoji === '🔴') bClass = 'section-red';
      else if (emoji === '🔵') bClass = 'section-blue';
      else if (emoji === '🟠') bClass = 'section-orange';
      else if (emoji === '✅') bClass = 'section-check';
      badgeHtml = `<div class="section-badge ${bClass}">${emoji} ${escapeHtml(title)}</div>`;
    }

    const smoothP = pContent.split('\n').map(l => l.trim()).filter(Boolean).join(' ');
    processedBlocks.push(`${badgeHtml}<p class="md-p">${formatInline(smoothP)}</p>`);
  }

  let finalHtml = processedBlocks.join('');

  // Step 4: Re-insert code blocks
  finalHtml = finalHtml.replace(/%%CODEBLOCK_(\d+)%%/g, (match, idx) => {
    const { lang, code } = codeBlocks[parseInt(idx)];
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    const escaped = escapeHtml(code);
    return `<div class="code-block">${langLabel}<button class="code-copy-btn" onclick="copyCodeBlock(this)">📋 Copy</button><pre><code>${escaped}</code></pre></div>`;
  });

  // Step 5: Re-insert tables
  finalHtml = finalHtml.replace(/%%TABLE_(\d+)%%/g, (match, idx) => tables[parseInt(idx)] || '');

  return finalHtml;
}

function openExternalLink(e, url) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}
window.openExternalLink = openExternalLink;

function copyCodeBlock(btn) {
  const code = btn.closest('.code-block').querySelector('code').textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = '✅';
      setTimeout(() => btn.textContent = '📋', 2000);
    }).catch(() => fallbackCopy(code, btn));
  } else {
    fallbackCopy(code, btn);
  }
}
window.copyCodeBlock = copyCodeBlock;

// ─── Copy card ───
function copyCard(btn) {
  const card = btn.closest('.answer-card');
  // Clone and remove control elements to get clean text
  const clone = card.cloneNode(true);
  clone.querySelector('.answer-controls')?.remove();
  clone.querySelector('.quick-actions')?.remove();
  const text = clone.textContent.trim();

  // Try modern clipboard API first, fallback to execCommand
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
    }).catch(() => {
      fallbackCopy(text, btn);
    });
  } else {
    fallbackCopy(text, btn);
  }
}

function fallbackCopy(text, btn) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  btn.textContent = '✅ Copied!';
  setTimeout(() => btn.textContent = '📋 Copy', 2000);
}
window.copyCard = copyCard;

// ─── Error ───
function showError(msg) {
  const el = document.createElement('div');
  el.className = 'error-bubble';
  el.textContent = '⚠️ ' + msg;
  chatArea.appendChild(el);
  scrollBottom();
}

// ─── Helpers ───
function scrollBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:78px;left:50%;transform:translateX(-50%);
    background:#1e2433;border:1px solid rgba(139,92,246,0.4);color:#e8edf5;
    padding:7px 16px;border-radius:20px;font-size:12px;z-index:9999;white-space:nowrap;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ══════════════════════════════════════════════════
// ─── SYSTEM AUDIO CAPTURE (Interviewer Listener) ───
// ══════════════════════════════════════════════════

listenBtn.addEventListener('click', toggleSystemListen);

async function toggleSystemListen() {
  if (isSystemListening) {
    stopSystemListen();
  } else {
    await startSystemListen();
  }
}

async function startSystemListen() {
  const whisperKey = groqKey || apiKey;
  if (!whisperKey) {
    showError('Add API key in ⚙️ Settings to use system audio capture.');
    return;
  }

  try {
    // Get desktop audio source
    const sources = await window.electronAPI.getScreenSources();
    if (!sources || sources.length === 0) {
      showError('No screen source found for audio capture.');
      return;
    }

    // Capture system audio via desktopCapturer
    systemStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          maxWidth: 1,
          maxHeight: 1
        }
      }
    });

    // Remove video tracks — we only need audio
    systemStream.getVideoTracks().forEach(t => t.stop());
    const audioOnly = new MediaStream(systemStream.getAudioTracks());

    // Setup silence detection
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioOnly);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    // Start recording
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      .find(m => MediaRecorder.isTypeSupported(m)) || '';

    systemRecorder = new MediaRecorder(audioOnly, mimeType ? { mimeType } : {});
    systemChunks = [];
    systemRecordStart = Date.now();

    systemRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) systemChunks.push(e.data);
    };

    systemRecorder.onstop = async () => {
      const elapsed = Date.now() - systemRecordStart;
      if (elapsed < MIN_RECORDING_MS || systemChunks.length === 0) {
        // Too short — restart if still listening
        if (isSystemListening) restartSystemRecording();
        return;
      }
      await processSystemAudio();
    };

    systemRecorder.start(250);
    isSystemListening = true;
    listenBtn.classList.add('listening');
    liveTranscriptBar.style.display = 'flex';
    liveTranscriptTxt.textContent = '🎧 Listening to system audio...';
    setStatusBar('🎧 Listening to interviewer — speak detected auto-answer');
    showToast('🎧 System Audio ON — listening to interviewer');

    // Start silence monitoring
    monitorSilence();

  } catch (e) {
    console.error('System audio error:', e);
    // Bug #5 Fix: Detect Windows loopback failure specifically
    const isLoopbackError = e.name === 'NotAllowedError' || e.name === 'NotFoundError' ||
      (e.message && e.message.toLowerCase().includes('audio'));
    if (isLoopbackError) {
      showError(
        '⚠️ System audio capture needs a virtual audio cable on Windows.\n' +
        'Install VB-Audio Cable (free) OR use 🎤 Mic button to record your voice instead.'
      );
    } else {
      showError('System audio capture failed: ' + e.message);
    }
    stopSystemListen();
  }
}

function monitorSilence() {
  if (!isSystemListening || !analyser) return;

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;

  if (avg > SILENCE_THRESHOLD) {
    // Sound detected — reset silence timer
    silenceStart = null;
    liveTranscriptTxt.textContent = '🎧 Hearing speech...';
  } else {
    // Silence
    if (!silenceStart) {
      silenceStart = Date.now();
    } else if (Date.now() - silenceStart > SILENCE_DURATION) {
      // Silence long enough — process what we have
      const elapsed = Date.now() - systemRecordStart;
      if (elapsed > MIN_RECORDING_MS && systemChunks.length > 0) {
        silenceStart = null;
        if (systemRecorder && systemRecorder.state !== 'inactive') {
          systemRecorder.stop(); // triggers onstop → processSystemAudio
        }
        return; // don't schedule next frame
      }
    }
  }

  if (isSystemListening) {
    requestAnimationFrame(monitorSilence);
  }
}

function restartSystemRecording() {
  if (!isSystemListening || !systemStream) return;

  // Check if audio tracks are still alive
  const liveTracks = systemStream.getAudioTracks().filter(t => t.readyState === 'live');
  if (liveTracks.length === 0) {
    console.warn('System audio tracks ended — stopping listener');
    stopSystemListen();
    showError('System audio stream ended. Click 🎧 to restart.');
    return;
  }

  const audioOnly = new MediaStream(liveTracks);
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find(m => MediaRecorder.isTypeSupported(m)) || '';

  systemRecorder = new MediaRecorder(audioOnly, mimeType ? { mimeType } : {});
  systemChunks = [];
  systemRecordStart = Date.now();

  systemRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) systemChunks.push(e.data);
  };

  systemRecorder.onstop = async () => {
    const elapsed = Date.now() - systemRecordStart;
    if (elapsed < MIN_RECORDING_MS || systemChunks.length === 0) {
      if (isSystemListening) restartSystemRecording();
      return;
    }
    await processSystemAudio();
  };

  systemRecorder.start(250);
  silenceStart = null;
  monitorSilence();
}

async function processSystemAudio() {
  liveTranscriptTxt.textContent = '⏳ Transcribing interviewer...';

  try {
    const whisperKey = groqKey || apiKey;
    const mimeType = systemChunks[0]?.type || 'audio/webm';
    const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
    const audioBlob = new Blob(systemChunks, { type: mimeType });

    // Skip tiny blobs (noise)
    if (audioBlob.size < 5000) {
      if (isSystemListening) restartSystemRecording();
      return;
    }

    const formData = new FormData();
    formData.append('file', audioBlob, `system_audio.${ext}`);
    formData.append('model', groqKey ? 'whisper-large-v3' : 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    const apiUrl = groqKey
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${whisperKey}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Transcription failed');

    const transcript = data.text?.trim();

    if (!transcript || transcript.length < 5) {
      // Empty/noise — restart
      if (isSystemListening) restartSystemRecording();
      liveTranscriptTxt.textContent = '🎧 Listening...';
      return;
    }

    // Check if transcript is a question (not just chatter)
    liveTranscriptTxt.textContent = '🧠 Checking if question...';

    const isQuestion = await detectQuestion(transcript);

    if (isQuestion) {
      liveTranscriptBar.style.display = 'flex';
      liveTranscriptTxt.textContent = '✅ Question detected: ' + transcript.slice(0, 60) + '...';
      // Auto-answer!
      await askCrackit(transcript, { fromSpeech: true });
    } else {
      liveTranscriptTxt.textContent = '🎧 Not a question — still listening...';
    }

    // Restart listening
    if (isSystemListening) restartSystemRecording();

  } catch (e) {
    console.error('System audio process error:', e);
    liveTranscriptTxt.textContent = '🎧 Listening...';
    if (isSystemListening) restartSystemRecording();
  }
}

async function detectQuestion(transcript) {
  // Skip very short or filler
  if (transcript.length < 10) return false;
  const fillers = ['thank you', 'thanks', 'okay', 'ok', 'alright', 'hmm', 'um', 'uh', 'yeah', 'yes', 'no', 'hello', 'hi', 'bye'];
  if (fillers.some(f => transcript.toLowerCase().trim() === f)) return false;

  // Use Groq to detect if it's an interview question
  const whisperKey = groqKey || apiKey;
  const apiUrl = groqKey
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const fastModel = groqKey ? 'openai/gpt-oss-120b' : 'gpt-4o-mini';

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whisperKey}`
      },
      body: JSON.stringify({
        model: fastModel,
        messages: [
          {
            role: 'system',
            content: `You detect interview questions. Given a transcript from a conversation, determine if it contains a technical, coding, or interview question that needs an answer.
Reply ONLY with "YES" or "NO".
- YES: if it's a question about programming, technology, architecture, design patterns, SQL, .NET, algorithms, HR/behavioral, or any interview topic
- NO: if it's just chatter, greetings, filler words, instructions like "can you hear me", "let me share my screen", or non-question statements`
          },
          { role: 'user', content: transcript }
        ],
        max_tokens: 5,
        temperature: 0
      })
    });

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content?.trim()?.toUpperCase() || '';
    return answer.includes('YES');
  } catch {
    // If detection fails, assume it's a question if long enough
    return transcript.length > 30;
  }
}

function stopSystemListen() {
  isSystemListening = false;
  listenBtn.classList.remove('listening');

  if (systemRecorder && systemRecorder.state !== 'inactive') {
    systemRecorder.stop();
  }
  if (systemStream) {
    systemStream.getTracks().forEach(t => t.stop());
    systemStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
  silenceStart = null;
  systemChunks = [];

  liveTranscriptBar.style.display = 'none';
  setStatusBar('Press Mic button to start');
  showToast('🎧 System Audio OFF');
}




// ══════════════════════════════════════════════════
// ─── TTS (Text-to-Speech) ENGINE ───
// ══════════════════════════════════════════════════

function speakText(text) {
  // Stop any current speech
  stopSpeaking();

  // Clean text for speech (remove code artifacts, special chars)
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')    // remove code blocks
    .replace(/`[^`]+`/g, '')           // remove inline code
    .replace(/[#*_~]/g, '')            // remove markdown
    .replace(/\n{2,}/g, '. ')          // paragraph breaks → pauses
    .replace(/\n/g, ' ')              // newlines → spaces
    .replace(/\s{2,}/g, ' ')          // collapse whitespace
    .trim();

  if (!cleanText) return;

  currentUtterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance.rate = ttsSpeed;
  currentUtterance.pitch = 1.0;
  currentUtterance.volume = 1.0;

  // Try to pick a natural English voice
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Microsoft David') || v.name.includes('Google US'))
    || voices.find(v => v.lang === 'en-US' && v.localService)
    || voices.find(v => v.lang.startsWith('en'));
  if (preferred) currentUtterance.voice = preferred;

  currentUtterance.onstart = () => {
    isSpeaking = true;
    updateTTSButtons('speaking');
  };
  currentUtterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    updateTTSButtons('idle');
  };
  currentUtterance.onerror = () => {
    isSpeaking = false;
    currentUtterance = null;
    updateTTSButtons('idle');
  };

  speechSynthesis.speak(currentUtterance);
}

function stopSpeaking() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  isSpeaking = false;
  currentUtterance = null;
  updateTTSButtons('idle');
}

function toggleTTSBtn(btn) {
  if (isSpeaking) {
    // If speaking — stop
    stopSpeaking();
    btn.textContent = '🔊';
    btn.title = 'Read aloud';
  } else {
    // Get card text content, excluding buttons/controls
    const card = btn.closest('.answer-card');
    if (!card) return;
    const clone = card.cloneNode(true);
    clone.querySelector('.answer-controls')?.remove();
    clone.querySelector('.quick-actions')?.remove();
    const cardText = clone.textContent.trim();
    if (!cardText) return;
    speakText(cardText);
    btn.textContent = '⏹️';
    btn.title = 'Stop reading';
  }
}

function updateTTSButtons(state) {
  document.querySelectorAll('.tts-btn').forEach(btn => {
    if (state === 'speaking') {
      // Only update the last one (currently speaking)
    } else {
      btn.textContent = '🔊';
      btn.title = 'Read aloud';
    }
  });
}

// Expose for onclick
window.toggleTTSBtn = toggleTTSBtn;

// Load voices (some browsers load async)
speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

// ══════════════════════════════════════════════════
// ─── NEW FEATURES ───
// ══════════════════════════════════════════════════

// ─── Conversation History Persistence ───
function saveConversationHistory() {
  try {
    const historyData = {
      timestamp: Date.now(),
      history: conversationHistory.slice(-50) // Keep last 50 messages
    };
    localStorage.setItem('angel_chat_history', JSON.stringify(historyData));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

function loadConversationHistory() {
  try {
    const saved = localStorage.getItem('angel_chat_history');
    if (saved) {
      const { history, timestamp } = JSON.parse(saved);
      // Only restore if less than 7 days old
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        conversationHistory = history || [];
        // Rebuild chat UI
        history.forEach((msg, idx) => {
          if (msg.role === 'user') {
            addUserBubble(msg.content);
          } else if (msg.role === 'assistant') {
            const row = document.createElement('div');
            row.className = 'message-row';
            row.innerHTML = `
              <div class="answer-wrap">
                <div class="angel-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L8 8H4L7 13L5 20L12 17L19 20L17 13L20 8H16L12 2Z" fill="#8b5cf6"/>
                  </svg>
                </div>
                <div class="answer-card">
                  ${escapeHtml(msg.content).replace(/`([^`]+)`/g, '<code>$1</code>')}
                </div>
              </div>`;
            chatArea.appendChild(row);
          }
        });
        showToast('💬 Chat history restored');
      }
    }
  } catch (e) {
    console.error('Failed to load history:', e);
  }
}

// Auto-save after each message
const originalAskCrackit = askCrackit;
askCrackit = async function (question, options) {
  await originalAskCrackit.call(this, question, options);
  saveConversationHistory();
};

// ─── Offline Mode Detection ───
function updateOnlineStatus() {
  isOffline = !navigator.onLine;
  if (isOffline) {
    showError('🌐 You are offline. Answers will be queued.');
    setStatusBar('⚠️ Offline — requests queued');
  } else {
    setStatusBar('Press Mic button to start');
    processRetryQueue();
  }
}

window.addEventListener('online', () => {
  updateOnlineStatus();
  showToast('🌐 Back online!');
});
window.addEventListener('offline', () => {
  updateOnlineStatus();
});

function processRetryQueue() {
  while (retryQueue.length > 0 && !isOffline) {
    const req = retryQueue.shift();
    askCrackit(req.question);
  }
}

// ─── Sound Notifications (placeholder for future use) ───
// To enable: call playBeep(frequency, duration) from recording events
function playBeep(frequency, duration) {
  if (!localStorage.getItem('angel_sound_enabled')) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    console.error('Audio error:', e);
  }
}

// ─── API Key Validation ───
async function validateApiKey(provider, key) {
  try {
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      return res.ok;
    } else if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return res.ok;
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      return res.ok;
    }
  } catch (e) {
    return false;
  }
  return false;
}

// ─── Enhanced Error Handling with Retry ───
function showErrorWithRetry(msg, retryFn) {
  const el = document.createElement('div');
  el.className = 'error-bubble';
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <span>⚠️ ${escapeHtml(msg)}</span>
      ${retryFn && retryCount < MAX_RETRY ? `<button class="retry-btn" style="padding:4px 10px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;">🔄 Retry</button>` : ''}
    </div>`;
  chatArea.appendChild(el);
  scrollBottom();

  if (retryFn && retryCount < MAX_RETRY) {
    el.querySelector('.retry-btn')?.addEventListener('click', () => {
      retryCount++;
      el.remove();
      retryFn();
    });
  }
}

// ─── Answer History Search ───
function searchHistory(query) {
  const results = [];
  conversationHistory.forEach((msg, idx) => {
    if (msg.role === 'assistant' && msg.content.toLowerCase().includes(query.toLowerCase())) {
      results.push({ index: idx, content: msg.content });
    }
  });
  return results;
}

// ─── Version Check (disabled — configure your repo URL first) ───
const APP_VERSION = '1.0.0';
async function checkForUpdates() {
  // TODO: Replace with your actual GitHub repo URL
  // const res = await fetch('https://api.github.com/repos/YOUR_USERNAME/crack-it/releases/latest');
  return;
}

// ─── Audio Device Management ───
async function loadAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    audioDevices = devices.filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput');
  } catch (e) {
    console.error('Failed to enumerate devices:', e);
  }
}

// ─── Window Position Persistence ───
function saveWindowBounds(bounds) {
  localStorage.setItem('angel_window_bounds', JSON.stringify(bounds));
}

// ─── Populate Audio Devices ───
async function populateAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    micSelect.innerHTML = '<option value="">Default Microphone</option>';
    speakerSelect.innerHTML = '<option value="">Default Speaker</option>';
    devices.forEach(d => {
      if (d.kind === 'audioinput') {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `Microphone (${d.deviceId.slice(0, 8)})`;
        if (d.deviceId === selectedMicId) opt.selected = true;
        micSelect.appendChild(opt);
      } else if (d.kind === 'audiooutput') {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `Speaker (${d.deviceId.slice(0, 8)})`;
        if (d.deviceId === selectedSpeakerId) opt.selected = true;
        speakerSelect.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('Failed to populate audio devices:', e);
  }
}

// ─── Populate Screen Sources ───
async function populateScreenSources() {
  if (!window.electronAPI) return;
  try {
    const sources = await window.electronAPI.getScreenSources();
    screenSelect.innerHTML = '';
    sources.forEach(source => {
      const opt = document.createElement('option');
      opt.value = source.id;
      opt.textContent = source.name;
      if (source.id === selectedScreenId) opt.selected = true;
      screenSelect.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to populate screen sources:', e);
  }
}

// ─── Audio Visualizer ───
function drawVisualizer(analyserNode) {
  if (!analyserNode || !visCtx) return;
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength); // FIX: Created once, reused every frame
  // FIX: Cache accent color ONCE — not 60x/sec inside loop!
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6';
  function draw() {
    if (!isListening && !isSystemListening) {
      visCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
      return;
    }
    visualizerAnimation = requestAnimationFrame(draw);
    analyserNode.getByteFrequencyData(dataArray);
    visCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
    const barWidth = (audioVisualizer.width / bufferLength) * 2.5;
    let x = 0;
    visCtx.fillStyle = accentColor; // FIX: Use cached color — zero DOM reads per frame
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * audioVisualizer.height;
      visCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }
  if (visualizerAnimation) cancelAnimationFrame(visualizerAnimation);
  draw();
}

// ─── Crop Modal Logic ───
let cropImage = new Image();
let cropCtx = cropCanvas ? cropCanvas.getContext('2d') : null;
let cropStartX = 0, cropStartY = 0, cropEndX = 0, cropEndY = 0, isCropDrawing = false;

if (cropCanvas) {
  cropCanvas.addEventListener('mousedown', (e) => {
    const rect = cropCanvas.getBoundingClientRect();
    const scaleX = cropCanvas.width / rect.width;
    const scaleY = cropCanvas.height / rect.height;
    cropStartX = (e.clientX - rect.left) * scaleX;
    cropStartY = (e.clientY - rect.top) * scaleY;
    isCropDrawing = true;
  });

  cropCanvas.addEventListener('mousemove', (e) => {
    if (!isCropDrawing) return;
    const rect = cropCanvas.getBoundingClientRect();
    const scaleX = cropCanvas.width / rect.width;
    const scaleY = cropCanvas.height / rect.height;
    cropEndX = (e.clientX - rect.left) * scaleX;
    cropEndY = (e.clientY - rect.top) * scaleY;
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(cropImage, 0, 0);
    cropCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    const drawX = Math.min(cropStartX, cropEndX);
    const drawY = Math.min(cropStartY, cropEndY);
    const drawW = Math.abs(cropStartX - cropEndX);
    const drawH = Math.abs(cropStartY - cropEndY);
    cropCtx.clearRect(drawX, drawY, drawW, drawH);
    cropCtx.drawImage(cropImage, drawX, drawY, drawW, drawH, drawX, drawY, drawW, drawH);
    cropCtx.strokeStyle = '#8b5cf6';
    cropCtx.lineWidth = 3;
    cropCtx.strokeRect(drawX, drawY, drawW, drawH);
  });

  cropCanvas.addEventListener('mouseup', () => { isCropDrawing = false; });
}

if (cancelCropBtn) {
  cancelCropBtn.addEventListener('click', () => {
    cropModal.style.display = 'none';
    setStatusBar('Press Mic button to start');
  });
}

if (performCropOcrBtn) {
  performCropOcrBtn.addEventListener('click', async () => {
    const drawX = Math.round(Math.min(cropStartX, cropEndX));
    const drawY = Math.round(Math.min(cropStartY, cropEndY));
    const drawW = Math.round(Math.abs(cropStartX - cropEndX));
    const drawH = Math.round(Math.abs(cropStartY - cropEndY));
    if (drawW < 10 || drawH < 10) {
      showToast('Draw a selection area first');
      return;
    }
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = drawW;
    croppedCanvas.height = drawH;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(cropImage, drawX, drawY, drawW, drawH, 0, 0, drawW, drawH);
    const croppedDataUrl = croppedCanvas.toDataURL('image/png');
    cropModal.style.display = 'none';
    await analyzeScreenshot(croppedDataUrl);
  });
}

// ─── Quick Actions ───
async function triggerQuickAction(btn, type) {
  const card = btn.closest('.answer-card');
  const clone = card.cloneNode(true);
  clone.querySelector('.answer-controls')?.remove();
  clone.querySelector('.quick-actions')?.remove();
  clone.querySelector('.think-block')?.remove();
  const originalText = clone.textContent.trim();
  let query = '';
  if (type === 'shorter') {
    query = `Rephrase this answer in exactly 1-2 sentences max. Speak as the candidate:\n\n${originalText}`;
  } else if (type === 'code') {
    query = `Write a clean, production-ready C# code sample illustrating the concept. Minimal comments:\n\n${originalText}`;
  } else if (type === 'star') {
    query = `Reframe this into a first-person STAR story (Situation, Task, Action, Result) as a senior developer:\n\n${originalText}`;
  }
  await askCrackit(query);
}
window.triggerQuickAction = triggerQuickAction;

function injectQuickActions(card) {
  if (card.querySelector('.quick-actions')) return;
  const qa = document.createElement('div');
  qa.className = 'quick-actions';
  qa.innerHTML = `
    <button class="action-btn" onclick="triggerQuickAction(this, 'shorter')">📋 Shorter</button>
    <button class="action-btn" onclick="triggerQuickAction(this, 'code')">💻 Code Sample</button>
    <button class="action-btn" onclick="triggerQuickAction(this, 'star')">📚 STAR Story</button>
  `;
  card.appendChild(qa);
}

// ─── Ollama Client ───
async function callOllama(thinkingEl) {
  const response = await fetch(`${ollamaEndpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      messages: buildMessages(),
      stream: true
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Ollama error ' + response.status + ': ' + errText);
  }
  return streamOpenAIFormat(response, thinkingEl, 'Ollama');
}

// ─── Interactive Start Tour System ───
const TOUR_STEPS = [
  {
    icon: '🎙️',
    title: 'Voice-to-Answer',
    desc: 'Press Spacebar once to start listening, speak your question, and press Spacebar again to stop and receive an instant expert answer!',
    hotkey: 'SPACEBAR or CTRL+M'
  },
  {
    icon: '📸',
    title: 'Screen Question OCR',
    desc: 'Capture any coding problem, MCQ, or architecture diagram on your screen. Crack It automatically extracts the text and solves it in real time!',
    hotkey: 'CTRL+SHIFT+S or Camera Icon'
  },
  {
    icon: '📺',
    title: 'Teleprompter Mode',
    desc: 'Transforms Crack It into a slim, transparent ribbon right below your webcam. Read answers effortlessly while maintaining eye contact with the interviewer!',
    hotkey: 'CTRL+P or TV Icon'
  },
  {
    icon: '📄',
    title: 'Resume Personalization',
    desc: 'Upload your PDF resume in Settings. Crack It automatically customizes all answers using your real projects, skills, companies, and experience!',
    hotkey: '⚙️ Settings → Resume Upload'
  },
  {
    icon: '🛡️',
    title: 'Screen Share Invisibility',
    desc: 'Crack It uses hardware-level window protection. It is completely invisible to Zoom, MS Teams, Google Meet, and screen sharing tools!',
    hotkey: 'Always Active + Toggle Hide'
  }
];

let currentTourIndex = 0;
const tourModal = document.getElementById('tourModal');
const tourStepBadge = document.getElementById('tourStepBadge');
const tourIcon = document.getElementById('tourIcon');
const tourTitle = document.getElementById('tourTitle');
const tourDesc = document.getElementById('tourDesc');
const tourHotkey = document.getElementById('tourHotkey');
const tourDots = document.getElementById('tourDots');
const tourPrevBtn = document.getElementById('tourPrevBtn');
const tourNextBtn = document.getElementById('tourNextBtn');
const tourCloseBtn = document.getElementById('tourCloseBtn');
const startTourBtn = document.getElementById('startTourBtn');
const welcomeTourLink = document.getElementById('welcomeTourLink');

function startTour() {
  currentTourIndex = 0;
  if (tourModal) tourModal.style.display = 'flex';
  if (settingsPanel) settingsPanel.style.display = 'none';
  if (helpPanel) helpPanel.style.display = 'none';
  renderTourStep();
}

function renderTourStep() {
  const step = TOUR_STEPS[currentTourIndex];
  if (!step) return;

  if (tourStepBadge) tourStepBadge.textContent = `Step ${currentTourIndex + 1} of ${TOUR_STEPS.length}`;
  if (tourIcon) tourIcon.textContent = step.icon;
  if (tourTitle) tourTitle.textContent = step.title;
  if (tourDesc) tourDesc.textContent = step.desc;
  if (tourHotkey) tourHotkey.textContent = step.hotkey;

  // Render dots
  if (tourDots) {
    tourDots.innerHTML = TOUR_STEPS.map((_, i) => 
      `<span class="tour-dot ${i === currentTourIndex ? 'active' : ''}"></span>`
    ).join('');
  }

  // Button labels & visibility
  if (tourPrevBtn) {
    tourPrevBtn.style.display = currentTourIndex > 0 ? 'inline-block' : 'none';
  }
  if (tourNextBtn) {
    tourNextBtn.textContent = currentTourIndex === TOUR_STEPS.length - 1 ? 'Get Started 🚀' : 'Next ➔';
  }
}

function nextTourStep() {
  if (currentTourIndex < TOUR_STEPS.length - 1) {
    currentTourIndex++;
    renderTourStep();
  } else {
    finishTour();
  }
}

function prevTourStep() {
  if (currentTourIndex > 0) {
    currentTourIndex--;
    renderTourStep();
  }
}

function finishTour() {
  if (tourModal) tourModal.style.display = 'none';
  localStorage.setItem('crackit_tour_completed', 'true');
  showToast('🎉 You are ready to crack your interview!');
}

if (tourNextBtn) tourNextBtn.addEventListener('click', nextTourStep);
if (tourPrevBtn) tourPrevBtn.addEventListener('click', prevTourStep);
if (tourCloseBtn) tourCloseBtn.addEventListener('click', finishTour);
if (startTourBtn) startTourBtn.addEventListener('click', startTour);
if (welcomeTourLink) {
  welcomeTourLink.addEventListener('click', (e) => {
    e.preventDefault();
    startTour();
  });
}

// ─── Initialize New Features ───
function initNewFeatures() {
  // Load conversation history
  loadConversationHistory();

  // Check online status
  updateOnlineStatus();

  // Load audio devices
  loadAudioDevices();

  // Check for updates (once per session)
  setTimeout(checkForUpdates, 5000);
}

// ─── Start ───
init();
initNewFeatures();
