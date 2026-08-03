// ═══════════════════════════════════════════════════════════════
// ANGEL INTERVIEW AI — RENDERER v3
// Chat Bubble UI + Live Mic Transcription + Auto Submit
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PROMPT = `You are my Senior .NET Full Stack Developer Interview Brain — my personal speaking assistant with 11+ years of hands-on experience.

IDENTITY & VOICE:
• Always answer as ME — the candidate speaking directly to the interviewer
• Speak in first person ("I built...", "In my project...", "I used...")
• Tone: calm, confident, senior-level — never nervous, never over-formal
• Sound like a real engineer who has shipped production code
• No AI disclaimers. No "As a language model..." responses
• Never say "Great question!" or use filler phrases

MY TECH STACK:
• Backend   → .NET Core 6/8, ASP.NET Web API, C#, Entity Framework Core
• Frontend  → React, Angular, TypeScript, HTML/CSS
• Database  → SQL Server, stored procedures, query optimization
• Cloud     → Azure (App Service, Service Bus, Key Vault, Blob Storage, Functions)
• DevOps    → Azure DevOps, CI/CD pipelines, Git
• Patterns  → Clean Architecture, CQRS, Repository, Microservices
• Auth      → JWT, OAuth2, Azure AD B2C
• Testing   → xUnit, NUnit, Moq

ANSWER STRUCTURE (use this EXACT order for EVERY answer — no exceptions):

🎯 Simple Interview Answer (30 Seconds)  ← ALWAYS FIRST
[3-4 sentences: Definition in 1 line + Real project example + Trade-off. Speak like you're answering live.]

🟢 Real Project Usage  ← MOST IMPORTANT SECTION (2nd)
[Specific example: module name, class name, result with numbers. This is what impresses most.]

🔴 Interview Point / Must Remember  ← SENIOR THINKING (3rd)
[Trade-off, senior-level insight, what NOT to do — this shows experience]

🔵 Definition / Main Concept
[What it is — 1-2 sentences, clear and direct]

🟠 Advantages / Benefits
[3-4 bullet points — practical, not textbook]

✅ Best Practice
[Code snippet in a csharp code block OR one powerful rule]

SMART RULES:
✅ Simple Answer FIRST — always. Interviewer attention captured in first 30 seconds.
✅ Real Project SECOND — this is what impresses interviewers most
✅ Interview Point THIRD — trade-offs show senior thinking
✅ Definition, Advantages, Best Practice come AFTER the top 3

COMMANDS: "shorter" | "longer" | "example" | "rephrase" | "rapid fire" | "deep dive" | "HR mode"

FORMAT: Use the emoji-header structure above. Use bullet points (•) for lists. Use \`\`\`csharp for code blocks. Write in first person as if speaking to the interviewer.`;

// ─── Prompt Version Control ───
const PROMPT_VERSION = 'v5.0';
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
  providerSelect.value = provider;
  groqKeyInput.value = groqKey ? '••••••••••••••••' : '';
  groqModelSelect.value = groqModel;
  geminiKeyInput.value = geminiKey ? '••••••••••••••••' : '';
  geminiModelSelect.value = geminiModel;
  apiKeyInput.value = apiKey ? '••••••••••••••••' : '';
  modelSelect.value = openaiModel;

  ollamaEndpointInput.value = ollamaEndpoint;
  ollamaModelSelect.value = ollamaModel;
  speechVocabularyInput.value = speechVocabulary;
  snippetModeToggle.checked = snippetMode;

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

