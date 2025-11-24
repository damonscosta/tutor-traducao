require('dotenv').config();
const fetch = require('node-fetch');

const key = process.env.GEMINI_KEY;
// URL para listar os modelos
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log("🔍 A consultar modelos disponíveis na sua conta...");

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Erro da API:", JSON.stringify(data.error, null, 2));
            return;
        }

        if (!data.models) {
            console.log("⚠️ Nenhum modelo encontrado ou formato de resposta inesperado.");
            console.log(data);
            return;
        }

        console.log("\n✅ SUCESSO! Aqui estão os modelos Gemini disponíveis para você:");
        console.log("============================================================");
        
        // Filtra apenas modelos que contêm "gemini" e servem para gerar conteúdo
        const geminiModels = data.models.filter(m => 
            m.name.includes('gemini') && 
            m.supportedGenerationMethods.includes('generateContent')
        );

        if (geminiModels.length === 0) {
            console.log("Nenhum modelo 'Gemini' encontrado para generateContent. Listando todos:");
            console.log(data.models);
        } else {
            geminiModels.forEach(model => {
                // O 'name' vem como 'models/gemini-pro', vamos limpar para exibir
                console.log(`➡️  ${model.name}`); // Este é o nome EXATO que deve ir no seu código
            });
        }
        console.log("============================================================");
        console.log("💡 Copie um dos nomes acima (ex: models/gemini-1.5-flash) e coloque na sua URL no server.js");

    } catch (error) {
        console.error("❌ Erro de conexão:", error.message);
    }
}

listModels();