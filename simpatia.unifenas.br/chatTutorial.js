/* ============================================================
   chatTutorial.js — Pop-up de ajuda para o módulo Plano de Aula
   Comunica com POST /api/tutorial no server.js
   ============================================================ */

(function () {
  "use strict";

  // ── Chips de perguntas rápidas ──────────────────────────────
  const CHIPS = [
    "Como gero um plano?",
    "O que é o campo Semanas?",
    "Posso editar depois de gerar?",
    "Como baixo o PDF?",
  ];

  // ── Mensagem de boas-vindas ─────────────────────────────────
  const WELCOME =
    "Olá! 👋 Sou o assistente do módulo <strong>Plano de Aula</strong>. " +
    "Pode me perguntar qualquer coisa sobre como usar esta ferramenta — " +
    "campos do formulário, geração do plano, exportação em PDF, e mais.";

  // ── Estado ──────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;

  // ── Injeção do HTML do pop-up ───────────────────────────────
  function injectHTML() {
    // Pulso de atenção
    const pulse = document.createElement("div");
    pulse.id = "tutorial-fab-pulse";
    document.body.appendChild(pulse);

    // Botão flutuante (FAB)
    const fab = document.createElement("button");
    fab.id = "tutorial-fab";
    fab.setAttribute("aria-label", "Abrir chat de ajuda");
    fab.innerHTML = `
      <!-- Ícone de interrogação (fechado) -->
      <svg id="tut-icon-open" viewBox="0 0 24 24" fill="none"
           xmlns="http://www.w3.org/2000/svg">
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
              stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="17" r="1" fill="currentColor"/>
        <circle cx="12" cy="12" r="10"
                stroke="currentColor" stroke-width="2"/>
      </svg>
      <!-- Ícone de fechar (aberto) -->
      <svg id="tut-icon-close" viewBox="0 0 24 24" fill="none"
           xmlns="http://www.w3.org/2000/svg" style="display:none">
        <path d="M18 6L6 18M6 6l12 12"
              stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    document.body.appendChild(fab);

    // Painel do chat
    const panel = document.createElement("div");
    panel.id = "tutorial-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat de ajuda do Plano de Aula");
    panel.innerHTML = `
      <!-- Cabeçalho -->
      <div id="tutorial-header">
        <div id="tutorial-header-avatar">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                  fill="currentColor"/>
            <path d="M7 8h10l1 8H6L7 8z" stroke="currentColor"
                  stroke-width="1.5" fill="none" stroke-linejoin="round"/>
            <path d="M9 16v4M15 16v4" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div id="tutorial-header-info">
          <p id="tutorial-header-name">Assistente SIMPATIA</p>
          <span id="tutorial-header-status">
            <span id="tutorial-status-dot"></span>
            Módulo Plano de Aula
          </span>
        </div>
      </div>

      <!-- Mensagens -->
      <div id="tutorial-messages"></div>

      <!-- Input -->
      <div id="tutorial-input-area">
        <input id="tutorial-input" type="text"
               placeholder="Digite sua dúvida..."
               autocomplete="off" maxlength="400"/>
        <button id="tutorial-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>`;
    document.body.appendChild(panel);
  }

  // ── Renderiza chips dentro da área de mensagens ─────────────
  function renderChips() {
    // Remove chips anteriores se existirem
    const old = document.getElementById("tutorial-chips");
    if (old) old.remove();

    const messages = document.getElementById("tutorial-messages");
    const container = document.createElement("div");
    container.id = "tutorial-chips";

    CHIPS.forEach((text) => {
      const btn = document.createElement("button");
      btn.className = "tut-chip";
      btn.textContent = text;
      btn.addEventListener("click", () => sendMessage(text));
      container.appendChild(btn);
    });

    messages.appendChild(container);
    messages.scrollTop = messages.scrollHeight;
  }

  // ── Adiciona mensagem na área de chat ───────────────────────
  function appendMessage(html, sender) {
    const messages = document.getElementById("tutorial-messages");
    const div = document.createElement("div");
    div.className = `tut-msg ${sender}`;
    div.innerHTML = html;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  // ── Typing indicator ────────────────────────────────────────
  function showTyping() {
    const messages = document.getElementById("tutorial-messages");
    const div = document.createElement("div");
    div.className = "tut-typing";
    div.id = "tut-typing-indicator";
    div.innerHTML = `
      <span class="tut-dot"></span>
      <span class="tut-dot"></span>
      <span class="tut-dot"></span>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const indicator = document.getElementById("tut-typing-indicator");
    if (indicator) indicator.remove();
  }

  // ── Envia mensagem para o servidor ──────────────────────────
  async function sendMessage(text) {
    const input = document.getElementById("tutorial-input");
    const sendBtn = document.getElementById("tutorial-send");

    const question = (text || input.value).trim();
    if (!question || isLoading) return;

    // Limpa input e desabilita
    input.value = "";
    isLoading = true;
    sendBtn.disabled = true;

    // Exibe mensagem do usuário
    appendMessage(escapeHtml(question), "user");

    // Remove chips durante a resposta
    const chipsEl = document.getElementById("tutorial-chips");
    if (chipsEl) chipsEl.remove();

    // Typing indicator
    showTyping();

    try {
      const response = await fetch("http://localhost:3000/api/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      removeTyping();

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      appendMessage(markdownToHtml(data.answer), "bot");
    } catch (err) {
      removeTyping();
      appendMessage(
        "Desculpe, não consegui me conectar ao servidor. " +
        "Verifique se o servidor está rodando e tente novamente.",
        "bot"
      );
      console.error("[chatTutorial] Erro:", err);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();

      // Reexibe chips no final das mensagens
      renderChips();
    }
  }

  // ── Escapa HTML para mensagens do usuário ───────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Converte Markdown simples → HTML para respostas do bot ──
  function markdownToHtml(text) {
    return text
      // Blocos de código (antes do inline para não conflitar)
      .replace(/```[\s\S]*?```/g, "")

      // Títulos: ### ## #
      .replace(/^### (.+)$/gm, "<strong>$1</strong>")
      .replace(/^## (.+)$/gm,  "<strong>$1</strong>")
      .replace(/^# (.+)$/gm,   "<strong>$1</strong>")

      // Negrito **texto** ou __texto__
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g,     "<strong>$1</strong>")

      // Itálico *texto* ou _texto_
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/_(.+?)_/g,   "<em>$1</em>")

      // Listas numeradas: "1. item"
      .replace(
        /((?:^\d+\. .+\n?)+)/gm,
        (block) => {
          const items = block.trim().split("\n").map((line) => {
            const content = line.replace(/^\d+\.\s*/, "").trim();
            return `<li>${content}</li>`;
          });
          return `<ol>${items.join("")}</ol>`;
        }
      )

      // Listas não-ordenadas: "* item" ou "- item"
      .replace(
        /((?:^[*\-] .+\n?)+)/gm,
        (block) => {
          const items = block.trim().split("\n").map((line) => {
            const content = line.replace(/^[*\-]\s*/, "").trim();
            return `<li>${content}</li>`;
          });
          return `<ul>${items.join("")}</ul>`;
        }
      )

      // Quebras de linha duplas → parágrafo
      .replace(/\n{2,}/g, "<br><br>")

      // Quebras de linha simples dentro de parágrafos
      .replace(/\n/g, "<br>")

      // Remove <br> desnecessários logo antes/depois de listas
      .replace(/<br><br>(<[uo]l>)/g, "$1")
      .replace(/(<\/[uo]l>)<br><br>/g, "$1")
      .replace(/<br>(<[uo]l>)/g, "$1")
      .replace(/(<\/[uo]l>)<br>/g, "$1");
  }

  // ── Abre / fecha o pop-up ───────────────────────────────────
  function togglePanel() {
    const panel = document.getElementById("tutorial-panel");
    const fab = document.getElementById("tutorial-fab");
    const iconOpen = document.getElementById("tut-icon-open");
    const iconClose = document.getElementById("tut-icon-close");

    isOpen = !isOpen;
    panel.classList.toggle("is-open", isOpen);
    fab.classList.toggle("is-open", isOpen);
    iconOpen.style.display = isOpen ? "none" : "block";
    iconClose.style.display = isOpen ? "block" : "none";

    if (isOpen) {
      setTimeout(() => {
        document.getElementById("tutorial-input").focus();
      }, 260);
    }
  }

  // ── Fecha ao clicar fora ────────────────────────────────────
  function handleOutsideClick(e) {
    const panel = document.getElementById("tutorial-panel");
    const fab = document.getElementById("tutorial-fab");
    if (isOpen && !panel.contains(e.target) && !fab.contains(e.target)) {
      togglePanel();
    }
  }

  // ── Fecha com Esc ───────────────────────────────────────────
  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) togglePanel();
  }

  // ── Inicialização ───────────────────────────────────────────
  function init() {
    injectHTML();
    renderChips();

    // Mensagem de boas-vindas
    appendMessage(WELCOME, "bot");

    // Eventos
    document.getElementById("tutorial-fab").addEventListener("click", togglePanel);
    document.getElementById("tutorial-send").addEventListener("click", () => sendMessage());
    document.getElementById("tutorial-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeydown);

    // Remove o pulso após as animações
    setTimeout(() => {
      const pulse = document.getElementById("tutorial-fab-pulse");
      if (pulse) pulse.remove();
    }, 4000);
  }

  // Aguarda o DOM estar pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
