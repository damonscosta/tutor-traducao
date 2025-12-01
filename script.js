

// ---------- Configurações ----------
const DEEPL_PROXY = "/api/translate"; // rota do servidor proxy para DeepL
const DEEPL_AUTH_KEY = "";        // chave de autenticação DeepL (não usada no client, apenas no servidor)


// ---------- DOM ----------
const englishSourceEl = document.getElementById('english-source');
const portugueseTranslationEl = document.getElementById('portuguese-translation');
const translateSelectionButton = document.getElementById('translate-selection-button');
const translateFullButton = document.getElementById('translate-full-button');
const readFullTextButton = document.getElementById('read-full-text-button');
const checkButton = document.getElementById('check-button');

const wordPopup = document.getElementById('word-popup');
const wordPopupContent = document.getElementById('word-popup-content');
const speakButton = document.getElementById('speak-button');
const closePopupButton = document.getElementById('close-popup');

const errorMessage = document.getElementById('error-message');
const hintContent = document.getElementById('hint-content');

const darkToggle = document.getElementById('dark-mode-toggle');

// ---------- Helpers ----------
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
}
function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
}
function showHint(html) {
    hintContent.innerHTML = html;
    hintContent.classList.remove('hidden');
}
function hideHint() {
    hintContent.classList.add('hidden');
    hintContent.innerHTML = '';
}
function showPopupAt(x, y, html) {
    wordPopup.style.left = x + 'px';
    wordPopup.style.top = y + 'px';
    wordPopupContent.innerHTML = html;
    wordPopup.classList.remove('hidden');
    wordPopup.setAttribute('aria-hidden', 'false');
}
function hidePopup() {
    wordPopup.classList.add('hidden');
    wordPopup.setAttribute('aria-hidden', 'true');
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// Obtém a palavra selecionada, limpa pontuação, limita a até 2 palavras
function getSelectedWord(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return null;
    let selected = textarea.value.substring(start, end).trim();
    selected = selected.replace(/^[^\w']+|[^\w']+$/g, '');
    if (!selected) return null;
    const parts = selected.split(/\s+/).filter(Boolean);
    if (parts.length > 2) return null;
    return selected;
}

// ---------- DeepL Translation ----------
async function fetchDeepL(text, target = 'PT') {
    const resp = await fetch('http://localhost:3000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target })
    });
    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(body);
    }
    const json = await resp.json(); // se o server retornar JSON
    // no nosso server retornamos o corpo do DeepL (JSON) como texto — por isso parsing:
    return json.translations?.[0]?.text ?? JSON.stringify(json);
}


// ---------- UI: Traduzir Seleção ----------
async function translateSelectionHandler(e) {
    hideError();
    hideHint();
    hidePopup();

    const start = englishSourceEl.selectionStart;
    const end = englishSourceEl.selectionEnd;
    if (start === end) {
        showError('Por favor selecione uma palavra ou frase no texto antes de clicar em "Traduzir Seleção".');
        return;
    }
    const fullSelection = englishSourceEl.value.substring(start, end).trim();
    if (!fullSelection) { showError('Seleção vazia.'); return; }

    const word = getSelectedWord(englishSourceEl); // pode ser null

    // Posição do botão para o popup (abaixo do botão)
    const btnRect = translateSelectionButton.getBoundingClientRect();
    const padding = 8;
    let left = window.scrollX + btnRect.left;
    let top = window.scrollY + btnRect.bottom + padding;

    // Mostra loading
    showPopupAt(left, top, '<div>Buscando tradução…</div>');

    try {
        const phrasePromise = fetchDeepL(fullSelection);
        const wordPromise = word ? fetchDeepL(word) : Promise.resolve(null);

        const [phraseTrans, wordTrans] = await Promise.all([phrasePromise, wordPromise]);

        let html = '';
        if (word) {
            html += '<div><strong>Palavra:</strong> <span>' + escapeHtml(word) + '</span>';
            html += '<div class="translation">' + escapeHtml(wordTrans || '') + '</div></div><hr>';
            speakButton.disabled = false;
            speakButton.dataset.word = word;
        } else {
            speakButton.disabled = true;
            speakButton.dataset.word = '';
        }

        html += '<div><strong>Frase selecionada:</strong><div class="source">' + escapeHtml(fullSelection) + '</div>';
        html += '<div class="translation">' + escapeHtml(phraseTrans || '') + '</div></div>';

        showPopupAt(left, top, html);

        // Ajuste para sair da tela direita/inferior
        requestAnimationFrame(() => { adjustPopupIntoView(); });

    } catch (err) {
        showPopupAt(left, top, '<div class="error">Erro ao traduzir: ' + escapeHtml(err.message || '') + '</div>');
        speakButton.disabled = true;
    }
}

