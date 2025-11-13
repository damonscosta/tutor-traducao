// Referências DOM
const englishSourceEl = document.getElementById('english-source');
const portugueseTranslationEl = document.getElementById('portuguese-translation');
const startButton = document.getElementById('start-button');
const checkButton = document.getElementById('check-button');
const checkButtonText = document.getElementById('check-button-text');
const loadingSpinner = document.getElementById('loading-spinner');
const correctionArea = document.getElementById('correction-area');
const correctionContent = document.getElementById('correction-content');
const hintArea = document.getElementById('hint-area');
const hintContent = document.getElementById('hint-content');
const errorMessage = document.getElementById('error-message');
const errorContent = document.getElementById('error-content');

// Elementos para o Popup
const wordPopup = document.getElementById('word-popup');
const wordPopupContent = document.getElementById('word-popup-content');
const speakButton = document.getElementById('speak-button');
const speakerIcon = document.getElementById('speaker-icon');
const speakerLoadingSpinner = document.getElementById('speaker-loading-spinner');

// Elementos para o Botão de Leitura Completa
const readFullTextButton = document.getElementById('read-full-text-button');
const fullTextSpeakerIcon = document.getElementById('full-text-speaker-icon');
const readFullTextText = document.getElementById('read-full-text-text');

// Novas Áreas de Feedback
const summaryArea = document.getElementById('summary-area');
const summaryContent = document.getElementById('summary-content');
const vocabularyArea = document.getElementById('vocabulary-area');
const vocabularyContent = document.getElementById('vocabulary-content');

// Elementos do Dark Mode
const darkModeToggle = document.getElementById('dark-mode-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');


// --- CORREÇÃO DE CONFIGURAÇÃO DA API ---
// REMOVEMOS ?key= do final para que a plataforma insira a chave automaticamente.
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const TTS_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";
// Mantemos a chave vazia, pois a plataforma a injetará.
const API_KEY = "AIzaSyB8oKrMkz5FjBSe2VVnzUy2vX3hX__47s0";
const RETRY_COUNT = 5;

// Configuração de Voz TTS (Alterada para voz masculina 'Kore')
const TTS_VOICE = "Kore";


// Variáveis Globais de Controle de Áudio (NOVO)
let currentAudio = null;
let currentFullTextButton = null;
let ttsAbortController = null; // Para cancelar a requisição de fetch

// --- Funções de Controle de Estado da UI ---

// NEW: Dark Mode Functionality
function applyDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add('dark');
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
        localStorage.setItem('darkMode', 'disabled');
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.contains('dark');
    applyDarkMode(!isDark);
}
// END NEW: Dark Mode Functionality

function stopAudio() {
    const audioToStop = currentAudio;
    const controllerToAbort = ttsAbortController;

    // 1. Resetar referências globais IMEDIATAMENTE (prioriza o estado de parada)
    currentAudio = null;
    ttsAbortController = null;

    // 2. Resetar UI do botão de leitura completa
    if (currentFullTextButton) {
        currentFullTextButton.disabled = false;
        fullTextSpeakerIcon.classList.remove('hidden');
        readFullTextText.textContent = 'Ouvir Texto Completo';
        currentFullTextButton = null;
    }

    // 3. Parar o processo: Abortar fetch ou pausar áudio
    if (controllerToAbort) {
        controllerToAbort.abort();
    }
    if (audioToStop) {
        audioToStop.pause();
    }
}

function startTranslation() {
    const englishText = englishSourceEl.value.trim();
    if (englishText) {
        portugueseTranslationEl.disabled = false;
        checkButton.disabled = false;
        startButton.textContent = 'Texto Fonte Atualizado (Clique para Reiniciar)';
        readFullTextButton.disabled = false; // Habilita leitura completa
        portugueseTranslationEl.focus();
        clearFeedback();
    } else {
        alertUser("Por favor, cole o texto em Inglês na caixa de texto superior para começar.");
    }
}

