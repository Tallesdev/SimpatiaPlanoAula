const path = require("path");
const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const Groq = require("groq-sdk");

// Única instância do cliente Groq — usada em todos os endpoints
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
const port = 3000;
const BASE_URL = `http://localhost:${port}`;

app.use(express.static(path.join(__dirname)));
app.use(cors());
app.use(express.json());

// Função para adicionar um atraso (retry em caso de rate limit)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Knowledge base: tudo que a IA precisa saber sobre o módulo ──
const SIMPATIA_KNOWLEDGE = `
Você é o assistente de ajuda do SIMPATIA, um sistema de geração de Planos de Aula 
desenvolvido pela Unifenas (Universidade José do Rosário Vellano).

Seu papel é responder dúvidas dos professores sobre como usar o módulo "Plano de Aula". 
Responda sempre em português, de forma clara, objetiva e amigável.
Use formatação HTML simples quando ajudar a clareza: <strong> para termos importantes, 
<br> para quebras de linha. Não use markdown (asteriscos, cerquilhas etc.).
Nunca invente funcionalidades que não existem no sistema descrito abaixo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIÇÃO GERAL DO MÓDULO PLANO DE AULA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O módulo Plano de Aula do SIMPATIA permite que professores gerem automaticamente 
um Plano de Ensino institucional no padrão da Unifenas, preenchendo um formulário 
e interagindo com um chat baseado em Inteligência Artificial (Groq).

O resultado final é um documento formatado que pode ser visualizado na tela e 
baixado como arquivo PDF.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPOS DO FORMULÁRIO (Painel Esquerdo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NÍVEL DE ENSINO (select)
   - Opções: Ensino Fundamental, Ensino Médio, Ensino Superior
   - Define o nível acadêmico do plano de aula gerado.

2. FORMATO DA AULA (select)
   - Opções: Presencial, EAD, Híbrida
   - Define a modalidade de ensino da disciplina.

3. NOME DO CURSO (texto livre)
   - Ex: "Ciências da Computação", "Medicina", "Direito"
   - Nome completo do curso ao qual a disciplina pertence.

4. NOME DA DISCIPLINA (texto livre)
   - Ex: "Banco de Dados", "Anatomia", "Direito Civil"
   - Nome exato da disciplina para a qual o plano será gerado.

5. HORAS TOTAIS (número)
   - Carga horária total da disciplina em horas.
   - Ex: 80 horas.

6. SEMANAS (número)
   - Quantidade de semanas que a disciplina possui.
   - A IA usará esse número para dividir o conteúdo em um cronograma semanal.
   - Ex: 8 semanas → o plano terá Semana 1, Semana 2... Semana 8.

7. Nº DE REFERÊNCIAS (número)
   - Quantidade de referências bibliográficas básicas que a IA deve gerar.
   - Essas referências aparecerão na seção "BIBLIOGRAFIA BÁSICA" do plano.

8. Nº DE REFERÊNCIAS COMPLEMENTARES (número)
   - Quantidade de referências complementares que a IA deve gerar.
   - Aparecerão na seção "BIBLIOGRAFIA COMPLEMENTAR" do plano.

9. SEMESTRE (texto livre)
   - Ex: "1º Semestre", "2", "Segundo Semestre"
   - Semestre letivo em que a disciplina é ministrada.

10. ANO (número)
    - Ex: 2025
    - Ano letivo do plano de ensino.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÕES DE CHECKBOX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MÉTODOS DE AVALIAÇÃO (checkboxes — múltipla seleção):
- Prova Discursiva
- Prova Prática
- Prova de Múltipla Escolha
- Trabalhos de Pesquisa
- Prova Oral
O professor marca quais métodos serão utilizados. 
No plano gerado, cada método aparece com SIM (marcado) ou NÃO (desmarcado).

METODOLOGIAS (checkboxes — múltipla seleção):
- Exposição Dialogada, Estudo de Caso, Trabalho de Grupo, Seminário, Debate,
  Painel, TBL, Fórum/Chat, PBL, PBLe, Aula Invertida, Tempestade Cerebral,
  Mapa Conceitual, Dramatização
O professor seleciona as metodologias de ensino que usará.
No plano gerado, cada metodologia aparece com SIM (marcado) ou NÃO (desmarcado).

RECURSOS AUXILIARES (checkboxes — múltipla seleção):
- Computador, Vídeos, AVA*, Atividades Clínicas, Lousa, Internet,
  Laboratório, Vídeo Conferência, Prancheta Digitalizadora, Projetor Multimídia,
  Álbuns Seriados, Slides, Manequins, Lousa Eletrônica
* AVA = Ambiente Virtual de Aprendizagem (plataformas digitais internas da Unifenas)
No plano gerado, cada recurso aparece com SIM (marcado) ou NÃO (desmarcado).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUXO DE USO PASSO A PASSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASSO 1 — Preencher o formulário
  O professor preenche todos os campos: nível de ensino, formato, curso, disciplina,
  horas totais, semanas, número de referências, semestre, ano, e marca os checkboxes
  de avaliação, metodologias e recursos.

PASSO 2 — Clicar em "Gerar Confirmação"
  O botão roxo "Gerar Confirmação" coleta todos os dados do formulário e exibe 
  uma mensagem no chat (painel inferior esquerdo) resumindo as informações 
  preenchidas para o professor revisar.

PASSO 3 — Confirmar ou ajustar pelo chat
  O professor lê a confirmação no chat.
  - Se estiver correto: digita "sim" ou "pode gerar" no chat e pressiona Enter.
  - Se quiser ajustar: digita a alteração desejada no chat. 
    Ex: "Mude a disciplina para Estrutura de Dados" ou "Adicione TBL nas metodologias".
  A IA entende pedidos de alteração em linguagem natural.

PASSO 4 — Visualizar o plano gerado
  Após confirmar, a IA gera o conteúdo completo (objetivos, ementa, cronograma,
  referências) e o plano aparece formatado no painel direito da tela,
  no padrão institucional da Unifenas com logo e todas as seções.

PASSO 5 — Baixar o PDF
  Após o plano ser gerado, o botão "Baixar PDF" aparece abaixo do painel direito.
  Ao clicar, o sistema gera e baixa automaticamente um arquivo PDF chamado
  "plano_de_aula.pdf" pronto para uso institucional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUTURA DO PLANO GERADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O plano gerado segue o modelo institucional da Unifenas e contém:
- Cabeçalho: Logo da Unifenas, Curso, Semestre, Ano, C/H (carga horária), Aulas (semanas)
- Disciplina
- PLANO DE ENSINO (título)
- OBJETIVOS: lista de objetivos gerados pela IA com base na Taxonomia de Bloom
- EMENTA: tópicos da disciplina
- METODOLOGIA: tabela com todas as metodologias em formato SIM/NÃO
- RECURSOS AUXILIARES: tabela com todos os recursos em formato SIM/NÃO
- AVALIAÇÃO: tabela com os métodos de avaliação em formato SIM/NÃO
- BIBLIOGRAFIA BÁSICA: referências no número solicitado
- BIBLIOGRAFIA COMPLEMENTAR: referências complementares no número solicitado
- DESENVOLVIMENTO DA AULA (CRONOGRAMA DE AULAS): conteúdo dividido por semanas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DÚVIDAS FREQUENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

P: Posso editar o plano depois de gerar?
R: Sim. O professor pode digitar pedidos de alteração no chat após a geração.
   Ex: "Adicione mais um objetivo" ou "Mude o método de avaliação para Prova Oral".
   A IA atualiza o plano e o painel direito é recarregado automaticamente.

P: O que acontece se eu não preencher todos os campos?
R: O sistema exige pelo menos o nome da disciplina ou do curso para gerar a confirmação.
   Campos vazios aparecerão como "N/A" no plano. Recomenda-se preencher todos os campos
   para um plano mais completo e preciso.

P: Posso gerar planos para qualquer disciplina?
R: Sim. O sistema é genérico e funciona para qualquer disciplina de qualquer curso.
   A IA adapta objetivos, ementa, cronograma e referências conforme o contexto informado.

P: As referências bibliográficas são reais?
R: As referências são geradas pela IA (Groq). Recomenda-se que o professor revise
   as referências antes de usar o documento oficialmente, pois a IA pode gerar 
   referências imprecisas.

P: O PDF gerado é o documento oficial?
R: O PDF segue o padrão visual da Unifenas. A validade institucional depende da 
   aprovação pelo coordenador ou setor responsável da universidade.

P: Qual IA é usada para gerar o plano?
R: O módulo Plano de Aula usa o Groq (modelo llama-3.1-8b-instant) para gerar
   o conteúdo acadêmico do plano.

P: Posso usar o módulo em dispositivos móveis?
R: A interface é responsiva. Em telas menores, os painéis se reorganizam verticalmente.
   A experiência é otimizada para desktops.
`;

