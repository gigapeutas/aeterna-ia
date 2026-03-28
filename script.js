/**
 * ============================================================
 * AETERNA.IA — CONSYSENCIA  |  script.js
 * Lógica de UI, chat, Markdown e integração com n8n
 * ============================================================
 */

// ─── CONFIGURAÇÃO ────────────────────────────────────────────
// ⚠️ Substitua pela URL real do seu webhook de produção no n8n
const N8N_WEBHOOK_URL = 'https://SUA_URL_DO_WEBHOOK_DE_PRODUCAO_DO_N8N_AQUI';

// ─── ELEMENTOS DOM ────────────────────────────────────────────
const sidebar          = document.getElementById('sidebar');
const sidebarToggle    = document.getElementById('sidebarToggle');
const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
const sidebarOverlay   = document.getElementById('sidebarOverlay');
const newChatBtn       = document.getElementById('newChatBtn');
const chatHistory      = document.getElementById('chatHistory');
const emptyState       = document.getElementById('emptyState');
const messagesArea     = document.getElementById('messagesArea');
const userInput        = document.getElementById('userInput');
const sendBtn          = document.getElementById('sendBtn');
const inputContainer   = document.getElementById('inputContainer');
const suggestionCards  = document.querySelectorAll('.suggestion-card');

// ─── ESTADO ───────────────────────────────────────────────────
let isLoading = false;
let chatActive = false;

// ─── MARKED.JS CONFIG ─────────────────────────────────────────
// Aguarda os scripts CDN carregarem
window.addEventListener('DOMContentLoaded', () => {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: null, // será feito manualmente via hljs
    });

    // Renderer customizado para blocos de código
    const renderer = new marked.Renderer();

    renderer.code = function (code, language) {
      // Se for objeto (marked v12+)
      if (typeof code === 'object' && code !== null) {
        language = code.lang || '';
        code = code.text || '';
      }

      const lang = (language || '').toLowerCase();
      let highlighted = code;

      try {
        if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(code, { language: lang }).value;
        } else if (typeof hljs !== 'undefined') {
          highlighted = hljs.highlightAuto(code).value;
        }
      } catch (e) {
        highlighted = escapeHtml(code);
      }

      const langLabel = lang || 'código';

      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang">${langLabel}</span>
            <button class="copy-btn" onclick="copyCode(this)">
              <i class="fa-regular fa-copy"></i> Copiar
            </button>
          </div>
          <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
        </div>
      `;
    };

    marked.use({ renderer });
  }

  initEventListeners();
});

// ─── UTILITÁRIOS ─────────────────────────────────────────────
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (typeof marked === 'undefined') return escapeHtml(text);
  try {
    return marked.parse(text);
  } catch {
    return escapeHtml(text);
  }
}

function scrollToBottom(smooth = true) {
  const container = document.querySelector('.chat-container');
  if (!container) return;
  container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
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

function toggleSidebar() {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
}

// ─── ESTADO DO CHAT ───────────────────────────────────────────
function showEmptyState() {
  emptyState.style.display = 'flex';
  messagesArea.style.display = 'none';
  chatActive = false;
}

function showChatState() {
  emptyState.style.display = 'none';
  messagesArea.style.display = 'flex';
  chatActive = true;
}

function resetChat() {
  messagesArea.innerHTML = '';
  showEmptyState();
  userInput.value = '';
  autoResize();
  updateSendBtn();

  // Remove active de todos
  document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
}

// ─── MENSAGENS ───────────────────────────────────────────────
/**
 * Adiciona uma mensagem do usuário
 */
function addUserMessage(text) {
  showChatState();

  const row = document.createElement('div');
  row.className = 'message-row user';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  row.appendChild(bubble);
  messagesArea.appendChild(row);
  scrollToBottom();
}

/**
 * Adiciona uma mensagem da IA com suporte a Markdown
 */
function addAIMessage(markdownText) {
  const row = document.createElement('div');
  row.className = 'message-row ai';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.innerHTML = `
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 20L14 6L22 20" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 16H19.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = renderMarkdown(markdownText);

  row.appendChild(avatarEl);
  row.appendChild(bubble);
  messagesArea.appendChild(row);
  scrollToBottom();

  return row;
}

/**
 * Adiciona um indicador de "digitando"
 */