// ─── Provider UI ───
function toggleProviderUI(p) {
  groqSection.style.display = p === 'groq' ? 'block' : 'none';
  geminiSection.style.display = p === 'gemini' ? 'block' : 'none';
  openaiSection.style.display = p === 'openai' ? 'block' : 'none';
  ollamaSection.style.display = p === 'ollama' ? 'block' : 'none';
}
providerSelect.addEventListener('change', () => toggleProviderUI(providerSelect.value));

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
  provider = providerSelect.value;
  localStorage.setItem('angel_provider', provider);

  const nGroq = groqKeyInput.value.trim();
  if (nGroq && !nGroq.startsWith('•')) { groqKey = nGroq; localStorage.setItem('angel_groq_key', groqKey); }
  groqModel = groqModelSelect.value; localStorage.setItem('angel_groq_model', groqModel);

  const nGemini = geminiKeyInput.value.trim();
  if (nGemini && !nGemini.startsWith('•')) { geminiKey = nGemini; localStorage.setItem('angel_gemini_key', geminiKey); }
  geminiModel = geminiModelSelect.value; localStorage.setItem('angel_gemini_model', geminiModel);

  const nOAI = apiKeyInput.value.trim();
  if (nOAI && !nOAI.startsWith('•')) { apiKey = nOAI; localStorage.setItem('angel_api_key', apiKey); }
  openaiModel = modelSelect.value; localStorage.setItem('angel_model', openaiModel);

  // Ollama settings
  ollamaEndpoint = ollamaEndpointInput.value.trim() || 'http://localhost:11434';
  localStorage.setItem('angel_ollama_endpoint', ollamaEndpoint);
  ollamaModel = ollamaModelSelect.value;
  localStorage.setItem('angel_ollama_model', ollamaModel);

  // Audio & capture settings
  speechVocabulary = speechVocabularyInput.value.trim();
  localStorage.setItem('angel_speech_vocabulary', speechVocabulary);
  snippetMode = snippetModeToggle.checked;
  localStorage.setItem('angel_snippet_mode', snippetMode);
  selectedScreenId = screenSelect.value;
  localStorage.setItem('angel_screen_id', selectedScreenId);
  selectedMicId = micSelect.value;
  localStorage.setItem('angel_mic_id', selectedMicId);
  selectedSpeakerId = speakerSelect.value;
  localStorage.setItem('angel_speaker_id', selectedSpeakerId);

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
    'forest': '🌿 Forest'
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
  const isTextInput = tag === 'textarea' || (tag === 'input' && document.activeElement.id === 'manualInput');

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

  // Escape: Close all panels
  if (e.key === 'Escape') {
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

  // Ctrl+C: Copy last answer (when not in text input)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isTextInput) {
    e.preventDefault();
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
      copyCard(copyBtn);
      return;
    }
  }

  // Ctrl+G: Toggle transparent/glass mode
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
    e.preventDefault();
    toggleGlassMode();
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

  // Spacebar = Toggle-to-Talk (only if not in text input)
  // Press once to start listening, press again to stop and generate answer
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
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
    liveTranscriptBar.style.display = 'flex';
    liveTranscriptTxt.textContent = '🎙️ Listening...';
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

  speechRecognition.onerror = (event) => {
    console.warn('SpeechRecognition error:', event.error);
    // If it's a "no-speech" error, just keep going
    if (event.error === 'no-speech' || event.error === 'aborted') return;
  };

  speechRecognition.onend = () => {
    // Auto-restart if still listening (recognition can stop unexpectedly)
    if (isListening && speechRecognition) {
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
    return;
  }

  // Show final text in normal color, interim text in dimmer color
  let display = '🎙️ ';
  if (finalText) {
    display += `<span class="transcript-final">${finalText}</span>`;
  }
  if (interimText) {
    display += `<span class="transcript-interim">${interimText}</span>`;
  }
  liveTranscriptTxt.innerHTML = display;

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

  // Show final captured transcript while processing
  const capturedText = (liveTranscript + ' ' + interimTranscript).trim();
  if (capturedText) {
    liveTranscriptTxt.innerHTML = '⏳ "' + capturedText + '"';
  } else {
    liveTranscriptTxt.textContent = '⏳ Transcribing...';
  }
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
      // Auto-submit!
      await askCrackit(transcript, { fromSpeech: true });
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

    // Step 2: Send raw OCR to Groq — AI extracts the clean interview question
    liveTranscriptTxt.textContent = '🧠 Finding the question...';

    const whisperKey = groqKey || apiKey;
    if (!whisperKey) {
      // No key — just pass raw text
      liveTranscriptBar.style.display = 'none';
      await askCrackit(rawText.replace(/\s+/g, ' ').trim().slice(0, 300));
      return;
    }

    const apiUrl = groqKey
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const fastModel = groqKey ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

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
            content: `You extract interview/coding questions from messy OCR text scraped from a computer screen.
The OCR text contains garbage: taskbar text, file names, status bars, browser tabs, random symbols like ® © ° @ #, timestamps, window titles.

Your job: Extract the COMPLETE question with ALL its parts.

CRITICAL RULES:
- Return the FULL question including ALL parts: the main question, examples, sample inputs/outputs, constraints, and instructions like "write a C# program" or "use only 1 loop"
- Keep array examples intact: [2,5,6,9,6,7,3,7]
- Keep code requirements: "write a program", "implement in C#", "use LINQ"
- If question has multiple lines/parts, include ALL of them
- Clean up OCR artifacts (broken words, random symbols) but keep the question content complete
- Do NOT summarize or shorten — return the exact full question as written
- If truly no question found, return exactly: NO_QUESTION_FOUND
- Return ONLY the extracted question text — no explanations, no labels, no "The question is:"`
          },
          {
            role: 'user',
            content: `Extract the COMPLETE interview/coding question from this OCR text. Include ALL parts — examples, constraints, and instructions:\n\n${rawText.slice(0, 4000)}`
          }
        ],
        max_tokens: 500,
        temperature: 0
      })

    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const extracted = data.choices?.[0]?.message?.content?.trim() || '';

    liveTranscriptBar.style.display = 'none';

    if (!extracted || extracted === 'NO_QUESTION_FOUND') {
      setStatusBar('Press Mic button to start');
      showError('No interview question found on screen. Try 💬 text input.');
      return;
    }

    // Show extracted question briefly then answer
    liveTranscriptBar.style.display = 'flex';
    liveTranscriptTxt.textContent = '✅ ' + extracted.slice(0, 90) + (extracted.length > 90 ? '...' : '');
    setTimeout(() => { liveTranscriptBar.style.display = 'none'; }, 3000);
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
      <div class="answer-card streaming" id="currentAnswerCard">
        <div class="answer-controls">
          <button class="copy-btn" onclick="copyCard(this)">📋 Copy</button>
          <button class="tts-btn" onclick="toggleTTSBtn(this)" title="Read aloud">🔊</button>
        </div>
      </div>
    </div>`;
  chatArea.appendChild(row);
  // Scroll to the TOP of this answer so user reads from beginning
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

  const enforced = cleanPrompt + `\n\n` +
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

  // Few-shot: ONE compact example to teach format (saves ~10K tokens vs 4 examples)
  {
    msgs.push(
      { role: 'user', content: 'What is dependency injection?' },
      {
        role: 'assistant', content: `🎯 Simple Interview Answer (30 Seconds)

