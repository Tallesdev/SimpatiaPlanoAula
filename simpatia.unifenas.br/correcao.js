import { GoogleGenerativeAI } from "@google/generative-ai";

// Replace with your actual API key
const API_KEY = 'AIzaSyCYuFodo4nEvUruEB9wJs_zWgEHp2zPL_g';
const genAI = new GoogleGenerativeAI(API_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitQuestion');
    const inputQuestion = document.getElementById('inputQuestion');
    const resultArea = document.getElementById('result');

    async function getAIResponse(question) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(question);
            const response = await result.response.text();
            return response;
        } catch (error) {
            console.error('Error fetching AI response:', error);
            return 'Erro ao obter resposta da IA.';
        }
    }

    async function handleQuestionSubmit() {
        const question = inputQuestion.value;
        if (question.trim() !== "") {
            resultArea.value = 'Carregando...';
            const response = await getAIResponse(question);
            resultArea.value = response;
            inputQuestion.value = ''; // Limpa o campo de pergunta
        } else {
            resultArea.value = 'Por favor, digite uma pergunta.';
        }
    }

    submitButton.addEventListener('click', handleQuestionSubmit);

    inputQuestion.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevents the default action (form submission)
            handleQuestionSubmit();
        }
    });
});
