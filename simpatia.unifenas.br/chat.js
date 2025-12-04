const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const planOutput = document.getElementById("plan-output");
const downloadPdfBtn = document.getElementById("download-pdf-btn");

// Função para exibir uma mensagem no chat
function appendMessage(message, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", `${sender}-message`);
  messageDiv.innerText = message;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para enviar a mensagem para o back-end
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  userInput.value = "";

  // Opcional: mostrar uma mensagem de "digitando"
  appendMessage("Pensando...", "bot");

  try {
    // Envia a mensagem para o seu servidor back-end
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message }),
    });

    const data = await response.json();
    const botMessageElement = chatMessages.lastChild;

    // Remove a mensagem de "digitando" e exibe a resposta real
    if (botMessageElement.innerText === "Pensando...") {
      chatMessages.removeChild(botMessageElement);
    }

    // Exibe a resposta da IA no chat
    appendMessage(data.response, "bot");

    // Insere a resposta formatada como HTML no contêiner do plano de aula
    planOutput.innerHTML = data.htmlResponse;
    downloadPdfBtn.style.display = "block";
  } catch (error) {
    console.error("Erro:", error);
    appendMessage("Desculpe, algo deu errado. Tente novamente.", "bot");
  }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Evento de clique para o botão de download
downloadPdfBtn.addEventListener("click", async () => {
  // Captura o conteúdo HTML da área de plano de aula
  const htmlContent = planOutput.innerHTML;

  try {
    const response = await fetch("http://localhost:3000/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ htmlContent: htmlContent }),
    });

    if (!response.ok) {
      throw new Error("Erro na resposta do servidor.");
    }

    // Converte a resposta em um blob (arquivo binário)
    const pdfBlob = await response.blob();

    // Cria um URL temporário para o arquivo e simula o download
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plano_de_aula.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao baixar o PDF:", error);
    alert("Não foi possível baixar o PDF. Tente novamente mais tarde.");
  }
});
