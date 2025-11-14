// --- 1. ZAPAMIĘTYWANIE MOTYWU (Ładowanie) ---
// Ta funkcja uruchamia się natychmiast, aby uniknąć "błysku"
let initialMonacoTheme = 'myCustomLight'; // Domyślny
(function () {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('theme', 'dark');
        // Bezpośredni dostęp do elementu, ponieważ skrypt jest na końcu body
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        initialMonacoTheme = 'myCustomDark';
    }
    // Domyślnie jest 'light' i ikona księżyca, więc nie trzeba 'else'
})();
// --- Koniec ładowania motywu ---

// Zmienne dla elementów DOM
const urlInput = document.getElementById('urlInput');
const fetchButton = document.getElementById('fetchButton');
const buttonText = document.getElementById('buttonText');
const loader = document.getElementById('loader');
const updatePreviewButton = document.getElementById('updatePreviewButton');
const previewFrame = document.getElementById('previewFrame');
const themeToggle = document.getElementById('themeToggle');
const toggleEditorButton = document.getElementById('toggleEditorButton');
const statusBar = document.getElementById('statusBar');
const languageSelector = document.getElementById('languageSelector');
const toggleUrlListButton = document.getElementById('toggleUrlListButton');
const closeUrlListButton = document.getElementById('closeUrlListButton');
const urlListPanel = document.getElementById('urlListPanel');
const addCurrentUrlButton = document.getElementById('addCurrentUrlButton');
const loadUrlListButton = document.getElementById('loadUrlListButton');
const urlListItems = document.getElementById('urlListItems');

// Elementy modalu
const addUrlModal = document.getElementById('addUrlModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalUrlInput = document.getElementById('modalUrlInput');
const modalNameInput = document.getElementById('modalNameInput');
const modalAddButton = document.getElementById('modalAddButton');
const modalListUrlInput = document.getElementById('modalListUrlInput');
const modalLoadListButton = document.getElementById('modalLoadListButton');

// Lista URL - domyślna i załadowana z localStorage
let savedUrls = JSON.parse(localStorage.getItem('savedUrls') || '[]');

// URL listy do załadowania
const URL_LIST_SOURCE = 'https://raw.githubusercontent.com/skokivPr/lista/refs/heads/main/lista';

// Funkcja do wyodrębnienia nazwy z URL (musi być wcześniej zdefiniowana)
function extractNameFromUrl(url) {
    const shortName = url.substring(url.lastIndexOf('/') + 1) || url;
    return shortName;
}

// Aktualizuj stare nazwy "URL 1", "URL 2" itp. na nazwy z adresu
savedUrls = savedUrls.map(item => {
    // Jeśli nazwa zaczyna się od "URL " i po tym są tylko cyfry, zamień na nazwę z adresu
    if (/^URL \d+$/.test(item.name)) {
        return { ...item, name: extractNameFromUrl(item.url) };
    }
    return item;
});
localStorage.setItem('savedUrls', JSON.stringify(savedUrls));

// Zmienne dla Resizera
const resizer = document.getElementById('resizer');
const editorPanel = document.getElementById('editorPanel');
const previewPanel = document.getElementById('previewPanel');
const content = document.getElementById('content');
const rulerIndicator = document.getElementById('rulerIndicator');
const bottomRuler = document.getElementById('bottomRuler');
const rulerMarks = document.getElementById('rulerMarks');
const rulerIndicatorBottom = document.getElementById('rulerIndicatorBottom');

// Punkty magnetyczne (w procentach)
const snapPoints = [25, 33.33, 50, 66.67, 75];
const snapThreshold = 2; // Próg przyciągania w procentach

// Funkcja do generowania znaczników linijki
function generateRulerMarks() {
    rulerMarks.innerHTML = '';

    // Główne znaczniki co 10%
    for (let i = 0; i <= 100; i += 10) {
        const mark = document.createElement('div');
        mark.className = 'ruler-mark major';
        mark.style.left = `${i}%`;

        const label = document.createElement('div');
        label.className = 'ruler-label';
        label.textContent = `${i}%`;
        mark.appendChild(label);

        rulerMarks.appendChild(mark);
    }

    // Mniejsze znaczniki co 5%
    for (let i = 5; i < 100; i += 10) {
        const mark = document.createElement('div');
        mark.className = 'ruler-mark minor';
        mark.style.left = `${i}%`;
        rulerMarks.appendChild(mark);
    }

    // Znaczniki dla punktów magnetycznych (jeśli nie pokrywają się z głównymi)
    snapPoints.forEach(point => {
        if (point % 10 !== 0 && Math.abs(point - Math.round(point)) > 0.1) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark major';
            mark.style.left = `${point}%`;

            const label = document.createElement('div');
            label.className = 'ruler-label';
            label.textContent = `${point.toFixed(1)}%`;
            mark.appendChild(label);

            rulerMarks.appendChild(mark);
        }
    });
}