function clearFeedback() {
    correctionArea.classList.add('hidden');
    hintArea.classList.add('hidden');
    summaryArea.classList.add('hidden');
    vocabularyArea.classList.add('hidden');
    errorMessage.classList.add('hidden');
    correctionContent.textContent = '';
    hintContent.textContent = '';
    summaryContent.textContent = '';
    vocabularyContent.textContent = '';
    errorContent.textContent = '';
    hideWordPopup(); // Garante que o popup de palavra também é escondido
}

function hideWordPopup() {
    wordPopup.classList.add('hidden');
}

function alertUser(message) {
    errorMessage.classList.remove('hidden');
    errorContent.textContent = message;
    // Não esconde automaticamente para que o usuário possa ler
    // setTimeout(() => errorMessage.classList.add('hidden'), 5000); 
}

function setLoadingButtons(button, isLoading, originalText = null) {
    button.disabled = isLoading;
    button.classList.toggle('opacity-50', isLoading);

    if (isLoading) {
        button.dataset.originalText = originalText || button.textContent;
        button.innerHTML = `<svg class="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processando...`;
    } else {
        button.textContent = button.dataset.originalText;
    }
}

// --- Lógica do Gemini API (Geral) ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchGeminiContent(payload, button = null) {
    if (button) {
        setLoadingButtons(button, true);
        clearFeedback();
    }

    for (let attempt = 0; attempt < RETRY_COUNT; attempt++) {
        try {
            // CONCATENAÇÃO CORRIGIDA: Não adicionamos "?key=" na URL, a plataforma fará isso se necessário.
            const finalUrl = API_URL + (API_KEY ? `?key=${API_KEY}` : '');

            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Attempt ${attempt + 1}: API call failed with status ${response.status}. Body: ${errorBody}`);

                // *** Tratamento de ERRO HTTP E PERMISSÃO: Lança o erro específico imediatamente. ***
                const specificError = new Error(`API Error: ${response.status} - ${errorBody.substring(0, 150)}`);
                specificError.isApiError = true;
                throw specificError;
            }

            const result = await response.json();
            return result;

        } catch (error) {
            // Se for um erro de status HTTP específico (403, 400), lançamos imediatamente para o usuário ver
            if (error.isApiError) {
                throw error;
            }

            // Se não for um erro de status (provavelmente erro de rede/timeout), tentamos novamente
            if (attempt === RETRY_COUNT - 1) {
                // Se falhar na última tentativa, mostramos o erro de rede/timeout
                throw new Error(`Falha na comunicação com a API após ${RETRY_COUNT} tentativas. Detalhe: ${error.message}`);
            }
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            await sleep(delay);
        }
    }
}


// --- Funções Auxiliares de Áudio (PCM para WAV) ---
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToWav(pcm16, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);

    let offset = 0;

    function writeString(s) {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(offset + i, s.charCodeAt(i));
        }
        offset += s.length;
    }

    function writeUint32(i) {
        view.setUint32(offset, i, true);
        offset += 4;
    }

    function writeUint16(i) {
        view.setUint16(offset, i, true);
        offset += 2;
    }

    // RIFF chunk descriptor
    writeString('RIFF');
    writeUint32(36 + pcm16.length * 2); // ChunkSize
    writeString('WAVE');

    // FMT sub-chunk
    writeString('fmt ');
    writeUint32(16); // Subchunk1Size
    writeUint16(1);  // AudioFormat (1 for PCM)
    writeUint16(numChannels);
    writeUint32(sampleRate);
    writeUint32(byteRate);
    writeUint16(blockAlign);
    writeUint16(bitsPerSample);

    // DATA sub-chunk
    writeString('data');
    writeUint32(pcm16.length * 2); // Subchunk2Size

    // Write the PCM data
    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(offset, pcm16[i], true);
        offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
}


// --- LÓGICA TTS CENTRALIZADA (Word e Full Text) ---
async function fetchGeminiTTS(text, fullTextButton = null, signal = null) {
    const userQuery = `Say in a clear and friendly tone: "${text}"`;

    const ttsPayload = {
        contents: [{
            parts: [{ text: userQuery }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    for (let attempt = 0; attempt < RETRY_COUNT; attempt++) {
        try {
            // CONCATENAÇÃO CORRIGIDA (novamente)
            const finalUrl = TTS_API_URL + (API_KEY ? `?key=${API_KEY}` : '');

            const fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ttsPayload),
                signal: signal // Usando o signal aqui
            };

            const response = await fetch(finalUrl, fetchOptions);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`TTS Attempt ${attempt + 1}: API call failed with status ${response.status}. Body: ${errorBody}`);

                // Lançamos um erro específico, mas sem o flag 'isApiError' 
                // para permitir as retentativas no bloco catch.
                throw new Error(`TTS API Error: ${response.status}`);
            }

            const result = await response.json();
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            const audioData = part?.inlineData?.data;
            const mimeType = part?.inlineData?.mimeType;

            if (audioData && mimeType && mimeType.startsWith("audio/L16")) {
                const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;

                const pcmData = base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(pcmData);

                const wavBlob = pcmToWav(pcm16, sampleRate);
                const audioUrl = URL.createObjectURL(wavBlob);

                const audio = new Audio(audioUrl);

                if (fullTextButton) {
                    currentAudio = audio;
                    currentFullTextButton = fullTextButton;
                }

                audio.play();

                return new Promise((resolve, reject) => {
                    audio.onended = () => {
                        URL.revokeObjectURL(audioUrl);
                        if (fullTextButton) {
                            stopAudio();
                        }
                        resolve();
                    };
                    audio.onerror = (e) => {
                        URL.revokeObjectURL(audioUrl);
                        if (fullTextButton) {
                            stopAudio();
                        }
                        reject(new Error("Erro na reprodução de áudio."));
                    }
                });

            } else {
                throw new Error("Dados de áudio inválidos ou ausentes.");
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }

            if (attempt === RETRY_COUNT - 1) {
                throw new Error(`Falha na comunicação com a API após ${RETRY_COUNT} tentativas.`);
            }
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            await sleep(delay);
        }
    }
}







// --- API de traducao DeepL ---

async function fetchDeepLTranslation(textoOriginal) {
    
    // 1. A sua chave (corrigida, sem o '=')
    const minhaChave = "3ed97480-a195-462a-b894-1143cc6e1c59:fx";
    
    // 2. Usando o proxy 'corsproxy.io' (que sabemos que responde)
    const url = "https://corsproxy.io/?https://api-free.deepl.com/v2/translate";

    const dados = {
        text: [textoOriginal],
        target_lang: "PT-BR"
    };

    try {
        const resposta = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                
                "Authorization": `DeepL-Auth-Key ${minhaChave}`
            },
            body: JSON.stringify(dados)
        });

        if (!resposta.ok) {
            // Se der 403 de novo, vai aparecer aqui
            const erroTxt = await resposta.text();
            console.error("Erro da API (via proxy):", erroTxt);
            try {
                const erroJson = JSON.parse(erroTxt);
                throw new Error(`Erro do DeepL (${resposta.status}): ${erroJson.message || erroTxt}`);
            } catch(e) {
                throw new Error(`Erro do Proxy/DeepL (${resposta.status}): ${erroTxt.substring(0, 150)}...`);
            }
        }

        // Se der certo, vem pra cá
        const resultado = await resposta.json();
        const traducao = resultado.translations[0].text;
        
        return `Tradução (DeepL):\n- ${traducao}`;

    } catch (erro) {
        // O erro "Failed to fetch" que você viu cairia aqui
        console.error("Deu ruim na tradução DeepL:", erro);
        return `Erro ao traduzir: ${erro.message}`;
    }
}
// --- FIM DA VERSÃO ---








async function speakWord(word, button) {
    if (!word || button.disabled) return;
    stopAudio();

    // UI de carregamento para a palavra
    button.disabled = true;
    speakerIcon.classList.add('hidden');
    speakerLoadingSpinner.classList.remove('hidden');

    try {
        // Não passamos o botão para fetchGeminiTTS para que ele não interfira no estado global de áudio (Full Text)
        await fetchGeminiTTS(word);
    } catch (e) {
        alertUser(`Erro ao gerar áudio: ${e.message}`);
    } finally {
        // UI de carregamento de volta
        button.disabled = false;
        speakerIcon.classList.remove('hidden');
        speakerLoadingSpinner.classList.add('hidden');
    }
}


// --- FUNÇÃO: Leitura do Texto Completo (READ FULL TEXT - AGORA UM TOGGLE COM ABORT) ---

async function readFullText(button) {
    if (currentAudio || ttsAbortController) {
        stopAudio();
        return;
    }

    const fullText = englishSourceEl.value.trim();
    if (!fullText) {
        alertUser("O campo de texto em Inglês está vazio. Cole um texto para ouvir.");
        return;
    }

    const controller = new AbortController();
    ttsAbortController = controller;

    // Prepara a UI para o estado de "Parar" (Stop)
    button.disabled = false; // Permanece habilitado para poder clicar em "Parar Leitura"
    fullTextSpeakerIcon.classList.add('hidden');
    readFullTextText.textContent = 'Parar Leitura';

    try {
        // Passamos o botão para que fetchGeminiTTS atualize o estado global (currentAudio, currentFullTextButton)
        await fetchGeminiTTS(fullText, button, controller.signal);

    } catch (e) {
        if (e.name === 'AbortError') {
            console.log("Leitura interrompida pelo usuário.");
        } else {
            alertUser(`Erro ao ler texto completo: ${e.message}`);
        }
    } finally {
        // O stopAudio() no onended ou no catch já deveria ter limpo o estado, 
        // mas garantimos que a UI seja resetada se houver falha de conexão.
        if (ttsAbortController) {
            // Se a leitura for abortada, o stopAudio já foi chamado, 
            // mas se houver erro não-abort, garantimos a limpeza
            stopAudio();
        }
    }
}


// --- NOVOS RECURSOS LLM ---

async function summarizeText(button) {
    const englishText = englishSourceEl.value.trim();
    if (!englishText) {
        alertUser("O campo de texto em Inglês está vazio. Cole um texto para resumir.");
        return;
    }

    const systemPrompt = "Você é um assistente de leitura. Sua tarefa é criar um resumo conciso e fluente em Português do texto em Inglês fornecido. O resumo deve ter no máximo 3 frases.";
    const userQuery = `Texto em Inglês para resumir: "${englishText}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const result = await fetchGeminiContent(payload, button);
        const summary = result.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o resumo.";

        summaryContent.innerHTML = summary.replace(/\n/g, '<br>');
        summaryArea.classList.remove('hidden');
        vocabularyArea.classList.add('hidden');

    } catch (e) {
        alertUser(e.message || "Erro ao gerar resumo.");
    } finally {
        setLoadingButtons(button, false, button.dataset.originalText);
    }
}