// ----------------------------------------------------
// 0. Marca d'água (watermark) em padrão repetido/diagonal
// ----------------------------------------------------

// Edite este texto para mudar o conteúdo da marca d'água.
const WATERMARK_TEXT = "Documento gerado por IA — sujeito à revisão institucional, sem valor legal.";

// Gera um "data URI" de um SVG com o texto rotacionado, que será usado
// como background-image repetido (background-repeat: repeat), criando
// o efeito de marca d'água diagonal e tilada (igual ao padrão usado em
// PDFs de e-book / Minha Biblioteca, como no exemplo do Robótica.pdf).
function buildWatermarkDataUri(text, options = {}) {
    const tileWidth = options.tileWidth || 650;
    const tileHeight = options.tileHeight || 320;
    const fontSize = options.fontSize || 25;
    const angle = options.angle ?? -28;
    const color = options.color || "rgba(70,70,70,0.35)";

    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}"
             viewBox="0 0 ${tileWidth} ${tileHeight}">
            <text x="${tileWidth / 2}" y="${tileHeight / 2}"
                  text-anchor="middle" dominant-baseline="middle"
                  transform="rotate(${angle} ${tileWidth / 2} ${tileHeight / 2})"
                  font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
                  fill="${color}">${escapedText}</text>
        </svg>
    `;

    // Base64 evita problemas de encoding com acentos (ã, ç, é, etc.) no data URI.
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

// ----------------------------------------------------
// 1. Definições das Listas e Mapeamento
// ----------------------------------------------------

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

const RECURSOS_MAP = [
    { display: "Computador", payload: "Computador" },
    { display: "Vídeos", payload: "Videos" },
    { display: "Projetor Multimídia", payload: "Projetor Multimidia" },
    { display: "Álbuns Seriados", payload: "Albuns Seriados" },
    { display: "Slides", payload: "Slides" },
    { display: "Manequins", payload: "Manequins" },
    { display: "Lousa Eletrônica", payload: "Lousa Eletrônica" },
    { display: "AVA*", payload: "AVA" },
    { display: "Atividades clínicas", payload: "Atividades Clinicas" },
    { display: "Lousa", payload: "Lousa" },
    { display: "Internet", payload: "Internet" },
    { display: "Laboratório", payload: "Laboratório" },
    { display: "Vídeo conferência", payload: "Video Conferencia" },
    { display: "Prancheta Digitalizadora", payload: "Prancheta Digitalizadora" }
];

const AVALIACOES_MAP = [
    { display: "Discursiva", payload: "Prova Discursiva" },
    { display: "Múltipla escolha", payload: "Prova de Múltipla Escolha" },
    { display: "Oral", payload: "Prova Oral" },
    { display: "Prática", payload: "Prova Prática" },
    { display: "Trabalhos de pesquisa", payload: "Trabalhos de Pesquisa" }
];

// ----------------------------------------------------
// 2. Geração do HTML do plano de aula
// ----------------------------------------------------

function generateHtmlFromContext(data) {
    const watermarkDataUri = buildWatermarkDataUri(WATERMARK_TEXT);

    const objetivosHtml = data.objetivos ? data.objetivos.split('\n')
        .map(o => o.trim())
        .filter(o => o.length > 0)
        .map(o => `<li>${o}</li>`).join('') : 'Não Gerado';

    const desenvolvimentoHtml = data.desenvolvimento ? data.desenvolvimento.replace(/\n/g, '<br>') : 'Não Gerado';
    const ementaHtml = data.topicos ? data.topicos.replace(/\n/g, '<br>') : 'Não Gerado';

    const referenciasTexto = data.referencias || '';
    const referenciasArray = referenciasTexto.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const numReferenciasBasicas = parseInt(data.numReferencias) > 0 ? parseInt(data.numReferencias) : 3;

    const basicas = referenciasArray.slice(0, numReferenciasBasicas).join('<br>') || 'N/A';
    const complementares = referenciasArray.slice(numReferenciasBasicas).join('<br>') || 'N/A';

    const generateCheckboxItem = (displayItem, payloadItem, dataAttribute, selectedString) => {
        const regex = new RegExp(`(^|,\\s*)${payloadItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*,|$)`, 'i');
        const isSelected = selectedString && regex.test(selectedString);

        const checkedSim = isSelected ? 'checked' : '';
        const checkedNao = isSelected ? '' : 'checked';

        const normalizedBaseId = displayItem.toLowerCase().replace(/[\s()/\*\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

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

    const metodologiasString = data.metodologias || '';
    const metodologiasHtml = METODOLOGIAS_MAP.map(m =>
        generateCheckboxItem(m.display, m.payload, 'data-metodo', metodologiasString)
    );

    const recursosString = data.recursos || '';
    const recursosHtml = RECURSOS_MAP.map(r =>
        generateCheckboxItem(r.display, r.payload, 'data-recurso', recursosString)
    );

    const avaliacaoString = data.avaliacao || '';
    const avaliacaoHtml = AVALIACOES_MAP.map(a =>
        generateCheckboxItem(a.display, a.payload, 'data-avaliacao', avaliacaoString)
    );

    const metadeMetodologias = Math.ceil(METODOLOGIAS_MAP.length / 2);
    const metodologiasCol1 = metodologiasHtml.slice(0, metadeMetodologias).join('');
    const metodologiasCol2 = metodologiasHtml.slice(metadeMetodologias).join('');

    const metadeRecursos = Math.ceil(RECURSOS_MAP.length / 2);
    const recursosCol1 = recursosHtml.slice(0, metadeRecursos).join('');
    const recursosCol2 = recursosHtml.slice(metadeRecursos).join('');

    const metadeAvaliacoes = Math.ceil(AVALIACOES_MAP.length / 2);
    const avaliacaoCol1 = avaliacaoHtml.slice(0, metadeAvaliacoes).join('');
    const avaliacaoCol2 = avaliacaoHtml.slice(metadeAvaliacoes).join('');

    const semestre = data.semestre || 'N/A';
    const ano = data.ano || 'N/A';

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
    <head>
        <meta charset="UTF-8" />
        <title>Plano de Ensino - ${data.nomeDisciplina || 'N/A'}</title>
        <style>
            body {
                background: #e0e0e0;
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                font-size: 15pt;
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
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: -1;
                background-image: url('${BASE_URL}/logos/MarcaDaAgua-removebg-preview.png');
                background-repeat: no-repeat;
                background-position: center center;
                background-size: 80%;
                opacity: 0.1;
                pointer-events: none;
            }
            .watermark-pattern {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 999;
                pointer-events: none;
                background-image: url('${watermarkDataUri}');
                background-repeat: repeat;
                background-position: top left;
            }
            .logo-container { text-align: center; margin-bottom: 0px; line-height: 0.5; }
            .logo-container img { width: 8cm; height: auto; margin: 0 auto; vertical-align: top; }
            .logo-container p { margin: 0; padding: 0; }
            hr { border: 0; height: 1px; background: #333; margin: 1px 0; }
            .info-block { display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 13pt; text-transform: uppercase; font-weight: bold; }
            .info-item { width: 18%; padding: 0px 0; box-sizing: border-box; }
            .disciplina-line { font-size: 13pt; font-weight: bold; text-transform: uppercase; padding: 2px 0; }
            .plano-titulo-line { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; padding: 1px 0; }
            .objetivo-line, .ementa-line, .metodologia-titulo, .recursos-titulo,
            .avaliacao-titulo, .bibliografia-titulo, .conteudo-line {
                font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 10px; padding: 0;
            }
            .objetivos-content, .ementa-content, .conteudo-content { font-size: 14pt; padding: 0 0 5px 0; text-align: justify; }
            .objetivos-content ul { list-style-type: disc; margin-top: 2px; padding-left: 20px; }
            .objetivos-content li { margin-bottom: 3px; }
            .metodologia-container, .recursos-container, .avaliacao-container {
                font-size: 14pt; display: flex; flex-wrap: wrap; justify-content: space-between; padding: 5px 0;
            }
            .metodologia-coluna, .recursos-coluna, .avaliacao-coluna { width: 48%; }
            .metodologia-item, .recursos-item, .avaliacao-item {
                display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;
            }
            .metodologia-opcoes, .recursos-opcoes, .avaliacao-opcoes {
                display: flex; align-items: center; font-weight: bold; text-transform: uppercase;
            }
            .metodologia-opcoes span, .recursos-opcoes span, .avaliacao-opcoes span { margin-right: 5px; margin-left: 10px; }
            .metodologia-opcoes input[type="checkbox"],
            .recursos-opcoes input[type="checkbox"],
            .avaliacao-opcoes input[type="checkbox"] {
                width: 12px; height: 12px; margin: 0; border: 1px solid #333;
                -webkit-appearance: none; appearance: none; cursor: pointer; vertical-align: middle;
            }
            .metodologia-opcoes input[type="checkbox"]:checked,
            .recursos-opcoes input[type="checkbox"]:checked,
            .avaliacao-opcoes input[type="checkbox"]:checked { background-color: #333; }
            .nota-recursos { font-size: 12pt; text-align: left; margin-top: 5px; padding-left: 5px; }
            .bibliografia-content { font-size: 14pt; padding: 5px 0 5px 0; text-align: justify; }
            @media print {
                .page-a4::before {
                    content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: -1;
                    background-image: url('${BASE_URL}/logos/MarcaDaAgua-removebg-preview.png');
                    background-repeat: no-repeat; background-position: center center;
                    background-size: 80%; opacity: 0.1;
                }
                .watermark-pattern {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999;
                    background-image: url('${watermarkDataUri}');
                    background-repeat: repeat; background-position: top left;
                }
                body, .page-a4 { background: white; width: 21cm; min-height: 29.7cm; margin: 0; box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="page-a4">
            <div class="watermark-pattern"></div>
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
                <div class="metodologia-coluna">${metodologiasCol1}</div>
                <div class="metodologia-coluna">${metodologiasCol2}</div>
            </div>
            <hr />
            <div class="recursos-titulo">RECURSOS AUXILIARES:</div>
            <div class="recursos-container">
                <div class="recursos-coluna">${recursosCol1}</div>
                <div class="recursos-coluna">${recursosCol2}</div>
            </div>
            <p class="nota-recursos">
                *O AVA (Ambiente Virtual de Aprendizagem) abrange todos os recursos
                digitais internos da instituição.
            </p>
            <hr />
            <div class="avaliacao-titulo">AVALIAÇÃO:</div>
            <div class="avaliacao-container">
                <div class="avaliacao-coluna">${avaliacaoCol1}</div>
                <div class="avaliacao-coluna">${avaliacaoCol2}</div>
            </div>
            <hr />
            <div class="bibliografia-titulo">BIBLIOGRAFIA BÁSICA:</div>
            <div class="bibliografia-content" id="bibliografia-basica-content">${basicas}</div>
            <hr />
            <div class="bibliografia-titulo">BIBLIOGRAFIA COMPLEMENTAR:</div>
            <div class="bibliografia-content" id="bibliografia-complementar-content">${complementares}</div>
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

// ----------------------------------------------------
// 3. Endpoint principal: /api/chat (geração do plano)
// ----------------------------------------------------

app.post("/api/chat", async (req, res) => {
    const { message, context } = req.body;

    const numSemanas = parseInt(context?.semanas) > 0 ? parseInt(context?.semanas) : null;

    const prompt = `
        Você é um assistente de IA para um gerador de plano de aula (PLANO DE ENSINO). Sua tarefa é analisar o contexto do plano de aula e a mensagem do usuário, e gerar o conteúdo acadêmico.

        **REGRA ANTI-CÓPIA (A MAIS IMPORTANTE DE TODAS):**
        Todo o conteúdo gerado (objetivos, ementa/tópicos, desenvolvimento, referências) deve ser 100% original e específico para a disciplina "${context?.nomeDisciplina || ''}" do curso "${context?.nomeCurso || ''}", exatamente como informado no contexto abaixo.
        NUNCA gere conteúdo sobre um assunto diferente do informado (ex: se a disciplina for "Anatomia", o conteúdo deve ser inteiramente sobre Anatomia, nunca sobre robótica, programação ou qualquer outro tema).
        Quaisquer instruções de formatação abaixo são apenas regras de ESTRUTURA (como separar itens). Elas não contêm nenhum conteúdo de exemplo a ser reaproveitado — não existe texto "modelo" para copiar.

        **REGRAS CRÍTICAS DE FORMATAÇÃO (Obrigatórias):**

        1.  **Listas (Objetivos, Recursos, Referências, Ementa/Tópicos):** O conteúdo deve ser uma lista de itens reais sobre a disciplina, OBRIGATORIAMENTE separados por um único caractere de quebra de linha (\\n), sem marcadores, traços ou numeração no início de cada item.

        2.  **Cronograma (campo 'desenvolvimento'):** ${numSemanas
            ? `Você DEVE gerar EXATAMENTE ${numSemanas} parágrafos, um para cada semana, na ordem "Semana 1" até "Semana ${numSemanas}", cada um separado por um único caractere de quebra de linha (\\n). Cada parágrafo deve descrever um CONTEÚDO ESPECÍFICO E DIFERENTE da disciplina (um subtema, tópico ou habilidade real do assunto), nunca um texto genérico. É PROIBIDO usar frases genéricas e repetidas como "será dedicada à avaliação da disciplina" ou "preparação para a prova final" em mais de uma semana — distribua o conteúdo real da matéria ao longo de TODAS as ${numSemanas} semanas, sem dividir artificialmente em "semanas de aula" e "semanas de avaliação".`
            : `Gere um cronograma detalhado e específico do conteúdo da disciplina, com cada parágrafo/semana separado por um único caractere de quebra de linha (\\n), sem frases genéricas repetidas.`}

        **SAÍDA ESPERADA:**
        Você deve retornar um objeto JSON **estritamente e somente** com dois campos: 'comando' e 'dados'.
        - O campo 'comando' deve ser: 'ALTERAR', 'GERAR' ou 'INVALIDO'.
        - O campo 'dados' deve ser o JSON completo do plano de aula atualizado/gerado.

        **Comando de Alteração ('ALTERAR'):**
        Se a mensagem for uma instrução de mudança, o campo 'comando' é 'ALTERAR'. O campo 'dados' é o JSON atualizado. **Após qualquer alteração, você DEVE re-gerar TODO o conteúdo dos campos de texto (objetivos, topicos, desenvolvimento, referencias) para refletir o novo contexto da disciplina/curso, seguindo as REGRAS CRÍTICAS de FORMATAÇÃO.**

        **Comando de Geração ('GERAR'):**
        Se a mensagem for uma confirmação final ('sim', 'pode gerar'), o campo 'comando' é 'GERAR'. Você DEVE preencher todos os campos vazios de conteúdo e retornar o JSON completo no campo 'dados', seguindo as **REGRAS CRÍTICAS de FORMATAÇÃO** acima.

        Os campos do JSON que você DEVE manipular são: 'nivelEnsino', 'formatoAula', 'nomeCurso', 'nomeDisciplina', 'horasTotais', 'semanas', 'numReferencias', 'numReferenciasComp', 'avaliacao', 'metodologias', 'objetivos', 'topicos', 'recursos', 'desenvolvimento', 'referencias'.

        **'topicos' é a EMENTA da disciplina:** uma lista de tópicos que serão estudados em "${context?.nomeDisciplina || ''}", seguindo a REGRA 1 de formatação.

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
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "user", content: prompt }
                ],
                temperature: 0.4,
                max_tokens: 8192,
            });

            const textResponse = completion.choices?.[0]?.message?.content?.trim() || "";
            const cleanedResponse = textResponse.replace(/```json\n?|```/g, "").trim();

            try {
                const responseJson = JSON.parse(cleanedResponse);
                const command = responseJson.comando;
                updatedData = responseJson.dados;

                let confirmationMessage = "";
                let htmlResponse = "";

                if (command === "GERAR") {
                    confirmationMessage = "Plano de aula gerado com sucesso! Utilize o botão 'Baixar PDF' para finalizar.";
                    htmlResponse = generateHtmlFromContext(updatedData);
                } else if (command === "ALTERAR") {
                    confirmationMessage = "Entendido! O plano ao lado foi atualizado. Posso ajudar com algo mais?";
                    htmlResponse = generateHtmlFromContext(updatedData);
                } else { // INVALIDO
                    confirmationMessage = "Desculpe, não entendi. Por favor, tente novamente com uma solicitação mais clara. Para gerar o plano, digite 'sim'.";
                    htmlResponse = generateHtmlFromContext(context);
                    updatedData = context;
                }

                res.json({ response: confirmationMessage, updatedData: updatedData, htmlResponse: htmlResponse });
                return;

            } catch (e) {
                console.error("Erro ao parsear JSON da IA:", textResponse);
                const invalidMessage = "Desculpe, não entendi. Houve um erro no processamento. Por favor, tente novamente.";
                const htmlResponse = generateHtmlFromContext(context);
                res.json({ response: invalidMessage, updatedData: context, htmlResponse: htmlResponse });
                return;
            }

        } catch (error) {
            // Groq retorna status 429 para rate limit
            if (error?.status === 429 && retryCount < maxRetries - 1) {
                retryCount++;
                const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                console.warn(`Erro 429. Tentando novamente em ${delayMs}ms... (Tentativa ${retryCount} de ${maxRetries})`);
                await delay(delayMs);
            } else {
                console.error("Erro na API do Groq:", error);
                res.status(500).json({ error: "Erro ao processar a solicitação após várias tentativas. Verifique a chave GROQ_API_KEY e tente novamente." });
                return;
            }
        }
    }

    res.status(500).json({ error: "Erro ao processar a solicitação após várias tentativas." });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

