const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


const DEEPL_KEY = process.env.DEEPL_KEY;
if (!DEEPL_KEY) {
  console.error('ERRO: defina DEEPL_KEY no arquivo .env');
  process.exit(1);
}

// DeepL API endpoint
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';


app.post('/api/translate', async (req, res) => {
  try {
    const { text, target } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const body = {
      text: [text],
      target_lang: (target || 'PT').toUpperCase()
    };

    const response = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`
      },
      body: JSON.stringify(body)
    });

    const respText = await response.text();
    res.status(response.status).send(respText);

  } catch (err) {
    console.error('Translate error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});



const PORT = process.env.PORT || 3000;

// --- Adicione isso no seu server.js ---

const GEMINI_KEY = process.env.GEMINI_KEY;

app.post('/api/check', async (req, res) => {
  try {
    const { source, userTranslation } = req.body;

    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_KEY não configurada' });

    // Prompt para o Gemini agir como professor
    const prompt = `
      Aja como um revisor de traduções técnico e direto.
      Texto original em inglês: "${source}"
      Tradução do aluno em português: "${userTranslation}"

      Analise e retorne APENAS um código HTML (sem markdown, sem \`\`\`) seguindo este formato:
      <h3>Nota: [Dê uma nota de 0 a 10]</h3>
      <ul>
        <li><strong>[Trecho original]</strong> -> <strong>[Melhor tradução]</strong>: [Explicação ultra curta do erro ou melhoria].</li>
        </ul>
      <p><em>Resumo: [Uma frase curta sobre a qualidade geral].</em></p>

      Regras:
      1. Forneça onde houver erros ou melhorias claras.
      2. Se estiver perfeito, diga apenas "Tradução perfeita!" e a nota.
      3. Foque apenas nos erros ou melhorias de vocabulário
      
    `;

    // Chamada à API do Gemini (REST via node-fetch)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("ERRO DO GEMINI:", JSON.stringify(data.error, null, 2));
    } else {
      console.log("Resposta Sucesso:", JSON.stringify(data, null, 2));
    }
    // ---------------------------------------------------------

    const feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar feedback.";

    res.send(feedbackText);

  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).send('Erro ao processar feedback com IA.');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy DeepL rodando em http://localhost:${PORT}`);
});
