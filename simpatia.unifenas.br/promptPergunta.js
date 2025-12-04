document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("questionForm");
    const perguntaInput = document.getElementById("pergunta");
    const respostaAlunoInput = document.getElementById("respostaAluno");
    const respostaTextarea = document.getElementById("resposta");
    form.addEventListener("submit", function(event) {
        event.preventDefault(); // Impede o envio padrão do formulário

        // Obtemos os valores dos campos de pergunta e resposta do aluno
        const pergunta = perguntaInput.value;
        const respostaAluno = respostaAlunoInput.value;

        // Construímos a resposta combinando a pergunta e a resposta do aluno
        const respostaCompleta = `Considere a seguinte questão: ${pergunta}.Verifique o percentual de acerto da seguinte resposta: ${respostaAluno}, e explique o motivo da porcentagem e coloque referências bibliográficas.`;

        // Exibimos a resposta combinada no textarea
        respostaTextarea.value = respostaCompleta;

        // Limpa os campos de pergunta e resposta do aluno
        //perguntaInput.value = "";
        //respostaAlunoInput.value = "";

        // Coloca o foco de volta no campo de pergunta
        perguntaInput.focus();
    });
});