// Generuj znaczniki przy starcie
generateRulerMarks();

// Zmienna globalna dla Instancji Edytora
let monacoEditor;

// Mapowanie kolorów dla motywów Monaco
let lightColors, darkColors;

// Logika Edytora Monaco
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
require(['vs/editor/editor.main'], function () {

    // Funkcja do definiowania niestandardowych motywów
    function defineThemes() {
        // Musimy pobrać zmienne CSS z DOM
        const styles = getComputedStyle(document.documentElement);

        // Zapisz obecny motyw
        const isCurrentlyDark = document.documentElement.hasAttribute('theme');

        // 1. Przełącz (tymczasowo) na jasny i odczytaj kolory
        document.documentElement.removeAttribute('theme');
        lightColors = {
            bg: styles.getPropertyValue('--panel-bg').trim(),
            text: styles.getPropertyValue('--text-color').trim(),
            highlight: styles.getPropertyValue('--highlight-color').trim(),
            border: styles.getPropertyValue('--border-color').trim(),
            muted: styles.getPropertyValue('--text-muted').trim()
        };

        // 2. Przełącz (tymczasowo) na ciemny i odczytaj kolory
        document.documentElement.setAttribute('theme', 'dark');
        darkColors = {
            bg: styles.getPropertyValue('--panel-bg').trim(),
            text: styles.getPropertyValue('--text-color').trim(),
            highlight: styles.getPropertyValue('--highlight-color').trim(),
            border: styles.getPropertyValue('--border-color').trim(),
            muted: styles.getPropertyValue('--text-muted').trim()
        };

        // 3. Przywróć oryginalny motyw
        if (isCurrentlyDark) {
            document.documentElement.setAttribute('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('theme');
        }

        // Definicja motywu JASNEGO (VS Code Light+ style)
        monaco.editor.defineTheme('myCustomLight', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '008000' }, // zielony
                { token: 'string', foreground: 'a31515' }, // ciemny czerwony
                { token: 'keyword', foreground: '0000ff' }, // niebieski
                { token: 'number', foreground: '098658' }, // zielony (liczby)
                { token: 'tag', foreground: '800000' }, // brązowy (HTML tags)
                { token: 'attribute.name', foreground: 'ff0000' }, // czerwony (HTML attributes)
                { token: 'attribute.value', foreground: '0000ff' }, // niebieski (HTML attribute values)
                { token: 'type', foreground: '267f99' }, // turkusowy
                { token: 'delimiter', foreground: '000000' },
            ],
            colors: {
                'editor.background': lightColors.bg,
                'editor.foreground': lightColors.text,
                'editorCursor.foreground': lightColors.highlight,
                'editor.lineHighlightBackground': lightColors.bg.replace('ff', 'ee'), // Lepszy kontrast
                'editor.selectionBackground': `${lightColors.highlight}40`, // Półprzezroczysty
                'editor.selectionHighlightBackground': `${lightColors.highlight}20`,
                'editorLineNumber.foreground': lightColors.muted,
                'editorLineNumber.activeForeground': lightColors.highlight
            }
        });

        // Definicja motywu CIEMNEGO (VS Code Dark+ style)
        monaco.editor.defineTheme('myCustomDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955' }, // zielony
                { token: 'string', foreground: 'CE9178' }, // pomarańczowy (stringi)
                { token: 'keyword', foreground: '569CD6' }, // niebieski (słowa kluczowe)
                { token: 'number', foreground: 'B5CEA8' }, // jasnozielony (liczby)
                { token: 'tag', foreground: '569CD6' }, // niebieski (HTML tags)
                { token: 'attribute.name', foreground: '9CDCFE' }, // jasnoniebieski (HTML attributes)
                { token: 'attribute.value', foreground: 'CE9178' }, // pomarańczowy (HTML attribute values)
                { token: 'type', foreground: '4EC9B0' }, // turkusowy
                { token: 'delimiter', foreground: 'D4D4D4' },
            ],
            colors: {
                'editor.background': darkColors.bg,
                'editor.foreground': darkColors.text,
                'editorCursor.foreground': darkColors.highlight,
                'editor.lineHighlightBackground': '#ffffff08', // Bardzo delikatne podświetlenie
                'editor.selectionBackground': `${darkColors.highlight}40`,
                'editor.selectionHighlightBackground': `${darkColors.highlight}20`,
                'editorLineNumber.foreground': darkColors.muted,
                'editorLineNumber.activeForeground': darkColors.highlight
            }
        });

        // Zastosuj ponownie motyw, jeśli edytor już istnieje
        if (monacoEditor) {
            monaco.editor.setTheme(isCurrentlyDark ? 'myCustomDark' : 'myCustomLight');
        }
    }

    // Utworzenie instancji edytora
    const savedContent = localStorage.getItem('editorContent');
    const defaultContent = [
        '<!DOCTYPE html>',
        '<html lang="pl">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '    <title>Tytuł Strony</title>',
        '    <style>',
        '        body { font-family: sans-serif; padding: 2rem; background-color: #f0f0f0; }',
        '        h1 { color: #333; }',
        '        p { font-size: 1.1rem; }',
        '    </style>',
        '</head>',
        '<body>',
        '    <h1>Witaj Świecie!</h1>',
        '    <p>Możesz edytować ten kod i kliknąć "Aktualizuj Podgląd".</p>',
        '    <script>',
        '        console.log("Skrypt działa!");',
        '    <\/script>',
        '</body>',
        '</html>'
    ].join('\n');

    monacoEditor = monaco.editor.create(document.getElementById('monacoEditorContainer'), {
        value: savedContent !== null ? savedContent : defaultContent,
        language: 'html',
        theme: initialMonacoTheme, // Użyj motywu z localStorage
        automaticLayout: true, // Automatyczne dopasowanie rozmiaru
        wordWrap: 'on',
    });

    // --- 2. ZAPAMIĘTYWANIE EDYTORA (Zapisywanie) ---
    let saveTimeout;
    monacoEditor.onDidChangeModelContent(() => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem('editorContent', monacoEditor.getValue());
        }, 500); // Zapisz 500ms po ostatniej zmianie
    });
    // --- Koniec zapisywania edytora ---

    languageSelector.value = 'html'; // Ustaw domyślny język w selektorze

    // --- Logika Aplikacji ---

    // Funkcja do pobierania treści
    const fetchAndLoadContent = async () => {
        const url = urlInput.value;
        if (!url) {
            showError("Proszę podać adres URL.");
            return;
        }

        updateStatus(`Pobieranie z ${url}...`);
        loader.style.display = 'block';
        buttonText.style.display = 'none';
        fetchButton.querySelector('i').style.display = 'none'; // Ukryj ikonę
        fetchButton.disabled = true;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Błąd HTTP! Status: ${response.status}`);
            }
            const textContent = await response.text();

            monacoEditor.setValue(textContent);
            localStorage.setItem('editorContent', textContent); // Zapisz też po pobraniu

            // Bonus: Wykryj język na podstawie rozszerzenia pliku
            let language = 'plaintext';
            try {
                const path = new URL(url).pathname;
                if (path.endsWith('.js')) language = 'javascript';
                else if (path.endsWith('.css')) language = 'css';
                else if (path.endsWith('.json')) language = 'json';
                else if (path.endsWith('.html') || path.endsWith('.htm')) language = 'html';
                else if (path.endsWith('.md')) language = 'markdown';
                else if (path.endsWith('.py')) language = 'python';
                else if (path.endsWith('.xml') || path.endsWith('.svg')) language = 'xml';
                else if (path.endsWith('.sql')) language = 'sql';

            } catch (e) { /* Ignoruj błąd parsowania URL */ }

            monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
            languageSelector.value = language; // Ustaw też selektor
            updateStatus(`Pobrano pomyślnie. Język: ${language}.`);

        } catch (error) {
            showError(`Błąd podczas pobierania: ${error.message}`);
            if (error.message.includes('404')) {
                showError('Błąd: Nie znaleziono pliku (404). Sprawdź adres URL.');
            }
        } finally {
            loader.style.display = 'none';
            buttonText.style.display = 'block';
            fetchButton.querySelector('i').style.display = 'inline-block'; // Pokaż ikonę
            fetchButton.disabled = false;
        }
    };

    // Funkcje pomocnicze paska statusu
    const updateStatus = (message) => {
        statusBar.textContent = message;
        statusBar.style.color = 'var(--text-muted)';
    };
    const showError = (message) => {
        statusBar.textContent = message;
        statusBar.style.color = 'var(--highlight-color)';
    };

    // --- Podpięcie Event Listenerów ---

    // 1. Przycisk Pobierz
    fetchButton.addEventListener('click', fetchAndLoadContent);

    // 2. Przycisk Aktualizuj Podgląd
    updatePreviewButton.addEventListener('click', () => {
        const code = monacoEditor.getValue();
        previewFrame.srcdoc = code; // Użyj srcdoc do renderowania kodu HTML
        updateStatus("Zaktualizowano podgląd.");
    });

    // 3. Wybór języka
    languageSelector.addEventListener('change', (e) => {
        const lang = e.target.value;
        monaco.editor.setModelLanguage(monacoEditor.getModel(), lang);
        updateStatus(`Język zmieniony na: ${lang}.`);
    });

    // 4. Przełącznik motywu
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
        // Musimy ponownie zdefiniować motywy, aby pobrały nowe zmienne CSS
        // i automatycznie zastosowały nowy motyw w edytorze
        defineThemes();
    });

    // 5. Przycisk ukrywania edytora
    toggleEditorButton.addEventListener('click', () => {
        const isHidden = editorPanel.classList.toggle('hidden');
        resizer.classList.toggle('hidden');
        previewPanel.classList.toggle('full-width');

        if (isHidden) {
            toggleEditorButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggleEditorButton.title = "Pokaż edytor";
        } else {
            toggleEditorButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            toggleEditorButton.title = "Ukryj edytor";
        }

        // Poproś Monaco o ponowne przeliczenie układu
        if (!isHidden) {
            monacoEditor.layout();
        }
    });

    // 6. Logika Resizera
    let isDragging = false;

    // Funkcja do znajdowania najbliższego punktu magnetycznego
    function findSnapPoint(percent) {
        for (let snapPoint of snapPoints) {
            if (Math.abs(percent - snapPoint) < snapThreshold) {
                return snapPoint;
            }
        }
        return percent;
    }

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        resizer.classList.add('is-dragging');
        document.body.style.cursor = 'col-resize';
        // POPRAWKA: Wyłącz interakcje z iframe podczas przeciągania
        previewFrame.style.pointerEvents = 'none';
        // Pokaż linijkę i dolną linijkę
        rulerIndicator.classList.add('active');
        bottomRuler.classList.add('active');

        // Zapobiegaj zaznaczaniu tekstu podczas przeciągania
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('is-dragging');
            document.body.style.cursor = 'default';
            // POPRAWKA: Włącz ponownie interakcje z iframe
            previewFrame.style.pointerEvents = 'auto';
            // Ukryj linijki
            rulerIndicator.classList.remove('active');
            bottomRuler.classList.remove('active');
            // Ręczne wywołanie resize w Monaco po zakończeniu przeciągania
            monacoEditor.layout();
            // Przywróć status "Gotowy"
            updateStatus('Gotowy.');
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Użyj e.clientX, aby uzyskać pozycję myszy
        // content.getBoundingClientRect().left to pozycja startowa kontenera
        const newEditorWidth = e.clientX - content.getBoundingClientRect().left;

        // Pobierz szerokość kontenera
        const containerWidth = content.clientWidth;

        // Ustaw szerokość w procentach, aby zachować elastyczność
        let newEditorWidthPercent = (newEditorWidth / containerWidth) * 100;

        // Magnetyczne przyciąganie
        const snappedPercent = findSnapPoint(newEditorWidthPercent);
        const isSnapped = snappedPercent !== newEditorWidthPercent;

        if (isSnapped) {
            newEditorWidthPercent = snappedPercent;
        }

        // Ustal limity, aby panele całkowicie nie zniknęły
        if (newEditorWidthPercent > 15 && newEditorWidthPercent < 85) {
            // Użyj stylu inline, ponieważ jest on dynamicznie zmieniany
            editorPanel.style.width = `${newEditorWidthPercent}%`;

            // Aktualizuj pozycję pionowej linijki
            const actualWidth = (newEditorWidthPercent / 100) * containerWidth;
            rulerIndicator.style.left = `${content.getBoundingClientRect().left + actualWidth}px`;
            rulerIndicator.setAttribute('data-width',
                `${newEditorWidthPercent.toFixed(1)}% ${isSnapped ? '📍' : ''}`);

            // Aktualizuj pozycję wskaźnika na dolnej linijce
            rulerIndicatorBottom.style.left = `${newEditorWidthPercent}%`;
            rulerIndicatorBottom.setAttribute('data-percentage',
                `${newEditorWidthPercent.toFixed(1)}% ${isSnapped ? '📍' : ''}`);

            // Pokaż szerokość w pasku statusu
            const snapIndicator = isSnapped ? ' 📍 SNAP' : '';
            updateStatus(`Szerokość edytora: ${newEditorWidthPercent.toFixed(1)}% (${Math.round(actualWidth)}px)${snapIndicator}`);
        }
    });

    // Pierwsze zdefiniowanie motywów po załadowaniu
    defineThemes();

    // --- 7. Modal do zarządzania URL ---

    // Funkcje modalu
    function openModal(tab = 'single') {
        addUrlModal.classList.add('active');

        // Wypełnij pole URL aktualnym adresem z input
        if (tab === 'single') {
            modalUrlInput.value = urlInput.value;
            modalNameInput.value = '';
        } else if (tab === 'list') {
            modalListUrlInput.value = URL_LIST_SOURCE;
        }

        // Przełącz na odpowiednią zakładkę
        switchModalTab(tab);
    }

    function closeModal() {
        addUrlModal.classList.remove('active');
        // Wyczyść pola
        modalUrlInput.value = '';
        modalNameInput.value = '';
    }

    function switchModalTab(tabName) {
        // Usuń aktywną klasę ze wszystkich zakładek i treści
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.modal-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Aktywuj wybraną zakładkę
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        const content = document.getElementById(tabName === 'single' ? 'tabSingle' : 'tabList');

        if (tab) tab.classList.add('active');
        if (content) content.classList.add('active');
    }

    // Event listenery dla modalu
    closeModalButton.addEventListener('click', closeModal);

    // Zamknij modal po kliknięciu w tło
    addUrlModal.addEventListener('click', (e) => {
        if (e.target === addUrlModal) {
            closeModal();
        }
    });

    // Zamknij modal klawiszem Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addUrlModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Przełączanie zakładek
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchModalTab(tab.dataset.tab);
        });
    });

    // Dodaj URL z modalu
    const addUrlFromModal = () => {
        const url = modalUrlInput.value.trim();
        if (!url) {
            showError('Proszę podać URL.');
            return;
        }

        // Sprawdź czy URL już istnieje
        if (savedUrls.some(item => item.url === url)) {
            showError('Ten URL już istnieje na liście.');
            return;
        }

        // Użyj nazwy z pola lub wygeneruj z URL
        const name = modalNameInput.value.trim() || extractNameFromUrl(url);

        savedUrls.push({ name, url });
        localStorage.setItem('savedUrls', JSON.stringify(savedUrls));
        renderUrlList();
        updateStatus(`Dodano: ${name}`);
        closeModal();
    };

    modalAddButton.addEventListener('click', addUrlFromModal);

    // Enter w polach formularza pojedynczego URL
    modalUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addUrlFromModal();
        }
    });

    modalNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addUrlFromModal();
        }
    });

    // Załaduj listę z modalu
    const loadListFromModal = async () => {
        const listUrl = modalListUrlInput.value.trim();
        if (!listUrl) {
            showError('Proszę podać URL do listy.');
            return;
        }

        updateStatus('Ładowanie listy URL...');
        try {
            const response = await fetch(listUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());

            let loadedCount = 0;
            for (const line of lines) {
                // Format: nazwa|url lub tylko url
                const parts = line.split('|');
                let name, url;

                if (parts.length >= 2) {
                    name = parts[0].trim();
                    url = parts[1].trim();
                } else {
                    url = parts[0].trim();
                    name = extractNameFromUrl(url);
                }

                // Sprawdź czy to jest prawidłowy URL
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    // Sprawdź czy już nie istnieje
                    if (!savedUrls.some(item => item.url === url)) {
                        savedUrls.push({ name, url });
                        loadedCount++;
                    }
                }
            }

            localStorage.setItem('savedUrls', JSON.stringify(savedUrls));
            renderUrlList();
            updateStatus(`Załadowano ${loadedCount} nowych URL z listy.`);
            closeModal();
        } catch (error) {
            showError(`Błąd podczas ładowania listy: ${error.message}`);
        }
    };

    modalLoadListButton.addEventListener('click', loadListFromModal);

    // Enter w polu URL listy
    modalListUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadListFromModal();
        }
    });

    // --- 8. Panel z listą URL ---

    // Funkcja do renderowania listy URL
    function renderUrlList() {
        if (savedUrls.length === 0) {
            urlListItems.innerHTML = '<div class="url-list-empty">Brak zapisanych adresów URL.<br>Dodaj aktualny URL lub załaduj listę.</div>';
            return;
        }

        urlListItems.innerHTML = savedUrls.map((item, index) => `
                    <button class="url-item" data-index="${index}" title="${item.url}">
                        <span class="url-item-name">${item.name || 'Bez nazwy'}</span>
                    </button>
                `).join('');

        // Dodaj event listenery dla przycisków
        document.querySelectorAll('.url-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const index = parseInt(item.dataset.index);
                urlInput.value = savedUrls[index].url;
                urlListPanel.classList.remove('active');
                updateStatus(`Załadowano URL: ${savedUrls[index].name || 'Bez nazwy'}`);
            });
        });
    }

    // Toggle panel
    toggleUrlListButton.addEventListener('click', () => {
        urlListPanel.classList.toggle('active');
        if (urlListPanel.classList.contains('active')) {
            renderUrlList();
        }
    });

    closeUrlListButton.addEventListener('click', () => {
        urlListPanel.classList.remove('active');
    });

    // Przyciski otwierające modal
    addCurrentUrlButton.addEventListener('click', () => {
        openModal('single');
    });

    loadUrlListButton.addEventListener('click', () => {
        openModal('list');
    });

    // Renderuj listę przy starcie
    renderUrlList();

});


