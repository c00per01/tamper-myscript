// ==UserScript==
// @name         My Tamper Script
// @namespace    https://example.com/
// @version      0.0.11
// @description  Пример userscript — меняй в Antigravity, нажимай Deploy
// @match        https://*/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/c00per01/tamper-myscript/main/myscript.user.js
// @downloadURL  https://raw.githubusercontent.com/c00per01/tamper-myscript/main/myscript.user.js
// ==/UserScript==

(function () {
    'use strict';
    let inited = false;
    let currentPageKey = 'page:1:default';
    let selections = new Map();
    let phraseCounter = 0;
    let phraseInProgress = null;
    let sentHistory = [];
    let importedMinuses = [];
    let panelPosition = { left: 'auto', right: '15px', top: '15px' };
    let isSending = false;
    let wordSpans = [];

    // Undo/Redo
    let undoStack = {
        stack: [],
        currentIndex: -1,
        maxSize: 10
    };

    // Tooltip
    let tooltipTimeout = null;

    // Auto-scroll
    let lastManualScrollTime = 0;
    const autoScrollDebounceMap = new Map();

    // Стоп-слова для строгого режима фраз
    const STOPWORDS = new Set(['в', 'на', 'с', 'и', 'а', 'по', 'для', 'от', 'к', 'у', 'о', 'из', 'за', 'до', 'под', 'при', 'про']);

    // Окончания для стеммера
    const ENDINGS_3 = ['ами', 'ами', 'ями', 'ией', 'его', 'ого', 'ему', 'ому', 'ими', 'ыми', 'ать', 'ить', 'еть', 'ать', 'ешь', 'ишь', 'ете', 'ите', 'ают', 'ют', 'ешь', 'ишь'];
    const ENDINGS_2 = ['ам', 'ем', 'ом', 'ах', 'ях', 'ах', 'ах', 'ой', 'ей', 'ий', 'ый', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ми', 'ть', 'ют', 'ут', 'ет', 'ат', 'ят', 'ит', 'ла', 'ло', 'ли'];
    const ENDINGS_1 = ['а', 'е', 'и', 'о', 'у', 'ы', 'я', 'й', 'ь'];

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================

    function init() {
        if (!window.location.href.includes('stat_type=search_queries')) {
            return;
        }

        loadGlobalState();
        detectPageChange();
        waitForTableAndInit();
    }

    function waitForTableAndInit(attempt = 0) {
        if (attempt >= 100) {
            console.log('[YD-SQ] Таблица не найдена после 100 попыток');
            return;
        }

        const table = findSearchQueryTable();
        if (table && !inited) {
            console.log('[YD-SQ] Таблица найдена, инициализация...');
            initWithTable(table);
        } else {
            setTimeout(() => waitForTableAndInit(attempt + 1), 250);
        }
    }

    function findSearchQueryTable() {
        // Ищем конкретную ячейку заголовка, чтобы найти именно таблицу данных, а не обертку
        const headers = document.querySelectorAll('th, [role="columnheader"]');
        for (const h of headers) {
            if ((h.textContent || '').toLowerCase().includes('поисковый запрос')) {
                return h.closest('table, [role="table"]');
            }
        }

        // Fallback: ищем в td, если заголовки сделаны через них
        const cells = document.querySelectorAll('td, [role="cell"]');
        for (const c of cells) {
            const txt = (c.textContent || '').toLowerCase();
            // Проверяем длину, чтобы не сработать на ячейку-обертку, содержащую таблицу
            if (txt.length < 100 && txt.includes('поисковый запрос')) {
                return c.closest('table, [role="table"]');
            }
        }
        return null;
    }

    function initWithTable(table) {
        try {
            inited = true;
            wrapTableWords(table);
            injectStyles();
            createPanel();
            setupResultPopupObserver();
            setupGlobalListeners();
            loadGlobalSelectionsToLocal();
            restoreVisualMarkers();
            updateUI();
            console.log('[YD-SQ] Инициализация завершена');
        } catch (err) {
            console.error('[YD-SQ] Ошибка инициализации:', err);
        }
    }

    function detectPageChange() {
        setInterval(() => {
            const newPageKey = getCurrentPageKey();
            if (newPageKey !== currentPageKey) {
                console.log('[YD-SQ] Смена страницы:', currentPageKey, '→', newPageKey);
                currentPageKey = newPageKey;

                if (phraseInProgress) {
                    finalizePhraseBuilding(true);
                }

                inited = false;
                wordSpans = [];
                waitForTableAndInit();
            }
        }, 500);
    }

    // ==================== УТИЛИТЫ ====================

    function getCurrentPageKey() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || '1';
        const tab = params.get('tab') || 'default';
        return `page:${page}:${tab}`;
    }

    function getCampaignId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('cid') || 'unknown';
    }

    function stemWord(raw) {
        let word = raw.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]/gi, '');
        if (word.length <= 3) return word;

        for (const endings of [ENDINGS_3, ENDINGS_2, ENDINGS_1]) {
            for (const end of endings) {
                if (word.endsWith(end) && word.length > end.length + 2) {
                    return word.slice(0, -end.length);
                }
            }
        }
        return word;
    }

    function getTextContent(node) {
        if (!node) return '';
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (['INPUT', 'BUTTON', 'SVG'].includes(node.nodeName)) return '';

        let text = '';
        for (const child of node.childNodes) {
            text += getTextContent(child);
        }
        return text;
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ==================== ОБЕРТЫВАНИЕ СЛОВ ====================

    function wrapTableWords(table) {
        let rows;
        // Используем .rows для стандартных таблиц, чтобы избежать захвата строк вложенных таблиц
        if (table.rows) {
            rows = Array.from(table.rows);
        } else {
            rows = Array.from(table.querySelectorAll('tr, [role="row"]'));
        }

        // Фильтруем шапку: исключаем thead, строки с th и строки с текстом заголовка
        rows = rows.filter(row => {
            if (row.closest('thead')) return false;
            if (row.querySelector('th')) return false;
            // Дополнительная проверка: если текст строки содержит "Поисковый запрос", считаем её шапкой
            if ((row.textContent || '').toLowerCase().includes('поисковый запрос')) return false;
            return true;
        });

        let rowCounter = 0;

        for (const row of rows) {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;

            rowCounter++;
            const rowId = `${currentPageKey}:${rowCounter}`;
            row.dataset.ydRowId = rowId;

            let queryCell = null;

            // Найти ячейку с запросом
            const cellWithCheckbox = checkbox.closest('td, [role="cell"]');
            if (cellWithCheckbox) {
                queryCell = cellWithCheckbox;
            } else {
                const cells = row.querySelectorAll('td, [role="cell"]');
                for (const cell of cells) {
                    const text = getTextContent(cell).trim();
                    if (text.length > 0) {
                        queryCell = cell;
                        break;
                    }
                }
            }

            if (queryCell) {
                addCopyButtonToRow(row, queryCell);
                wrapCellWordsPreserving(queryCell, rowId);
            }
        }
    }

    function wrapCellWordsPreserving(cell, rowId) {
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';
            const tokens = text.split(/(\s+)/);
            const fragment = document.createDocumentFragment();

            for (const token of tokens) {
                if (/^\s+$/.test(token)) {
                    fragment.appendChild(document.createTextNode(token));
                } else {
                    const words = token.match(/[A-Za-zА-Яа-яЁё0-9]+|[^A-Za-zА-Яа-яЁё0-9]+/g) || [];
                    for (const word of words) {
                        if (/[A-Za-zА-Яа-яЁё0-9]+/.test(word)) {
                            const span = document.createElement('span');
                            span.className = 'yd-word';
                            span.textContent = word;
                            span.dataset.word = word;
                            span.dataset.wordLower = word.toLowerCase();
                            span.dataset.stem = stemWord(word);
                            span.dataset.rowId = rowId;

                            span.addEventListener('click', onWordClick);
                            span.addEventListener('dblclick', onWordDoubleClick);
                            span.addEventListener('mouseenter', onWordHover);
                            span.addEventListener('mouseleave', onWordHoverOut);

                            wordSpans.push(span);
                            fragment.appendChild(span);
                        } else {
                            fragment.appendChild(document.createTextNode(word));
                        }
                    }
                }
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        }
    }

    function addCopyButtonToRow(row, queryCell) {
        if (queryCell.querySelector('.yd-copy-query-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'yd-copy-query-btn';
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>`;
        btn.title = 'Скопировать запрос';

        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const text = getTextContent(queryCell).replace(/\s+/g, ' ').trim();

            try {
                await navigator.clipboard.writeText(text);
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;
                btn.classList.add('yd-copy-success');

                setTimeout(() => {
                    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>`;
                    btn.classList.remove('yd-copy-success');
                }, 1500);
            } catch (err) {
                console.error('[YD-SQ] Ошибка копирования:', err);
            }
        });

        queryCell.style.position = 'relative';
        queryCell.appendChild(btn);
    }

    // ==================== ВЗАИМОДЕЙСТВИЕ С СЛОВАМИ ====================

    function onWordClick(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        const span = e.currentTarget;
        const stem = span.dataset.stem;
        const wordLower = span.dataset.wordLower;
        const word = span.dataset.word;
        const rowId = span.dataset.rowId;

        // Проверка уже выделено
        if (span.classList.contains('yd-selected-soft') || span.classList.contains('yd-selected-strict')) {
            const key = span.classList.contains('yd-selected-soft') ? `soft:${stem}` : `strict:${wordLower}`;
            removeSelectionById(key);
            updateUI();
            return;
        }

        if (e.altKey) {
            toggleStrictWord(span, wordLower, word, rowId);
            pushUndo('add_selection', `Добавлено строгое слово "${word}"`);
        } else {
            toggleSoftWord(span, stem, word, rowId);
            pushUndo('add_selection', `Добавлено мягкое слово "${word}"`);
        }

        updateUI();
        debounceAutoScroll(rowId, 180);
    }

    function onWordDoubleClick(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        const span = e.currentTarget;
        const word = span.dataset.word;
        const rowId = span.dataset.rowId;

        if (!phraseInProgress) {
            phraseCounter++;
            const phraseId = `phrase:${phraseCounter}`;
            phraseInProgress = {
                id: phraseId,
                rowId: rowId,
                words: [word],
                startTime: Date.now()
            };

            selections.set(phraseId, {
                id: phraseId,
                kind: 'phrase',
                raw: word,
                display: word,
                words: [word],
                rowId: rowId,
                pageKey: currentPageKey,
                matchType: null,
                _building: true
            });

            span.classList.add('yd-phrase-building');
            span.dataset.phraseId = phraseId;
        } else if (phraseInProgress.rowId === rowId) {
            if (phraseInProgress.words.includes(word)) return;

            phraseInProgress.words.push(word);
            const sel = selections.get(phraseInProgress.id);
            sel.raw = phraseInProgress.words.join(' ');
            sel.display = sel.raw;
            sel.words = [...phraseInProgress.words];

            span.classList.add('yd-phrase-building');
            span.dataset.phraseId = phraseInProgress.id;
        } else {
            finalizePhraseBuilding(false);
            onWordDoubleClick(e);
            return;
        }

        updateUI();
    }

    function finalizePhraseBuilding(isCancel) {
        if (!phraseInProgress) return;

        const sel = selections.get(phraseInProgress.id);

        if (isCancel || !sel || sel.words.length < 2) {
            selections.delete(phraseInProgress.id);
        } else {
            sel._building = false;
            pushUndo('add_selection', `Построена фраза: "${sel.raw}"`);
        }

        // Удалить классы
        for (const span of wordSpans) {
            span.classList.remove('yd-phrase-building');
            delete span.dataset.phraseId;
        }

        phraseInProgress = null;
        updateUI();
    }

    function toggleSoftWord(span, stem, word, rowId) {
        const key = `soft:${stem}`;

        if (selections.has(key)) {
            const sel = selections.get(key);
            if (sel.pageKey === currentPageKey && sel.rowId === rowId) {
                selections.delete(key);
            } else {
                sel.rowId = rowId;
                sel.pageKey = currentPageKey;
                sel.raw = word;
                sel.display = word;
            }
        } else {
            selections.set(key, {
                id: key,
                kind: 'soft-word',
                stem: stem,
                raw: word,
                display: word,
                rowId: rowId,
                pageKey: currentPageKey,
                matchType: null,
                unassignedOnThisPage: false
            });
        }
    }

    function toggleStrictWord(span, wordLower, word, rowId) {
        const key = `strict:${wordLower}`;

        if (selections.has(key)) {
            const sel = selections.get(key);
            if (sel.pageKey === currentPageKey && sel.rowId === rowId) {
                selections.delete(key);
            } else {
                sel.rowId = rowId;
                sel.pageKey = currentPageKey;
                sel.raw = word;
                sel.display = '!' + word;
            }
        } else {
            selections.set(key, {
                id: key,
                kind: 'strict-word',
                wordLower: wordLower,
                raw: word,
                display: '!' + word,
                rowId: rowId,
                pageKey: currentPageKey,
                matchType: 'strict',
                unassignedOnThisPage: false
            });
        }
    }

    function removeSelectionById(id) {
        const sel = selections.get(id);
        if (!sel) return;

        selections.delete(id);

        const { rowId, pageKey } = sel;
        const otherSelsOnRow = Array.from(selections.values()).some(
            s => s.pageKey === pageKey && s.rowId === rowId
        );

        if (!otherSelsOnRow && pageKey === currentPageKey) {
            const cb = getRowCheckbox(rowId);
            if (cb && cb.checked && cb.dataset.ydAuto === 'true') {
                clickCheckbox(cb, true);
                delete cb.dataset.ydAuto;
            }
        }
    }

    // ==================== TOOLTIP ====================

    function onWordHover(e) {
        const span = e.currentTarget;
        tooltipTimeout = setTimeout(() => {
            const tooltip = createTooltip(span);
            if (tooltip) {
                document.body.appendChild(tooltip);

                const rect = span.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
            }
        }, 500);
    }

    function onWordHoverOut(e) {
        clearTimeout(tooltipTimeout);
        const existing = document.querySelector('.yd-tooltip');
        if (existing) existing.remove();
    }

    function createTooltip(span) {
        const tooltip = document.createElement('div');
        tooltip.className = 'yd-tooltip';

        if (span.classList.contains('yd-sent-history')) {
            const sentAt = span.dataset.sentAt ? new Date(parseInt(span.dataset.sentAt)) : null;
            const dateStr = sentAt ? sentAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'недавно';

            tooltip.innerHTML = `
                <div class="yd-tooltip-layer">Присутствует в истории</div>
                <div class="yd-tooltip-content">
                    ✓ Отправлено ${dateStr}
                </div>
            `;
            return tooltip;
        }

        if (span.classList.contains('yd-imported-minus')) {
            const importedAt = span.dataset.importedAt ? new Date(parseInt(span.dataset.importedAt)) : null;
            const dateStr = importedAt ? importedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'недавно';

            tooltip.innerHTML = `
                <div class="yd-tooltip-layer">Минус в кампании</div>
                <div class="yd-tooltip-content">
                    📥 В кампании<br>
                    загружено ${dateStr}
                </div>
            `;
            return tooltip;
        }

        if (span.classList.contains('yd-selected-soft')) {
            const stem = span.dataset.stem;
            const count = wordSpans.filter(s => s.dataset.stem === stem).length;

            tooltip.innerHTML = `
                <div class="yd-tooltip-layer">Мягкое выделение (soft)</div>
                <div class="yd-tooltip-content">
                    Похоже на "${span.dataset.word}"<br>
                    найдено ещё ${count - 1} похожих
                </div>
            `;
            return tooltip;
        }

        if (span.classList.contains('yd-selected-strict')) {
            tooltip.innerHTML = `
                <div class="yd-tooltip-layer">Строгое выделение (strict)</div>
                <div class="yd-tooltip-content">Точное совпадение</div>
            `;
            return tooltip;
        }

        return null;
    }

    // ==================== HIGHLIGHTS ====================

    function updateHighlights() {
        // Очистить все классы
        for (const sp of wordSpans) {
            sp.classList.remove(
                'yd-selected-soft', 'yd-selected-strict', 'yd-selected-phrase',
                'yd-phrase-building', 'yd-primary-soft', 'yd-primary-strict',
                'yd-sent-history', 'yd-imported-minus'
            );
            delete sp.dataset.phraseId;
            delete sp.dataset.sentAt;
            delete sp.dataset.importedAt;
        }

        // Собрать данные
        const softStems = new Set();
        const strictWords = new Set();
        const phrases = [];
        let primarySoft = null;
        let primaryStrict = null;

        for (const sel of selections.values()) {
            if (sel.kind === 'soft-word') {
                softStems.add(sel.stem);
                if (sel.pageKey === currentPageKey) {
                    primarySoft = { stem: sel.stem, rowId: sel.rowId };
                }
            } else if (sel.kind === 'strict-word') {
                strictWords.add(sel.wordLower);
                if (sel.pageKey === currentPageKey) {
                    primaryStrict = { wordLower: sel.wordLower, rowId: sel.rowId };
                }
            } else if (sel.kind === 'phrase' && sel.pageKey === currentPageKey) {
                phrases.push(sel);
            }
        }

        // Применить выделение
        for (const span of wordSpans) {
            const stem = span.dataset.stem;
            const wordLower = span.dataset.wordLower;
            const word = span.dataset.word;
            const rowId = span.dataset.rowId;

            // СЛОЙ 3: Текущие выделения
            if (softStems.has(stem)) {
                span.classList.add('yd-selected-soft');
                if (primarySoft && primarySoft.stem === stem && primarySoft.rowId === rowId) {
                    span.classList.add('yd-primary-soft');
                }
            }

            if (strictWords.has(wordLower)) {
                span.classList.add('yd-selected-strict');
                if (primaryStrict && primaryStrict.wordLower === wordLower && primaryStrict.rowId === rowId) {
                    span.classList.add('yd-primary-strict');
                }
            }

            for (const phrase of phrases) {
                if (phrase.words.includes(word) && phrase.rowId === rowId) {
                    span.classList.add('yd-selected-phrase');
                    span.dataset.phraseId = phrase.id;

                    if (phrase._building) {
                        span.classList.add('yd-phrase-building');
                    }
                }
            }

            // СЛОЙ 2: История отправлений
            for (const sent of sentHistory) {
                const sentStem = stemWord(sent.raw);
                if (sentStem === stem || sent.raw.toLowerCase() === wordLower) {
                    span.classList.add('yd-sent-history');
                    span.dataset.sentAt = sent.lastSentAt;
                    break;
                }
            }

            // СЛОЙ 1: Импортированные
            for (const imp of importedMinuses) {
                const impStem = stemWord(imp.raw);
                if (impStem === stem || imp.raw.toLowerCase() === wordLower) {
                    span.classList.add('yd-imported-minus');
                    span.dataset.importedAt = imp.importedAt;
                    break;
                }
            }
        }
    }

    function restoreVisualMarkers() {
        updateHighlights();
    }

    // ==================== UNDO/REDO ====================

    function pushUndo(actionType, description) {
        undoStack.stack = undoStack.stack.slice(0, undoStack.currentIndex + 1);

        undoStack.stack.push({
            timestamp: Date.now(),
            type: actionType,
            description: description,
            snapshot: new Map(selections)
        });

        undoStack.currentIndex++;

        if (undoStack.stack.length > undoStack.maxSize) {
            undoStack.stack.shift();
            undoStack.currentIndex--;
        }

        updateUndoRedoButtons();
    }

    function undo() {
        if (undoStack.currentIndex > 0) {
            undoStack.currentIndex--;
            selections.clear();

            const snapshot = undoStack.stack[undoStack.currentIndex].snapshot;
            for (const [key, val] of snapshot) {
                selections.set(key, { ...val });
            }

            updateUI();
            updateUndoRedoButtons();
        }
    }

    function redo() {
        if (undoStack.currentIndex < undoStack.stack.length - 1) {
            undoStack.currentIndex++;
            selections.clear();

            const snapshot = undoStack.stack[undoStack.currentIndex].snapshot;
            for (const [key, val] of snapshot) {
                selections.set(key, { ...val });
            }

            updateUI();
            updateUndoRedoButtons();
        }
    }

    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('yd-sq-undo-btn');
        const redoBtn = document.getElementById('yd-sq-redo-btn');

        if (undoBtn) undoBtn.disabled = (undoStack.currentIndex <= 0);
        if (redoBtn) redoBtn.disabled = (undoStack.currentIndex >= undoStack.stack.length - 1);
    }

    // ==================== CHECKBOX УПРАВЛЕНИЕ ====================

    function getRowCheckbox(rowId) {
        const row = document.querySelector(`[data-yd-row-id="${rowId}"]`);
        return row ? row.querySelector('input[type="checkbox"]') : null;
    }

    function clickCheckbox(cb, silent = false) {
        if (!silent) {
            cb.click();
        } else {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function getAllRowsOnPage() {
        return Array.from(document.querySelectorAll(`[data-yd-row-id^="${currentPageKey}:"]`));
    }

    // ==================== AUTO-SCROLL ====================

    function debounceAutoScroll(rowId, delay) {
        if (autoScrollDebounceMap.has(rowId)) {
            clearTimeout(autoScrollDebounceMap.get(rowId));
        }

        const timeout = setTimeout(() => {
            autoScrollIfAllowed(rowId);
            autoScrollDebounceMap.delete(rowId);
        }, delay);

        autoScrollDebounceMap.set(rowId, timeout);
    }

    function autoScrollIfAllowed(rowId) {
        if (isSending) return;
        if (phraseInProgress) return;
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (Date.now() - lastManualScrollTime < 600) return;

        const row = getAllRowsOnPage().find(r => r.dataset.ydRowId === rowId);
        if (!row) return;

        const rect = row.getBoundingClientRect();
        const table = row.closest('table');
        const header = table ? table.querySelector('thead') : null;
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const rowHeight = rect.height;
        const desiredOffset = headerHeight + (rowHeight * 2);

        if (rect.top < desiredOffset || rect.top > window.innerHeight - 100) {
            const targetScrollTop = window.scrollY + rect.top - desiredOffset;
            window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        }
    }

    // ==================== ИСТОРИЯ И ИМПОРТ ====================

    function addToSentHistory(display, matchType, pageNumbers = []) {
        const existing = sentHistory.find(s => s.raw === display);

        if (existing) {
            existing.count++;
            existing.lastSentAt = Date.now();
            existing.pageNumbers = [...new Set([...existing.pageNumbers, ...pageNumbers])];
        } else {
            sentHistory.push({
                id: `sent:${Date.now()}_${Math.random()}`,
                raw: display,
                matchType: matchType,
                firstSentAt: Date.now(),
                lastSentAt: Date.now(),
                count: 1,
                pageNumbers: pageNumbers,
                status: 'confirmed'
            });
        }

        syncLocalToGlobal();
    }

    function parseMinusesFromText(text) {
        const results = [];
        const usedRanges = [];

        const patterns = [
            { regex: /-\[([^\]]+)\]/g, type: 'bracket' },
            { regex: /-"([^"]+)"/g, type: 'quote' },
            { regex: /-!([^\s]+)/g, type: 'strict' },
            { regex: /-([^\s-]+)/g, type: null }
        ];

        for (const pattern of patterns) {
            const regex = new RegExp(pattern.regex);
            let match;

            while ((match = regex.exec(text)) !== null) {
                const start = match.index;
                const end = start + match[0].length;

                const overlaps = usedRanges.some(range =>
                    (start >= range.start && start < range.end) ||
                    (end > range.start && end <= range.end)
                );

                if (!overlaps) {
                    results.push({
                        raw: match[1].trim(),
                        matchType: pattern.type
                    });
                    usedRanges.push({ start, end });
                }
            }
        }

        return results;
    }

    async function importMinusesFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            const items = parseMinusesFromText(text);

            if (items.length === 0) {
                showYdsqNotification('В буфере не найдено минусов', 'warn');
                return;
            }

            const confirmed = confirm(`Загрузить ${items.length} минусов?\nЭто заменит текущие импортированные минусы.`);
            if (!confirmed) return;

            importedMinuses = items.map(i => ({
                id: `imp:${Date.now()}_${Math.random()}`,
                raw: i.raw,
                matchType: i.matchType,
                source: 'manual_paste',
                importedAt: Date.now(),
                lastUpdated: Date.now(),
                count: null
            }));

            pushUndo('import', `Загружено ${items.length} минусов из буфера`);
            syncLocalToGlobal();
            updateHighlights();
            updateUI();

            showYdsqNotification(`Загружено ${items.length} минусов`, 'success');
        } catch (err) {
            console.error('[YD-SQ] Ошибка импорта:', err);
            showYdsqNotification('Ошибка чтения буфера обмена', 'error');
        }
    }

    // ==================== UI ПАНЕЛЬ ====================

    function createPanel() {
        const existing = document.getElementById('yd-sq-panel');
        if (existing) {
            existing.style.display = '';
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'yd-sq-panel';
        panel.innerHTML = `
            <div class="yd-sq-header" id="yd-sq-panel-header">
                <span>Минус-слова и фразы</span>
                <button id="yd-sq-panel-toggle" class="yd-sq-toggle">−</button>
            </div>

            <div id="yd-sq-panel-body">
                <div class="yd-sq-section">
                    <div class="yd-sq-section-title">
                        Выбранные сейчас (<span id="yd-sq-global-count">0</span>)
                    </div>
                    <div id="yd-sq-list" class="yd-sq-list"></div>
                </div>

                <div class="yd-sq-section">
                    <div class="yd-sq-section-title">
                        📤 История отправлений (<span id="yd-sq-sent-count">0</span>)
                        <button id="yd-sq-sent-toggle" class="yd-sq-expand-btn">▼</button>
                    </div>
                    <div id="yd-sq-sent-list" class="yd-sq-list" style="display:none;"></div>
                </div>

                <div class="yd-sq-section">
                    <div class="yd-sq-section-title">
                        📥 В кампании (<span id="yd-sq-imported-count">0</span>)
                        <button id="yd-sq-imported-toggle" class="yd-sq-expand-btn">▼</button>
                    </div>
                    <div id="yd-sq-imported-list" class="yd-sq-list" style="display:none;"></div>
                </div>

                <div class="yd-sq-section yd-sq-controls">
                    <button id="yd-sq-load-clipboard" class="yd-sq-btn-secondary">📋 Загрузить из буфера</button>
                    <button id="yd-sq-update-imported" class="yd-sq-btn-secondary">↻ Обновить</button>
                </div>

                <div class="yd-sq-section yd-sq-footer-buttons">
                    <button id="yd-sq-undo-btn" class="yd-sq-btn-secondary" style="flex:0 0 40px;">↶</button>
                    <button id="yd-sq-redo-btn" class="yd-sq-btn-secondary" style="flex:0 0 40px;">↷</button>
                    <button id="yd-sq-send" class="yd-sq-btn-primary">Отправить</button>
                    <button id="yd-sq-clear-all" class="yd-sq-btn-secondary">✕</button>
                </div>

                <div class="yd-sq-hint">
                    Клик – мягкий (soft) + скролл<br>
                    Alt+клик – строгий (!) + скролл<br>
                    Дб.клик – построение фразы<br>
                    Enter/выход – завершить фразу<br>
                    📋 – скопировать весь запрос
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Применить позицию
        panel.style.position = 'fixed';
        panel.style.left = panelPosition.left;
        panel.style.right = panelPosition.right;
        panel.style.top = panelPosition.top;

        // Обработчики
        document.getElementById('yd-sq-panel-toggle').addEventListener('click', () => {
            const body = document.getElementById('yd-sq-panel-body');
            const btn = document.getElementById('yd-sq-panel-toggle');
            if (body.style.display === 'none') {
                body.style.display = '';
                btn.textContent = '−';
            } else {
                body.style.display = 'none';
                btn.textContent = '+';
            }
        });

        document.getElementById('yd-sq-sent-toggle').addEventListener('click', () => {
            const list = document.getElementById('yd-sq-sent-list');
            const btn = document.getElementById('yd-sq-sent-toggle');
            if (list.style.display === 'none') {
                list.style.display = '';
                btn.textContent = '▲';
            } else {
                list.style.display = 'none';
                btn.textContent = '▼';
            }
        });

        document.getElementById('yd-sq-imported-toggle').addEventListener('click', () => {
            const list = document.getElementById('yd-sq-imported-list');
            const btn = document.getElementById('yd-sq-imported-toggle');
            if (list.style.display === 'none') {
                list.style.display = '';
                btn.textContent = '▲';
            } else {
                list.style.display = 'none';
                btn.textContent = '▼';
            }
        });

        document.getElementById('yd-sq-load-clipboard').addEventListener('click', importMinusesFromClipboard);

        document.getElementById('yd-sq-update-imported').addEventListener('click', () => {
            importedMinuses = [];
            syncLocalToGlobal();
            updateHighlights();
            updateUI();
            showYdsqNotification('Импортированные минусы очищены', 'info');
        });

        document.getElementById('yd-sq-undo-btn').addEventListener('click', undo);
        document.getElementById('yd-sq-redo-btn').addEventListener('click', redo);

        document.getElementById('yd-sq-send').addEventListener('click', sendToMinusPhrases);

        document.getElementById('yd-sq-clear-all').addEventListener('click', () => {
            if (confirm('Очистить все выделения?')) {
                selections.clear();
                pushUndo('clear_all', 'Очищены все выделения');
                updateUI();
            }
        });

        makePanelDraggable();
    }

    function makePanelDraggable() {
        const header = document.getElementById('yd-sq-panel-header');
        const panel = document.getElementById('yd-sq-panel');

        let isDragging = false;
        let offset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset.x = e.clientX - panel.offsetLeft;
            offset.y = e.clientY - panel.offsetTop;
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            panel.style.left = (e.clientX - offset.x) + 'px';
            panel.style.top = (e.clientY - offset.y) + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;

            isDragging = false;
            header.style.cursor = 'grab';

            panelPosition = {
                left: panel.style.left,
                right: 'auto',
                top: panel.style.top
            };
            syncLocalToGlobal();
        });
    }

    function updateUI() {
        updateHighlights();
        renderSelectionList();
        renderSentHistory();
        renderImportedMinuses();
        updateUndoRedoButtons();
    }

    function renderSelectionList() {
        const container = document.getElementById('yd-sq-list');
        const countIndicator = document.getElementById('yd-sq-global-count');

        countIndicator.textContent = selections.size;

        if (selections.size === 0) {
            container.innerHTML = '<div class="yd-sq-empty">Пока ничего не выбрано</div>';
            return;
        }

        const items = Array.from(selections.values()).sort((a, b) => {
            if (a.pageKey === currentPageKey && b.pageKey !== currentPageKey) return -1;
            if (a.pageKey !== currentPageKey && b.pageKey === currentPageKey) return 1;
            return 0;
        });

        container.innerHTML = items.map(sel => {
            const isBuilding = sel._building;
            const isUnassigned = sel.unassignedOnThisPage;
            const isForeign = sel.pageKey !== currentPageKey;

            let classes = 'yd-sq-item';
            if (isBuilding) classes += ' yd-sq-item-building';
            if (isUnassigned) classes += ' yd-sq-item-unassigned';
            if (isForeign) classes += ' yd-sq-item-foreign';

            const pageHint = isForeign ? `<span class="yd-sq-page-hint">(стр. ${sel.pageKey.split(':')[1]})</span>` :
                isUnassigned ? `<span class="yd-sq-page-hint">(не найдена на странице)</span>` :
                    isBuilding ? `<span class="yd-sq-page-hint">(Дб.клик...)</span>` : '';

            return `
                <div class="${classes}" data-sel-id="${escapeHtml(sel.id)}">
                    <div class="yd-sq-left">
                        <button class="type-btn ${sel.matchType === 'quote' ? 'active' : ''}" data-type="quote" data-sel-id="${escapeHtml(sel.id)}">" "</button>
                        ${sel.kind === 'phrase' ? `<button class="type-btn ${sel.matchType === 'bracket' ? 'active' : ''}" data-type="bracket" data-sel-id="${escapeHtml(sel.id)}">[ ]</button>` : ''}
                        <button class="type-btn ${sel.matchType === 'strict' ? 'active' : ''}" data-type="strict" data-sel-id="${escapeHtml(sel.id)}">!</button>
                    </div>
                    <div class="yd-sq-mid">
                        <span class="yd-sq-item-text" data-sel-id-text="${escapeHtml(sel.id)}">${escapeHtml(sel.display)}</span>
                        ${pageHint}
                    </div>
                    <div class="yd-sq-right">
                        <button class="yd-sq-edit" data-sel-id="${escapeHtml(sel.id)}" title="Редактировать">✎</button>
                        <button class="yd-sq-item-remove" data-sel-id="${escapeHtml(sel.id)}" title="Удалить">×</button>
                    </div>
                </div>
            `;
        }).join('');

        // Обработчики
        container.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.selId;
                const type = btn.dataset.type;
                toggleMatchType(id, type);
            });
        });

        container.querySelectorAll('.yd-sq-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                startInlineEdit(btn.dataset.selId);
            });
        });

        container.querySelectorAll('.yd-sq-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeSelectionById(btn.dataset.selId);
                updateUI();
            });
        });

        container.scrollTop = container.scrollHeight;
    }

    function renderSentHistory() {
        const container = document.getElementById('yd-sq-sent-list');
        const countIndicator = document.getElementById('yd-sq-sent-count');

        countIndicator.textContent = sentHistory.length;

        if (sentHistory.length === 0) {
            container.innerHTML = '<div class="yd-sq-empty">История пуста</div>';
            return;
        }

        const sorted = [...sentHistory].sort((a, b) => b.lastSentAt - a.lastSentAt);

        container.innerHTML = sorted.map((sent, idx) => {
            const date = new Date(sent.lastSentAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
            const pages = sent.pageNumbers.length > 0 ? `на стр. ${sent.pageNumbers.join(', ')}` : '';

            return `
                <div class="yd-sq-item yd-sq-item-sent" data-sent-idx="${idx}">
                    <div class="yd-sq-left">
                        <span class="yd-sq-checkmark">✓</span>
                    </div>
                    <div class="yd-sq-mid">
                        <span class="yd-sq-item-text">${escapeHtml(sent.raw)}</span>
                        <span class="yd-sq-page-hint">×${sent.count} (${date}) ${pages}</span>
                    </div>
                    <div class="yd-sq-right">
                        <button class="yd-sq-item-remove" data-sent-idx="${idx}" title="Удалить из истории">×</button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.yd-sq-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.sentIdx);
                sentHistory.splice(idx, 1);
                syncLocalToGlobal();
                updateUI();
            });
        });
    }

    function renderImportedMinuses() {
        const container = document.getElementById('yd-sq-imported-list');
        const countIndicator = document.getElementById('yd-sq-imported-count');

        countIndicator.textContent = importedMinuses.length;

        if (importedMinuses.length === 0) {
            container.innerHTML = '<div class="yd-sq-empty">Минусы не загружены</div>';
            return;
        }

        container.innerHTML = importedMinuses.map((imp, idx) => {
            const date = new Date(imp.importedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

            return `
                <div class="yd-sq-item yd-sq-item-imported" data-imp-idx="${idx}">
                    <div class="yd-sq-left">
                        <span class="yd-sq-import-icon">📥</span>
                    </div>
                    <div class="yd-sq-mid">
                        <span class="yd-sq-item-text">${escapeHtml(imp.raw)}</span>
                        <span class="yd-sq-page-hint">загружено ${date}</span>
                    </div>
                    <div class="yd-sq-right">
                        <button class="yd-sq-item-remove" data-imp-idx="${idx}" title="Удалить">×</button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.yd-sq-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.impIdx);
                importedMinuses.splice(idx, 1);
                syncLocalToGlobal();
                updateHighlights();
                renderImportedMinuses();
            });
        });
    }

    function toggleMatchType(id, type) {
        const sel = selections.get(id);
        if (!sel) return;

        if (type === 'quote') {
            sel.matchType = (sel.matchType === 'quote') ? null : 'quote';
        } else if (type === 'bracket' && sel.kind === 'phrase') {
            sel.matchType = (sel.matchType === 'bracket') ? null : 'bracket';
        } else if (type === 'strict') {
            sel.matchType = (sel.matchType === 'strict') ? null : 'strict';
        }

        applyMatchTypeToSelection(sel, sel.matchType);
        updateUI();
    }

    function applyMatchTypeToSelection(sel, matchType) {
        if (!matchType) {
            sel.display = sel.raw;
            sel.matchType = null;
            return;
        }

        if (matchType === 'quote') {
            sel.display = '"' + sel.raw + '"';
        } else if (matchType === 'bracket' && sel.kind === 'phrase') {
            sel.display = '[' + sel.raw + ']';
        } else if (matchType === 'strict') {
            if (sel.kind === 'phrase') {
                const words = sel.raw.split(/\s+/).map(w => {
                    const wlow = w.toLowerCase().replace(/[^а-яa-z0-9ё]+/gi, '');
                    return STOPWORDS.has(wlow) ? w : ('!' + w);
                });
                sel.display = words.join(' ');
            } else {
                sel.display = sel.raw.startsWith('!') ? sel.raw : ('!' + sel.raw);
            }
        }
    }

    function startInlineEdit(id) {
        const span = document.querySelector(`[data-sel-id-text="${id}"]`);
        const sel = selections.get(id);
        if (!span || !sel) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = sel.raw;
        input.style.width = '100%';
        input.style.fontSize = '13px';
        input.style.padding = '2px 4px';
        input.style.border = '1px solid #4a90e2';
        input.style.borderRadius = '3px';

        const finishEdit = () => {
            const newValue = input.value.trim();
            sel.raw = newValue;

            if (sel.kind === 'phrase') {
                sel.words = sel.raw.split(/\s+/).filter(w => w);
            }

            applyMatchTypeToSelection(sel, sel.matchType);
            updateUI();
        };

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                updateUI();
            }
        });

        span.replaceWith(input);
        input.focus();
        input.select();
    }

    // ==================== ОТПРАВКА ====================

    async function sendToMinusPhrases() {
        if (selections.size === 0) {
            showYdsqNotification('Список минусов пуст', 'warn');
            return;
        }

        if (isSending) return;
        isSending = true;

        await new Promise(resolve => setTimeout(resolve, 150));

        const values = [];
        const unassigned = [];

        for (const sel of selections.values()) {
            if (sel.unassignedOnThisPage) {
                unassigned.push(sel.display);
            } else {
                values.push(sel.display);
            }
        }

        if (unassigned.length > 0) {
            showYdsqNotification(`Внимание: ${unassigned.length} элементов не найдены на странице`, 'warn');
        }

        if (values.length === 0) {
            showYdsqNotification('Нет элементов для отправки', 'warn');
            isSending = false;
            return;
        }

        // Найти кнопку "Добавить в минус-фразы"
        const addButton = findAddToMinusPhrasesButton();
        if (!addButton) {
            showYdsqNotification('Кнопка "Добавить в минус-фразы" не найдена', 'error');
            isSending = false;
            return;
        }

        addButton.click();

        await waitForMinusModal(values);
    }

    function findAddToMinusPhrasesButton() {
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
            const text = btn.textContent || '';
            if (text.includes('минус-фраз') || text.includes('Минус-фраз')) {
                return btn;
            }
        }
        return null;
    }

    async function waitForMinusModal(values, attempt = 0) {
        if (attempt >= 50) {
            showYdsqNotification('Окно не обнаружено', 'error');
            isSending = false;
            return;
        }

        const modal = findMinusModal();
        if (modal) {
            await fillMinusModal(modal, values);
        } else {
            setTimeout(() => waitForMinusModal(values, attempt + 1), 200);
        }
    }

    function findMinusModal() {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const dialog of dialogs) {
            const text = dialog.textContent || '';
            if (text.includes('Добавление минус-фраз') || text.includes('Добавление минус')) {
                return dialog;
            }
        }
        return null;
    }

    async function fillMinusModal(modal, values) {
        // Установить "на кампанию"
        const selects = modal.querySelectorAll('select');
        for (const select of selects) {
            const options = Array.from(select.options);
            const campaignOption = options.find(opt =>
                opt.textContent.includes('на кампанию') || opt.textContent.includes('кампани')
            );

            if (campaignOption) {
                select.value = campaignOption.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        await waitForInputFields(modal, values, 0);
    }

    async function waitForInputFields(modal, values, attempt) {
        if (attempt > 12) {
            showYdsqNotification('Поля ввода не найдены', 'error');
            isSending = false;
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 300));

        const textareas = Array.from(modal.querySelectorAll('textarea'));
        const textInputs = Array.from(modal.querySelectorAll('input[type="text"]'));
        const contentEditables = Array.from(modal.querySelectorAll('[contenteditable="true"]'));

        const allInputs = [...textareas, ...textInputs, ...contentEditables];
        const visible = allInputs.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });

        if (visible.length > 0) {
            fillFields(visible, values);

            setTimeout(() => {
                tryCloseResultPopup();

                // Добавить в историю
                const currentPage = parseInt(currentPageKey.split(':')[1]) || 1;
                for (const val of values) {
                    addToSentHistory(val, null, [currentPage]);
                }

                showYdsqNotification(`Отправлено ${values.length} минусов`, 'success');
                pushUndo('send', `Отправлено ${values.length} минусов`);

                isSending = false;
            }, 1200);
        } else {
            await waitForInputFields(modal, values, attempt + 1);
        }
    }

    function fillFields(inputs, values) {
        // Очистить
        for (const input of inputs) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Заполнить
        for (let i = 0; i < Math.min(inputs.length, values.length); i++) {
            const input = inputs[i];
            input.value = values[i];

            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));

            if (input.hasAttribute('contenteditable')) {
                input.textContent = values[i];
                input.dispatchEvent(new Event('keyup', { bubbles: true }));
            }
        }

        if (values.length > inputs.length) {
            showYdsqNotification(`Значений больше полей: ${values.length} > ${inputs.length}`, 'warn');
        }
    }

    function tryCloseResultPopup() {
        const popup = findResultPopup();
        if (!popup) return false;

        const buttons = popup.querySelectorAll('button');
        for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('ok') || text.includes('ок')) {
                btn.click();
                return true;
            }
        }

        const closeBtn = popup.querySelector('[aria-label*="Закрыть"], [aria-label*="закрыть"]');
        if (closeBtn) {
            closeBtn.click();
            return true;
        }

        return false;
    }

    function findResultPopup() {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const dialog of dialogs) {
            const text = dialog.textContent || '';
            if (text.includes('Добавлено') && text.includes('минус')) {
                return dialog;
            }
        }
        return null;
    }

    // ==================== PERSISTENCE ====================

    function loadGlobalState() {
        try {
            const campaignId = getCampaignId();
            const key = `yd-sq-state-global:${campaignId}`;
            const stored = localStorage.getItem(key);

            if (stored) {
                const data = JSON.parse(stored);
                sentHistory = data.sentHistory || [];
                importedMinuses = data.importedMinuses || [];
                panelPosition = data.panelPosition || { left: 'auto', right: '15px', top: '15px' };
                phraseCounter = data.phraseCounter || 0;

                // Восстановить selections
                if (data.selections) {
                    selections.clear();
                    for (const [key, val] of Object.entries(data.selections)) {
                        selections.set(key, val);
                    }
                }
            }
        } catch (err) {
            console.error('[YD-SQ] Ошибка загрузки состояния:', err);
        }
    }

    function syncLocalToGlobal() {
        try {
            const campaignId = getCampaignId();
            const key = `yd-sq-state-global:${campaignId}`;

            const selectionsObj = {};
            for (const [k, v] of selections) {
                selectionsObj[k] = v;
            }

            const data = {
                selections: selectionsObj,
                phraseCounter: phraseCounter,
                sentHistory: sentHistory,
                importedMinuses: importedMinuses,
                panelPosition: panelPosition
            };

            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.error('[YD-SQ] Ошибка сохранения состояния:', err);
        }
    }

    function loadGlobalSelectionsToLocal() {
        // Selections уже загружены в loadGlobalState
    }

    // ==================== УВЕДОМЛЕНИЯ ====================

    function showYdsqNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `yd-sq-notification yd-sq-notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('yd-sq-notification-show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('yd-sq-notification-show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // ==================== ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ ====================

    function setupGlobalListeners() {
        // Скролл пользователя
        window.addEventListener('scroll', () => {
            lastManualScrollTime = Date.now();
        }, { passive: true });

        // Завершение фразы при клике вне
        document.addEventListener('click', (e) => {
            if (phraseInProgress && !e.target.classList.contains('yd-word')) {
                finalizePhraseBuilding(false);
            }
        });

        // Завершение фразы при Enter
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && phraseInProgress) {
                finalizePhraseBuilding(false);
            }
        });
    }

    function setupResultPopupObserver() {
        const observer = new MutationObserver(() => {
            const popup = findResultPopup();
            if (popup) {
                setTimeout(() => tryCloseResultPopup(), 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ==================== CSS СТИЛИ ====================

    function injectStyles() {
        if (document.getElementById('yd-sq-styles')) return;

        const style = document.createElement('style');
        style.id = 'yd-sq-styles';
        style.textContent = `
            /* ПАНЕЛЬ */
            #yd-sq-panel {
                position: fixed;
                z-index: 9999999;
                background: #fff;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 8px;
                box-shadow: 0 6px 18px rgba(0,0,0,0.08);
                font-size: 12px;
                min-width: 320px;
                max-width: 450px;
                box-sizing: border-box;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }

            #yd-sq-panel * { box-sizing: border-box; }

            #yd-sq-panel .yd-sq-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
                padding: 10px 12px;
                border-bottom: 1px solid #eee;
                background: linear-gradient(to bottom, #fafafa, #f5f5f5);
                cursor: grab;
                user-select: none;
            }

            #yd-sq-panel .yd-sq-toggle {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 0 4px;
                color: #666;
                line-height: 1;
            }

            #yd-sq-panel-body {
                padding: 10px 12px 12px;
                max-height: 600px;
                overflow-y: auto;
            }

            #yd-sq-panel .yd-sq-section {
                margin-bottom: 10px;
            }

            #yd-sq-panel .yd-sq-section-title {
                font-weight: 600;
                margin-bottom: 8px;
                color: #333;
                font-size: 13px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            #yd-sq-panel .yd-sq-list {
                max-height: 250px;
                overflow-y: auto;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 8px;
                background: #fafafa;
                scroll-behavior: smooth;
            }

            #yd-sq-panel .yd-sq-empty {
                padding: 16px;
                text-align: center;
                color: #999;
                font-size: 12px;
            }

            #yd-sq-panel .yd-sq-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                border-radius: 6px;
                margin-bottom: 6px;
                background: #fff;
                border: 1px solid #e8e8e8;
                transition: all 0.2s;
            }

            #yd-sq-panel .yd-sq-item:hover {
                border-color: #ccc;
                box-shadow: 0 1px 4px rgba(0,0,0,0.05);
            }

            #yd-sq-panel .yd-sq-item-foreign {
                background: #f9f9f9;
                opacity: 0.8;
            }

            #yd-sq-panel .yd-sq-item-unassigned {
                background: #fff8f8;
                border-color: #e0b0b0;
            }

            #yd-sq-panel .yd-sq-item-building {
                background: #e2f0ff;
                border-color: #7da9ff;
            }

            #yd-sq-panel .yd-sq-item-sent {
                background: #f5f5f5;
                opacity: 0.7;
                border-color: #ddd;
            }

            #yd-sq-panel .yd-sq-item-imported {
                background: #fafafa;
                border: 1px dashed #ccc;
                opacity: 0.75;
            }

            #yd-sq-panel .yd-sq-page-hint {
                font-size: 10px;
                color: #999;
                margin-left: 5px;
            }

            #yd-sq-panel .yd-sq-left,
            #yd-sq-panel .yd-sq-right {
                display: flex;
                gap: 4px;
                flex-shrink: 0;
            }

            #yd-sq-panel .yd-sq-mid {
                flex: 1;
                min-width: 0;
            }

            #yd-sq-panel .type-btn {
                border: 1px solid #ccc;
                background: #fff;
                padding: 3px 7px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                font-size: 11px;
                transition: all 0.2s;
                line-height: 1;
            }

            #yd-sq-panel .type-btn:hover {
                background: #f5f5f5;
                border-color: #999;
            }

            #yd-sq-panel .type-btn.active {
                background: #4a90e2;
                color: #fff;
                border-color: #4a90e2;
            }

            #yd-sq-panel .yd-sq-item-text {
                font-size: 13px;
                word-break: break-word;
                line-height: 1.4;
            }

            #yd-sq-panel .yd-sq-edit {
                border: none;
                background: none;
                cursor: pointer;
                font-size: 15px;
                padding: 4px 6px;
                color: #666;
                transition: color 0.2s;
            }

            #yd-sq-panel .yd-sq-edit:hover {
                color: #4a90e2;
            }

            #yd-sq-panel .yd-sq-item-remove {
                border: none;
                background: none;
                cursor: pointer;
                color: #d00;
                font-size: 18px;
                padding: 4px 6px;
                line-height: 1;
                transition: color 0.2s;
            }

            #yd-sq-panel .yd-sq-item-remove:hover {
                color: #f00;
            }

            #yd-sq-panel .yd-sq-checkmark {
                font-size: 14px;
                color: #28a745;
            }

            #yd-sq-panel .yd-sq-import-icon {
                font-size: 14px;
            }

            #yd-sq-panel .yd-sq-expand-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0;
                font-size: 11px;
                color: #666;
                transition: transform 0.2s;
            }

            #yd-sq-panel .yd-sq-controls,
            #yd-sq-panel .yd-sq-footer-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 12px;
            }

            #yd-sq-panel .yd-sq-btn-secondary,
            #yd-sq-panel .yd-sq-btn-primary {
                padding: 10px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                border: none;
                transition: all 0.2s;
                flex: 1;
                min-width: 80px;
            }

            #yd-sq-panel .yd-sq-btn-secondary {
                background: #f5f5f5;
                color: #333;
            }

            #yd-sq-panel .yd-sq-btn-secondary:hover:not(:disabled) {
                background: #e8e8e8;
            }

            #yd-sq-panel .yd-sq-btn-secondary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            #yd-sq-panel .yd-sq-btn-primary {
                background: #4a90e2;
                color: #fff;
            }

            #yd-sq-panel .yd-sq-btn-primary:hover:not(:disabled) {
                background: #357abd;
            }

            #yd-sq-panel .yd-sq-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            #yd-sq-panel .yd-sq-hint {
                font-size: 11px;
                color: #888;
                margin-top: 8px;
                line-height: 1.4;
                padding-top: 8px;
                border-top: 1px solid #eee;
            }

            /* СЛОВА В ТАБЛИЦЕ */
            .yd-word {
                cursor: pointer;
                transition: background 0.15s ease, box-shadow 0.15s ease;
                border-radius: 2px;
                padding: 1px 0;
                position: relative;
                display: inline-block;
            }

            .yd-word:hover {
                background: rgba(74, 144, 226, 0.1);
            }

            .yd-selected-soft {
                background: #fff3bf !important;
            }

            .yd-selected-strict {
                background: #ffd6d6 !important;
            }

            .yd-selected-phrase {
                background: #cce5ff !important;
            }

            .yd-phrase-building {
                background: #e2f0ff !important;
                outline: 2px dashed #7da9ff;
                outline-offset: 1px;
            }

            .yd-primary-soft {
                box-shadow: 0 0 0 2px #f0c200 inset;
                font-weight: 600;
            }

            .yd-primary-strict {
                box-shadow: 0 0 0 2px #d90000 inset;
                background: #ffd6d6 !important;
                font-weight: 600;
            }

            .yd-sent-history {
                background: #f5f5f5 !important;
                opacity: 0.65;
                border-bottom: 1px solid #28a745;
                position: relative;
            }

            .yd-sent-history::after {
                content: '✓';
                position: absolute;
                right: -6px;
                top: -4px;
                font-size: 10px;
                color: #28a745;
                font-weight: bold;
            }

            .yd-imported-minus {
                background: rgba(0, 0, 0, 0.04) !important;
                color: #aaa !important;
                text-decoration: line-through;
                text-decoration-color: rgba(0, 0, 0, 0.1);
                opacity: 0.8;
            }

            /* COPY КНОПКА */
            .yd-copy-query-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: 8px;
                vertical-align: middle;
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 4px 6px;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s, background 0.2s, border-color 0.2s;
                z-index: 10;
                color: #666;
                width: 24px;
                height: 24px;
                line-height: 1;
            }

            tr:hover .yd-copy-query-btn,
            [role="row"]:hover .yd-copy-query-btn {
                opacity: 1;
            }

            .yd-copy-query-btn:hover {
                background: #fff;
                border-color: #4a90e2;
                color: #4a90e2;
            }

            .yd-copy-query-btn.yd-copy-success {
                color: #28a745 !important;
                border-color: #28a745 !important;
            }

            /* TOOLTIP */
            .yd-tooltip {
                position: fixed;
                background: #333;
                color: #fff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 11px;
                z-index: 10000000;
                max-width: 200px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                pointer-events: none;
                line-height: 1.4;
            }

            .yd-tooltip-layer {
                font-weight: 600;
                margin-bottom: 4px;
                padding-bottom: 4px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                font-size: 10px;
            }

            .yd-tooltip-content {
                font-size: 11px;
            }

            /* УВЕДОМЛЕНИЯ */
            .yd-sq-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2147483647;
                padding: 12px 20px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
                max-width: 350px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }

            .yd-sq-notification-show {
                opacity: 1;
                transform: translateY(0);
            }

            .yd-sq-notification-info {
                background: #4a90e2;
                color: #fff;
            }

            .yd-sq-notification-success {
                background: #28a745;
                color: #fff;
            }

            .yd-sq-notification-warn {
                background: #ff9800;
                color: #fff;
            }

            .yd-sq-notification-error {
                background: #dc3545;
                color: #fff;
            }
        `;

        document.head.appendChild(style);
    }

    // ==================== ЗАПУСК ====================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
