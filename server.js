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
app.listen(PORT, () => {
  console.log(`Proxy DeepL rodando em http://localhost:${PORT}`);
});