function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row ai';
  row.id = 'typingRow';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.innerHTML = `
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 20L14 6L22 20" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 16H19.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = `
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
    <span class="typing-text">Aeterna está processando...</span>
  `;

  row.appendChild(avatarEl);
  row.appendChild(indicator);
  messagesArea.appendChild(row);
  scrollToBottom();

  return row;
}

function removeTypingIndicator() {
  const typingRow = document.getElementById('typingRow');
  if (typingRow) typingRow.remove();
}

/**
 * Adiciona uma mensagem de erro
 */
function addErrorMessage(text) {
  const row = document.createElement('div');
  row.className = 'message-row ai error-message';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.style.cssText = 'background: linear-gradient(135deg, #dc2626, #991b1b);';
  avatarEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:white; font-size:13px;"></i>`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = `<strong>Erro:</strong> ${escapeHtml(text)}`;

  row.appendChild(avatarEl);
  row.appendChild(bubble);
  messagesArea.appendChild(row);
  scrollToBottom();
}

// ─── COPIAR CÓDIGO ────────────────────────────────────────────
window.copyCode = function (btn) {
  const pre = btn.closest('.code-block-wrapper').querySelector('pre code');
  const text = pre.innerText || pre.textContent;

  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
    }, 2000);
  }).catch(() => {
    btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Erro';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar';
    }, 1500);
  });
};

// ─── AUTO-RESIZE TEXTAREA ─────────────────────────────────────
function autoResize() {
  userInput.style.height = 'auto';
  const maxH = 200;
  const newH = Math.min(userInput.scrollHeight, maxH);
  userInput.style.height = `${newH}px`;
  userInput.style.overflowY = userInput.scrollHeight > maxH ? 'auto' : 'hidden';
}

function updateSendBtn() {
  const hasText = userInput.value.trim().length > 0;
  sendBtn.disabled = !hasText || isLoading;
}

// ─── INTEGRAÇÃO N8N ──────────────────────────────────────────
/**
 * Envia a mensagem para o webhook n8n e exibe a resposta
 */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  // Atualiza estado
  isLoading = true;
  userInput.value = '';
  autoResize();
  updateSendBtn();

  // Exibe mensagem do usuário
  addUserMessage(text);

  // Exibe indicador de carregamento
  addTypingIndicator();

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extrai a chave 'reply' conforme documentado
    const reply = data?.reply || data?.output || data?.text || data?.message || null;

    if (!reply) {
      throw new Error('A resposta do servidor não contém a chave "reply".');
    }

    removeTypingIndicator();
    addAIMessage(reply);

    // Adiciona ao histórico visual (mockado)
    addToHistory(text);

  } catch (error) {
    removeTypingIndicator();

    let errorMsg = error.message;

    // Mensagem amigável para erro de CORS ou rede
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMsg = 'Não foi possível conectar ao servidor n8n. Verifique a URL do webhook e as configurações de CORS.';
    }

    addErrorMessage(errorMsg);
    console.error('[Aeterna] Erro ao comunicar com n8n:', error);
  } finally {
    isLoading = false;
    updateSendBtn();
    userInput.focus();
  }
}

// ─── HISTÓRICO (mockado) ─────────────────────────────────────
function addToHistory(text) {
  const label = text.length > 36 ? text.slice(0, 36) + '…' : text;

  const existing = document.querySelectorAll('.chat-item');
  existing.forEach(el => el.classList.remove('active'));

  const item = document.createElement('a');
  item.href = '#';
  item.className = 'chat-item active';
  item.setAttribute('data-id', Date.now());
  item.innerHTML = `<i class="fa-regular fa-message"></i><span>${escapeHtml(label)}</span>`;

  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
  });

  chatHistory.prepend(item);
}

// ─── EVENT LISTENERS ─────────────────────────────────────────
function initEventListeners() {
  // Textarea: auto-resize + habilitar botão
  userInput.addEventListener('input', () => {
    autoResize();
    updateSendBtn();
  });

  // Enviar com Enter (Shift+Enter = nova linha)
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Botão enviar
  sendBtn.addEventListener('click', sendMessage);

  // Novo Chat
  newChatBtn.addEventListener('click', resetChat);

  // Sidebar toggle (desktop)
  sidebarToggle?.addEventListener('click', toggleSidebar);

  // Sidebar toggle (mobile)
  mobileSidebarToggle?.addEventListener('click', openSidebar);

  // Overlay (fecha sidebar no mobile)
  sidebarOverlay?.addEventListener('click', closeSidebar);

  // Suggestion cards
  suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt) {
        userInput.value = prompt;
        autoResize();
        updateSendBtn();
        userInput.focus();
        // Auto-envia a sugestão
        setTimeout(sendMessage, 100);
      }
    });
  });

  // Itens do histórico mockado (clicáveis)
  document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Estado inicial
  showEmptyState();
  userInput.focus();
}
