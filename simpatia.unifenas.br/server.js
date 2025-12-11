const path = require("path");
const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");


const app = express();
const port = 3000;
const BASE_URL = `http://localhost:${port}`;


// LINHA 14: SUBSTITUA "YOUR_API_KEY" PELA SUA CHAVE REAL. (Mantenho a sua chave no código)
const genAI = new GoogleGenerativeAI("AIzaSyCxCm034cgvR6ZjYLVKDmNc6ORwZ7qt7ys"); 
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
app.use(express.static(path.join(__dirname)));
app.use(cors());
app.use(express.json());

// Função para adicionar um atraso
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------
// 1. Definições das Listas e Mapeamento (Novo Template vs. JSON Payload)
// ----------------------------------------------------

// Lista Mapeada de Metodologias: { display: Nome no Novo Template, payload: Nome no JSON de entrada }
// Ajustei os PAYLOADS para corresponderem aos VALORES EXATOS do seu HTML (PlanoAula.html)
const METODOLOGIAS_MAP = [
    { display: "Exposição Dialogada", payload: "Exposição Dialogada" },
    { display: "Trabalho de grupo", payload: "Trabalho de Grupo" },
    { display: "Debate", payload: "Debate" },
    { display: "TBL (Team Based Learning)", payload: "TBL" },
    { display: "PBL (Project Based Learning)", payload: "PBL" },
    { display: "Aula invertida", payload: "Aula Invertida" },
    { display: "Mapa Conceitual", payload: "Mapa Conceitual" }, 
    { display: "Estudo de caso", payload: "Estudo de Caso" },
    { display: "Seminário", payload: "Seminário" },
    { display: "Painel", payload: "Painel" },
    { display: "Fórum/Chat", payload: "Fórum/Chat" },
    { display: "PBLe (Problem Based Learning)", payload: "PBLe" },
    { display: "Tempestade Cerebral (Brainstorming)", payload: "Tempestade Cerebral" },
    { display: "Dramatização/Role Play", payload: "Dramatização" }
];

// Lista Mapeada de Recursos Auxiliares (ATUALIZADA)
// Os PAYLOADS agora correspondem EXATAMENTE aos VALORES do seu novo HTML (PlanoAula.html)
const RECURSOS_MAP = [
    { display: "Computador", payload: "Computador" },
    { display: "Vídeos", payload: "Videos" }, // Mapeamento do acento (Vídeos no display, Videos no payload)
    { display: "Projetor Multimídia", payload: "Projetor Multimidia" }, // Mapeamento do acento
    { display: "Álbuns Seriados", payload: "Albuns Seriados" }, // Mapeamento do acento
    { display: "Slides", payload: "Slides" },
    { display: "Manequins", payload: "Manequins" },
    { display: "Lousa Eletrônica", payload: "Lousa Eletrônica" },
    { display: "AVA*", payload: "AVA" }, 
    { display: "Atividades clínicas", payload: "Atividades Clinicas" }, // Mapeamento do acento
    { display: "Lousa", payload: "Lousa" }, // Sincronizado
    { display: "Internet", payload: "Internet" }, // Sincronizado
    { display: "Laboratório", payload: "Laboratório" }, // Sincronizado
    { display: "Vídeo conferência", payload: "Video Conferencia" }, // Mapeamento do acento
    { display: "Prancheta Digitalizadora", payload: "Prancheta Digitalizadora" }
];

// Lista Mapeada de Avaliações
const AVALIACOES_MAP = [
    { display: "Discursiva", payload: "Prova Discursiva" }, 
    { display: "Múltipla escolha", payload: "Prova de Múltipla Escolha" }, 
    { display: "Oral", payload: "Prova Oral" },
    { display: "Prática", payload: "Prova Prática" },
    { display: "Trabalhos de pesquisa", payload: "Trabalhos de Pesquisa" } 
];


/**
 * Função para gerar o HTML do plano de aula a partir do JSON.
 * @param {object} data - O objeto JSON com os dados do plano de aula.
 * @returns {string} O HTML completo do plano de aula.
 */
