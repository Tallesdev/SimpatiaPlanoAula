const downloadPdfBtn = document.getElementById("download-pdf-btn");
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const planOutput = document.getElementById("plan-output");

// Novo botão de geração de confirmação
const generateBtn = document.getElementById("generate-btn");

// Nova variável para armazenar os dados do formulário
let formData = {};

// Função para exibir uma mensagem no chat
function appendMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);
    // Usar innerHTML para suportar a formatação de confirmação (negrito)
    messageDiv.innerHTML = message; 
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para coletar os dados do formulário
function collectFormData() {
    const nivelEnsino = document.getElementById("nivel-ensino").value;
    const formatoAula = document.getElementById("formato-aula").value;
    const nomeCurso = document.getElementById("nome-curso").value;
    const nomeDisciplina = document.getElementById("nome-disciplina").value;
    const horasTotais = document.getElementById("horas-totais").value;
    const semanas = document.getElementById("semanas").value;
    const numReferencias = document.getElementById("num-referencias").value;
    const numReferenciasComp = document.getElementById("num-referencias-comp").value;
    const semestre = document.getElementById("semestre").value;
    const ano = document.getElementById("ano").value;
    

    const avaliacaoCheckboxes = document.querySelectorAll('input[name="avaliacao"]:checked');
    const avaliacaoSelecionada = Array.from(avaliacaoCheckboxes).map(cb => cb.value).join(", ");

    const metodologiaCheckboxes = document.querySelectorAll('input[name="metodologia"]:checked');
    const metodologiasSelecionadas = Array.from(metodologiaCheckboxes).map(cb => cb.value).join(", ");

    const recursosCheckboxes = document.querySelectorAll('input[name="recursos"]:checked');
    const recursosSelecionados = Array.from(recursosCheckboxes).map(cb => cb.value);

    formData = {
        // Campos de texto e seleção
        nivelEnsino,
        formatoAula,
        nomeCurso,
        nomeDisciplina,
        horasTotais,
        semanas,
        numReferencias,
        numReferenciasComp,
        semestre,
        ano,
        // Campos de lista que o Gemini deve alterar/adicionar
        avaliacao: avaliacaoSelecionada,
        metodologias: metodologiasSelecionadas,
        recursos: recursosSelecionados,
        // Campos adicionais que o Gemini irá preencher (deixados vazios por enquanto)
        objetivos: "", // O Gemini preencherá
        desenvolvimento: "", // O Gemini preencherá
        referencias: "", // O Gemini preencherá
    };
}

// Função para construir e exibir a mensagem de confirmação
function generateConfirmationMessage() {
    collectFormData();

    if (!formData.nomeDisciplina && !formData.nomeCurso) {
        appendMessage("Por favor, preencha pelo menos o nome da disciplina ou do curso antes de continuar.", "bot");
        return;
    }

    const message = `Só para confirmar, você gostaria de criar um plano de aula para a disciplina de ${formData.nomeDisciplina || 'N/A'} (curso de ${formData.nomeCurso || 'N/A'}) com as seguintes informações:
    - Nível de Ensino: ${formData.nivelEnsino}
    - Formato: ${formData.formatoAula}
    - Carga Horária: ${formData.horasTotais || 'N/A'} horas (${formData.semanas || 'N/A'} semanas)
    - Referências: ${formData.numReferencias || 'N/A'} bibliográficas e ${formData.numReferenciasComp || 'N/A'} complementares.
    - Avaliação: ${formData.avaliacao || 'Não especificado'}
    - Metodologias: ${formData.metodologias || 'Não especificadas'}
    - Recursos Auxiliares: ${formData.recursos || 'Não especificados'}
    Se as informações estiverem corretas, digite "sim" ou faça alguma alteração no chat.`;

    appendMessage(message, "bot"); // confirmação do BOT
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage(message, "user");
    userInput.value = "";
    appendMessage("Pensando...", "bot");

    try {
        // Envia a mensagem do usuário e o estado atual do formulário (formData)
        const response = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, context: formData }),
        });

        const data = await response.json();
        const botMessageElement = chatMessages.lastChild;
        if (botMessageElement.innerText === "Pensando...") {
            chatMessages.removeChild(botMessageElement);
        }

        // updatedData e htmlResponse são tratados.
        if (data.updatedData) {
            // 1. ATUALIZA OS DADOS LOCAIS COM A RESPOSTA DA IA
            formData = data.updatedData;

            // 2. ATUALIZA O PREVIEW COM O HTML RETORNADO PELO SERVIDOR
            // O servidor envia o HTML no campo 'htmlResponse'
            planOutput.innerHTML = data.htmlResponse; 

            // 3. EXIBE A RESPOSTA DO BOT
            appendMessage(data.response, "bot");
            downloadPdfBtn.style.display = "block";

        } else if (data.htmlResponse) {
            // Este caso é se o JSON retornado pelo servidor foi incompleto, mas tinha um HTML
            planOutput.innerHTML = data.htmlResponse;
            appendMessage(data.response, "bot");
            downloadPdfBtn.style.display = "block";

        } else {
            // Se a IA não entendeu, exibe a mensagem de erro E MANTÉM O CONTEXTO
            appendMessage(data.response, "bot");
            
            // Se não houver HTML, exibe o placeholder 
            planOutput.innerHTML = `
                <div class="placeholder-text">
                    <h2>Seu plano de aula aparecerá aqui...</h2>
                    <p>Use o chat ao lado para interagir e gerar o plano.</p>
                </div>
            `;
            downloadPdfBtn.style.display = "none";
        }

    } catch (error) {
        console.error("Erro na comunicação com o servidor:", error);
        // Remove 'Pensando...' e exibe erro
        const botMessageElement = chatMessages.lastChild;
        if (botMessageElement && botMessageElement.innerText === "Pensando...") {
             chatMessages.removeChild(botMessageElement);
        }
        appendMessage("Desculpe, houve um erro de conexão com o servidor. Tente novamente.", "bot");
    }
}


// Event listeners
generateBtn.addEventListener("click", generateConfirmationMessage);
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Listener para o botão de PDF 
downloadPdfBtn.addEventListener("click", async () => {
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

    const pdfBlob = await response.blob();
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