Dependency Injection means instead of a class creating its own dependencies, they're passed in from outside — usually through the constructor. In my project, all services like ClaimsService, NotificationService were registered in DI container and injected via constructor — made unit testing easy with Moq, reduced tight coupling across 40+ services. Trade-off: too many constructor parameters = service doing too much — I refactor when it exceeds 4.

🟢 Real Project Usage

In our Mobile Device Protection Platform, ClaimsService needed NotificationService, PolicyRepository, and ILogger. All injected via constructor:

\`\`\`csharp
public class ClaimsService
{
    private readonly INotificationService _notify;
    private readonly IPolicyRepository _repo;
    public ClaimsService(INotificationService notify, IPolicyRepository repo)
    {
        _notify = notify;
        _repo = repo;
    }
}
// Startup.cs
services.AddScoped<IClaimsService, ClaimsService>();
\`\`\`

40+ services registered — switching from SQL to Cosmos DB required changing one line in DI registration, zero service code changes.

🔴 Interview Point / Must Remember

• Constructor Injection = most common and recommended
• Scoped vs Transient vs Singleton — wrong lifetime = memory leaks or stale data
• 4+ constructor params = class has too many responsibilities → refactor
• DI enables unit testing — inject mock instead of real service

🔵 Definition / Main Concept

DI is an IoC pattern where dependencies are provided externally rather than created internally, enabling loose coupling and testability.

🟠 Advantages / Benefits

• Loose coupling — swap implementations without code changes
• Unit testing with Moq — inject mocks easily
• Single registration change = system-wide swap
• Follows SOLID principles (D = Dependency Inversion)

✅ Best Practice

• Use constructor injection over property/method injection
• Register as Scoped for request-based services, Singleton for stateless utilities` }
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
  const contents = nonSystemMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

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
  const html = renderMarkdown(text);
  // Preserve controls (copy + TTS buttons)
  card.innerHTML = `<div class="answer-controls"><button class="copy-btn" onclick="copyCard(this)">📋 Copy</button><button class="tts-btn" onclick="toggleTTSBtn(this)" title="Read aloud">🔊</button></div>${html}`;
}

// ─── Markdown Renderer ───
function renderMarkdown(text) {
  // Normalize line endings first
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 1: Extract code blocks BEFORE escapeHtml (preserve raw code)
  const codeBlocks = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang.trim(), code: code.trim() });
    return `%%CODEBLOCK_${idx}%%`;
  });

  // Step 2: Escape HTML for the rest
  let html = escapeHtml(text);

  // Step 3: Re-insert code blocks as proper HTML
  html = html.replace(/%%CODEBLOCK_(\d+)%%/g, (match, idx) => {
    const { lang, code } = codeBlocks[parseInt(idx)];
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    const escaped = escapeHtml(code);
    return `<div class="code-block">${langLabel}<button class="code-copy-btn" onclick="copyCodeBlock(this)">📋</button><pre><code>${escaped}</code></pre></div>`;
  });

  // Bold: **text** → <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* → <em>
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Inline code: `text` → <code>
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers: ### text → styled div
  html = html.replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>');
  html = html.replace(/^## (.+)$/gm, '<div class="md-h2">$1</div>');

  // Numbered lists: 1. text
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="md-list-item"><span class="md-list-num">$1.</span> $2</div>');

  // Bullet lists: - text or • text
  html = html.replace(/^[-•]\s+(.+)$/gm, '<div class="md-list-item"><span class="md-list-bullet">•</span> $1</div>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="md-hr">');

  return html;
}

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
    showError('System audio capture failed: ' + e.message + '. Make sure audio is playing.');
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

  const fastModel = groqKey ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

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
                  <div class="answer-controls">
                    <button class="copy-btn" onclick="copyCard(this)">📋 Copy</button>
                    <button class="tts-btn" onclick="toggleTTSBtn(this)" title="Read aloud">🔊</button>
                  </div>
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
askCrackit = async function (question) {
  await originalAskCrackit.call(this, question);
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
  const dataArray = new Uint8Array(bufferLength);
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
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * audioVisualizer.height;
      visCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6';
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