function generateHtmlFromContext(data) {
    // ----------------------------------------------------
    // 2. Processamento das Listas e Blocos
    // ----------------------------------------------------

    // Objetivos (Lista <ul><li>)
    const objetivosHtml = data.objetivos ? data.objetivos.split('\n')
        .map(o => o.trim())
        .filter(o => o.length > 0)
        .map(o => `<li>${o}</li>`).join('') : 'Não Gerado';

    // Desenvolvimento/Detalhe (Bloco de Texto <br> - CRONOGRAMA)
    const desenvolvimentoHtml = data.desenvolvimento ? data.desenvolvimento.replace(/\n/g, '<br>') : 'Não Gerado';

    // Tópicos/Ementa (Bloco de Texto <br>)
    // MANTIDO, pois Ementa é parte padrão do Plano de Ensino, mesmo se o campo de input foi removido.
    const ementaHtml = data.topicos ? data.topicos.replace(/\n/g, '<br>') : 'Não Gerado';
    // Referências
    const referenciasTexto = data.referencias || '';
    const referenciasArray = referenciasTexto.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const numReferenciasBasicas = parseInt(data.numReferencias) > 0 ? parseInt(data.numReferencias) : 3;

    const basicas = referenciasArray.slice(0, numReferenciasBasicas).join('<br>') || 'N/A';
    const complementares = referenciasArray.slice(numReferenciasBasicas).join('<br>') || 'N/A';

    // ----------------------------------------------------
    // 3. Lógica de Geração dos Checkboxes (SIM/NÃO)
    // ----------------------------------------------------

    /**
     * Função auxiliar para gerar o HTML do item de checkbox (SIM/NÃO)
     * @param {string} displayItem - O nome do item para exibição (Novo Template).
     * @param {string} payloadItem - O nome do item no JSON de entrada (Gemini/Template Antigo).
     * @param {string} dataAttribute - O nome do atributo de dados (e.g., 'data-metodo').
     * @param {string} selectedString - A string de itens selecionados (do JSON de entrada, separados por ", ").
     * @returns {string} O HTML do item com checkboxes.
     */
    const generateCheckboxItem = (displayItem, payloadItem, dataAttribute, selectedString) => {
        // Verifica se o payloadItem (o nome esperado no JSON de entrada) está na string de selecionados
        // Usa regex para evitar falso positivo em sub-strings (ex: "Laboratório" em "Laboratório de Informática")
        const regex = new RegExp(`(^|,\\s*)${payloadItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*,|$)`, 'i');
        const isSelected = selectedString && regex.test(selectedString);

        const checkedSim = isSelected ? 'checked' : '';
        const checkedNao = isSelected ? '' : 'checked'; // Assume NÃO se não estiver em SIM

        // Normaliza o nome de exibição para usar como ID (evita caracteres especiais)
        const normalizedBaseId = displayItem.toLowerCase().replace(/[\s\(\)\/\*\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        // Usa o displayItem para a visualização, mas mantém o payloadItem para o dataAttribute
        return `
            <div class="${dataAttribute.replace('data-', '')}-item">
                <span>${displayItem}:</span>
                <div class="${dataAttribute.replace('data-', '')}-opcoes">
                    <span>SIM</span>
                    <input type="checkbox" id="${normalizedBaseId}-sim" ${dataAttribute}="${payloadItem}" ${checkedSim} />
                    <span>NÃO</span>
                    <input type="checkbox" id="${normalizedBaseId}-nao" ${dataAttribute}="${payloadItem}" ${checkedNao} />
                </div>
            </div>
        `;
    };

    // Metodologia em formato de tabela SIM/NÃO
    const metodologiasString = data.metodologias || '';
    const metodologiasHtml = METODOLOGIAS_MAP.map(m =>
        generateCheckboxItem(m.display, m.payload, 'data-metodo', metodologiasString)
    );

    // Recursos em formato de tabela SIM/NÃO
    // ATENÇÃO: Usa a string completa de recursos.
    const recursosString = data.recursos || ''; 
    const recursosHtml = RECURSOS_MAP.map(r =>
        generateCheckboxItem(r.display, r.payload, 'data-recurso', recursosString)
    );

    // Avaliação em formato de tabela SIM/NÃO
    const avaliacaoString = data.avaliacao || '';
    const avaliacaoHtml = AVALIACOES_MAP.map(a =>
        generateCheckboxItem(a.display, a.payload, 'data-avaliacao', avaliacaoString)
    );
    
    // Divide os itens em colunas para o layout do PDF
    const metadeMetodologias = Math.ceil(METODOLOGIAS_MAP.length / 2);
    const metodologiasCol1 = metodologiasHtml.slice(0, metadeMetodologias).join('');
    const metodologiasCol2 = metodologiasHtml.slice(metadeMetodologias).join('');

    const metadeRecursos = Math.ceil(RECURSOS_MAP.length / 2);
    const recursosCol1 = recursosHtml.slice(0, metadeRecursos).join('');
    const recursosCol2 = recursosHtml.slice(metadeRecursos).join('');
    
    const metadeAvaliacoes = Math.ceil(AVALIACOES_MAP.length / 2);
    const avaliacaoCol1 = avaliacaoHtml.slice(0, metadeAvaliacoes).join('');
    const avaliacaoCol2 = avaliacaoHtml.slice(metadeAvaliacoes).join('');

    // ----------------------------------------------------
    // 4. Montagem do Template HTML (Injeção de Dados)
    // ----------------------------------------------------

    const semestre = data.semestre || 'N/A';
    const ano = data.ano || 'N/A';

    // @param {object} data
    // @returns {string}
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
    <head>
        <meta charset="UTF-8" />
        <title>Plano de Ensino - ${data.nomeDisciplina || 'N/A'}</title>
        <style>
            /* Seu CSS do Template PDF permanece inalterado */
            body {
                background: #e0e0e0;
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                font-size: 11pt;
            }

            .page-a4 {
                width: 21cm;
                min-height: 29.7cm;
                margin: 1cm auto;
                background: white;
                box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
                box-sizing: border-box;
                position: relative;
            }
            .page-a4::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: -1; /* Manda a marca d'água para trás do conteúdo */
                
                /* Configuração da Imagem */
                background-image: url('${BASE_URL}/logos/MarcaDaAgua-removebg-preview.png');
                background-repeat: no-repeat;
                background-position: center center;
                background-size: 80%; /* Ajuste o tamanho conforme necessário (ex: 50% ou 80%) */
                opacity: 0.1; /* ESSENCIAL: Deixa a imagem transparente */
                pointer-events: none; /* Garante que não interfira com seleção de texto */
            }

            .logo-container {
                text-align: center;
                margin-bottom: 0px;
                line-height: 0.5;
            }
            .logo-container img {
                width: 8cm;
                height: auto;
                margin: 0 auto;
                vertical-align: top;
            }
            .logo-container p {
                margin: 0;
                padding: 0;
            }

            hr {
                border: 0;
                height: 1px;
                background: #333;
                margin: 1px 0;
            }

            .info-block {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                font-size: 8pt;
                text-transform: uppercase;
                font-weight: bold;
            }
            .info-item {
                width: 18%;
                padding: 0px 0;
                box-sizing: border-box;
            }

            .disciplina-line {
                font-size: 8pt;
                font-weight: bold;
                text-transform: uppercase;
                padding: 2px 0;
            }
            .plano-titulo-line {
                font-size: 8pt;
                font-weight: bold;
                text-align: center;
                text-transform: uppercase;
                padding: 1px 0;
            }

            .objetivo-line,
            .ementa-line,
            .metodologia-titulo,
            .recursos-titulo,
            .avaliacao-titulo,
            .bibliografia-titulo,
            .conteudo-line {
                font-size: 9pt;
                font-weight: bold;
                text-transform: uppercase;
                margin-top: 10px;
                padding: 0;
            }
            .objetivos-content,
            .ementa-content,
            .conteudo-content {
                font-size: 9pt;
                padding: 0 0 5px 0;
                text-align: justify;
            }
            .objetivos-content ul {
                list-style-type: disc;
                margin-top: 2px;
                padding-left: 20px;
            }
            .objetivos-content li {
                margin-bottom: 3px;
            }

            .metodologia-container,
            .recursos-container,
            .avaliacao-container {
                font-size: 9pt;
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                padding: 5px 0;
            }

            .metodologia-coluna,
            .recursos-coluna,
            .avaliacao-coluna {
                width: 48%;
            }

            .metodologia-item,
            .recursos-item,
            .avaliacao-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2px;
            }

            .metodologia-opcoes,
            .recursos-opcoes,
            .avaliacao-opcoes {
                display: flex;
                align-items: center;
                font-weight: bold;
                text-transform: uppercase;
            }

            .metodologia-opcoes span,
            .recursos-opcoes span,
            .avaliacao-opcoes span {
                margin-right: 5px;
                margin-left: 10px;
            }

            .metodologia-opcoes input[type="checkbox"],
            .recursos-opcoes input[type="checkbox"],
            .avaliacao-opcoes input[type="checkbox"] {
                width: 12px;
                height: 12px;
                margin: 0;
                border: 1px solid #333;
                -webkit-appearance: none;
                appearance: none;
                cursor: pointer;
                vertical-align: middle;
            }

            .metodologia-opcoes input[type="checkbox"]:checked,
            .recursos-opcoes input[type="checkbox"]:checked,
            .avaliacao-opcoes input[type="checkbox"]:checked {
                background-color: #333 ;
            }

            .nota-recursos {
                font-size: 8pt;
                text-align: left;
                margin-top: 5px;
                padding-left: 5px;
            }

            .bibliografia-content {
                font-size: 9pt;
                padding: 5px 0 5px 0;
                text-align: justify;
            }

            @media print {
            .page-a4::before {
                    content: '';
                    position: fixed; /* Fixa a imagem no viewport (para todas as páginas) */
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: -1;
                    
                    background-image: url('${BASE_URL}/logos/MarcaDaAgua-removebg-preview.png'); 
                    background-repeat: no-repeat;
                    background-position: center center;
                    background-size: 80%; 
                    opacity: 0.1;
                }
                body,
                .page-a4 {
                    background: white;
                    width: 21cm;
                    min-height: 29.7cm;
                    margin: 0;
                    box-shadow: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="page-a4">
            <div class="logo-container">
                <img src="${BASE_URL}/logos/LogoUnifenasPlano.png" alt="Logo da Instituição" />
            </div>

            <hr />

            <div class="info-block">
                <div class="info-item">CURSO: ${data.nomeCurso || 'N/A'}</div>
                <div class="info-item">SEMESTRE: ${semestre}</div>
                <div class="info-item">ANO: ${ano}</div>
                <div class="info-item">C/H: ${data.horasTotais || 'N/A'}</div>
                <div class="info-item">AULAS: ${data.semanas || 'N/A'}</div>
            </div>

            <hr />

            <div class="disciplina-line">DISCIPLINA: ${data.nomeDisciplina || 'N/A'}</div>
            <hr />
            <div class="plano-titulo-line">PLANO DE ENSINO</div>
            <hr />

            <div class="objetivo-line">OBJETIVOS</div>
            <div class="objetivos-content"><ul>${objetivosHtml}</ul></div>

            <hr />
            <div class="ementa-line">EMENTA:</div>
            <div class="ementa-content">${ementaHtml}</div>
            <hr />

            <div class="metodologia-titulo">METODOLOGIA:</div>
            <div class="metodologia-container">
                <div class="metodologia-coluna">
                    ${metodologiasCol1}
                </div>
                <div class="metodologia-coluna">
                    ${metodologiasCol2}
                </div>
            </div>
            <hr />

            <div class="recursos-titulo">RECURSOS AUXILIARES:</div>
            <div class="recursos-container">
                <div class="recursos-coluna">
                    ${recursosCol1}
                </div>
                <div class="recursos-coluna">
                    ${recursosCol2}
                </div>
            </div>
            <p class="nota-recursos">
                *O AVA (Ambiente Virtual de Aprendizagem) abrange todos os recursos
                digitais internos da instituição.
            </p>

            <hr />

            <div class="avaliacao-titulo">AVALIAÇÃO:</div>
            <div class="avaliacao-container">
                <div class="avaliacao-coluna">
                    ${avaliacaoCol1}
                </div>
                <div class="avaliacao-coluna">
                    ${avaliacaoCol2}
                </div>
            </div>
            <hr />

            <div class="bibliografia-titulo">BIBLIOGRAFIA BÁSICA:</div>
            <div class="bibliografia-content" id="bibliografia-basica-content">
                ${basicas}
            </div>

            <hr />

            <div class="bibliografia-titulo">BIBLIOGRAFIA COMPLEMENTAR:</div>
            <div class="bibliografia-content" id="bibliografia-complementar-content">
                ${complementares}
            </div>

            <hr />

            <div class="logo-container">
                <img src="${BASE_URL}/logos/LogoUnifenasPlano.png" alt="Logo da Instituição" />
            </div>

            <hr />

            <div class="info-block">
                <div class="info-item">CURSO: ${data.nomeCurso || 'N/A'}</div>
                <div class="info-item">SEMESTRE: ${semestre}</div>
                <div class="info-item">ANO: ${ano}</div>
                <div class="info-item">C/H: ${data.horasTotais || 'N/A'}</div>
                <div class="info-item">AULAS: ${data.semanas || 'N/A'}</div>
            </div>

            <hr />

            <div class="disciplina-line">DISCIPLINA: ${data.nomeDisciplina || 'N/A'}</div>
            <hr />
            <div class="plano-titulo-line">PLANO DE ENSINO</div>
            <hr />

            <div class="conteudo-line">DESENVOLVIMENTO DA AULA (CRONOGRAMA DE AULAS)</div>
            <div class="conteudo-content">${desenvolvimentoHtml}</div>
        </div>
    </body>
</html>
    `;

    return htmlContent;
}

// Endpoint principal para o chat.
app.post("/api/chat", async (req, res) => {
    const { message, context } = req.body;
    
    // PROMPT REFORÇADO PARA O COMANDO 'GERAR'
    const prompt = `
        Você é um assistente de IA para um gerador de plano de aula (PLANO DE ENSINO). Sua tarefa é analisar o contexto do plano de aula e a mensagem do usuário, e gerar o conteúdo acadêmico.

        **REGRAS CRÍTICAS DE FORMATAÇÃO (Obrigatórias):**

        1.  **Listas (Objetivos, Recursos, Referências):** O conteúdo deve ser uma lista de itens, OBRIGATORIAMENTE separados por um único caractere de quebra de linha (\\n).
            * Exemplo de Objetivos: "Definir robótica\\nDiscutir princípios\\nDesenvolver sistemas."
            * Exemplo de Referências (ABNT/Vancouver): "AUTOR, A. Livro X...\\nAUTOR, B. Livro Y..."

        2.  **Bloco de Texto (Desenvolvimento, Ementa/Tópicos):** O conteúdo deve ser um bloco de texto detalhado, onde cada parágrafo, tópico de aula ou semana de aula OBRIGATORIAMENTE é separado por um único caractere de quebra de linha (\\n). Use **\\n** para criar o espaçamento entre as semanas/tópicos.

        **SAÍDA ESPERADA:**
        Você deve retornar um objeto JSON **estritamente e somente** com dois campos: 'comando' e 'dados'.
        - O campo 'comando' deve ser: 'ALTERAR', 'GERAR' ou 'INVALIDO'.
        - O campo 'dados' deve ser o JSON completo do plano de aula atualizado/gerado.

        **Comando de Alteração ('ALTERAR'):**
        Se a mensagem for uma instrução de mudança, o campo 'comando' é 'ALTERAR'. O campo 'dados' é o JSON atualizado. **Após qualquer alteração, você DEVE re-gerar TODO o conteúdo dos campos de texto (objetivos, desenvolvimento, referencias) para refletir o novo contexto da disciplina/curso, seguindo as REGRAS CRÍTICAS de FORMATAÇÃO.**

        **Comando de Geração ('GERAR'):**
        Se a mensagem for uma confirmação final ('sim', 'pode gerar'), o campo 'comando' é 'GERAR'. Você DEVE preencher todos os campos vazios de conteúdo e retornar o JSON completo no campo 'dados', seguindo as **REGRAS CRÍTICAS de FORMATAÇÃO** acima.

        Os campos do JSON que você DEVE manipular são: 'nivelEnsino', 'formatoAula', 'nomeCurso', 'nomeDisciplina', 'horasTotais', 'semanas', 'numReferencias', 'numReferenciasComp', 'avaliacao', 'metodologias', 'objetivos', 'recursos', 'desenvolvimento', 'referencias'.
        
        **Os valores para 'avaliacao', 'metodologias' e 'recursos' DEVEM ser as listas de strings exatas do front-end separadas por vírgula (Ex: "Prova Discursiva, Prova Oral", "Trabalho de Grupo, Debate", "Laboratório, Internet").**

        ---
        Contexto do Plano de Aula (dados atuais):
        ${JSON.stringify(context, null, 2)}

        Mensagem do usuário: "${message}"

        Sua resposta (somente o objeto JSON completo):
    `;

    let updatedData = context;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            const aiResponse = await model.generateContent(prompt);
            const textResponse = aiResponse.response.text().trim();
            
            // Remove a marcação de código JSON que o modelo adiciona
            const cleanedResponse = textResponse.replace(/```json\n?|```/g, "").trim();
            
            try {
                const responseJson = JSON.parse(cleanedResponse);
                const command = responseJson.comando;
                // Assume que 'dados' é o plano de aula atualizado
                updatedData = responseJson.dados;

                let confirmationMessage = "";
                let htmlResponse = "";

                if (command === "GERAR") {
                    confirmationMessage = "Plano de aula gerado com sucesso! Utilize o botão 'Baixar PDF' para finalizar.";
                    // GERAÇÃO DE HTML GARANTIDA AQUI
                    htmlResponse = generateHtmlFromContext(updatedData); 
                } else if (command === "ALTERAR") {
                    confirmationMessage = "Entendido! O plano ao lado foi atualizado. Posso ajudar com algo mais?";
                    // GERAÇÃO DE HTML GARANTIDA AQUI
                    htmlResponse = generateHtmlFromContext(updatedData);
                } else { // INVALIDO
                    confirmationMessage = "Desculpe, não entendi. Por favor, tente novamente com uma solicitação mais clara. Para gerar o plano, digite 'sim'.";
                    // GERAÇÃO DE HTML GARANTIDA AQUI (Com contexto original)
                    htmlResponse = generateHtmlFromContext(context);
                    updatedData = context;
                }

                // SEMPRE envia o htmlResponse
                res.json({ response: confirmationMessage, updatedData: updatedData, htmlResponse: htmlResponse });
                return;

            } catch (e) {
                // CASO DE ERRO DE PARSE: GARANTIMOS O HTML DE CONTEXTO
                console.error("Erro ao parsear JSON da IA:", textResponse);
                const invalidMessage = "Desculpe, não entendi. Houve um erro no processamento. Por favor, tente novamente.";
                
                // Garante que o preview use o CONTEXTO ORIGINAL (dados do formulário)
                const htmlResponse = generateHtmlFromContext(context); 
                res.json({ response: invalidMessage, updatedData: context, htmlResponse: htmlResponse });
                return;
            }
            
        } catch (error) {
            if (error.status === 429 && retryCount < maxRetries - 1) {
                retryCount++;
                const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                console.warn(`Erro 429. Tentando novamente em ${delayMs}ms... (Tentativa ${retryCount} de ${maxRetries})`);
                await delay(delayMs);
            } else {
                console.error("Erro na API do Gemini:", error);
                res.status(500).json({ error: "Erro ao processar a solicitação após várias tentativas. Verifique a chave e o nome do modelo." });
                return;
            }
        }
    }

    res.status(500).json({ error: "Erro ao processar a solicitação após várias tentativas." });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

// Endpoint para gerar PDF
app.post("/api/generate-pdf", async (req, res) => {
    const { htmlContent } = req.body;

    if (!htmlContent) {
        return res.status(400).send("Conteúdo HTML não fornecido.");
    }

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: "networkidle0",
            url: `file://${path.resolve(__dirname).replace(/\\/g, '/')}/`
        });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true, // ESSENCIAL para fundos e cores do CSS
            margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });

        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="plano_de_aula.pdf"'
        );
        res.send(pdf);
    } catch (error) {
        console.error("Erro ao gerar o PDF:", error);
        res.status(500).send("Erro ao gerar o PDF. Por favor, tente novamente.");
    }
});