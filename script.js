/**
 * ============================================================
 * AETERNA.IA — CONSYSENCIA  |  script.js
 * ============================================================
 */

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────
// ⚠️ Substitua pela URL real do seu webhook de produção no n8n
const N8N_WEBHOOK_URL = 'https://SUA_URL_DO_WEBHOOK_DE_PRODUCAO_DO_N8N_AQUI';

// ─── ESTADO ───────────────────────────────────────────────────
let isLoading = false;

// ─── REFS DOM (resolvidas após DOMContentLoaded) ──────────────
let sidebar, sidebarToggle, mobileSidebarToggle, sidebarOverlay;
let newChatBtn, emptyState, messagesArea, userInput, sendBtn;

// ─── INICIALIZAÇÃO ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  sidebar             = document.getElementById('sidebar');
  sidebarToggle       = document.getElementById('sidebarToggle');
  mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
  sidebarOverlay      = document.getElementById('sidebarOverlay');
  newChatBtn          = document.getElementById('newChatBtn');
  emptyState          = document.getElementById('emptyState');
  messagesArea        = document.getElementById('messagesArea');
  userInput           = document.getElementById('userInput');
  sendBtn             = document.getElementById('sendBtn');

  setupMarked();
  bindEvents();
  showEmptyState();
});

// ─── SETUP MARKED.JS ─────────────────────────────────────────
function setupMarked() {
  if (typeof marked === 'undefined') return;

  marked.setOptions({ breaks: true, gfm: true });

  const renderer = new marked.Renderer();

  renderer.code = function (token) {
    const lang = (typeof token === 'object' ? token.lang : '') || '';
    const code = typeof token === 'object' ? (token.text || '') : String(token);
    const langKey = lang.toLowerCase();

    let highlighted = escapeHtml(code);
    try {
      if (langKey && typeof hljs !== 'undefined' && hljs.getLanguage(langKey)) {
        highlighted = hljs.highlight(code, { language: langKey }).value;
      } else if (typeof hljs !== 'undefined') {
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch (_) {}

    return '<div class="code-block-wrapper">'
      + '<div class="code-block-header">'
      + '<span class="code-lang">' + (langKey || 'código') + '</span>'
      + '<button class="copy-btn" onclick="copyCode(this)">'
      + '<i class="fa-regular fa-copy"></i> Copiar</button>'
      + '</div>'
      + '<pre><code class="hljs">' + highlighted + '</code></pre>'
      + '</div>';
  };

  marked.use({ renderer });
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  if (typeof marked === 'undefined') return '<p>' + escapeHtml(text) + '</p>';
  try { return marked.parse(text); }
  catch (_) { return '<p>' + escapeHtml(text) + '</p>'; }
}

function scrollToBottom() {
  const c = document.querySelector('.chat-container');
  if (c) c.scrollTop = c.scrollHeight;
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

// ─── ESTADO DO CHAT ───────────────────────────────────────────
function showEmptyState() {
  emptyState.style.display   = 'flex';
  messagesArea.style.display = 'none';
}

function showChatState() {
  emptyState.style.display   = 'none';
  messagesArea.style.display = 'flex';
}

function resetChat() {
  messagesArea.innerHTML = '';
  showEmptyState();
  userInput.value = '';
  autoResize();
  updateSendBtn();
  closeSidebar();
}

// ─── INPUT ────────────────────────────────────────────────────
function autoResize() {
  userInput.style.height = 'auto';
  var max = 200;
  userInput.style.height = Math.min(userInput.scrollHeight, max) + 'px';
  userInput.style.overflowY = userInput.scrollHeight > max ? 'auto' : 'hidden';
}

function updateSendBtn() {
  var hasText = userInput.value.trim().length > 0;
  sendBtn.disabled = !hasText || isLoading;
}

// ─── MENSAGENS ────────────────────────────────────────────────
function addUserMessage(text) {
  showChatState();
  var row = document.createElement('div');
  row.className = 'message-row user';
  var bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  messagesArea.appendChild(row);
  scrollToBottom();
}

function avatarSVG() {
  return '<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<path d="M6 20L14 6L22 20" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M8.5 16H19.5" stroke="white" stroke-width="2" stroke-linecap="round"/>'
    + '</svg>';
}

function addAIMessage(markdownText) {
  var row = document.createElement('div');
  row.className = 'message-row ai';

  var avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerHTML = avatarSVG();

  var bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = renderMarkdown(markdownText);

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesArea.appendChild(row);
  scrollToBottom();
}

function addTypingIndicator() {
  showChatState();
  var row = document.createElement('div');
  row.className = 'message-row ai';
  row.id = 'typingRow';

  var avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerHTML = avatarSVG();

  var indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<div class="typing-dots">'
    + '<div class="typing-dot"></div>'
    + '<div class="typing-dot"></div>'
    + '<div class="typing-dot"></div>'
    + '</div>'
    + '<span class="typing-text">Aeterna está processando...</span>';

  row.appendChild(avatar);
  row.appendChild(indicator);
  messagesArea.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  var el = document.getElementById('typingRow');
  if (el) el.remove();
}

function addErrorMessage(text) {
  var row = document.createElement('div');
  row.className = 'message-row ai error-message';

  var avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.style.cssText = 'background:linear-gradient(135deg,#dc2626,#991b1b);';
  avatar.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:white;font-size:13px;"></i>';

  var bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = '<strong>Erro:</strong> ' + escapeHtml(text);

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesArea.appendChild(row);
  scrollToBottom();
}

// ─── COPIAR CÓDIGO ────────────────────────────────────────────
window.copyCode = function (btn) {
  var code = btn.closest('.code-block-wrapper').querySelector('pre code');
  navigator.clipboard.writeText(code.innerText || code.textContent).then(function () {
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
    setTimeout(function () {
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
    }, 2000);
  }).catch(function () {
    btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Erro';
    setTimeout(function () { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar'; }, 1500);
  });
};

// ─── ENVIO PARA N8N ───────────────────────────────────────────
async function sendMessage() {
  var text = userInput.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  userInput.value = '';
  autoResize();
  updateSendBtn();

  addUserMessage(text);
  addTypingIndicator();

  try {
    var res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
    });

    if (!res.ok) throw new Error('Erro HTTP ' + res.status + ': ' + res.statusText);

    var data = await res.json();
    var reply = (data && (data.reply || data.output || data.text || data.message)) || null;

    if (!reply) throw new Error('Resposta do servidor não contém a chave "reply".');

    removeTypingIndicator();
    addAIMessage(reply);

  } catch (err) {
    removeTypingIndicator();
    var msg = (err.name === 'TypeError')
      ? 'Não foi possível conectar ao n8n. Verifique a URL do webhook e as configurações de CORS.'
      : err.message;
    addErrorMessage(msg);
    console.error('[Aeterna]', err);
  } finally {
    isLoading = false;
    updateSendBtn();
  }
}

// ─── EVENT LISTENERS ─────────────────────────────────────────
function bindEvents() {
  userInput.addEventListener('input', function () {
    autoResize();
    updateSendBtn();
  });

  userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  newChatBtn.addEventListener('click', resetChat);

  if (mobileSidebarToggle) mobileSidebarToggle.addEventListener('click', openSidebar);
  if (sidebarToggle)       sidebarToggle.addEventListener('click', closeSidebar);
  if (sidebarOverlay)      sidebarOverlay.addEventListener('click', closeSidebar);
}
