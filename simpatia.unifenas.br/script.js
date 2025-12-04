//Gerar Plano de Aula

// Função para obter as seções selecionadas dos checkbox tópicos especificos
function getSelectedSections() {
  const checkboxes = document.getElementsByName("section");
  const selectedSections = [];

  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      selectedSections.push(checkbox.value);
    }
  });

  return selectedSections;
}

// Função para obter as seções selecionadas dos checkbox metodos de avaliação
function getSelectedSectionsAvaliacao() {
  const check = document.getElementsByName("sectionAvaliacao");
  const selectedSectionsAvaliacao = [];

  check.forEach((checkbox) => {
    if (checkbox.checked) {
      selectedSectionsAvaliacao.push(checkbox.value);
    }
  });

  return selectedSectionsAvaliacao;
}

// Função para obter as seções selecionadas dos checkbox metodologia
function getSelectedSectionsMet() {
  const checkb = document.getElementsByName("sectionMet");
  const selectedSectionsMet = [];

  checkb.forEach((checkbox) => {
    if (checkbox.checked) {
      selectedSectionsMet.push(checkbox.value);
    }
  });

  return selectedSectionsMet;
}

function showAlert(message, type) {
  var alertElement = document.getElementById("alert");
  alertElement.innerHTML = message;
  alertElement.className = "custom-alert " + type;
  alertElement.style.display = "block";

  setTimeout(function () {
    alertElement.style.display = "none";
  }, 3000); // Oculta o alerta após 3 segundos (3000 milissegundos)
}

function CopyTexto(idElemento) {
  var textoCopiado = document.getElementById(idElemento);
  var selecao = window.getSelection();
  var faixa = document.createRange();
  faixa.selectNodeContents(textoCopiado);
  selecao.removeAllRanges();
  selecao.addRange(faixa);
  document.execCommand("copy");

  showAlert("Texto copiado com sucesso!", "success");
}

//esconder o input outro
function esconderOutro() {
  var outroInput = document.getElementById("outroInput");
  outroInput.style.display = "none";
}

//função para mostrar dropdown nível de ensino
function mostrarOutro() {
  var dropdown = document.getElementById("opcoes");
  var outroInput = document.getElementById("outroInput");

  if (dropdown.value === "outro") {
    outroInput.style.display = "block";
    return outroInput.value; // Retorna o valor inserido no campo "Outro"
  } else {
    outroInput.style.display = "none";
    return dropdown.value; // Retorna o valor selecionado no dropdown
  }
}
esconderOutro();

//função para mostrar forma de ensino, ead, presencial ...
function mostrarDrop() {
  var dropdown = document.getElementById("opcao");
  return dropdown.value; // Retorna o valor selecionado no dropdown
}

//função para deixar por padrão os checkbox selecionados
document.addEventListener("DOMContentLoaded", function () {
  // Seletor para todos os checkboxes
  var checkboxes = document.querySelectorAll('input[type="checkbox"]');

  // Itera sobre os checkboxes e desmarca cada um
  checkboxes.forEach(function (checkbox) {
    checkbox.checked = false;
  });
});