// ----------------------------------------------------
// 4. Endpoint: /api/generate-pdf
// ----------------------------------------------------

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

        await page.setContent(htmlContent, {
            waitUntil: "networkidle0",
            url: `file://${path.resolve(__dirname).replace(/\\/g, '/')}/`
        });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });

        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="plano_de_aula.pdf"');
        res.send(pdf);

    } catch (error) {
        console.error("Erro ao gerar o PDF:", error);
        res.status(500).send("Erro ao gerar o PDF. Por favor, tente novamente.");
    }
});

// ----------------------------------------------------
// 5. Endpoint: /api/tutorial (chat de ajuda)
// ----------------------------------------------------

app.post("/api/tutorial", async (req, res) => {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
        return res.status(400).json({ error: "Pergunta não pode ser vazia." });
    }

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: SIMPATIA_KNOWLEDGE },
                { role: "user", content: question.trim() },
            ],
            temperature: 0.4,
            max_tokens: 512,
            top_p: 0.9,
        });

        const answer =
            completion.choices?.[0]?.message?.content?.trim() ||
            "Desculpe, não consegui gerar uma resposta. Tente reformular sua pergunta.";

        res.json({ answer });

    } catch (error) {
        console.error("[/api/tutorial] Erro Groq:", error?.message || error);

        if (error?.message?.includes("API key")) {
            return res.status(500).json({
                answer:
                    "O assistente ainda não está configurado. " +
                    "O administrador precisa adicionar a chave da API Groq no servidor.",
            });
        }

        res.status(500).json({
            answer:
                "Ocorreu um erro ao processar sua pergunta. " +
                "Tente novamente em alguns instantes.",
        });
    }
});