const vocabularySchema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            "word": { "type": "STRING", "description": "A palavra chave em Inglês." },
            "translation": { "type": "STRING", "description": "A tradução mais comum em Português." },
            "definition": { "type": "STRING", "description": "Uma breve definição/contexto em Português." }
        },
        required: ["word", "translation", "definition"]
    }
};

async function extractVocabulary(button) {
    const englishText = englishSourceEl.value.trim();
    if (!englishText) {
        alertUser("O campo de texto em Inglês está vazio. Cole um texto para extrair vocabulário.");
        return;
    }

    const systemPrompt = "Você é um analista de texto especializado em identificar o vocabulário mais relevante ou desafiador em um texto em Inglês para um falante de Português. Seu objetivo é retornar uma lista de 5 a 8 termos em formato JSON. Inclua a palavra em Inglês, sua tradução em Português e uma breve definição/contexto para estudo. Retorne APENAS o JSON.";
    const userQuery = `Texto em Inglês para análise de vocabulário: "${englishText}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: vocabularySchema
        },
    };

    try {
        const result = await fetchGeminiContent(payload, button);
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const vocabulary = JSON.parse(jsonText);

        let html = '<ul class="list-disc ml-5 space-y-2">';
        vocabulary.forEach(item => {
            html += `<li><strong class="text-indigo-600">${item.word}</strong> (${item.translation}): <em>${item.definition}</em></li>`;
        });
        html += '</ul>';

        vocabularyContent.innerHTML = html;
        vocabularyArea.classList.remove('hidden');
        summaryArea.classList.add('hidden');

    } catch (e) {
        console.error("Erro ao extrair vocabulário:", e);
        alertUser("Erro ao extrair vocabulário. Certifique-se de que o texto em Inglês é longo o suficiente e tente novamente.");
    } finally {
        setLoadingButtons(button, false, button.dataset.originalText);
    }
}

// --- FUNÇÃO: Checagem de Tradução (Existente) ---

const translationSchema = {
    type: "OBJECT",
    properties: {
        "correction": {
            "type": "STRING",
            "description": "Uma análise detalhada (em português) da tradução do usuário, destacando erros e oferecendo a tradução correta para a frase ou trecho."
        },
        "hint": {
            "type": "STRING",
            "description": "Uma dica concisa (em português) ou uma tradução alternativa mais natural para o próximo segmento do texto, se aplicável, para ajudar o usuário a melhorar."
        }
    },
    required: ["correction", "hint"]
};

const tutorSystemPrompt = `Você é um tutor de idiomas muito experiente e encorajador, especializado em tradução entre Inglês e Português. Sua função é analisar a tradução fornecida pelo usuário. Compare o texto fonte em Inglês com a tradução em Português do usuário. Forneça feedback construtivo e preciso, sempre em Português. Seu output deve ser um objeto JSON. 'correction' deve conter uma análise detalhada da tradução do usuário, destacando pontos fracos e oferecendo a tradução ideal para comparação. 'hint' deve fornecer uma dica útil ou a tradução mais natural para ajudar o usuário a melhorar no próximo trecho.`;

async function checkTranslation() {
    hideWordPopup();
    stopAudio();
    clearFeedback();
    const englishText = englishSourceEl.value.trim();
    const portugueseText = portugueseTranslationEl.value.trim();

    if (!englishText || !portugueseText) {
        alertUser("Por favor, preencha tanto o Texto Fonte quanto a Sua Tradução.");
        return;
    }

    setLoadingButtons(checkButton, true, "Checar Tradução e Obter Dicas");

    const userQuery = `Texto Original (Inglês): "${englishText}"\n\nMinha Tradução (Português): "${portugueseText}"`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: tutorSystemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: translationSchema
        },
    };

    try {
        const result = await fetchGeminiContent(payload);
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const feedback = JSON.parse(jsonText);

        if (feedback.correction) {
            correctionContent.innerHTML = feedback.correction.replace(/\n/g, '<br>');
            correctionArea.classList.remove('hidden');
        } else { correctionArea.classList.add('hidden'); }

        if (feedback.hint) {
            hintContent.innerHTML = feedback.hint.replace(/\n/g, '<br>');
            hintArea.classList.remove('hidden');
        } else { hintArea.classList.add('hidden'); }

    } catch (e) {
        console.error("Erro final:", e);
        alertUser(e.message || "Ocorreu um erro inesperado ao analisar a tradução.");
    } finally {
        setLoadingButtons(checkButton, false, "Checar Tradução e Obter Dicas");
    }
}


// Função para obter a palavra selecionada (com limpeza básica)
function getSelectedWord(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Se nada foi selecionado, retorna nulo
    if (start === end) return null;

    let selectedText = text.substring(start, end).trim();

    // Limpa pontuação inicial e final
    selectedText = selectedText.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]$/g, "");

    // Aceita no máximo duas palavras (para expressões curtas)
    if (selectedText.split(/\s+/).filter(w => w.length > 0).length > 2 || selectedText === "") {
        return null;
    }

    return selectedText.toLowerCase();
}

// Manipulador do clique duplo
async function handleWordLookup(event) {
    hideWordPopup();

    // Permitir que o popup apareça se houver seleção
    if (englishSourceEl.selectionStart === englishSourceEl.selectionEnd) {
        return;
    }

    const word = getSelectedWord(englishSourceEl);

    if (word) {
        // 1. Define a posição inicial do popup
        wordPopup.style.left = `${event.clientX + window.scrollX}px`;
        wordPopup.style.top = `${event.clientY + window.scrollY + 15}px`;

        // 2. Prepara o conteúdo de carregamento e mostra o popup
        speakButton.dataset.word = word;
        speakButton.disabled = false;
        speakerIcon.classList.remove('hidden');
        speakerLoadingSpinner.classList.add('hidden');

        wordPopupContent.innerHTML = `<div class="flex items-center text-indigo-500"><svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Buscando '${word}'...</div>`;
        wordPopup.classList.remove('hidden');

        // 3. Verifica e ajusta a posição IMEDIATAMENTE antes da requisição (melhor UX)
        let popupRect = wordPopup.getBoundingClientRect();
        const padding = 10;

        // Ajusta para o limite direito
        if (popupRect.right > window.innerWidth) {
            wordPopup.style.left = `${window.scrollX + window.innerWidth - popupRect.width - padding}px`;
            popupRect = wordPopup.getBoundingClientRect(); // Recalcula
        }

        // Ajusta para o limite inferior (se houver espaço acima)
        if (popupRect.bottom > window.innerHeight && popupRect.top > popupRect.height) {
            wordPopup.style.top = `${event.clientY + window.scrollY - popupRect.height - 15}px`;
        }

        // 4. Executa a requisição da API
        try {
            const translationText = await fetchDeepLTranslation(word);
            wordPopupContent.innerHTML = translationText.replace(/\n/g, '<br>');

        } catch (e) {
            // O erro agora pode ser o específico (API Error: 400) ou o genérico (Falha na comunicação...)
            wordPopupContent.innerHTML = `<span class="text-red-500">Erro: ${e.message}</span>`;
            speakButton.disabled = true;
        }

    }
}

// Inicialização e Listeners
window.onload = () => {
    // NEW: Initialize Dark Mode based on localStorage
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        applyDarkMode(true);
    } else {
        applyDarkMode(false);
    }

    if (englishSourceEl.value.trim()) {
        startTranslation();
    } else {
        readFullTextButton.disabled = true;
    }

    englishSourceEl.addEventListener('dblclick', handleWordLookup);

    document.addEventListener('click', (event) => {
        if (wordPopup && !wordPopup.contains(event.target) && event.target !== englishSourceEl) {
            hideWordPopup();
        }
    });

    // Atribui as novas funções ao escopo global (para o onclick)
    window.startTranslation = startTranslation;
    window.checkTranslation = checkTranslation;
    window.hideWordPopup = hideWordPopup;
    window.speakWord = speakWord;
    window.readFullText = readFullText;
    window.stopAudio = stopAudio;
    window.summarizeText = summarizeText;
    window.extractVocabulary = extractVocabulary;
    window.toggleDarkMode = toggleDarkMode;
    window.applyDarkMode = applyDarkMode;
};