// gerar plano de aula completo
function generatePlan() {
  const subject = document.getElementById("subject").value; //Disciplina
  const subject1 = document.getElementById("subject1").value; //Curso
  const horas = document.getElementById("horas").value; //horas
  const semanas = document.getElementById("semanas").value; //semanas
  const avaliacao = document.getElementById("avaliacao").value; //avaliacao
  const ref1 = document.getElementById("ref1").value; //ref1
  const ref2 = document.getElementById("ref2").value; //ref2
  const drop = mostrarOutro();
  const dropForma = mostrarDrop();
  const met = getSelectedSectionsMet();
  const ava = getSelectedSectionsAvaliacao();

  const specificTopic = `
        <h2>Crie um plano de ensino de nível ${drop} para o curso de ${subject1}, na disciplina de ${subject}, ministrada na forma ${dropForma}.</h2>
        <p> Elabore um plano de ensino sobre ${subject} no curso de ${subject1}. Onde deverá abordar
            os conteúdo teóricos e práticos de ${subject}. Apresente
            a ementa e, adicionalmente, o objetivo geral deste programa educacional. A carga horária total da
            disciplina deverá ter ${horas} horas totais. Disponibilize uma divisão dos conteúdos totais
            da disciplina em ${semanas} semanas e detalhe esses conteúdos, a fim de obter um cronograma completo e
            detalhado do conteúdo do curso. O método de avaliação será feito através de ${avaliacao} ${ava}. Deverá ser incluso também ${ref1} referências
            bibliográficas sobre o assunto e ${ref2} referências complementares, podendo ser referências nacionais e internacionais.
        </p>
        <ol>
            <li><strong>Introdução:</strong> Descreva a importância de ${subject} na vida cotidiana ou no contexto da disciplina.</li>
            <li><strong>Objetivos:</strong> Defina os objetivos de aprendizagem de acordo com a Taxonomia de Bloom, destacando o que os alunos devem entender ou ser capazes de fazer ao final da aula.</li>
            <li><strong>Objetivos Específicos:</strong> Defina os objetivos específicos de aprendizagem de acordo com a Taxonomia de Bloom, destacando o que os alunos devem entender ou ser capazes de fazer até o final da disciplina, gere objetivos específicos bem explicativos.</li>
            <li><strong>Metodologia:</strong> Gere o plano de aula de acordo com a metodologia de ensino descrita a frente: ${met}.</li>
            <li><strong>Ementa:</strong> Crie uma ementa em tópicos, que seja clara concisa e objetiva do que o aluno irá estudar durante a disciplina de ${subject}.</li>
            <li><strong>Atividade Inicial:</strong> Proponha uma atividade que ative o conhecimento prévio dos alunos sobre ${subject}. Relacione a atividade com situações práticas ou fundamentos da disciplina.</li>
            <li><strong>Desenvolvimento:</strong> Divida o conteúdo em seções e forneça informações chave sobre ${subject}. Utilize recursos visuais, exemplos práticos e estudos de caso relacionados à disciplina.</li>
            <li><strong>Atividade Prática:</strong> Elabore uma atividade prática que permita aos alunos aplicar o que aprenderam. Inclua perguntas que incentivem a reflexão e a discussão.</li>
            <li><strong>Discussão em Grupo:</strong> Divida os alunos em grupos para discutir diferentes perspectivas ou abordagens relacionadas ao ${subject}. Peça que cada grupo compartilhe suas conclusões com a turma.</li>
            <li><strong>Síntese:</strong> Faça uma revisão dos principais pontos que possam ser abordados durante a aula. Reforce os conceitos chave e destaque sua relevância na disciplina.</li>
            <li><strong>Atividades Avaliativas:</strong> Crie uma atividade de avaliação que permita aos alunos demonstrar sua compreensão do ${subject}. Utilize diferentes formatos, como questões escritas, questões abertas, questões fechadas com no mínimo 10 questões.</li>
            <li><strong>Tarefas de Casa:</strong> Atribua tarefas de casa relacionadas ao ${subject}. Encoraje os alunos a explorarem recursos adicionais para aprofundar seu entendimento.</li>
        </ol>
    `;

  const outputDiv = document.getElementById("output");
  outputDiv.innerHTML = specificTopic;

  // Mostra o botão de cópia se houver texto na div "output"
  const copyButton = document.querySelector(".btnCopi");
  copyButton.style.display =
    outputDiv.innerText.trim() !== "" ? "block" : "none";
}