// ---------- Translate full text ----------
async function translateFullHandler() {
    hideError();
    const text = englishSourceEl.value.trim();
    if (!text) { showError('Cole um texto em inglês primeiro.'); return; }
    try {
        translateFullButton.disabled = true;
        translateFullButton.textContent = 'Traduzindo…';
        const translated = await fetchDeepL(text);
        document.getElementById('portuguese-translation').value = translated;
    } catch (e) {
        showError('Erro ao traduzir o texto: ' + e.message);
    } finally {
        translateFullButton.disabled = false;
        translateFullButton.textContent = 'Traduzir Texto Inteiro';
    }
}

// ---------- Simple "check" (placeholder educational feedback) ----------
// ---------- Check Translation with AI ----------
async function checkTranslationHandler() {
    hideError();
    hideHint(); // Limpa dica anterior

    const source = englishSourceEl.value.trim();
    const user = portugueseTranslationEl.value.trim();

    if (!source || !user) {
        showError('Cole o texto em Inglês e escreva sua tradução antes de checar.');
        return;
    }

    // Muda o texto do botão para indicar carregamento
    const originalBtnText = checkButton.textContent;
    checkButton.disabled = true;
    checkButton.textContent = "Analisando...";

    try {
        const resp = await fetch('http://localhost:3000/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, userTranslation: user })
        });

        if (!resp.ok) throw new Error('Erro ao conectar com o tutor.');

        const feedbackHtml = await resp.text();
        showHint(feedbackHtml);

    } catch (e) {
        showError('Erro ao obter feedback: ' + e.message);
    } finally {
        checkButton.disabled = false;
        checkButton.textContent = originalBtnText;
    }
}

// ---------- TTS (Web Speech API) ----------
function speakText(text) {
    if (!('speechSynthesis' in window)) { showError('TTS não suportado neste navegador.'); return; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
}

// Button speak handler
function speakButtonHandler() {
    const w = speakButton.dataset.word;
    if (!w) return;
    speakText(w);
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

// ---------- Popup utilities ----------
function adjustPopupIntoView() {
    const rect = wordPopup.getBoundingClientRect();
    const padding = 12;
    let left = rect.left;
    let top = rect.top;
    if (rect.right > window.innerWidth - padding) {
        left = window.innerWidth - rect.width - padding;
    }
    if (rect.bottom > window.innerHeight - padding) {
        top = window.innerHeight - rect.height - padding;
    }
    wordPopup.style.left = Math.max(8, left) + 'px';
    wordPopup.style.top = Math.max(8, top) + 'px';
}

// ---------- Dark Mode ----------
function applyDarkMode(isDark) {
    document.body.classList.toggle('dark', !!isDark);
    localStorage.setItem('tutor_dark', isDark ? '1' : '0');
}
darkToggle.addEventListener('click', () => applyDarkMode(!document.body.classList.contains('dark')));
(function () { const mode = localStorage.getItem('tutor_dark'); applyDarkMode(mode === '1'); })();

// ---------- Listeners ----------
translateSelectionButton.addEventListener('click', translateSelectionHandler);
translateFullButton.addEventListener('click', translateFullHandler);
readFullTextButton.addEventListener('click', () => speakText(englishSourceEl.value.trim()));
checkButton.addEventListener('click', checkTranslationHandler);
speakButton.addEventListener('click', speakButtonHandler);
closePopupButton.addEventListener('click', hidePopup);

// Close popup when clicking outside
document.addEventListener('click', (ev) => {
    if (wordPopup.contains(ev.target) || ev.target === translateSelectionButton) return;
    hidePopup();
});

// keyboard: Esc closes popup
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hidePopup(); });

// Prevent accidental form submit on Enter inside textareas
document.addEventListener('submit', e => e.preventDefault());

// ---------- End of script.js ----------