function generateSpecificTopic() {
  const subject = document.getElementById("subject").value; //Disciplina
  const subject1 = document.getElementById("subject1").value; //Curso
  const horas = document.getElementById("horas").value; //horas
  const semanas = document.getElementById("semanas").value; //semanas
  const avaliacao = document.getElementById("avaliacao").value; //avaliacao
  const ref1 = document.getElementById("ref1").value; //ref1
  const ref2 = document.getElementById("ref2").value; //ref2
  const dropForma = mostrarDrop();

  const met = getSelectedSectionsMet();
  const selectedSections = getSelectedSections();

  let output = `<h2 style="text-align: center;">Gere um tópico específico sobre ${subject}, ministrada na forma ${dropForma}.</h2><ol>`;

  selectedSections.forEach((section) => {
    switch (section) {
      case "introduction":
        output += `<li><strong>Introdução:</strong> Descreva a importância do tema ${subject} na vida cotidiana ou no contexto da disciplina.</li>`;
        break;
      case "objectives":
        output += `<li><strong>Objetivos:</strong> Defina os objetivos de aprendizagem de acordo com a Taxonomia de Bloom, destacando o que os alunos devem entender ou ser capazes de fazer ao final da aula.</li>`;
        break;
      case "ementa":
        output += `<li><strong>Ementa:</strong> Crie uma ementa em tópicos, que seja clara concisa e objetiva do que o aluno irá estudar durante a disciplina de ${subject}.</li>`;
        break;
      case "objectivesEsp":
        output += `<li><strong>Objetivos Específicos:</strong> Defina os objetivos específicos de aprendizagem de acordo com a Taxonomia de Bloom, destacando o que os alunos devem entender ou ser capazes de fazer até o final da disciplina, gere objetivos específicos bem explicativos.</li>`;
        break;
      case "activityInitial":
        output += `<li><strong>Atividade Inicial:</strong> Proponha uma atividade que ative o conhecimento prévio dos alunos sobre ${subject}. Relacione a atividade com situações práticas ou fundamentos da disciplina.</li>`;
        break;
      case "development":
        output += `<li><strong>Desenvolvimento:</strong> Divida o conteúdo em seções e forneça informações chave sobre ${subject}. Utilize recursos visuais, exemplos práticos e estudos de caso relacionados à disciplina.</li>`;
        break;
      case "practicalActivity":
        output += `<li><strong>Atividade Prática:</strong> Elabore uma atividade prática que permita aos alunos aplicar o que aprenderam. Inclua perguntas que incentivem a reflexão e a discussão.</li>`;
        break;
      case "groupDiscussion":
        output += `<li><strong>Discussão em Grupo:</strong> Gere um projeto e um trabalho para que em grupos os alunos discutam diferentes perspectivas ou abordagens relacionadas a ${subject}. O projeto e o trabalho deverá ser feito para que cada grupo compartilhe suas conclusões com a turma e com o professor.</li>`;
        break;
      case "synthesis":
        output += `<li><strong>Síntese:</strong> Faça uma revisão dos principais pontos abordados durante a aula. Reforce os conceitos chave e destaque sua relevância na disciplina.</li>`;
        break;
      case "assessmentActivity":
        output += `<li><strong>Atividade de Avaliação:</strong> Crie uma atividade de avaliação que permita aos alunos demonstrar sua compreensão em ${subject}. Utilize diferentes formatos, como questões fechadas, abertas e múltipla escolha. Coloque as respostas das questões logo abaixo, gere no mínimo 10 questões.</li>`;
        break;
      case "feedback":
        output += `<li><strong>Feedback:</strong> Forneça feedback construtivo sobre o desempenho dos alunos. Destaque pontos fortes e áreas para melhorias.</li>`;
        break;
      case "homework":
        output += `<li><strong>Tarefas de Casa:</strong> Gere tarefas de casa relacionadas a ${subject}. As tarefas deverão encorajar os alunos a explorarem recursos adicionais para aprofundar seu entendimento.</li>`;
        break;
      case "referencia":
        output += `<li><strong>Referências:</strong> Gere ${ref1} referências
                bibliográficas e ${ref2} referências complementares, podendo ser referências nacionais e internacionais sobre o curso de ${subject1} na disciplina de ${subject}.</li>`;
        break;
      case "projeto":
        output += `<li><strong>Projeto:</strong> Gere um projeto ou trabalho que permita aos alunos demonstrar sua compreensão em ${subject}.</li>`;
        break;
      case "recAux":
        output += `<li><strong>Recursos Auxiliares:</strong> Gere em tópicos recursos auxiliares serão utilizados para a condução de toda a disciplina.</li>`;
        break;
      case "metodologia":
        output += `<li><strong>Metodologia:</strong> Gere em tópicos a metodologia de ensino que será utilizada para conduzir as aulas com base nas metodologias a seguir: ${met}. </li>`;
        break;
      default:
        break;
    }
  });

  output += `</ol>`;
  const outputDiv = document.getElementById("output");
  outputDiv.innerHTML = output;

  // Mostra o botão de cópia se houver texto na div "output"
  const copyButton = document.querySelector(".btnCopi");
  copyButton.style.display =
    outputDiv.innerText.trim() !== "" ? "block" : "none";
}
