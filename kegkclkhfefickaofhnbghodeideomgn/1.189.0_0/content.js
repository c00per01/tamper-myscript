
(function () {
    'use strict';

    // ==================== ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ====================
    const DEBUG_MODE = true; // ВРЕМЕННО: для отладки, потом установим false

    // Глобальный буфер логов для диагностики (последние 200 записей)
    const LOG_BUFFER = [];
    const LOG_BUFFER_SIZE = 200;

    function addToLogBuffer(level, msg, data) {
        const entry = {
            ts: new Date().toISOString(),
            level,
            msg,
            data: data !== undefined ? (typeof data === 'object' ? JSON.stringify(data) : String(data)) : null
        };
        LOG_BUFFER.push(entry);
        if (LOG_BUFFER.length > LOG_BUFFER_SIZE) {
            LOG_BUFFER.shift();
        }
        // Экспортируем в window для доступа из консоли
        window.__YD_SQ_LOGS = LOG_BUFFER;
    }

    const log = {
        // Основные события
        info: (msg, data) => {
            addToLogBuffer('info', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] ℹ️ ${msg}`, data !== undefined ? data : '');
        },

        // Критические ошибки (всегда логируем)
        error: (msg, error) => {
            addToLogBuffer('error', msg, error);
            console.error(`[YD-SQ] ❌ ERROR: ${msg}`, error || '');
        },

        // Предупреждения
        warn: (msg, data) => {
            addToLogBuffer('warn', msg, data);
            if (!DEBUG_MODE) return;
            console.warn(`[YD-SQ] ⚠️ ${msg}`, data !== undefined ? data : '');
        },

        // Успешные операции
        success: (msg, data) => {
            addToLogBuffer('success', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] ✅ ${msg}`, data !== undefined ? data : '');
        },

        // Пакетная отправка
        batch: (msg, data) => {
            addToLogBuffer('batch', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 📦 BATCH: ${msg}`, data !== undefined ? data : '');
        },

        // Резервация строк
        reserve: (msg, data) => {
            addToLogBuffer('reserve', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 🔒 RESERVE: ${msg}`, data !== undefined ? data : '');
        },

        // Клики и взаимодействия
        click: (msg, data) => {
            addToLogBuffer('click', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 👆 CLICK: ${msg}`, data !== undefined ? data : '');
        },

        // Состояние selections
        selection: (msg, data) => {
            addToLogBuffer('selection', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 📝 SELECTION: ${msg}`, data !== undefined ? data : '');
        },

        // Модальные окна
        modal: (msg, data) => {
            addToLogBuffer('modal', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 🪟 MODAL: ${msg}`, data !== undefined ? data : '');
        },

        // Синхронизация данных
        sync: (msg, data) => {
            addToLogBuffer('sync', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 🔄 SYNC: ${msg}`, data !== undefined ? data : '');
        },

        // UI события (новое)
        ui: (msg, data) => {
            addToLogBuffer('ui', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 🎨 UI: ${msg}`, data !== undefined ? data : '');
        },

        // Resize события (новое)
        resize: (msg, data) => {
            addToLogBuffer('resize', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] ↔️ RESIZE: ${msg}`, data !== undefined ? data : '');
        },

        // Подсветка (новое)
        highlight: (msg, data) => {
            addToLogBuffer('highlight', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 🔆 HIGHLIGHT: ${msg}`, data !== undefined ? data : '');
        },

        // Storage операции (новое)
        storage: (msg, data) => {
            addToLogBuffer('storage', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 💾 STORAGE: ${msg}`, data !== undefined ? data : '');
        },

        // Инициализация (новое)
        init: (msg, data) => {
            addToLogBuffer('init', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 🚀 INIT: ${msg}`, data !== undefined ? data : '');
        },

        // Редирект (новое)
        redirect: (msg, data) => {
            addToLogBuffer('redirect', msg, data);
            if (!DEBUG_MODE) return;
            console.log(`[YD-SQ] 🔀 REDIRECT: ${msg}`, data !== undefined ? data : '');
        },

        // Детальный дамп состояния
        state: (label) => {
            if (!DEBUG_MODE) return;
            console.group(`[YD-SQ] 📊 STATE: ${label}`);
            console.log('selections.size:', selections.size);
            console.log('selections:', Array.from(selections.entries()));
            console.log('batchQueue.length:', batchQueue.length);
            console.log('currentBatchIndex:', currentBatchIndex);
            console.log('isSending:', isSending);
            console.log('pendingSentMinuses.length:', pendingSentMinuses.length);
            console.log('importedMinuses.length:', importedMinuses.length);
            console.log('currentPageKey:', currentPageKey);
            console.groupEnd();
        },

        // Получить все логи (для диагностики)
        getLogs: () => LOG_BUFFER,

        // Вывести все логи в консоль
        dumpLogs: () => {
            console.group('[YD-SQ] 📋 FULL LOG DUMP');
            LOG_BUFFER.forEach(entry => {
                console.log(`${entry.ts} [${entry.level}] ${entry.msg}`, entry.data || '');
            });
            console.groupEnd();
        }
    };

    let inited = false;
    let currentPageKey = 'page:1:default';
    let selections = new Map();
    let phraseCounter = 0;
    let phraseInProgress = null;
    let sentHistory = [];
    let importedMinuses = [];
    let pendingSentMinuses = []; // Минусы, ожидающие подтверждения отправки
    let pendingSentMinusesBackup = []; // Бэкап отправленных минусов для пакетной обработки
    let panelPosition = { left: 'auto', right: '15px', top: '15px' };
    let isSending = false;
    let isWrapping = false;
    let wordSpans = [];
    let campaignMinusList = new Set(); // Cache for "In Campaign" phrases

    // Batch sending
    let batchQueue = []; // Очередь пакетов для отправки
    let currentBatchIndex = 0;

    // Дата последней отправки минусов в Директ (timestamp)
    let lastSendDate = null;

    // Флаг: был ли уже выполнен редирект для текущей кампании
    // Храним в sessionStorage чтобы сохранялся при перезагрузках страницы
    let lastCheckedCampaignId = sessionStorage.getItem('yd-sq-last-checked-cid') || null;

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

    // ==================== УТИЛИТЫ ====================

    // Debounce функция для оптимизации производительности
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Валидация и очистка минус-слова
    function sanitizeMinusKeyword(str) {
        if (typeof str !== 'string') return null;

        // Убираем лишние пробелы
        let clean = str.trim();

        // Пустая строка
        if (!clean) return null;

        // Слишком длинная строка (ограничение Директа ~35 символов на слово)
        if (clean.length > 100) {
            clean = clean.substring(0, 100);
        }

        // Убираем начальный минус если есть (мы добавим его сами)
        if (clean.startsWith('-')) {
            clean = clean.substring(1).trim();
        }

        // Убираем множественные пробелы
        clean = clean.replace(/\s+/g, ' ');

        // Проверяем на невалидные символы (оставляем буквы, цифры, пробелы, !, ", [])
        // Эти символы используются в Direct для операторов
        const validPattern = /^[а-яёa-z0-9\s!"\[\]]+$/i;
        if (!validPattern.test(clean)) {
            // Убираем невалидные символы
            clean = clean.replace(/[^а-яёa-z0-9\s!"\[\]]/gi, '');
        }

        return clean || null;
    }

    // Стоп-слова для строгого режима фраз
    // Стоп-слова для строгого режима фраз и автоматического переключения в strict
    const STOPWORDS = new Set([
        'в', 'на', 'с', 'и', 'а', 'по', 'для', 'от', 'к', 'у', 'о', 'из', 'за', 'до', 'под', 'при', 'про',
        'как', 'так', 'или', 'но', 'да', 'ни', 'то', 'что', 'чтобы', 'без', 'об', 'над', 'перед', 'между',
        'ли', 'же', 'бы', 'было', 'будет', 'если', 'где', 'когда', 'кто', 'что', 'чем', 'тем', 'все', 'всё',
        'весь', 'вся', 'они', 'мы', 'вы', 'он', 'она', 'оно', 'это', 'эта', 'этот', 'те', 'тот', 'та'
    ]);

    // Regex patterns for Porter Stemmer
    const RE_PERFECTIVEGERUND = /((ив|ивши|ившись|ыв|ывши|ывшись)|((?<=[ая])(в|вши|вшись)))$/;
    const RE_REFLEXIVE = /(с[яь])$/;
    const RE_ADJECTIVE = /((ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)|((?<=[ая])(ем|нн|н|ш|щ)))$/;
    const RE_PARTICIPLE = /((ивш|ывш|ующ)|((?<=[ая])(ем|нн|н|ш|щ)))$/;
    const RE_VERB = /((ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь|ую|ю)|((?<=[ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)))$/;
    const RE_NOUN = /(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
    const RE_RVRE = /^(.*?[аеиоуыэюя])(.*)$/;
    const RE_DERIVATIONAL_SIMPLE = /ость?$/;
    const RE_SUPERLATIVE = /(ейше|ейш)$/;
    const RE_I = /и$/;
    const RE_P = /ь$/;
    const RE_NN = /нн$/;

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================

    function init() {
        // Проверяем: если мы на странице настроек кампании и идёт синхронизация
        if (isOnCampaignSettingsPage()) {
            if (handleSettingsPageSync()) {
                return; // Обработка синхронизации завершится автоматически
            }
        }

        if (!window.location.href.includes('stat_type=search_queries')) {
            return;
        }

        // Проверяем и редиректим на правильный URL если нужно
        checkAndRedirectUrl();

        loadGlobalState();
        loadLastSendDate(); // Загружаем дату последней отправки
        setupGlobalListeners();

        // Проверяем есть ли синхронизированные данные для применения
        setTimeout(() => {
            checkAndApplySyncedData();
        }, 1000);

        detectPageChange();
        waitForTableAndInit();
    }

    function setupGlobalListeners() {
        // Отслеживаем ручную прокрутку для автоскролла
        document.addEventListener('scroll', trackManualScroll, { passive: true });
        document.addEventListener('wheel', trackManualScroll, { passive: true });
        document.addEventListener('touchmove', trackManualScroll, { passive: true });
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
            setupTableObserver(table);
            injectStyles();
            createPanel();
            setupResultPopupObserver();
            setupMinusModalObserver();
            restoreCheckboxes();
            updateHighlights();
            updateUI();

            // MutationObserver (setupTableObserver) отслеживает изменения DOM
            // и вызывает restoreCheckboxes/updateHighlights при необходимости

            console.log('[YD-SQ] Инициализация завершена');

            // Автосинхронизация при первой установке
            const firstRunKey = 'yd-sq-first-run-completed';
            if (!localStorage.getItem(firstRunKey)) {
                console.log('[YD-SQ] Первый запуск — автоматическая синхронизация...');
                localStorage.setItem(firstRunKey, Date.now().toString());

                // Запускаем синхронизацию с небольшой задержкой после инициализации
                setTimeout(async () => {
                    try {
                        showYdsqNotification('Первый запуск: синхронизация данных...', 'info');
                        await startCampaignSync();
                        if (typeof syncLatestDateFromHistory === 'function') {
                            await syncLatestDateFromHistory();
                        }
                        showYdsqNotification('Синхронизация завершена!', 'success');
                    } catch (err) {
                        console.error('[YD-SQ] Ошибка автосинхронизации:', err);
                    }
                }, 2000);
            }
        } catch (err) {
            console.error('[YD-SQ] Ошибка инициализации:', err);
        }
    }

    function restoreCheckboxes() {
        // Восстанавливаем чекбоксы для строк, которые есть в selections на текущей странице
        const rowsWithSelections = new Set();
        const allSelectionsCount = selections.size;

        for (const [selKey, sel] of selections.entries()) {
            // Пытаемся сопоставить по pageKey ИЛИ если ключ в Map совпадает с текущим pageKey
            if (sel.pageKey === currentPageKey) {
                rowsWithSelections.add(sel.rowId);
            } else {
                // FALLBACK: если в ключе записи есть хеш, который присутствует на текущей странице
                // Это помогает, если страница определилась как page:1 вместо page:3
                const parts = selKey.split(':');
                const hash = parts[parts.length - 1]; // Последняя часть - всегда хеш
                const potentialRowId = `${currentPageKey}:${hash}`;
                // Если в текущем DOM есть строка с таким хешем - восстановим её
                if (document.querySelector(`[data-yd-row-id="${potentialRowId}"]`)) {
                    rowsWithSelections.add(potentialRowId);
                }
            }
        }

        if (rowsWithSelections.size > 0 || allSelectionsCount > 0) {
            console.log(`[YD-SQ] 🔲 RESTORE: Page=${currentPageKey}, CurrentPageSels=${rowsWithSelections.size}, TotalSels=${allSelectionsCount}`);
        }

        // Устанавливаем чекбоксы для найденных строк АСИНХРОННО
        // (клик по чекбоксу Яндекса может вызывать побочные эффекты)
        if (rowsWithSelections.size > 0) {
            setTimeout(() => {
                let restoredCount = 0;
                for (const rowId of rowsWithSelections) {
                    try {
                        const row = document.querySelector(`[data-yd-row-id="${rowId}"]`);
                        if (row) {
                            const checkbox = row.querySelector('input[type="checkbox"]');
                            if (checkbox && !checkbox.checked) {
                                clickCheckbox(checkbox, true);
                                checkbox.dataset.ydAuto = 'true';
                                restoredCount++;
                            }
                        }
                    } catch (err) {
                        console.error('[YD-SQ] ❌ Ошибка восстановления чекбокса для rowId:', rowId, err);
                    }
                }

                if (restoredCount > 0) {
                    log.checkbox(`Восстановлено ${restoredCount} чекбоксов`);
                }
            }, 100);
        }
    }

    function setupTableObserver(table) {
        const observer = new MutationObserver((mutations) => {
            if (isWrapping) return;

            let shouldUpdate = false;
            for (const m of mutations) {
                if (m.type === 'childList') {
                    shouldUpdate = true;
                    break;
                }
            }

            if (shouldUpdate) {
                isWrapping = true;
                setTimeout(() => {
                    cleanWordSpans();
                    wrapTableWords(table);
                    restoreCheckboxes(); // Восстанавливаем чекбоксы после перерисовки таблицы
                    updateHighlights();
                    isWrapping = false;
                }, 50);
            }
        });

        const tbody = table.querySelector('tbody') || table;
        observer.observe(tbody, { childList: true, subtree: true });
    }

    function cleanWordSpans() {
        wordSpans = wordSpans.filter(span => document.body.contains(span));
    }

    function cleanupPageState() {
        // Прерываем пакетную отправку если она идет
        if (batchQueue.length > 0) {
            console.log('[YD-SQ] Прерывание пакетной отправки из-за смены страницы');
            showYdsqNotification('Пакетная отправка прервана при смене страницы', 'warn');
            batchQueue = [];
            currentBatchIndex = 0;
            isSending = false;
            pendingSentMinuses = []; // Очищаем pending, т.к. отправка не завершена
        }

        // Cancel phrase mode if active
        if (phraseInProgress) {
            phraseInProgress = null;
        }

        // Remove all phrase action buttons
        document.querySelectorAll('.yd-phrase-actions').forEach(el => el.remove());

        // Unwrap all .yd-word spans back to text
        const parents = new Set();
        document.querySelectorAll('.yd-word').forEach(span => {
            const text = span.textContent;
            const textNode = document.createTextNode(text);
            const parent = span.parentNode;
            parent.replaceChild(textNode, span);
            parents.add(parent);
        });

        // Normalize parent nodes to merge adjacent text nodes
        parents.forEach(parent => {
            if (parent && parent.normalize) {
                parent.normalize();
            }
        });

        // Clear wordSpans array
        wordSpans = [];

        // Remove temporary classes from all rows
        document.querySelectorAll('[data-yd-row-id]').forEach(row => {
            row.classList.remove('yd-row-deactivated');
            delete row.dataset.ydAutoRow;
        });

        // Reset checkbox dataset attributes
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            delete cb.dataset.ydAuto;
        });

        resetClearAllButton();

        console.log('[YD-SQ] Состояние страницы очищено');
    }

    function detectPageChange() {
        setInterval(() => {
            const newPageKey = getCurrentPageKey();
            if (newPageKey !== currentPageKey) {
                console.log('[YD-SQ] Смена страницы:', currentPageKey, '→', newPageKey);
                currentPageKey = newPageKey;

                // Full cleanup before reinitializing
                cleanupPageState();

                inited = false;
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

    function addDelegatedListener(type, selector, handler) {
        document.body.addEventListener(type, (e) => {
            const target = e.target.closest(selector);
            if (target) handler(e, target);
        });
    }

    function addClickListener(container, selector, handler) {
        container.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handler(e, btn);
            });
        });
    }

    /**
     * Упрощённый стеммер для Яндекс Директ
     * 
     * Логика Яндекс Директ: минус-слово без оператора ! исключает ВСЕ СЛОВОФОРМЫ,
     * но НЕ однокоренные слова другой части речи.
     * 
     * Примеры:
     * - "шина" исключает: шины, шине, шиной, шину (словоформы существительного)
     * - "шина" НЕ исключает: шинный, шинная (прилагательные - другое слово)
     * - "купить" исключает: купил, купила, куплю (формы глагола)
     * 
     * Решение: 
     * 1. Прилагательные НЕ трогаем (это другие слова)
     * 2. Существительные - убираем падежные окончания
     * 3. Глаголы - приводим к основе
     */
    function stemWord(word) {
        word = word.toLowerCase().replace(/ё/g, 'е');

        // Минимальная длина для стемминга
        if (word.length < 4) return word;

        // === ПРИЛАГАТЕЛЬНЫЕ: НЕ УБИРАЕМ (это другие слова) ===
        const adjEndings = /(?:ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его|ому|ему|ым|им|ой|ей|ую|юю|ых|их|ыми|ими)$/;
        if (adjEndings.test(word)) {
            return word;
        }

        // === ГЛАГОЛЫ: приводим к основе ===
        // Инфинитив (-ть, -ти, -чь)
        const verbInfEndings = ['ться', 'тись', 'ить', 'ать', 'ять', 'еть', 'уть', 'оть', 'ыть', 'ти', 'чь'];
        for (const ending of verbInfEndings) {
            if (word.endsWith(ending) && word.length - ending.length >= 2) {
                return word.slice(0, -ending.length);
            }
        }

        // Прошедшее время (-л, -ла, -ло, -ли)
        const verbPastEndings = ['лась', 'лось', 'лись', 'ла', 'ло', 'ли', 'л'];
        for (const ending of verbPastEndings) {
            if (word.endsWith(ending) && word.length - ending.length >= 2) {
                return word.slice(0, -ending.length);
            }
        }

        // === СУЩЕСТВИТЕЛЬНЫЕ: падежи и числа ===
        // Порядок важен: сначала длинные, потом короткие
        const nounEndings = [
            // Множественное число + падежи
            'ами', 'ями', 'ах', 'ях', 'ам', 'ям', 'ов', 'ев', 'ей',
            // Единственное число падежи
            'ой', 'ей', 'ом', 'ем', 'ою', 'ею', 'ий',
            // Простые окончания
            'а', 'я', 'о', 'е', 'у', 'ю', 'ы', 'и', 'ь'
        ];

        for (const ending of nounEndings) {
            if (word.endsWith(ending) && word.length - ending.length >= 2) {
                return word.slice(0, -ending.length);
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
                // Check if already wrapped to avoid double processing
                if (queryCell.querySelector('.yd-word')) continue;

                // Используем текст запроса для создания стабильного rowId
                const queryText = getTextContent(queryCell).trim();
                const queryHash = simpleHash(queryText);
                const rowId = `${currentPageKey}:${queryHash}`;
                row.dataset.ydRowId = rowId;

                addCopyButtonToRow(row, queryCell);
                wrapCellWordsPreserving(queryCell, rowId);
            }
        }
    }

    // Простая хеш-функция для создания уникального ID из текста
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
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

                            // Direct listeners to prevent bubbling to row and fix checkbox toggling
                            span.addEventListener('click', (e) => onWordClick(e, span));
                            span.addEventListener('dblclick', (e) => onWordDoubleClick(e, span));
                            span.addEventListener('mouseover', (e) => onWordHover(e, span));
                            span.addEventListener('mouseout', (e) => onWordHoverOut(e, span));

                            // Stop propagation for mouse events to prevent row toggle
                            span.addEventListener('mousedown', (e) => { e.stopPropagation(); });
                            span.addEventListener('mouseup', (e) => { e.stopPropagation(); });

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

        // Контейнер для кнопок
        const btnContainer = document.createElement('span');
        btnContainer.className = 'yd-query-actions';

        // Кнопка копирования
        const copyBtn = document.createElement('button');
        copyBtn.className = 'yd-copy-query-btn';
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>`;
        copyBtn.title = 'Скопировать запрос';

        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const text = getTextContent(queryCell).replace(/\s+/g, ' ').trim();

            try {
                await navigator.clipboard.writeText(text);
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;
                copyBtn.classList.add('yd-copy-success');

                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>`;
                    copyBtn.classList.remove('yd-copy-success');
                }, 1500);
            } catch (err) {
                console.error('[YD-SQ] Ошибка копирования:', err);
            }
        });

        // Кнопка открытия в Яндекс
        const searchBtn = document.createElement('button');
        searchBtn.className = 'yd-search-query-btn';
        searchBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
        </svg>`;
        searchBtn.title = 'Открыть в Яндекс';

        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = getTextContent(queryCell).replace(/\s+/g, ' ').trim();
            const encodedQuery = encodeURIComponent(text);
            const searchUrl = `https://yandex.ru/search/?text=${encodedQuery}&lr=213`;
            window.open(searchUrl, '_blank');
        });

        btnContainer.appendChild(copyBtn);
        btnContainer.appendChild(searchBtn);

        queryCell.style.position = 'relative';
        queryCell.appendChild(btnContainer);
    }

    // ==================== SMART SCROLL (DEFERRED) ====================
    // Константы скролла
    const SCROLL_BOTTOM_TRIGGER_ZONE = 0.4; // Нижние 40% экрана - зона требующая скролла
    const SCROLL_TARGET_POSITION = 0.3;     // Целевая позиция строки - 30% от верха

    // Состояние отложенного скролла
    let pendingScrollRowId = null;
    let pendingScrollNeedsScroll = false;

    function trackManualScroll() {
        lastManualScrollTime = Date.now();
        // При ручном скролле сбрасываем отложенный скролл
        pendingScrollNeedsScroll = false;
    }

    /**
     * Проверяет нужен ли скролл для строки и устанавливает флаг.
     * Скролл НЕ выполняется сразу - только при mouseleave.
     */
    function checkScrollNeeded(rowId) {
        // Не скроллим, если была ручная прокрутка менее 500ms назад
        const timeSinceLastScroll = Date.now() - lastManualScrollTime;
        if (lastManualScrollTime > 0 && timeSinceLastScroll < 500) {
            return;
        }

        const row = document.querySelector(`[data-yd-row-id="${rowId}"]`);
        if (!row) return;

        const rowRect = row.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Граница нижней зоны (верхние 60% экрана - безопасная зона)
        const bottomZoneStart = viewportHeight * (1 - SCROLL_BOTTOM_TRIGGER_ZONE);

        // Если row.bottom выше чем нижняя зона - скролл не нужен
        if (rowRect.bottom < bottomZoneStart) {
            pendingScrollNeedsScroll = false;
            pendingScrollRowId = null;
            return;
        }

        // Строка в нижней зоне - нужен скролл, но откладываем
        pendingScrollNeedsScroll = true;
        pendingScrollRowId = rowId;

        // Устанавливаем обработчик mouseleave на строку
        setupRowMouseLeaveHandler(row);
    }

    /**
     * Устанавливает обработчик mouseleave для отложенного скролла
     */
    function setupRowMouseLeaveHandler(row) {
        // Удаляем старый обработчик если есть
        if (row._scrollMouseLeaveHandler) {
            row.removeEventListener('mouseleave', row._scrollMouseLeaveHandler);
        }

        // Создаем новый обработчик
        row._scrollMouseLeaveHandler = function onRowMouseLeave() {
            if (pendingScrollNeedsScroll && pendingScrollRowId) {
                executeScrollToRow(pendingScrollRowId);
            }
            // Сбрасываем состояние
            pendingScrollNeedsScroll = false;
            pendingScrollRowId = null;
            // Удаляем обработчик после срабатывания
            row.removeEventListener('mouseleave', row._scrollMouseLeaveHandler);
            row._scrollMouseLeaveHandler = null;
        };

        row.addEventListener('mouseleave', row._scrollMouseLeaveHandler);
    }

    /**
     * Выполняет плавный скролл к строке на позицию TARGET_POSITION
     */
    function executeScrollToRow(rowId) {
        const row = document.querySelector(`[data-yd-row-id="${rowId}"]`);
        if (!row) return;

        const rowRect = row.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Вычисляем целевую позицию: верхняя граница строки на 30% от верха экрана
        const targetY = rowRect.top + window.scrollY - (viewportHeight * SCROLL_TARGET_POSITION);

        // Apple-like smooth scroll
        const scrollStart = window.scrollY;
        const scrollDiff = Math.max(0, targetY) - scrollStart;

        if (Math.abs(scrollDiff) < 5) {
            window.scrollTo(0, Math.max(0, targetY));
            return;
        }

        const duration = 1000;
        const startTime = performance.now();

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            let progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
            const ease = 1 - Math.pow(1 - progress, 4);

            window.scrollTo(0, scrollStart + scrollDiff * ease);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    // Совместимость со старым API (для debounceAutoScroll)
    function autoScrollToRow(rowId) {
        checkScrollNeeded(rowId);
    }

    function debounceAutoScroll(rowId, delay = 180) {
        // Clear existing timeout for this row
        if (autoScrollDebounceMap.has(rowId)) {
            clearTimeout(autoScrollDebounceMap.get(rowId));
        }

        // Set new timeout
        const timeoutId = setTimeout(() => {
            checkScrollNeeded(rowId);
            autoScrollDebounceMap.delete(rowId);
        }, delay);

        autoScrollDebounceMap.set(rowId, timeoutId);
    }

    // ==================== ВЗАИМОДЕЙСТВИЕ С СЛОВАМИ ====================

    function onWordClick(e, targetSpan) {
        e.stopPropagation();

        log.click('onWordClick вызван', {
            word: targetSpan.dataset.word,
            rowId: targetSpan.dataset.rowId,
            altKey: e.altKey,
            shiftKey: e.shiftKey
        });

        // Блокируем клики во время отправки
        if (isSending) {
            log.warn('Клик заблокирован: идет отправка');
            showYdsqNotification('Идет пакетная отправка, подождите...', 'warn');
            return;
        }

        const span = targetSpan;

        // 🛑 ISOLATION LOCKDOWN: Блокируем клики по импортированным словам
        if (span.classList.contains('yd-imported-minus')) {
            log.click('Клик по импортированному минусу - игнорируем');
            e.stopPropagation();
            return; // Немедленный выход, никакой логики не выполняется
        }

        const stem = span.dataset.stem;
        const wordLower = span.dataset.wordLower;
        const word = span.dataset.word;
        const rowId = span.dataset.rowId;

        // If phrase building is in progress
        if (phraseInProgress) {
            // Check if click is in the same row
            if (phraseInProgress.rowId !== rowId) {
                // Click on another row's word -> Ignore (do nothing)
                return;
            }

            // Check if this word is already part of the phrase
            const wordIndex = phraseInProgress.words.indexOf(word);

            if (wordIndex !== -1) {
                // Word is in phrase -> Remove it
                // If it's the only word -> Fast cancel
                if (phraseInProgress.words.length === 1) {
                    cancelPhraseBuilding();
                    return;
                }

                // Remove word
                phraseInProgress.words.splice(wordIndex, 1);

                // Update selection
                const sel = selections.get(phraseInProgress.id);
                sel.raw = phraseInProgress.words.join(' ');
                sel.display = `"${sel.raw}"`;
                sel.words = [...phraseInProgress.words];

                span.classList.remove('yd-phrase-building');
                delete span.dataset.phraseId;

                updateUI();
                return;
            }

            // Add word to phrase
            phraseInProgress.words.push(word);
            const sel = selections.get(phraseInProgress.id);
            sel.raw = phraseInProgress.words.join(' ');
            sel.display = `"${sel.raw}"`;
            sel.words = [...phraseInProgress.words];

            span.classList.add('yd-phrase-building');
            span.dataset.phraseId = phraseInProgress.id;

            // Auto-complete if all words in row are selected
            const rowSpans = wordSpans.filter(s => s.dataset.rowId === rowId);
            if (phraseInProgress.words.length === rowSpans.length) {
                finalizePhraseBuilding(false);
                return;
            }

            updateUI();
            ensureRowChecked(rowId);
            return;
        }

        // Normal click behavior (no phrase mode)
        // Check if word is part of a completed phrase
        if (span.classList.contains('yd-selected-phrase')) {
            // Find and remove the phrase selection
            for (const [key, sel] of selections) {
                if (sel.kind === 'phrase' && sel.rowId === rowId && sel.pageKey === currentPageKey) {
                    removeSelectionById(key);
                    showYdsqNotification('Фраза удалена', 'info');
                    updateUI();
                    return;
                }
            }
        }

        // Check if already selected as soft/strict
        if (span.classList.contains('yd-selected-soft') || span.classList.contains('yd-selected-strict')) {
            const key = span.classList.contains('yd-selected-soft') ? `soft:${stem}` : `strict:${wordLower}`;
            removeSelectionById(key);
            resetClearAllButton();
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

        resetClearAllButton();
        updateUI();
        debounceAutoScroll(rowId, 180);
    }

    function toggleSoftWord(span, stem, word, rowId) {
        const key = `soft:${stem}`;
        log.selection(`toggleSoftWord: ${word}`, { key, stem, rowId });

        selections.set(key, {
            id: key,
            kind: 'soft',
            stem: stem,
            raw: word,
            display: word,
            rowId: rowId,
            pageKey: currentPageKey,
            matchType: 'broad'
        });

        log.selection(`Selection добавлен`, selections.get(key));
        ensureRowChecked(rowId);
        syncLocalToGlobal();
        clearUndoModeOnNewSelection();
    }

    function toggleStrictWord(span, wordLower, word, rowId) {
        const key = `strict:${wordLower}`;
        log.selection(`toggleStrictWord: ${word}`, { key, wordLower, rowId });

        selections.set(key, {
            id: key,
            kind: 'strict',
            wordLower: wordLower,
            raw: `!${word}`,
            display: `!${word}`,
            rowId: rowId,
            pageKey: currentPageKey,
            matchType: 'strict'
        });

        log.selection(`Selection добавлен (strict)`, selections.get(key));
        ensureRowChecked(rowId);
        syncLocalToGlobal();
        clearUndoModeOnNewSelection();
    }

    function onWordDoubleClick(e, targetSpan) {
        e.stopPropagation();

        const span = targetSpan;

        // 🛑 ISOLATION LOCKDOWN: Блокируем двойные клики по импортированным словам
        if (span.classList.contains('yd-imported-minus')) {
            e.stopPropagation();
            return; // Немедленный выход
        }

        const word = span.dataset.word;
        const rowId = span.dataset.rowId;

        // 1. Exclusive Mode: Clear other selections in this row
        // We need to find all selections for this row and remove them
        const selsToRemove = [];
        for (const [key, sel] of selections) {
            if (sel.pageKey === currentPageKey && sel.rowId === rowId) {
                selsToRemove.push(key);
            }
        }
        selsToRemove.forEach(key => removeSelectionById(key));

        // Ensure checkbox is unchecked initially (it will be checked when we add the phrase)
        // Actually removeSelectionById might have unchecked it.
        // We will ensure it is checked later if we add a phrase.

        // 2. Check row word count
        const rowSpans = wordSpans.filter(s => s.dataset.rowId === rowId);
        const rowWordCount = rowSpans.length;

        phraseCounter++;
        const phraseId = `phrase:${phraseCounter}`;

        if (rowWordCount === 2) {
            // 3. Two-word row: Auto-complete
            const words = rowSpans.map(s => s.dataset.word);

            selections.set(phraseId, {
                id: phraseId,
                kind: 'phrase',
                raw: words.join(' '),
                display: `"${words.join(' ')}"`,
                words: words,
                rowId: rowId,
                pageKey: currentPageKey,
                matchType: 'quote',
                _building: false
            });

            ensureRowChecked(rowId);
            pushUndo('add_selection', `Построена фраза: "${words.join(' ')}"`);
            showYdsqNotification('Фраза добавлена (2 слова)', 'success');
            syncLocalToGlobal();
            updateUI();
            return;
        }

        // 4. Multi-word row: Start building
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
            display: `"${word}"`,
            words: [word],
            rowId: rowId,
            pageKey: currentPageKey,
            matchType: 'quote',
            _building: true
        });

        span.classList.add('yd-phrase-building');
        span.dataset.phraseId = phraseId;

        // Deactivate other rows
        deactivateOtherRows(rowId);

        // Inject buttons
        injectPhraseButtons(rowId);

        // Show notification
        showYdsqNotification('Режим фразы', 'info');

        ensureRowChecked(rowId);
        updateUI();
    }

    function finalizePhraseBuilding(isCancel) {
        if (!phraseInProgress) return;

        const sel = selections.get(phraseInProgress.id);
        const rowId = phraseInProgress.rowId;

        // Remove buttons
        removePhraseButtons(rowId);

        if (isCancel || !sel || sel.words.length < 2) {
            // If less than 2 words, we can't finalize unless it's a cancel
            // But if user pressed "Done" with 1 word, we should show warning
            if (!isCancel && sel && sel.words.length === 1) {
                showYdsqNotification('Завершите фразу (минимум 2 слова)', 'warn');
                // Re-inject buttons because we are not done
                injectPhraseButtons(rowId);
                return;
            }

            selections.delete(phraseInProgress.id);
        } else {
            sel._building = false;
            sel.matchType = 'quote';
            ensureRowChecked(phraseInProgress.rowId);
            pushUndo('add_selection', `Построена фраза: "${sel.raw}"`);
            showYdsqNotification('Фраза добавлена', 'success');
        }

        // Remove phrase-building classes
        for (const span of wordSpans) {
            span.classList.remove('yd-phrase-building');
            delete span.dataset.phraseId;
        }

        // Reactivate all rows
        reactivateAllRows();

        phraseInProgress = null;
        syncLocalToGlobal();
        resetClearAllButton();
        updateUI();
    }

    function cancelPhraseBuilding() {
        if (!phraseInProgress) return;

        const rowId = phraseInProgress.rowId;
        selections.delete(phraseInProgress.id);

        // Remove buttons
        removePhraseButtons(rowId);

        // Remove phrase-building classes
        for (const span of wordSpans) {
            span.classList.remove('yd-phrase-building');
            delete span.dataset.phraseId;
        }

        // Reactivate all rows
        reactivateAllRows();

        // Uncheck if no other selections on this row (which is true since exclusive)
        const cb = getRowCheckbox(rowId);
        if (cb && cb.checked && cb.dataset.ydAuto === 'true') {
            clickCheckbox(cb, false);
            delete cb.dataset.ydAuto;
        }

        phraseInProgress = null;
        showYdsqNotification('Фраза отменена', 'info');
        syncLocalToGlobal();
        updateUI();
    }

    function injectPhraseButtons(rowId) {
        const row = document.querySelector(`[data-yd-row-id="${rowId}"]`);
        if (!row) return;

        // Find the cell with words
        const cell = row.querySelector('.yd-word')?.closest('td, [role="cell"]');
        if (!cell) return;

        if (cell.querySelector('.yd-phrase-actions')) return;

        const container = document.createElement('span');
        container.className = 'yd-phrase-actions';
        container.innerHTML = `
            <button class="yd-phrase-btn yd-phrase-btn-done" title="Завершить фразу">Готово</button>
            <button class="yd-phrase-btn yd-phrase-btn-cancel" title="Отменить">Отмена</button>
        `;

        container.querySelector('.yd-phrase-btn-done').addEventListener('click', (e) => {
            e.stopPropagation();
            finalizePhraseBuilding(false);
        });

        container.querySelector('.yd-phrase-btn-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            cancelPhraseBuilding();
        });

        cell.appendChild(container);
    }

    function removePhraseButtons(rowId) {
        const row = document.querySelector(`[data-yd-row-id="${rowId}"]`);
        if (!row) return;
        const actions = row.querySelector('.yd-phrase-actions');
        if (actions) actions.remove();
    }

    function deactivateOtherRows(activeRowId) {
        const allRows = getAllRowsOnPage();
        for (const row of allRows) {
            if (String(row.dataset.ydRowId) !== String(activeRowId)) {
                row.classList.add('yd-row-deactivated');
            }
        }
    }

    function reactivateAllRows() {
        const allRows = getAllRowsOnPage();
        for (const row of allRows) {
            row.classList.remove('yd-row-deactivated');
        }
    }

    function ensureRowChecked(rowId) {
        const cb = getRowCheckbox(rowId);
        // console.log('[YD-SQ] ensureRowChecked:', { rowId, found: !!cb, checked: cb?.checked });

        if (cb && !cb.checked) {
            clickCheckbox(cb, true);  // Явно включаем чекбокс
            cb.dataset.ydAuto = 'true';
            // console.log('[YD-SQ] Чекбокс включен автоматически для rowId:', rowId);
        }

        // Double check after a delay to fix race conditions with Yandex handlers
        setTimeout(() => {
            const cb2 = getRowCheckbox(rowId);
            if (cb2 && !cb2.checked) {
                clickCheckbox(cb2, true);
                cb2.dataset.ydAuto = 'true';
            }
        }, 50);
    }

    function toggleSoftWord(span, stem, word, rowId) {
        // Если слово является стоп-словом, принудительно используем строгий режим
        const wordLower = word.toLowerCase();
        if (STOPWORDS.has(wordLower)) {
            toggleStrictWord(span, wordLower, word, rowId);
            return;
        }

        const key = `soft:${stem}`;

        if (selections.has(key)) {
            const sel = selections.get(key);
            if (sel.pageKey === currentPageKey && sel.rowId === rowId) {
                removeSelectionById(key);
                return; // removeSelectionById already calls syncLocalToGlobal
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
            ensureRowChecked(rowId);
        }
        syncLocalToGlobal();
    }

    function toggleStrictWord(span, wordLower, word, rowId) {
        const key = `strict:${wordLower}`;

        if (selections.has(key)) {
            const sel = selections.get(key);
            if (sel.pageKey === currentPageKey && sel.rowId === rowId) {
                removeSelectionById(key);
                return; // removeSelectionById already calls syncLocalToGlobal
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
            ensureRowChecked(rowId);
        }
        syncLocalToGlobal();
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
                clickCheckbox(cb, false);  // Явно выключаем чекбокс
                delete cb.dataset.ydAuto;
            }
        } else if (otherSelsOnRow && pageKey === currentPageKey) {
            // Если остались другие выделенные слова, гарантируем, что чекбокс включен
            ensureRowChecked(rowId);
        }
        syncLocalToGlobal();
    }

    // ==================== TOOLTIP ====================

    function onWordHover(e, targetSpan) {
        const span = targetSpan;

        // 🛑 ISOLATION LOCKDOWN: Блокируем тултипы для импортированных слов
        if (span.classList.contains('yd-imported-minus')) {
            return; // Никаких тултипов
        }

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

    function onWordHoverOut(e, targetSpan) {
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

    // Cache for parsed rules to avoid re-parsing on every update
    let cachedImportedRules = null;
    let lastImportedMinusesRef = null;

    function updateHighlightsCore() {
        // 1. Clear classes
        // Using a simple loop is fast for clearing.
        for (const sp of wordSpans) {
            sp.className = 'yd-word'; // Reset to base class
            // Restore original classes if any? 
            // Actually wordSpans only have 'yd-word' initially.
            // But wait, if we have other classes?
            // Safer to remove specific classes.
            sp.classList.remove(
                'yd-selected-soft', 'yd-selected-strict', 'yd-selected-phrase',
                'yd-phrase-building', 'yd-primary-soft', 'yd-primary-strict',
                'yd-sent-history', 'yd-imported-minus'
            );
            delete sp.dataset.phraseId;
            delete sp.dataset.sentAt;
            delete sp.dataset.importedAt;
            delete sp.dataset.tooltip; // Очищаем кастомный tooltip
        }

        // 2. Prepare Rules
        // Пересчитываем кэш, если изменился массив или количество элементов
        const shouldRebuild = lastImportedMinusesRef !== importedMinuses ||
            !cachedImportedRules ||
            cachedImportedRules.length !== importedMinuses.length;

        if (shouldRebuild) {
            cachedImportedRules = importedMinuses.map(imp => {
                const r = parseMinusRule(imp.raw);
                r.source = 'imported';
                return r;
            });
            lastImportedMinusesRef = importedMinuses;
        }

        // Combine cached imported rules with current selections
        const rules = [...(cachedImportedRules || [])];
        const initialRulesCount = rules.length;

        for (const sel of selections.values()) {
            if (sel.display) {
                const r = parseMinusRule(sel.display);
                r.source = 'selection';

                // Логика подсветки для одиночных слов:
                // - БЕЗ кавычек (matchType === null): broad - подсвечиваем везде где есть это слово
                // - С кавычками (matchType === 'quote'): quote - только там где слово ОДНО в строке
                // Это соответствует логике Яндекс.Директа для минус-фраз
                if ((sel.kind === 'soft-word' || sel.kind === 'strict-word') && r.words.length === 1) {
                    if (sel.matchType === 'quote') {
                        // Кавычки = точное соответствие = только строки с одним словом
                        r.type = 'quote';
                    } else {
                        // Без кавычек = широкое соответствие = везде где есть слово
                        r.type = 'broad';
                    }
                }

                rules.push(r);
            }
        }

        if (rules.length > 0 || sentHistory.length > 0) {
            console.log(`[YD-SQ] 🎨 UPDATE HIGHLIGHTS: Spans: ${wordSpans.length}, Rules: ${rules.length} (sel: ${rules.length - initialRulesCount}, imp: ${initialRulesCount}), history: ${sentHistory.length}`);
        }

        if (rules.length === 0 && sentHistory.length === 0) return;

        // 3. Group spans by row (Optimization)
        // This avoids O(N*M) filtering inside the loop.
        const spansByRow = new Map();
        for (const sp of wordSpans) {
            const rid = sp.dataset.rowId;
            if (!rid) continue;
            let arr = spansByRow.get(rid);
            if (!arr) {
                arr = [];
                spansByRow.set(rid, arr);
            }
            arr.push(sp);
        }

        // 4. Iterate Rows
        for (const [rowId, rowSpans] of spansByRow) {
            // Prepare row data once
            const rowWordsData = rowSpans.map(s => ({
                text: s.dataset.word,
                lower: s.dataset.wordLower,
                stem: s.dataset.stem,
                span: s
            }));
            const rowLen = rowWordsData.length;

            for (const rule of rules) {
                let isMatch = false;
                let matchedIndices = new Set();
                let strictIndices = new Set();

                let baseClass = 'yd-imported-minus';
                if (rule.source === 'selection') {
                    baseClass = 'yd-selected-soft';
                }

                if (rule.type === 'quote') {
                    // Quote: Exact Set of words (no extra words in row)
                    // DEBUG закомментирован - слишком спамит
                    // if (rule.source === 'selection') {
                    //     log.info(`QUOTE CHECK: rowId=${rowId}, rowLen=${rowLen}, ruleWords=${rule.words.length}, words=[${rowWordsData.map(d => d.text).join(', ')}]`);
                    // }

                    // СПЕЦИАЛЬНАЯ ЛОГИКА для одного слова в кавычках:
                    // Проверяем что ВСЕ слова в строке являются формами искомого слова
                    // (Яндекс может показывать [склад, склад] как 2 слова)
                    if (rule.words.length === 1) {
                        const rWord = rule.words[0];
                        const rWordStem = stemWord(rWord.text);

                        // Проверяем что ВСЕ слова в строке совпадают с искомым
                        const allWordsMatch = rowWordsData.every(d => {
                            if (rWord.isStrict) {
                                return d.lower === rWord.text;
                            } else {
                                return d.stem === rWordStem;
                            }
                        });

                        if (allWordsMatch) {
                            isMatch = true;
                            for (let i = 0; i < rowLen; i++) matchedIndices.add(i);
                            baseClass = 'yd-selected-phrase';
                            log.info(`QUOTE MATCH: rowId=${rowId} - все слова совпадают с "${rWord.text}"`);
                        }
                    } else if (rowLen === rule.words.length) {
                        // Стандартная логика для фраз из нескольких слов
                        const rowIndicesUsed = new Set();
                        let allRuleWordsFound = true;

                        for (const rWord of rule.words) {
                            const foundIdx = rowWordsData.findIndex((d, idx) => {
                                if (rowIndicesUsed.has(idx)) return false;
                                if (rWord.isStrict) {
                                    return d.lower === rWord.text;
                                } else {
                                    return d.stem === stemWord(rWord.text);
                                }
                            });

                            if (foundIdx !== -1) {
                                rowIndicesUsed.add(foundIdx);
                            } else {
                                allRuleWordsFound = false;
                                break;
                            }
                        }

                        if (allRuleWordsFound) {
                            isMatch = true;
                            for (let i = 0; i < rowLen; i++) matchedIndices.add(i);
                            baseClass = 'yd-selected-phrase';
                        }
                    }

                } else if (rule.type === 'bracket') {
                    // Bracket: Fixed sequence
                    const pLen = rule.words.length;
                    if (rowLen >= pLen) {
                        for (let i = 0; i <= rowLen - pLen; i++) {
                            let subMatch = true;
                            for (let j = 0; j < pLen; j++) {
                                const rWord = rule.words[j];
                                const d = rowWordsData[i + j];
                                const match = rWord.isStrict
                                    ? (d.lower === rWord.text)
                                    : (d.stem === stemWord(rWord.text));

                                if (!match) {
                                    subMatch = false;
                                    break;
                                }
                            }

                            if (subMatch) {
                                isMatch = true;
                                for (let k = 0; k < pLen; k++) matchedIndices.add(i + k);
                            }
                        }
                    }
                    if (isMatch) baseClass = 'yd-selected-strict';

                } else if (rule.type === 'broad') {
                    // Broad: All words present anywhere
                    const indicesFound = [];
                    let allFound = true;

                    for (const rWord of rule.words) {
                        const foundForThisWord = [];
                        rowWordsData.forEach((d, idx) => {
                            const match = rWord.isStrict
                                ? (d.lower === rWord.text)
                                : (d.stem === stemWord(rWord.text));
                            if (match) {
                                foundForThisWord.push(idx);
                                if (rWord.isStrict) strictIndices.add(idx);
                            }
                        });

                        if (foundForThisWord.length > 0) {
                            indicesFound.push(...foundForThisWord);
                        } else {
                            allFound = false;
                            break;
                        }
                    }

                    if (allFound) {
                        isMatch = true;
                        indicesFound.forEach(idx => matchedIndices.add(idx));
                    }
                }

                if (isMatch) {
                    for (const idx of matchedIndices) {
                        const span = rowWordsData[idx].span;
                        if (rule.type === 'broad' && strictIndices.has(idx)) {
                            span.classList.add('yd-selected-strict');
                        } else {
                            span.classList.add(baseClass);
                        }
                        // Добавляем tooltip для imported минусов
                        if (rule.source === 'imported') {
                            span.dataset.tooltip = 'Уже добавлено';
                        }
                    }
                }
            }
        }

        // --- HISTORY ---
        // Optimized history check
        if (sentHistory.length > 0) {
            const sentStems = new Set();
            const sentLowers = new Set();
            for (const sent of sentHistory) {
                sentStems.add(stemWord(sent.raw));
                sentLowers.add(sent.raw.toLowerCase());
            }

            for (const span of wordSpans) {
                if (sentStems.has(span.dataset.stem) || sentLowers.has(span.dataset.wordLower)) {
                    span.classList.add('yd-sent-history');
                }
            }
        }

        // --- SELECTION SOURCE HIGHLIGHT ---
        // Explicitly highlight words in the source row for phrase selections
        for (const sel of selections.values()) {
            if (sel.kind === 'phrase' && !sel._building && sel.pageKey === currentPageKey && sel.rowId && sel.words) {
                // Find spans in this row
                const rowSpans = spansByRow.get(sel.rowId);
                if (rowSpans) {
                    for (const span of rowSpans) {
                        if (sel.words.includes(span.dataset.word)) {
                            span.classList.add('yd-selected-phrase');
                        }
                    }
                }
            }
        }

        // --- PHRASE BUILDING ---
        // Restore highlighting for the phrase being built
        if (phraseInProgress) {
            const phraseId = phraseInProgress.id.split(':')[1];
            for (const word of phraseInProgress.words) {
                for (const span of wordSpans) {
                    if (String(phraseInProgress.rowId) === span.dataset.rowId && span.dataset.word === word) {
                        span.classList.add('yd-phrase-building');
                        span.dataset.phraseId = phraseId;
                    }
                }
            }
        }
    }

    // Debounced версия updateHighlights для оптимизации производительности
    const updateHighlights = debounce(updateHighlightsCore, 150);

    // Синхронная версия для критических мест где нужен мгновенный отклик
    const updateHighlightsImmediate = updateHighlightsCore;

    // Парсер минус-правил
    function parseMinusRule(raw) {
        raw = raw.trim();

        // Удаляем начальный минус (минус-фразы часто хранятся как "-слово")
        if (raw.startsWith('-')) {
            raw = raw.substring(1).trim();
        }

        let type = 'broad';
        let content = raw;

        if (raw.startsWith('"') && raw.endsWith('"')) {
            type = 'quote';
            content = raw.slice(1, -1);
        } else if (raw.startsWith('[') && raw.endsWith(']')) {
            type = 'bracket';
            content = raw.slice(1, -1);
        }

        // Разбиваем на слова
        const rawWords = content.split(/[\s+]+/).filter(w => w);
        const words = rawWords.map(w => {
            let text = w.toLowerCase();
            let isStrict = false;
            if (text.startsWith('!')) {
                isStrict = true;
                text = text.substring(1);
            }
            return { text, isStrict };
        });

        return { type, words, raw };
    }


    function restoreVisualMarkers() {
        updateHighlights();

        // Восстановить чекбоксы для сохраненных выделений
        for (const sel of selections.values()) {
            if (sel.pageKey === currentPageKey && sel.rowId) {
                ensureRowChecked(sel.rowId);
            }
        }
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
            syncLocalToGlobal();
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
            syncLocalToGlobal();
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

    function clickCheckbox(cb, newState) {
        // console.log('[YD-SQ] clickCheckbox вызван:', { currentState: cb.checked, targetState: newState });

        if (cb.checked !== newState) {
            cb.click();
            // console.log('[YD-SQ] Выполнен клик по чекбоксу');

            // Проверка и fallback
            setTimeout(() => {
                if (cb.checked !== newState) {
                    // console.warn('[YD-SQ] Клик не сработал, пробуем fallback');
                    cb.checked = newState;
                    cb.dispatchEvent(new Event('input', { bubbles: true }));
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, 50);
        }
    }

    function getAllRowsOnPage() {
        return Array.from(document.querySelectorAll(`[data-yd-row-id^="${currentPageKey}:"]`));
    }

    function findFreeRows(prioritizeAfterRowId = null) {
        const rows = getAllRowsOnPage();
        const usedRowIdsOnThisPage = new Set();
        selections.forEach(sel => {
            if (sel.pageKey === currentPageKey && sel.rowId) {
                usedRowIdsOnThisPage.add(String(sel.rowId));
            }
        });

        const freeRows = rows.filter(r => {
            const cb = r.querySelector('input[type="checkbox"]');
            if (!cb) return false;
            const rid = String(r.dataset.ydRowId);
            return !cb.checked && !usedRowIdsOnThisPage.has(rid);
        });

        if (prioritizeAfterRowId) {
            const lastUsedIndex = rows.findIndex(r => String(r.dataset.ydRowId) === String(prioritizeAfterRowId));
            if (lastUsedIndex > -1) {
                const after = [];
                const before = [];
                freeRows.forEach(row => {
                    const rowIndex = rows.indexOf(row);
                    if (rowIndex > lastUsedIndex) {
                        after.push(row);
                    } else {
                        before.push(row);
                    }
                });
                return [...after, ...before];
            }
        }
        return freeRows;
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

    // ==================== SMART DATA PIPELINE ====================

    function normalizeMinusInput(rawInput) {
        let rawString = Array.isArray(rawInput) ? rawInput.join('\n') : String(rawInput);

        // Поддержка формата "-слово1 -слово2" (пробел-дефис как разделитель)
        // Заменяем " -" на "\n-" (если после дефиса не пробел)
        rawString = rawString.replace(/\s-(?=[^\s])/g, '\n-');

        // Разделители: новая строка, табуляция, запятая, точка с запятой
        const parts = rawString.split(/[\n\t,;]+/);
        const normalized = new Set();

        for (let part of parts) {
            part = part.trim();
            if (!part) continue;

            // Удаляем ведущий дефис, если он есть (формат Яндекса: -слово)
            // Но сохраняем структуру фразы
            if (part.startsWith('-')) {
                part = part.substring(1);
            }

            part = part.trim();
            if (!part) continue;

            normalized.add(part);
        }
        return normalized;
    }

    function validateMinusSet(newSet, existingSet) {
        const result = {
            valid: true,
            filteredSet: new Set(),
            warnings: [],
            clipboardCopyNeeded: false
        };

        // 1. Дубликаты
        for (const item of newSet) {
            if (!existingSet.has(item)) {
                result.filteredSet.add(item);
            }
        }

        if (result.filteredSet.size === 0) {
            return result;
        }

        // 2. Лимит длины (4000 символов)
        const currentContent = Array.from(existingSet).join('\n');
        const newContent = Array.from(result.filteredSet).join('\n');

        if ((currentContent.length + newContent.length + 10) > 4000) {
            result.valid = false;
            result.clipboardCopyNeeded = true;
            result.warnings.push('Превышен лимит поля (4000 симв).');
            return result;
        }

        // 3. Вложенность
        const allItems = new Set([...existingSet, ...result.filteredSet]);

        for (const phrase of result.filteredSet) {
            // Разбиваем фразу на слова
            const words = phrase.split(/[\s+]+/);
            if (words.length > 1) {
                for (const word of words) {
                    const cleanWord = word.replace(/[!\[\]""]/g, '').toLowerCase();
                    // Проверяем, есть ли это слово как отдельный минус
                    if (allItems.has(cleanWord) || allItems.has('!' + cleanWord)) {
                        result.warnings.push(`Конфликт: фраза "${phrase}" содержит минус "${cleanWord}"`);
                    }
                }
            }
        }

        return result;
    }

    async function smartAppendToField(input, newPhrasesSet) {
        const currentVal = input.value || '';
        const existingSet = normalizeMinusInput(currentVal);

        const validation = validateMinusSet(newPhrasesSet, existingSet);

        if (!validation.valid) {
            if (validation.clipboardCopyNeeded) {
                const textToCopy = Array.from(validation.filteredSet).join('\n');
                await navigator.clipboard.writeText(textToCopy);
                showYdsqNotification(validation.warnings.join('\n') + '\nСкопировано в буфер!', 'warn');
            }
            return false;
        }

        if (validation.warnings.length > 0) {
            const proceed = confirm(`Обнаружены предупреждения:\n${validation.warnings.join('\n')}\n\nВсё равно добавить?`);
            if (!proceed) return false;
        }

        if (validation.filteredSet.size === 0) {
            return true; // Уже есть
        }

        // Слияние
        const finalSet = new Set([...existingSet, ...validation.filteredSet]);
        const separator = input.tagName === 'TEXTAREA' ? '\n' : ', ';
        input.value = Array.from(finalSet).join(separator);

        // События
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));

        return true;
    }


    // ========================================
    // СИНХРОНИЗАЦИЯ С НАСТРОЙКАМИ КАМПАНИИ
    // ========================================

    const SYNC_STORAGE_KEY = 'yd-sq-sync-pending';
    const SYNC_DATA_KEY = 'yd-sq-synced-minuses';
    const SYNC_RETURN_URL_KEY = 'yd-sq-sync-return-url';

    // Toast уведомление для страницы настроек (где нет нашей панели)
    function showSyncStatusToast(message) {
        let toast = document.getElementById('yd-sync-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'yd-sync-toast';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #fff;
                padding: 16px 24px;
                border-radius: 12px;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 999999;
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }

    // Определяем URL настроек кампании из текущего URL статистики
    function getCampaignSettingsUrl() {
        const params = new URLSearchParams(window.location.search);
        const cid = params.get('cid');
        const ulogin = params.get('ulogin');

        if (!cid || !ulogin) {
            log.warn('Не удалось определить cid или ulogin');
            return null;
        }

        // Пробуем найти ссылку "Изменить параметры" на странице
        const editLink = Array.from(document.querySelectorAll('a')).find(a =>
            a.textContent.includes('Изменить параметры') ||
            a.textContent.includes('Редактировать') ||
            a.href?.includes('/edit')
        );

        if (editLink && editLink.href) {
            log.info('Найдена ссылка на настройки:', editLink.href);
            return editLink.href;
        }

        // Формируем URL для wizard кампании (новый интерфейс)
        // Это работает для большинства кампаний
        const wizardUrl = `https://direct.yandex.ru/wizard/campaigns/${cid}/edit/?ulogin=${ulogin}`;
        log.info('Сформирован URL настроек (wizard):', wizardUrl);
        return wizardUrl;
    }

    // ========================================
    // API ДЛЯ ПОЛУЧЕНИЯ МИНУС-СЛОВ КАМПАНИИ
    // ========================================

    // Получение минус-слов кампании через API
    async function fetchCampaignMinusKeywords(ulogin, campaignId) {
        try {
            const url = `https://direct.yandex.ru/web-api/uac/campaign/${campaignId}?ulogin=${encodeURIComponent(ulogin)}`;

            log.sync('Запрос минус-слов кампании:', url);

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'x-direct-api': '1'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.result) {
                const minusKeywords = data.result.minus_keywords || [];
                log.sync(`Получено ${minusKeywords.length} минус-слов из API`);
                return minusKeywords;
            } else {
                log.error('API вернул ошибку:', data);
                return null;
            }
        } catch (error) {
            log.error('Ошибка получения минус-слов:', error.message || error);
            return null;
        }
    }

    // Начать синхронизацию - через API (без перехода на другую страницу)
    async function startCampaignSync() {
        const params = new URLSearchParams(window.location.search);
        const campaignId = params.get('cid');
        const ulogin = params.get('ulogin');

        if (!campaignId || !ulogin) {
            showYdsqNotification('Не удалось определить параметры кампании', 'error');
            return;
        }

        // Показываем анимацию и уведомление
        const syncBtn = document.getElementById('yd-sq-sync-campaign');
        if (syncBtn) {
            syncBtn.classList.add('syncing');
        }

        showYdsqNotification('🔄 Загрузка минус-слов кампании...', 'info');

        try {
            // Получаем минус-слова через API
            const minusKeywords = await fetchCampaignMinusKeywords(ulogin, campaignId);

            if (syncBtn) {
                syncBtn.classList.remove('syncing');
            }

            if (minusKeywords === null) {
                showYdsqNotification('❌ Ошибка загрузки минус-слов', 'error');
                return;
            }

            if (minusKeywords.length === 0) {
                showYdsqNotification('ℹ️ В кампании нет минус-слов', 'info');
                return;
            }

            // Применяем минус-слова и получаем статистику
            const result = applySyncedMinuses(minusKeywords);

            if (result.added > 0) {
                showYdsqNotification(`✅ Добавлено ${result.added} новых минус-слов`, 'success');
            } else {
                showYdsqNotification(`ℹ️ Все ${minusKeywords.length} минус-слов уже импортированы`, 'info');
            }

        } catch (error) {
            if (syncBtn) {
                syncBtn.classList.remove('syncing');
            }
            log.error('Ошибка синхронизации:', error.message || error);
            console.error('[YD-SQ] Ошибка синхронизации:', error);
            showYdsqNotification('❌ Ошибка синхронизации', 'error');
        }
    }

    // Флаг для защиты от двойного вызова
    let isSyncingCampaign = false;

    // Применение синхронизированных минус-слов
    function applySyncedMinuses(minusKeywords) {
        try {
            log.sync('Начало применения минус-слов, количество:', minusKeywords.length);
            log.sync('importedMinuses.length:', importedMinuses.length);

            // Проверяем что это массив
            if (!Array.isArray(minusKeywords)) {
                log.error('minusKeywords не является массивом!');
                return { added: 0, existing: 0 };
            }

            // Создаём Set существующих минусов для быстрой проверки
            const existingSet = new Set(
                importedMinuses.map(item => item.raw.toLowerCase().trim())
            );
            log.sync('Существующих минусов:', existingSet.size);

            // Добавляем новые минусы
            const added = [];
            const alreadyExists = [];

            log.sync('Начинаю цикл обработки...');

            for (let i = 0; i < minusKeywords.length; i++) {
                try {
                    const keyword = minusKeywords[i];

                    // Логируем каждые 100 элементов
                    if (i % 100 === 0) {
                        log.sync(`Обработано ${i} из ${minusKeywords.length}`);
                    }

                    if (typeof keyword !== 'string') {
                        continue;
                    }

                    const normalized = keyword.trim().toLowerCase();
                    if (!normalized) continue;

                    if (!existingSet.has(normalized)) {
                        // Добавляем в массив importedMinuses как объект
                        importedMinuses.push({
                            id: `api-sync:${Date.now()}_${i}`,
                            raw: keyword.trim(),
                            source: 'api-sync',
                            importedAt: Date.now()
                        });
                        existingSet.add(normalized);
                        added.push(normalized);
                    } else {
                        alreadyExists.push(normalized);
                    }
                } catch (innerError) {
                    log.error(`Ошибка на элементе ${i}:`, innerError.message);
                }
            }

            log.sync(`Синхронизация: добавлено ${added.length}, уже было ${alreadyExists.length}`);
            log.sync('Новый размер importedMinuses:', importedMinuses.length);

            if (added.length > 0) {
                try {
                    log.sync('Сохраняю данные...');
                    saveData();
                    log.sync('saveData() успешно');
                } catch (saveErr) {
                    log.error('Ошибка в saveData():', saveErr.message);
                    console.error('[YD-SQ] saveData error:', saveErr);
                }

                try {
                    log.sync('Обновляю подсветку...');
                    updateHighlights();
                    log.sync('updateHighlights() успешно');
                } catch (hlErr) {
                    log.error('Ошибка в updateHighlights():', hlErr.message);
                    console.error('[YD-SQ] updateHighlights error:', hlErr);
                }

                try {
                    log.sync('Обновляю UI...');
                    renderImportedMinuses();
                    log.sync('renderImportedMinuses() успешно');
                } catch (uiErr) {
                    log.error('Ошибка в renderImportedMinuses():', uiErr.message);
                    console.error('[YD-SQ] renderImportedMinuses error:', uiErr);
                }

                log.sync('Готово!');
            }

            return { added: added.length, existing: alreadyExists.length };
        } catch (error) {
            log.error('Ошибка в applySyncedMinuses:', error.message || error);
            console.error('[YD-SQ] Ошибка в applySyncedMinuses:', error);
            throw error;
        }
    }


    // Парсинг минус-фраз на странице настроек (вызывается на странице настроек)
    function parseMinusesFromSettingsPage() {
        const minuses = [];

        // Тип 1: Wizard кампании (textarea с contenteditable)
        // Селектор: [data-testid="MinusKeywords.SingleInput"]
        const wizardTextarea = document.querySelector('[data-testid="MinusKeywords.SingleInput"]');
        if (wizardTextarea) {
            log.info('Найден wizard формат минус-фраз');
            const html = wizardTextarea.innerHTML;
            // Минусы разделены <br>, формат: -!слово<br>-слово2<br>
            const items = html.split(/<br\s*\/?>/i).filter(Boolean);
            items.forEach(item => {
                // Убираем HTML теги и пробелы
                let clean = item.replace(/<[^>]*>/g, '').trim();
                // Убираем начальный минус если есть
                if (clean.startsWith('-')) {
                    clean = clean.substring(1).trim();
                }
                if (clean) {
                    minuses.push(clean);
                }
            });
            log.info(`Распарсено ${minuses.length} минусов из wizard формата`);
        }

        // Тип 2: DNA кампании (теги)
        // Селектор: [data-testid^="ExceptionsEditor.Tag_phrase."]
        const dnaTags = document.querySelectorAll('[data-testid^="ExceptionsEditor.Tag_phrase."]');
        if (dnaTags.length > 0) {
            log.info('Найден DNA формат минус-фраз');
            dnaTags.forEach(tag => {
                // Ищем текст внутри: span > div или просто textContent
                const textDiv = tag.querySelector('span.dc-Text__text div');
                let phrase = textDiv ? textDiv.textContent.trim() : '';

                if (!phrase) {
                    // Попробуем из data-testid
                    const testId = tag.getAttribute('data-testid') || '';
                    const match = testId.match(/ExceptionsEditor\.Tag_phrase\.(.+)$/);
                    if (match) {
                        phrase = match[1];
                    }
                }

                if (phrase && !phrase.endsWith('.close')) {
                    minuses.push(phrase);
                }
            });
            log.info(`Распарсено ${minuses.length} минусов из DNA формата`);
        }

        return minuses;
    }

    // Проверка: находимся ли мы на странице настроек кампании
    function isOnCampaignSettingsPage() {
        const url = window.location.href;
        return url.includes('/wizard/campaigns/') && url.includes('/edit') ||
            url.includes('/dna/campaigns-edit');
    }

    // Обработка страницы настроек (парсинг и возврат)
    function handleSettingsPageSync() {
        if (!isOnCampaignSettingsPage()) return false;

        const syncPending = sessionStorage.getItem(SYNC_STORAGE_KEY);
        if (syncPending !== 'true') return false;

        log.info('Обнаружена страница настроек с pending sync');

        // Показываем уведомление на странице настроек
        showSyncStatusToast('🔄 Ожидание загрузки страницы...');

        // Ждём полной загрузки страницы
        let attempts = 0;
        const maxAttempts = 30;
        let lastCount = 0;
        let stableCount = 0; // Сколько раз подряд количество было стабильным
        let pageLoadedButEmpty = 0; // Счетчик: страница загружена, но минусов нет

        const tryParse = () => {
            attempts++;
            const minuses = parseMinusesFromSettingsPage();
            const currentCount = minuses.length;

            // Проверяем, загружена ли страница полностью (есть ключевые элементы UI)
            // Расширенные селекторы для разных типов страниц настроек
            const hasMinusContainer = document.querySelector('[data-testid="MinusKeywords.SingleInput"]') ||
                document.querySelector('[data-testid^="ExceptionsEditor"]') ||
                document.querySelector('.minus-keywords-editor') ||
                document.querySelector('[class*="MinusKeywords"]') ||
                // Дополнительные селекторы для определения загрузки формы
                document.querySelector('[data-testid*="minus"]') ||
                document.querySelector('[data-testid*="Minus"]');

            // Проверяем что страница настроек загружена (есть форма редактирования)
            const hasFormLoaded = document.querySelector('button[type="submit"]') ||
                document.querySelector('[data-testid="submit-button"]') ||
                document.querySelector('button[class*="Save"]') ||
                document.querySelector('[class*="CampaignEdit"]') ||
                document.querySelector('[class*="wizard"]') ||
                document.querySelector('[data-testid="CampaignEditForm"]');

            const hasPageLoaded = document.querySelector('[data-testid]') !== null &&
                document.readyState === 'complete';

            // Логируем состояние для отладки (каждые 5 попыток)
            if (attempts % 5 === 0) {
                console.log(`[YD-SQ] 🔍 SYNC попытка ${attempts}: minuses=${currentCount}, hasMinusContainer=${!!hasMinusContainer}, hasFormLoaded=${!!hasFormLoaded}, hasPageLoaded=${hasPageLoaded}`);
            }

            // Проверяем стабильность: количество должно быть одинаковым 3 раза подряд
            if (currentCount > 0 && currentCount === lastCount) {
                stableCount++;
            } else {
                stableCount = 0;
            }
            lastCount = currentCount;

            // Быстрое завершение: если форма загружена, но минусов нет
            // Условие: страница загружена И (есть контейнер минусов ИЛИ есть форма редактирования) И минусов 0
            if (hasPageLoaded && (hasMinusContainer || hasFormLoaded) && currentCount === 0) {
                pageLoadedButEmpty++;
                if (pageLoadedButEmpty >= 3) {
                    // Страница загружена, но минусов нет
                    console.log(`[YD-SQ] ✅ SYNC: Форма загружена, минусов нет (попытка ${attempts})`);
                    showSyncStatusToast('ℹ️ Минус-фразы не найдены (пустой список). Возврат...');
                    finishSync(minuses, 0);
                    return;
                }
            } else {
                pageLoadedButEmpty = 0;
            }

            // Показываем прогресс
            if (currentCount > 0) {
                showSyncStatusToast(`🔄 Загрузка: ${currentCount} минусов (проверка ${stableCount}/3)...`);
            } else if (hasMinusContainer) {
                showSyncStatusToast(`🔄 Контейнер найден, ожидание данных... (${attempts}/${maxAttempts})`);
            } else {
                showSyncStatusToast(`🔄 Ожидание загрузки страницы... (${attempts}/${maxAttempts})`);
            }

            // Успех: данные стабильны 3 попытки подряд ИЛИ достигли максимума
            if ((currentCount > 0 && stableCount >= 3) || attempts >= maxAttempts) {
                if (currentCount === 0) {
                    showSyncStatusToast('⚠️ Минус-фразы не найдены. Возврат...');
                } else {
                    showSyncStatusToast(`✅ Синхронизировано: ${currentCount} минусов. Возврат...`);
                }
                finishSync(minuses, currentCount);
                return;
            }

            // Ждём ещё (1 секунда между попытками)
            setTimeout(tryParse, 1000);
        };

        const finishSync = (minuses, currentCount) => {
            // Сохраняем результат
            const syncData = {
                minuses: minuses,
                timestamp: Date.now(),
                campaignUrl: window.location.href
            };
            localStorage.setItem(SYNC_DATA_KEY, JSON.stringify(syncData));

            // Очищаем флаг
            sessionStorage.removeItem(SYNC_STORAGE_KEY);

            // Получаем URL для возврата
            const returnUrl = sessionStorage.getItem(SYNC_RETURN_URL_KEY);
            sessionStorage.removeItem(SYNC_RETURN_URL_KEY);

            log.success(`Синхронизировано ${currentCount} минусов, возврат...`);

            // Возвращаемся назад с задержкой для показа уведомления
            setTimeout(() => {
                if (returnUrl) {
                    window.location.href = returnUrl;
                } else {
                    window.history.back();
                }
            }, 1500);
        };

        // Начинаем парсинг через 2 секунды для загрузки страницы
        setTimeout(tryParse, 2000);
        return true;
    }

    // Проверка и применение синхронизированных данных (на странице статистики)
    function checkAndApplySyncedData() {
        const syncDataStr = localStorage.getItem(SYNC_DATA_KEY);
        if (!syncDataStr) return false;

        try {
            const syncData = JSON.parse(syncDataStr);

            // Проверяем что данные свежие (не старше 5 минут)
            if (Date.now() - syncData.timestamp > 5 * 60 * 1000) {
                localStorage.removeItem(SYNC_DATA_KEY);
                return false;
            }

            const syncedMinuses = syncData.minuses || [];
            log.info(`Применяем синхронизированные данные: ${syncedMinuses.length} минусов`);

            // ПОЛНАЯ ЗАМЕНА: очищаем текущий список и заполняем из кампании
            const oldCount = importedMinuses.length;
            importedMinuses.length = 0; // Очищаем

            // Добавляем все минусы из кампании
            for (const phrase of syncedMinuses) {
                importedMinuses.push({
                    id: `sync:${Date.now()}_${Math.random()}`,
                    raw: phrase,
                    source: 'sync',
                    importedAt: Date.now()
                });
            }

            log.success(`Синхронизировано ${importedMinuses.length} минусов (было ${oldCount})`);
            console.log('[YD-SQ] importedMinuses после синхронизации:', importedMinuses.slice(0, 5));

            // Сохраняем время последней синхронизации
            localStorage.setItem('yd-sq-last-sync-time', syncData.timestamp.toString());

            // Очищаем данные синхронизации
            localStorage.removeItem(SYNC_DATA_KEY);

            // Обновляем кэш минусов кампании
            rebuildCampaignMinusList();

            // Обновляем UI
            syncLocalToGlobal();
            renderImportedMinuses();
            updateHighlights();

            // Показываем результат
            showYdsqNotification(`✅ В кампании: ${syncedMinuses.length} минусов`, 'success');

            // Убираем анимацию с кнопки
            const syncBtn = document.getElementById('yd-sq-sync-campaign');
            if (syncBtn) {
                syncBtn.classList.remove('syncing');
            }

            return true;
        } catch (e) {
            log.error('Ошибка применения синхронизированных данных:', e);
            localStorage.removeItem(SYNC_DATA_KEY);
            return false;
        }
    }


    async function importMinusesFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            const newPhrases = normalizeMinusInput(text);

            if (newPhrases.size === 0) {
                showYdsqNotification('В буфере не найдено минусов', 'warn');
                return { success: false, count: 0 };
            }

            // Собираем существующие для проверки дубликатов
            const existingRaw = new Set(importedMinuses.map(imp => imp.raw.toLowerCase().trim()));

            const newItems = [];
            for (const phrase of newPhrases) {
                const normalized = phrase.toLowerCase().trim();
                if (!existingRaw.has(normalized)) {
                    newItems.push({
                        id: `imp:${Date.now()}_${Math.random()}`,
                        raw: phrase,
                        source: 'clipboard', // Различаем импортированные
                        importedAt: Date.now()
                    });
                    existingRaw.add(normalized); // Добавляем чтобы не дублировать в текущем импорте
                }
            }

            if (newItems.length > 0) {
                importedMinuses = [...importedMinuses, ...newItems];
                syncLocalToGlobal();
                rebuildCampaignMinusList();
                updateHighlights();
                resetClearAllButton();
                updateUI();

                const duplicates = newPhrases.size - newItems.length;
                let msg = `Импортировано ${newItems.length} минусов`;
                if (duplicates > 0) {
                    msg += ` (${duplicates} дубликатов пропущено)`;
                }
                showYdsqNotification(msg, 'success');
                return { success: true, count: newItems.length };
            } else {
                showYdsqNotification('Все минусы уже есть в списке', 'info');
                return { success: false, count: 0 };
            }
        } catch (err) {
            console.error('[YD-SQ] Ошибка импорта:', err);
            showYdsqNotification('Ошибка чтения буфера обмена', 'error');
            return { success: false, count: 0, error: err };
        }
    }

    function clearImportedMinuses() {
        if (importedMinuses.length === 0) {
            showYdsqNotification('Список импортированных пуст', 'info');
            return;
        }

        const confirmed = confirm(`Удалить все импортированные минуса (${importedMinuses.length} шт)?`);
        if (!confirmed) return;

        importedMinuses = [];
        syncLocalToGlobal();
        updateHighlights();
        updateUI();
        showYdsqNotification('Список импортированных очищен', 'success');
    }

    async function copyImportedToClipboard() {
        const activeMinuses = importedMinuses.filter(imp => !imp.deleted);

        if (activeMinuses.length === 0) {
            showYdsqNotification('Нет активных минусов для копирования', 'warn');
            return;
        }

        // Конвертируем каждый минус в формат с префиксом "-"
        const formatted = activeMinuses.map(imp => {
            const raw = imp.raw;
            // Сохраняем оригинальный формат
            return `-${raw}`;
        });

        const text = formatted.join('\n');

        try {
            await navigator.clipboard.writeText(text);
            showYdsqNotification(`Скопировано ${activeMinuses.length} минусов`, 'success');
        } catch (err) {
            console.error('[YD-SQ] Ошибка копирования:', err);
            showYdsqNotification('Ошибка копирования в буфер', 'error');
        }
    }

    // ==================== UI ПАНЕЛЬ ====================

    function createPanel() {
        const existingPanel = document.getElementById('yd-sq-panel');
        const existingPill = document.getElementById('yd-sq-pill');

        // Если панель и pill уже существуют - не пересоздаём
        if (existingPanel && existingPill) {
            // Проверяем что хотя бы одно из них видимо
            // Если оба скрыты - показываем панель
            const panelVisible = existingPanel.style.display !== 'none';
            const pillVisible = existingPill.style.display !== 'none';

            if (!panelVisible && !pillVisible) {
                existingPanel.style.display = 'flex';
                existingPanel.style.opacity = '1';
                existingPanel.style.transform = 'none';
            }
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'yd-sq-panel';
        panel.innerHTML = `
            <!-- Header -->
            <div class="yd-sq-header" id="yd-sq-panel-header">
                <div class="yd-sq-header-left">
                    <svg class="yd-sq-logo" width="20" height="20" viewBox="0 0 100 100">
                        <circle cx="38" cy="38" r="28" fill="none" stroke="#205598" stroke-width="8"/>
                        <line x1="58" y1="58" x2="85" y2="85" stroke="#205598" stroke-width="10" stroke-linecap="round"/>
                        <rect x="22" y="28" width="32" height="6" rx="2" fill="#E46924"/>
                        <rect x="22" y="42" width="24" height="6" rx="2" fill="#205598"/>
                    </svg>
                    <span class="yd-sq-title">YD Helper</span>
                </div>
                <div class="yd-sq-header-right">
                    <button id="yd-sq-help-btn" class="yd-sq-icon-btn" title="Горячие клавиши">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </button>
                    <button id="yd-sq-panel-toggle" class="yd-sq-icon-btn" title="Свернуть">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Body (flex container) -->
            <div id="yd-sq-panel-body" class="yd-sq-body">
                <!-- Section: ВЫБРАНО -->
                <div class="yd-sq-section yd-sq-section-selected">
                    <div class="yd-sq-section-header">
                        <div class="yd-sq-section-header-left">
                            <span class="yd-sq-section-label">ВЫБРАНО</span>
                            <span id="yd-sq-global-count" class="yd-sq-badge">0</span>
                        </div>
                        <div class="yd-sq-section-header-right">
                            <button id="yd-sq-copy-selected" class="yd-sq-icon-btn-sm" title="Копировать">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                            </button>
                            <button id="yd-sq-clear-all" class="yd-sq-icon-btn-sm" title="Очистить всё">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div id="yd-sq-list" class="yd-sq-list"></div>
                </div>

                <!-- Section: В КАМПАНИИ (Accordion) -->
                <div id="yd-sq-imported-section" class="yd-sq-section yd-sq-accordion">
                    <div class="yd-sq-accordion-header" id="yd-sq-imported-toggle">
                        <div class="yd-sq-accordion-header-left">
                            <span class="yd-sq-section-label-muted">В КАМПАНИИ</span>
                            <span id="yd-sq-imported-count" class="yd-sq-badge-muted">0</span>
                            <svg class="yd-sq-accordion-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </div>
                        <div class="yd-sq-section-header-right">
                            <!-- Dropdown меню вместо 4 отдельных кнопок -->
                            <div class="yd-sq-dropdown" id="yd-sq-imported-menu">
                                <button class="yd-sq-icon-btn-sm yd-sq-dropdown-trigger" title="Действия">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="12" cy="5" r="2"/>
                                        <circle cx="12" cy="12" r="2"/>
                                        <circle cx="12" cy="19" r="2"/>
                                    </svg>
                                </button>
                                <div class="yd-sq-dropdown-menu">
                                    <button class="yd-sq-dropdown-item" id="yd-sq-copy-imported">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                        </svg>
                                        <span>Копировать</span>
                                    </button>
                                    <button class="yd-sq-dropdown-item" id="yd-sq-load-clipboard">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                                            <rect x="8" y="2" width="8" height="4" rx="1"/>
                                        </svg>
                                        <span>Вставить из буфера</span>
                                    </button>
                                    <div class="yd-sq-dropdown-divider"></div>
                                    <button class="yd-sq-dropdown-item yd-sq-dropdown-item-danger" id="yd-sq-clear-imported">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 6h18"/>
                                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                        </svg>
                                        <span>Очистить</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="yd-sq-imported-list" class="yd-sq-list yd-sq-accordion-content"></div>
                </div>
            </div>

            <!-- Footer -->
            <div class="yd-sq-footer">
                <div class="yd-sq-footer-buttons">
                    <button id="yd-sq-send" class="yd-sq-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        <span>Отправить в Директ</span>
                    </button>
                    <button id="yd-sq-sync-all" class="yd-sq-btn-icon" title="Синхронизировать минус-слова кампании">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                            <path d="M3 21v-5h5"/>
                        </svg>
                    </button>
                </div>
                <div id="yd-sq-last-send-info" class="yd-sq-status-text"></div>
            </div>

            <!-- Help Tooltip -->
            <div id="yd-sq-help-tooltip" class="yd-sq-help-tooltip" style="display:none;">
                <div class="yd-sq-help-title">Горячие клавиши</div>
                <div class="yd-sq-help-row"><kbd>Клик</kbd> — мягкое совпадение</div>
                <div class="yd-sq-help-row"><kbd>Alt+Клик</kbd> — строгое (!)</div>
                <div class="yd-sq-help-row"><kbd>2×Клик</kbd> — режим фразы</div>
            </div>

            <!-- Resize handles -->
            <div class="yd-sq-resize-handle yd-sq-resize-n" data-resize="n"></div>
            <div class="yd-sq-resize-handle yd-sq-resize-s" data-resize="s"></div>
            <div class="yd-sq-resize-handle yd-sq-resize-e" data-resize="e"></div>
            <div class="yd-sq-resize-handle yd-sq-resize-w" data-resize="w"></div>
            <div class="yd-sq-resize-handle yd-sq-resize-ne" data-resize="ne"></div>
            <div class="yd-sq-resize-handle yd-sq-resize-nw" data-resize="nw"></div>
            <div class="yd-sq-resize-handle yd-sq-resize-se" data-resize="se"></div>
            <div class="yd-sq-resize-handle yd-sq-resize-sw" data-resize="sw"></div>
        `;

        // Floating Pill (свёрнутое состояние)
        const pill = document.createElement('div');
        pill.id = 'yd-sq-pill';
        pill.className = 'yd-sq-pill';
        pill.style.display = 'none';
        pill.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 100 100">
                <circle cx="38" cy="38" r="28" fill="none" stroke="#205598" stroke-width="8"/>
                <line x1="58" y1="58" x2="85" y2="85" stroke="#205598" stroke-width="10" stroke-linecap="round"/>
            </svg>
            <span>YD Helper</span>
            <span id="yd-sq-pill-count" class="yd-sq-pill-badge">0</span>
        `;
        document.body.appendChild(pill);

        document.body.appendChild(panel);

        // Применить позицию
        panel.style.position = 'fixed';
        panel.style.left = panelPosition.left;
        panel.style.right = panelPosition.right;
        panel.style.top = panelPosition.top;

        // Обработчики
        // Toggle panel -> Floating Pill with animation
        document.getElementById('yd-sq-panel-toggle').addEventListener('click', () => {
            const panel = document.getElementById('yd-sq-panel');
            const pill = document.getElementById('yd-sq-pill');
            const helpTooltip = document.getElementById('yd-sq-help-tooltip');

            console.log('[YD-SQ] 🔽 СВОРАЧИВАНИЕ: начало');

            if (!pill) {
                console.error('[YD-SQ] ❌ Pill не найден!');
                return;
            }

            helpTooltip.style.display = 'none';

            // Анимация сворачивания
            panel.classList.add('yd-sq-panel-minimizing');
            setTimeout(() => {
                panel.style.display = 'none';
                panel.classList.remove('yd-sq-panel-minimizing');

                // Сбрасываем сохранённую позицию чтобы pill появился в стандартном месте
                localStorage.removeItem('yd-sq-pill-position');

                // Показываем pill в правом нижнем углу (стандартная позиция)
                pill.style.cssText = '';
                pill.style.display = 'flex';
                pill.style.position = 'fixed';
                pill.style.bottom = '20px';
                pill.style.right = '20px';
                pill.style.left = 'auto';
                pill.style.top = 'auto';
                pill.style.zIndex = '9999999';
                pill.style.opacity = '1';
                pill.style.visibility = 'visible';
                pill.style.pointerEvents = 'auto';

                pill.classList.add('yd-sq-pill-appear');
                setTimeout(() => pill.classList.remove('yd-sq-pill-appear'), 300);

                console.log('[YD-SQ] 🔽 СВОРАЧИВАНИЕ: pill показан', {
                    display: pill.style.display,
                    position: pill.style.position,
                    bottom: pill.style.bottom,
                    right: pill.style.right,
                    left: pill.style.left,
                    top: pill.style.top,
                    zIndex: pill.style.zIndex,
                    inDOM: document.body.contains(pill),
                    rect: pill.getBoundingClientRect()
                });
            }, 200);

            // Обновляем счётчик на pill
            updatePillCount();
        });

        // Pill click -> Restore panel
        document.getElementById('yd-sq-pill').addEventListener('click', (e) => {
            console.log('[YD-SQ] 🔼 РАЗВОРАЧИВАНИЕ: клик по pill');

            // Игнорируем если это drag
            if (e.target.closest('.yd-sq-pill').classList.contains('yd-sq-pill-dragging')) {
                console.log('[YD-SQ] 🔼 РАЗВОРАЧИВАНИЕ: пропуск (drag)');
                return;
            }

            const panel = document.getElementById('yd-sq-panel');
            const pill = document.getElementById('yd-sq-pill');

            // Скрываем pill
            pill.style.display = 'none';

            // Восстанавливаем панель с анимацией
            panel.classList.remove('yd-sq-panel-minimizing');
            panel.style.display = 'flex';
            panel.style.opacity = '1';
            panel.style.transform = 'none';
            panel.style.visibility = 'visible';

            // Запускаем анимацию появления
            panel.classList.add('yd-sq-panel-appearing');
            setTimeout(() => panel.classList.remove('yd-sq-panel-appearing'), 400);

            // Проверяем что панель в видимой области
            const rect = panel.getBoundingClientRect();
            if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) {
                // Панель за экраном - возвращаем в стандартную позицию
                console.log('[YD-SQ] 🔼 РАЗВОРАЧИВАНИЕ: панель за экраном, возвращаем');
                panel.style.right = '20px';
                panel.style.top = '100px';
                panel.style.left = 'auto';
                panel.style.bottom = 'auto';
            }

            console.log('[YD-SQ] 🔼 РАЗВОРАЧИВАНИЕ: панель показана');
        });

        // Pill drag & drop
        makePillDraggable();

        // Help tooltip - HOVER only (не клик)
        const helpBtn = document.getElementById('yd-sq-help-btn');
        const helpTooltip = document.getElementById('yd-sq-help-tooltip');

        helpBtn.addEventListener('mouseenter', () => {
            helpTooltip.style.display = 'block';
        });
        helpBtn.addEventListener('mouseleave', () => {
            helpTooltip.style.display = 'none';
        });

        // Accordion for imported (click only on header-left, not on Import button)
        document.querySelector('.yd-sq-accordion-header-left').addEventListener('click', () => {
            const section = document.getElementById('yd-sq-imported-section');
            const list = document.getElementById('yd-sq-imported-list');
            const arrow = section.querySelector('.yd-sq-accordion-arrow');

            section.classList.toggle('yd-sq-accordion-open');
            if (section.classList.contains('yd-sq-accordion-open')) {
                list.style.display = '';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                list.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
            }
        });

        // Import button - сразу импортирует из буфера
        document.getElementById('yd-sq-load-clipboard').addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            const result = await importMinusesFromClipboard();
            if (result.success) {
                showIconFeedback(btn, 'success');
            }
            // Закрываем dropdown
            document.getElementById('yd-sq-imported-menu').classList.remove('open');
        });

        // Dropdown меню toggle
        const dropdown = document.getElementById('yd-sq-imported-menu');
        dropdown.querySelector('.yd-sq-dropdown-trigger').addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        // Закрытие dropdown при клике вне
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        // Объединённая кнопка синхронизации (минусы + дата)
        document.getElementById('yd-sq-sync-all').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            if (btn.classList.contains('syncing')) return;

            btn.classList.add('syncing');

            try {
                // 1. Синхронизируем минус-слова кампании
                await startCampaignSync();

                // 2. Синхронизируем дату последней отправки
                if (typeof syncLatestDateFromHistory === 'function') {
                    await syncLatestDateFromHistory();
                }

                showYdsqNotification('Синхронизация завершена', 'success');
            } catch (err) {
                log.error('Ошибка синхронизации:', err);
                showYdsqNotification('Ошибка синхронизации', 'error');
            } finally {
                btn.classList.remove('syncing');
            }
        });

        // Copy Imported
        document.getElementById('yd-sq-copy-imported').addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            await copyImportedToClipboard();
            showIconFeedback(btn, 'success');
            // Закрываем dropdown
            document.getElementById('yd-sq-imported-menu').classList.remove('open');
        });

        // Clear Imported - удаляет всё с возможностью отмены
        let importedUndoMode = false;
        let importedBackup = [];

        document.getElementById('yd-sq-clear-imported').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;

            // Если в режиме undo - восстановить из backup
            if (importedUndoMode) {
                importedMinuses.push(...importedBackup);
                importedBackup = [];
                importedUndoMode = false;
                restoreClearImportedButton(btn);
                syncLocalToGlobal();
                renderImportedMinuses();
                updateHighlights();
                showYdsqNotification('Восстановлено', 'success');
                return;
            }

            // Проверяем есть ли элементы
            if (importedMinuses.length === 0) {
                showYdsqNotification('Нет элементов для очистки', 'info');
                return;
            }

            // Сохраняем backup и очищаем
            importedBackup = [...importedMinuses];
            importedMinuses.length = 0;
            importedUndoMode = true;

            // Меняем кнопку на иконку Undo
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h12a5 5 0 0 1 0 10H9"/><polyline points="7 8 3 12 7 16"/></svg>`;
            btn.title = 'Нажмите чтобы вернуть';
            btn.style.color = 'var(--yd-primary)';

            syncLocalToGlobal();
            renderImportedMinuses();
            updateHighlights();

            showYdsqNotification(`Удалено ${importedBackup.length} элементов (нажмите ↩ чтобы вернуть)`, 'info');

            // Закрываем dropdown
            document.getElementById('yd-sq-imported-menu').classList.remove('open');
        });

        function restoreClearImportedButton(btn) {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
            btn.title = 'Очистить';
            btn.style.color = '';
        }


        // Copy Selected with feedback
        document.getElementById('yd-sq-copy-selected').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            await copySelectedToClipboard();
            showIconFeedback(btn, 'success');
        });

        // Clear All with Undo
        document.getElementById('yd-sq-clear-all').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            handleClearWithUndo(btn);
        });

        document.getElementById('yd-sq-send').addEventListener('click', showSendConfirmDialog);

        makePanelDraggable();
        makePanelResizable();

        // Отображаем дату последней отправки
        updateLastSendDateUI();

        // Инъекция стилей синхронизации
        injectSyncStyles();

        // Обработчик кнопки синхронизации даты
        const syncDateBtn = document.getElementById('yd-sq-sync-date-btn');
        if (syncDateBtn) {
            syncDateBtn.addEventListener('click', async () => {
                syncDateBtn.classList.add('syncing');
                await syncLastSendDate(true);
                syncDateBtn.classList.remove('syncing');
            });
        }

        // Автосинхронизация при первом запуске (с задержкой)
        setTimeout(() => {
            checkAndAutoSync();
        }, 2000);
    }

    // Обновление счётчика на pill
    function updatePillCount() {
        const pillCount = document.getElementById('yd-sq-pill-count');
        if (pillCount) {
            pillCount.textContent = selections.size;
            // Красный бейдж если есть слова
            pillCount.classList.toggle('has-items', selections.size > 0);
        }
    }

    // Drag & Drop для pill
    function makePillDraggable() {
        const pill = document.getElementById('yd-sq-pill');
        let isDragging = false;
        let hasMoved = false; // Флаг - было ли реальное перемещение
        let startX, startY, startLeft, startTop;

        // Загружаем сохранённую позицию - НЕ применяем, т.к. сбрасываем при сворачивании
        // const savedPos = localStorage.getItem('yd-sq-pill-position');

        pill.addEventListener('mousedown', (e) => {
            isDragging = true;
            hasMoved = false; // Сбрасываем флаг перемещения
            startX = e.clientX;
            startY = e.clientY;
            startLeft = pill.offsetLeft;
            startTop = pill.offsetTop;
            e.preventDefault(); // Предотвращаем выделение текста
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Считаем drag только если сдвинули больше 5px
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                hasMoved = true;
                pill.classList.add('yd-sq-pill-dragging');
                pill.style.right = 'auto';
                pill.style.bottom = 'auto';
                pill.style.left = (startLeft + dx) + 'px';
                pill.style.top = (startTop + dy) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;

            if (hasMoved) {
                // Был drag - сохраняем позицию
                setTimeout(() => {
                    pill.classList.remove('yd-sq-pill-dragging');
                }, 100);

                localStorage.setItem('yd-sq-pill-position', JSON.stringify({
                    left: pill.offsetLeft,
                    top: pill.offsetTop
                }));
            }
            // Если не было перемещения - это click, обработчик click сработает
        });
    }

    // Clear с Undo
    let clearUndoBuffer = null;
    let clearUndoTimeout = null;

    function handleClearWithUndo(btn) {
        // Если уже в режиме Undo - восстановить
        if (btn.dataset.undoMode === 'true') {
            if (clearUndoBuffer) {
                selections = new Map(clearUndoBuffer);
                clearUndoBuffer = null;
                // Восстанавливаем чекбоксы
                selections.forEach(sel => {
                    if (sel.rowId) ensureRowChecked(sel.rowId);
                });
            }
            restoreClearButton(btn);
            syncLocalToGlobal();
            updateUI();
            showYdsqNotification('Восстановлено', 'success');
            return;
        }

        // Нечего очищать
        if (selections.size === 0) {
            showYdsqNotification('Нет слов для очистки', 'info');
            return;
        }

        // Сохраняем буфер для отмены
        clearUndoBuffer = new Map(selections);

        // Снимаем чекбоксы в таблице
        selections.forEach(sel => {
            if (sel.rowId) {
                const row = document.querySelector(`[data-yd-row-id="${sel.rowId}"]`);
                if (row) {
                    const cb = row.querySelector('input[type="checkbox"]');
                    if (cb && cb.checked) {
                        clickCheckbox(cb, false);
                    }
                }
            }
        });

        // Очищаем
        selections.clear();
        syncLocalToGlobal();
        updateUI();

        // Меняем кнопку на иконку Undo (стрелка назад)
        btn.dataset.undoMode = 'true';
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h12a5 5 0 0 1 0 10H9"/><polyline points="7 8 3 12 7 16"/></svg>`;
        btn.title = 'Нажмите чтобы вернуть';
        btn.style.color = 'var(--yd-primary)';

        // НЕ ставим таймаут - сбрасывается только при добавлении нового минуса
    }

    // Вызывать при добавлении нового минуса чтобы сбросить режим undo
    function clearUndoModeOnNewSelection() {
        clearUndoBuffer = null;
        const btn = document.getElementById('yd-sq-clear-all');
        if (btn && btn.dataset.undoMode === 'true') {
            restoreClearButton(btn);
        }
    }

    function restoreClearButton(btn) {
        delete btn.dataset.undoMode;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        btn.title = 'Очистить всё';
        btn.style.color = '';
    }

    // Функция обратной связи для иконок
    function showIconFeedback(btn, type = 'success') {
        const originalHTML = btn.innerHTML;
        if (type === 'success') {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
            btn.style.color = '#28a745';
        }
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = '';
        }, 2000);
    }

    // Анимация успешной отправки кнопки "Отправить в Директ"
    function animateSendButtonSuccess() {
        const btn = document.getElementById('yd-sq-send');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        btn.classList.add('success');
        btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>✓ Отправлено!</span>
            `;

        setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = originalHTML;
        }, 3000);
    }
    // Форматирование минуса для копирования/отправки (с операторами)
    function formatMinusForCopy(sel) {
        if (!sel) return '';
        const raw = sel.raw || sel.display;

        // Применяем операторы на основе matchType
        if (sel.matchType === 'strict') {
            // Для strict - добавляем ! к каждому слову
            const words = raw.split(/\s+/).filter(Boolean);
            return words.map(w => w.startsWith('!') ? w : '!' + w).join(' ');
        } else if (sel.matchType === 'bracket' && sel.kind === 'phrase') {
            return '[' + raw + ']';
        } else if (sel.matchType === 'quote') {
            return '"' + raw + '"';
        }
        return raw;
    }

    // Копирование выбранных минусов
    async function copySelectedToClipboard() {
        const minuses = Array.from(selections.values())
            .filter(sel => !sel._building)
            .map(sel => formatMinusForCopy(sel));

        if (minuses.length === 0) {
            showYdsqNotification('Нет слов для копирования', 'info');
            return;
        }

        try {
            await navigator.clipboard.writeText(minuses.join('\n'));
            showYdsqNotification(`Скопировано ${minuses.length} слов`, 'success');
        } catch (err) {
            log.error('Ошибка копирования', err);
            showYdsqNotification('Ошибка копирования', 'error');
        }
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

    // Размер панели (загружаем из localStorage)
    let panelSize = {
        width: parseInt(localStorage.getItem('yd-sq-panel-width')) || null,
        height: parseInt(localStorage.getItem('yd-sq-panel-height')) || null
    };

    function makePanelResizable() {
        const panel = document.getElementById('yd-sq-panel');
        const handles = panel.querySelectorAll('.yd-sq-resize-handle');

        let isResizing = false;
        let currentHandle = null;
        let startX, startY, startWidth, startHeight, startLeft, startTop;

        const MIN_WIDTH = 280;
        const MAX_WIDTH = 600;
        const MIN_HEIGHT = 200;
        const MAX_HEIGHT = 800;

        // Применяем сохранённый размер
        if (panelSize.width) {
            panel.style.width = panelSize.width + 'px';
            panel.style.minWidth = 'unset';
            panel.style.maxWidth = 'unset';
        }
        if (panelSize.height) {
            panel.style.height = panelSize.height + 'px';
        }

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                isResizing = true;
                currentHandle = handle.dataset.resize;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = panel.offsetWidth;
                startHeight = panel.offsetHeight;
                startLeft = panel.offsetLeft;
                startTop = panel.offsetTop;

                log.resize('Начало resize', { handle: currentHandle, startWidth, startHeight });

                document.body.style.cursor = getComputedStyle(handle).cursor;
                document.body.style.userSelect = 'none';
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            // Обработка разных направлений
            if (currentHandle.includes('e')) {
                newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + dx));
            }
            if (currentHandle.includes('w')) {
                const potentialWidth = startWidth - dx;
                if (potentialWidth >= MIN_WIDTH && potentialWidth <= MAX_WIDTH) {
                    newWidth = potentialWidth;
                    newLeft = startLeft + dx;
                }
            }
            if (currentHandle.includes('s')) {
                newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + dy));
            }
            if (currentHandle.includes('n')) {
                const potentialHeight = startHeight - dy;
                if (potentialHeight >= MIN_HEIGHT && potentialHeight <= MAX_HEIGHT) {
                    newHeight = potentialHeight;
                    newTop = startTop + dy;
                }
            }

            // Применяем новые размеры
            panel.style.width = newWidth + 'px';
            panel.style.minWidth = 'unset';
            panel.style.maxWidth = 'unset';
            panel.style.height = newHeight + 'px';

            if (currentHandle.includes('w')) {
                panel.style.left = newLeft + 'px';
                panel.style.right = 'auto';
            }
            if (currentHandle.includes('n')) {
                panel.style.top = newTop + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (!isResizing) return;

            isResizing = false;
            currentHandle = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Сохраняем размер
            panelSize.width = panel.offsetWidth;
            panelSize.height = panel.offsetHeight;
            localStorage.setItem('yd-sq-panel-width', panelSize.width);
            localStorage.setItem('yd-sq-panel-height', panelSize.height);

            log.resize('Конец resize', { width: panelSize.width, height: panelSize.height });
        });
    }

    function updateUI() {
        updateHighlights();
        renderSelectionList();
        renderImportedMinuses();
        updateUndoRedoButtons();
    }

    function renderSelectionList() {
        const container = document.getElementById('yd-sq-list');
        const countIndicator = document.getElementById('yd-sq-global-count');

        countIndicator.textContent = selections.size;

        if (selections.size === 0) {
            container.innerHTML = `
                <div class="yd-sq-empty">
                    <div class="yd-sq-empty-icon">
                        <svg width="48" height="48" viewBox="0 0 100 100" opacity="0.3">
                            <circle cx="38" cy="38" r="28" fill="none" stroke="#205598" stroke-width="6"/>
                            <line x1="58" y1="58" x2="85" y2="85" stroke="#205598" stroke-width="8" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="yd-sq-empty-text">Кликните по слову в таблице</div>
                    <div class="yd-sq-empty-hint">2×клик — для создания фразы</div>
                </div>
            `;
            return;
        }

        const items = Array.from(selections.values());

        container.innerHTML = items.map(sel => {
            const isBuilding = sel._building;

            // Определяем тип для badge
            const isQuote = sel.matchType === 'quote';
            const isBracket = sel.matchType === 'bracket';
            const isStrict = sel.matchType === 'strict';
            const isPhrase = sel.kind === 'phrase';

            // Badge отображает текущий тип (кликабельный для смены)
            let badgeText = '—'; // нет оператора
            let badgeClass = 'yd-sq-badge-type';
            if (isStrict) {
                badgeText = '!';
                badgeClass += ' yd-sq-badge-strict';
            } else if (isBracket) {
                badgeText = '[ ]';
                badgeClass += ' yd-sq-badge-bracket';
            } else if (isQuote) {
                badgeText = '" "';
                badgeClass += ' yd-sq-badge-quote';
            }

            // Чистый текст без операторов - берём из raw
            const cleanText = sel.raw || sel.display;

            return `
                <div class="yd-sq-item${isBuilding ? ' yd-sq-item-building' : ''}" data-sel-id="${escapeHtml(sel.id)}">
                    <button class="yd-sq-item-delete" data-action="remove" data-sel-id="${escapeHtml(sel.id)}" title="Удалить">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                    <button class="${badgeClass}" data-action="cycle-type" data-sel-id="${escapeHtml(sel.id)}" title="Клик для смены типа">${badgeText}</button>
                    <span class="yd-sq-item-text" data-action="edit" data-sel-id="${escapeHtml(sel.id)}" title="Клик для редактирования">${escapeHtml(cleanText)}</span>
                    ${isBuilding ? '<span class="yd-sq-item-building-hint">(building...)</span>' : ''}
                </div>
            `;
        }).join('');

        // Delete action
        addClickListener(container, '[data-action="remove"]', (e, btn) => {
            e.stopPropagation();
            removeSelectionById(btn.dataset.selId);
            updateUI();
            updatePillCount();
        });

        // Cycle type on badge click
        addClickListener(container, '[data-action="cycle-type"]', (e, btn) => {
            e.stopPropagation();
            cycleMatchType(btn.dataset.selId);
        });

        // Edit on text click
        addClickListener(container, '[data-action="edit"]', (e, el) => {
            e.stopPropagation();
            startInlineEdit(el.dataset.selId);
        });

        container.scrollTop = container.scrollHeight;
        updatePillCount();
    }

    // Циклическая смена типа соответствия (включая нейтральный)
    function cycleMatchType(id) {
        const sel = selections.get(id);
        if (!sel) return;

        // Цикл: нейтральный -> quote -> bracket (для phrase) -> strict -> нейтральный
        const types = sel.kind === 'phrase'
            ? [null, 'quote', 'bracket', 'strict']
            : [null, 'quote', 'strict'];

        const currentIndex = types.indexOf(sel.matchType);
        const nextIndex = (currentIndex + 1) % types.length;
        sel.matchType = types[nextIndex];

        // Применяем изменения
        applyMatchTypeToSelection(sel, sel.matchType);
        syncLocalToGlobal();
        updateHighlights();
        renderSelectionList();
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

        addClickListener(container, '.yd-sq-item-remove', (e, btn) => {
            const idx = parseInt(btn.dataset.sentIdx);
            sentHistory.splice(idx, 1);
            syncLocalToGlobal();
            updateUI();
        });
    }

    function renderImportedMinuses() {
        const section = document.getElementById('yd-sq-imported-section');
        const container = document.getElementById('yd-sq-imported-list');
        const countIndicator = document.getElementById('yd-sq-imported-count');

        countIndicator.textContent = importedMinuses.length;

        // Всегда показываем секцию
        section.style.display = '';

        // Если пусто - показываем placeholder
        if (importedMinuses.length === 0) {
            container.innerHTML = `
                <div class="yd-sq-empty-placeholder">
                    <span style="opacity: 0.5; font-size: 11px;">Нажмите ⟳ для синхронизации с кампанией</span>
                </div>
            `;
            return;
        }

        container.innerHTML = importedMinuses.map((imp, idx) => {
            const itemClass = `yd-sq-item yd-sq-item-imported`;

            // Иконка источника
            let sourceIcon = '';
            switch (imp.source) {
                case 'clipboard':
                    sourceIcon = '<span class="yd-sq-source-icon" title="Импортировано из буфера">📋</span>';
                    break;
                case 'sync':
                    sourceIcon = '<span class="yd-sq-source-icon" title="Синхронизировано">☁️</span>';
                    break;
                case 'table':
                default:
                    sourceIcon = '<span class="yd-sq-source-icon" title="Отправлено через расширение">📤</span>';
                    break;
            }

            return `
                <div class="${itemClass}" data-imp-idx="${idx}">
                    <button class="yd-sq-item-delete" data-action="remove-imported" data-imp-idx="${idx}" title="Удалить">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                    ${sourceIcon}
                    <span class="yd-sq-item-text">${escapeHtml(imp.raw)}</span>
                </div>
            `;
        }).join('');

        addClickListener(container, '[data-action="remove-imported"]', (e, btn) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.impIdx);

            // Удаляем элемент сразу
            importedMinuses.splice(idx, 1);

            syncLocalToGlobal();
            updateHighlights();
            renderImportedMinuses();
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
        syncLocalToGlobal();
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
        // Ищем span с текстом по data-sel-id
        const span = document.querySelector(`.yd-sq-item-text[data-sel-id="${id}"]`);
        const sel = selections.get(id);
        if (!span || !sel) return;

        // Уже редактируется?
        if (span.dataset.editing === 'true') return;
        span.dataset.editing = 'true';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = sel.raw || sel.display;
        input.className = 'yd-sq-item-edit-input';
        input.style.cssText = `
            width: 100%;
            font-size: 14px;
            padding: 4px 6px;
            border: 2px solid var(--yd-primary);
            border-radius: 4px;
            outline: none;
            background: var(--yd-bg);
            color: var(--yd-text);
        `;

        const finishEdit = (save = true) => {
            if (save) {
                const newValue = input.value.trim();
                if (newValue) {
                    sel.raw = newValue;

                    if (sel.kind === 'phrase') {
                        sel.words = sel.raw.split(/\s+/).filter(w => w);
                    } else if (sel.kind === 'soft-word') {
                        sel.stem = stemWord(sel.raw);
                    } else if (sel.kind === 'strict-word') {
                        sel.wordLower = sel.raw.toLowerCase();
                    }

                    applyMatchTypeToSelection(sel, sel.matchType);
                    syncLocalToGlobal();
                }
            }
            updateUI();
        };

        input.addEventListener('blur', () => finishEdit(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finishEdit(false);
            }
        });

        span.innerHTML = '';
        span.appendChild(input);
        input.focus();
        input.select();
    }

    // ==================== ОТПРАВКА (Logic from Малый код) ====================

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function sendBatch() {
        if (currentBatchIndex >= batchQueue.length) {
            // Все пакеты отправлены
            batchQueue = [];
            currentBatchIndex = 0;
            showYdsqNotification('✅ Все пакеты отправлены!', 'success');
            isSending = false;
            return;
        }

        const batch = batchQueue[currentBatchIndex];
        const values = batch.map(sel => sel.display);
        const batchInfo = `Пакет ${currentBatchIndex + 1}/${batchQueue.length} (${values.length} минусов)`;

        log.batch(`Начало отправки ${batchInfo}`);
        log.state(`Перед отправкой пакета ${currentBatchIndex + 1}`);

        showYdsqNotification(batchInfo, 'info');
        console.log(`[YD-SQ] Отправка ${batchInfo}`);

        // **КРИТИЧНО: Очищаем auto-чекбоксы от предыдущего batch**
        const rows = getAllRowsOnPage();
        let autoCleared = 0;
        rows.forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb && cb.dataset.ydAuto === 'true') {
                clickCheckbox(cb, false);
                delete cb.dataset.ydAuto;
                delete row.dataset.ydAutoRow;
                autoCleared++;
            }
        });

        log.reserve(`Очищено ${autoCleared} auto-чекбоксов от предыдущего batch`);

        await delay(100); // Даем время чекбоксам обновиться

        // **Пересчитываем ресурсы ПОСЛЕ очистки**
        let checkedCount = rows.filter(r => {
            const cb = r.querySelector('input[type="checkbox"]');
            return cb && cb.checked && cb.dataset.ydAuto !== 'true'; // Не учитываем auto
        }).length;

        const freeRows = findFreeRows(null);

        log.reserve(`Ресурсы после очистки`, {
            checkedCount,
            freeRowsCount: freeRows.length,
            neededForBatch: values.length,
            totalAvailable: checkedCount + freeRows.length
        });

        // **АДАПТИВНАЯ ЛОГИКА**: Если строк меньше чем нужно - отправляем сколько есть
        const actualAvailable = checkedCount + freeRows.length;

        if (actualAvailable === 0) {
            log.error('Нет доступных строк на странице');
            showYdsqNotification('Нет доступных строк. Перейдите на другую страницу.', 'error');
            isSending = false;
            batchQueue = [];
            return;
        }

        // Если доступных строк меньше чем в пакете - пересоздаём очередь
        if (actualAvailable < values.length) {
            log.warn(`Недостаточно строк для полного пакета. Адаптируем: отправим ${actualAvailable} из ${values.length}`);

            // Разбиваем текущий пакет: отправляем что можем, остальное в новый пакет
            const canSendNow = batch.slice(0, actualAvailable);
            const leftOver = batch.slice(actualAvailable);

            // Обновляем текущий пакет
            batchQueue[currentBatchIndex] = canSendNow;

            // Добавляем остаток как новый пакет
            if (leftOver.length > 0) {
                batchQueue.splice(currentBatchIndex + 1, 0, leftOver);
                log.batch(`Создан дополнительный пакет: ${leftOver.length} минусов`);
            }

            // Обновляем values для текущей отправки
            values.length = 0;
            canSendNow.forEach(sel => values.push(sel.display));

            showYdsqNotification(`Адаптировано: отправляем ${actualAvailable} минусов (всего пакетов: ${batchQueue.length})`, 'info');
        }

        // Резервируем строки для текущего пакета
        if (checkedCount < values.length) {
            const toReserve = values.length - checkedCount;
            log.reserve(`Нужно зарезервировать ${toReserve} строк`);

            let reserved = 0;
            for (let i = 0; i < freeRows.length && reserved < toReserve; i++) {
                const row = freeRows[i];
                const cb = row.querySelector('input[type="checkbox"]');
                if (cb && !cb.checked) {
                    clickCheckbox(cb, true);
                    cb.dataset.ydAuto = 'true';
                    row.dataset.ydAutoRow = 'true';
                    reserved++;
                    log.reserve(`Зарезервирована строка ${i + 1}/${toReserve}`, { rowId: row.dataset.ydRowId });
                }
            }

            log.success(`Зарезервировано ${reserved} строк для пакета ${currentBatchIndex + 1}`);
            console.log(`[YD-SQ] Зарезервировано ${reserved} строк для пакета ${currentBatchIndex + 1}`);
        }

        await delay(250);

        // Открываем модалку
        const addBtn = Array.from(document.querySelectorAll('button, span')).find(el => el.textContent && el.textContent.includes('Добавить в минус-фразы'));
        if (!addBtn) {
            showYdsqNotification('Кнопка не найдена', 'error');
            isSending = false;
            batchQueue = [];
            return;
        }

        addBtn.click();
        log.batch('Кнопка нажата, ожидаем модалку');

        try {
            await waitForMinusModal(values);
            log.success(`Пакет ${currentBatchIndex + 1} успешно завершён`);

            // ВАЖНО: Удаляем ТОЛЬКО реально отправленные минусы (не весь пакет!)
            const currentBatch = batchQueue[currentBatchIndex];
            const sentBackup = pendingSentMinusesBackup || [];
            const sentCount = sentBackup.length;
            let deletedCount = 0;

            log.batch(`Обработка пакета: currentBatch=${currentBatch?.length || 0}, sentBackup=${sentCount}`);

            if (sentCount > 0) {
                // Удаляем по backup (реально отправленные)
                for (const item of sentBackup) {
                    for (const [key, sel] of selections.entries()) {
                        if (sel.display === item.raw) {
                            selections.delete(key);
                            deletedCount++;
                            break;
                        }
                    }
                }
            } else if (currentBatch && currentBatch.length > 0) {
                // Fallback: если backup пуст, удаляем по currentBatch
                log.warn('pendingSentMinusesBackup пуст, используем currentBatch');
                for (const sel of currentBatch) {
                    if (selections.has(sel.id)) {
                        selections.delete(sel.id);
                        deletedCount++;
                    }
                }
            }

            log.selection(`Удалено ${deletedCount} selections после пакета ${currentBatchIndex + 1}`);

            // Проверяем, остались ли минусы которые не влезли в модалку
            const remainingInSelections = selections.size;
            const lostInThisBatch = (currentBatch?.length || 0) - deletedCount;

            if (lostInThisBatch > 0) {
                log.warn(`⚠️ В пакете ${currentBatchIndex + 1} не влезло ${lostInThisBatch} минусов - они остаются в selections`);
            }

            syncLocalToGlobal();
            updateUI();

            // Переходим к следующему пакету
            currentBatchIndex++;

            if (currentBatchIndex < batchQueue.length) {
                log.batch(`Переход к пакету ${currentBatchIndex + 1}/${batchQueue.length}`);
                showYdsqNotification(`Пакет ${currentBatchIndex} отправлен. Следующий пакет через 2 сек...`, 'success');
                await delay(2000); // Пауза между пакетами
                await sendBatch(); // Рекурсивный вызов СЛЕДУЮЩЕГО пакета
            } else {
                // Все пакеты отправлены
                const totalBatches = batchQueue.length;
                const remainingAfterAllBatches = selections.size;

                batchQueue = [];
                currentBatchIndex = 0;
                isSending = false;
                pendingSentMinuses = []; // Очищаем pending

                if (remainingAfterAllBatches > 0) {
                    // Остались минусы которые не влезли в модалки - запускаем автоповтор
                    log.batch(`⚠️ После ${totalBatches} пакетов осталось ${remainingAfterAllBatches} минусов - автоповтор`);
                    showYdsqNotification(`Пакеты отправлены, осталось ${remainingAfterAllBatches}. Автоотправка...`, 'info');

                    setTimeout(() => {
                        if (selections.size > 0) {
                            log.batch('=== АВТОПОВТОРНАЯ ОТПРАВКА ПОСЛЕ ПАКЕТОВ ===');
                            sendToMinusPhrases();
                        }
                    }, 2000);
                } else {
                    log.success(`✅ Все ${totalBatches} пакетов успешно отправлены!`);
                    showYdsqNotification(`✅ Все ${totalBatches} пакетов отправлены!`, 'success');

                    // Анимация кнопки успеха
                    animateSendButtonSuccess();
                }
                resetClearAllButton();
            }

        } catch (error) {
            log.error('Ошибка в пакетной отправке', error);
            console.error('[YD-SQ] Ошибка:', error);
            showYdsqNotification('Ошибка при обработке окна', 'error');
            isSending = false;
            batchQueue = [];
            pendingSentMinuses = [];
        }
    }

    // Проверяет нужна ли пакетная отправка и показывает диалог если да
    function showSendConfirmDialog() {
        if (!selections.size) {
            showYdsqNotification('Список минус-слов пуст', 'warn');
            return;
        }
        if (isSending) {
            showYdsqNotification('Отправка уже идёт...', 'warn');
            return;
        }

        // Считаем доступные строки
        const values = [];
        selections.forEach(sel => {
            if (!sel.unassignedOnThisPage) values.push(sel.display);
        });

        if (values.length === 0) {
            showYdsqNotification('Нет элементов для отправки', 'warn');
            return;
        }

        const allRows = getAllRowsOnPage();
        const checkedCount = allRows.filter(r => {
            const cb = r.querySelector('input[type="checkbox"]');
            return cb && cb.checked;
        }).length;
        const freeCount = findFreeRows(null).length;
        const availableRows = checkedCount + freeCount;

        // Определяем количество пакетов
        const MAX_BATCH_SIZE = 100;
        const batchSize = Math.min(availableRows, MAX_BATCH_SIZE);
        const totalBatches = batchSize > 0 ? Math.ceil(values.length / batchSize) : 0;

        log.batch(`Проверка: ${values.length} минусов, ${availableRows} доступных строк, ~${totalBatches} пакетов`);

        // Если нужен только 1 пакет - отправляем сразу без подтверждения
        if (totalBatches <= 1) {
            log.batch('Один пакет - отправляем без подтверждения');
            startAutomaticSending();
            return;
        }

        // Нужна пакетная отправка - показываем диалог
        const count = selections.size;

        const overlay = document.createElement('div');
        overlay.id = 'yd-sq-confirm-overlay';
        overlay.innerHTML = `
            <div class="yd-sq-confirm-dialog">
                <div class="yd-sq-confirm-title">⚠️ Пакетная отправка</div>
                <div class="yd-sq-confirm-text">
                    Отправить <strong>${count}</strong> минус-фраз в кампанию?
                </div>
                <div class="yd-sq-confirm-hint">
                    На странице недостаточно строк.<br>
                    Отправка будет разбита на <strong>${totalBatches} пакетов</strong>.<br>
                    Процесс автоматический и займёт некоторое время.
                </div>
                <div class="yd-sq-confirm-buttons">
                    <button class="yd-sq-confirm-btn yd-sq-confirm-cancel">Отмена</button>
                    <button class="yd-sq-confirm-btn yd-sq-confirm-ok">Начать отправку</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('yd-sq-confirm-show');
        });

        const closeDialog = () => {
            overlay.classList.remove('yd-sq-confirm-show');
            setTimeout(() => overlay.remove(), 200);
        };

        overlay.querySelector('.yd-sq-confirm-cancel').addEventListener('click', () => {
            log.info('Пакетная отправка отменена пользователем');
            closeDialog();
        });

        overlay.querySelector('.yd-sq-confirm-ok').addEventListener('click', async () => {
            log.info('Пользователь подтвердил пакетную отправку');
            closeDialog();
            await startAutomaticSending();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog();
            }
        });

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    // Запуск автоматической отправки
    async function startAutomaticSending() {
        log.batch('=== ЗАПУСК АВТОМАТИЧЕСКОЙ ОТПРАВКИ ===');
        await sendToMinusPhrases();
    }

    async function sendToMinusPhrases() {
        if (!selections.size) { showYdsqNotification('Список минус-слов пуст', 'warn'); return; }
        if (isSending) return;
        isSending = true;
        log.batch('=== ОТПРАВКА НАЧАТА ===');
        console.log('[YD SQ] === ОТПРАВКА ===');
        await delay(150);

        const values = [];
        const unassigned = [];
        selections.forEach(sel => {
            if (!sel.unassignedOnThisPage) values.push(sel.display);
            else unassigned.push(sel.raw);
        });

        if (unassigned.length > 0) showYdsqNotification(`${unassigned.length} элементов не найдены на странице`, 'warn');
        if (values.length === 0) { showYdsqNotification('Нет элементов для отправки', 'warn'); isSending = false; return; }

        // Синхронизация чекбоксов: снять лишние, оставить только для строк с selections
        const rowsWithSelections = new Set();
        selections.forEach(sel => {
            if (sel.pageKey === currentPageKey && sel.rowId && !sel.unassignedOnThisPage) {
                rowsWithSelections.add(sel.rowId);
            }
        });

        console.log(`[YD-SQ] 🔍 ДИАГНОСТИКА: values=${values.length}, rowsWithSelections=${rowsWithSelections.size}, currentPageKey=${currentPageKey}`);

        const allRows = getAllRowsOnPage();
        let uncheckedCount = 0;
        allRows.forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            const rowId = row.dataset.ydRowId;
            if (cb && cb.checked && !rowsWithSelections.has(rowId)) {
                // Снять чекбокс, если строка не содержит selections
                clickCheckbox(cb, false);
                delete cb.dataset.ydAuto;
                delete row.dataset.ydAutoRow;
                uncheckedCount++;
            }
        });

        if (uncheckedCount > 0) {
            console.log(`[YD-SQ] ⚠️ Сняли ${uncheckedCount} лишних чекбоксов`);
        }

        const rows = getAllRowsOnPage();
        let checkedCount = rows.filter(r => { const cb = r.querySelector('input[type="checkbox"]'); return cb && cb.checked; }).length;
        const neededTotal = values.length;
        const availableRows = checkedCount + findFreeRows(null).length;

        console.log(`[YD-SQ] 📊 ПЕРЕД ОТПРАВКОЙ: checkedCount=${checkedCount}, neededTotal=${neededTotal}, availableRows=${availableRows}`);

        // **ГРАНИЧНЫЙ СЛУЧАЙ: Нет доступных строк**
        if (availableRows === 0) {
            showYdsqNotification(
                'На странице нет свободных строк.\n\nПерейдите на другую страницу или снимите чекбоксы.',
                'error'
            );
            isSending = false;
            return;
        }

        // **НОВАЯ ЛОГИКА БАТЧИНГА**
        // Если не хватает строк - разбиваем на пакеты
        if (neededTotal > availableRows) {
            const MAX_BATCH_SIZE = 100; // Лимит для защиты от перегрузки Яндекса
            const batchSize = Math.min(availableRows, MAX_BATCH_SIZE);
            const batches = [];
            const allSelections = Array.from(selections.values()).filter(s => !s.unassignedOnThisPage);

            for (let i = 0; i < allSelections.length; i += batchSize) {
                batches.push(allSelections.slice(i, i + batchSize));
            }

            batchQueue = batches;
            currentBatchIndex = 0;

            showYdsqNotification(`Пакетная отправка: ${batches.length} пакетов (макс. ${batchSize} минусов/пакет)`, 'info');
            await delay(1000);

            // Отправляем первый пакет
            return sendBatch();
        }

        // **ОБЫЧНАЯ ОТПРАВКА** (если строк достаточно)
        if (checkedCount < neededTotal) {
            const toReserve = neededTotal - checkedCount;
            let lastUsedRowId = null;
            const selsOnPage = Array.from(selections.values()).filter(s => s.pageKey === currentPageKey && !s.unassignedOnThisPage);
            if (selsOnPage.length > 0) lastUsedRowId = selsOnPage[selsOnPage.length - 1]?.rowId;

            const freeRows = findFreeRows(lastUsedRowId);
            if (toReserve > freeRows.length) {
                showYdsqNotification(`Недостаточно строк (нужно: ${neededTotal}, свободно: ${freeRows.length})`, 'error');
                isSending = false;
                return;
            }

            let reserved = 0;
            for (let i = 0; i < freeRows.length && reserved < toReserve; i++) {
                const row = freeRows[i];
                const cb = row.querySelector('input[type="checkbox"]');
                if (cb && !cb.checked) {
                    clickCheckbox(cb, true);
                    cb.dataset.ydAuto = 'true';
                    row.dataset.ydAutoRow = 'true';
                    reserved++;
                }
            }
            checkedCount = rows.filter(r => { const cb = r.querySelector('input[type="checkbox"]'); return cb && cb.checked; }).length;
        }

        await delay(250);
        const finalChecked = getAllRowsOnPage().filter(r => { const cb = r.querySelector('input[type="checkbox"]'); return cb && cb.checked; }).length;

        if (values.length > finalChecked) { showYdsqNotification(`Ошибка: недостаточно строк`, 'error'); isSending = false; return; }

        const addBtn = Array.from(document.querySelectorAll('button, span')).find(el => el.textContent && el.textContent.includes('Добавить в минус-фразы'));
        if (!addBtn) { showYdsqNotification('Кнопка не найдена', 'error'); isSending = false; return; }

        addBtn.click();

        try {
            await waitForMinusModal(values);
        } catch (error) {
            console.error('[YD SQ] Ошибка:', error);
            showYdsqNotification('Ошибка при обработке окна', 'error');
        } finally {
            setTimeout(() => { isSending = false; }, 500);
        }
    }

    // КРИТИЧНО: Возвращает Promise и ждет ПОЛНОГО завершения (включая закрытие результата)
    function waitForMinusModal(values, attempt = 0) {
        return new Promise((resolve, reject) => {
            log.modal(`waitForMinusModal: попытка ${attempt}`);

            const checkModal = (att) => {
                const modal = findMinusModal();
                if (modal) {
                    log.modal('Модальное окно найдено, заполняем поля');
                    fillMinusModalAsync(modal, values).then(() => {
                        log.modal('Поля заполнены, ждём закрытия результата');
                        // Ждём появления результата и его закрытия
                        waitForResultPopupClosed().then(resolve).catch(reject);
                    }).catch(reject);
                } else if (att < 50) {
                    setTimeout(() => checkModal(att + 1), 200);
                } else {
                    log.error('Модальное окно не найдено после 50 попыток');
                    showYdsqNotification('Окно не обнаружено', 'error');
                    // В пакетном режиме НЕ сбрасываем isSending
                    if (batchQueue.length === 0) {
                        isSending = false;
                    }
                    reject(new Error('Modal not found'));
                }
            };

            checkModal(attempt);
        });
    }

    // Ждёт появления и закрытия попапа с результатом
    function waitForResultPopupClosed() {
        return new Promise((resolve) => {
            log.modal('waitForResultPopupClosed: начинаем ожидание');
            let checkCount = 0;
            const maxChecks = 120; // 60 секунд макс
            let popupWasFound = false; // Флаг - был ли popup найден хотя бы раз
            const isBatchMode = batchQueue.length > 0; // Проверяем пакетный режим

            const checkClosed = () => {
                checkCount++;

                // Проверяем - не закрылось ли модальное окно (отмена пользователем)
                // НО только если popup ещё НЕ появлялся (иначе это нормальное закрытие)
                const modal = findMinusModal();
                if (!modal && checkCount > 4 && !popupWasFound) {
                    log.warn('Модальное окно закрыто (возможно отмена)');
                    // В пакетном режиме НЕ сбрасываем isSending - это сделает sendBatch
                    if (!isBatchMode) {
                        isSending = false;
                    }
                    resolve();
                    return;
                }

                const popup = findResultPopup();

                if (popup) {
                    popupWasFound = true; // Запоминаем что popup появился
                    // Попап найден - пытаемся закрыть
                    log.modal('Результат найден, tryCloseResultPopup');
                    const closed = tryCloseResultPopup();
                    if (closed) {
                        log.success('Попап результата закрыт, пакет завершён');
                        setTimeout(resolve, 500); // Даём время на обработку
                        return;
                    }
                }

                if (checkCount < maxChecks) {
                    setTimeout(checkClosed, 500);
                } else {
                    log.warn('Таймаут ожидания результата, продолжаем');
                    // В пакетном режиме НЕ сбрасываем isSending
                    if (!isBatchMode) {
                        isSending = false;
                    }
                    resolve(); // Продолжаем даже если таймаут
                }
            };

            setTimeout(checkClosed, 1000); // Начинаем проверку через 1 сек
        });
    }

    function findMinusModal() {
        const candidates = document.querySelectorAll('div, section');
        for (const el of candidates) {
            const txt = el.textContent || '';
            if (!txt) continue;
            if (txt.includes('Добавление минус-фраз')) return el.closest('[role="dialog"]') || el;
        }
        return null;
    }



    // Async версия для пакетной отправки
    function fillMinusModalAsync(modal, values) {
        return new Promise((resolve, reject) => {
            log.modal('fillMinusModalAsync: начало');

            const selects = Array.from(modal.querySelectorAll('select'));
            selects.forEach((select) => {
                const opts = Array.from(select.options);
                const opt = opts.find(o => o.textContent.trim() === 'на кампанию' || o.textContent.trim() === 'На кампанию');
                if (opt) {
                    log.modal('Выбираем "на кампанию" в select');
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                    const btn = select.closest('.select')?.querySelector('button.select__button');
                    if (btn) { const t = btn.querySelector('.button__text'); if (t) t.textContent = 'на кампанию'; }
                }
            });

            waitForInputFieldsAsync(modal, values, 0, resolve, reject);
        });
    }

    // Async версия waitForInputFields
    async function waitForInputFieldsAsync(modal, values, attempt, resolve, reject) {
        if (attempt > 12) {
            log.error('Поля ввода не найдены после 12 попыток');
            showYdsqNotification('Поля ввода не найдены', 'error');
            isSending = false;
            reject(new Error('Input fields not found'));
            return;
        }

        setTimeout(async () => {
            const textareas = modal.querySelectorAll('textarea.textarea__control, textarea');
            const textInputs = modal.querySelectorAll('input.text-input__control, input[type="text"]');
            const otherInputs = modal.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])');
            const contentEditables = modal.querySelectorAll('[contenteditable="true"]');

            // 🔬 ДИАГНОСТИКА: Подсчет полей по типам
            console.log('[YD-SQ] 🔬 ЭКСПЕРИМЕНТ: Анализ полей в модалке');
            console.log(`  📝 textareas: ${textareas.length}`);
            console.log(`  📝 textInputs: ${textInputs.length}`);
            console.log(`  📝 otherInputs: ${otherInputs.length}`);
            console.log(`  📝 contentEditables: ${contentEditables.length}`);

            const all = [...textareas, ...textInputs, ...otherInputs, ...contentEditables];
            const uniq = [...new Set(all)];
            console.log(`  📊 Всего уникальных элементов: ${uniq.length}`);

            const visible = uniq.filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
            });

            // 🔬 ДИАГНОСТИКА: Сколько строк отмечено чекбоксами
            const checkedRows = document.querySelectorAll('input[type="checkbox"]:checked').length;
            console.log(`  ✅ Отмечено строк чекбоксами: ${checkedRows}`);
            console.log(`  👁️ Видимых полей для ввода: ${visible.length}`);
            console.log(`  🎯 Нужно отправить слов: ${values.length}`);

            if (visible.length > 0) {
                // Определяем сколько слов реально влезет
                const canFitCount = Math.min(visible.length, values.length);
                const valuesToFit = values.slice(0, canFitCount);
                const remainingValues = values.slice(canFitCount);

                log.modal(`Найдено ${visible.length} полей. Влезет: ${canFitCount}, Остаток: ${remainingValues.length}`);

                if (remainingValues.length > 0) {
                    showYdsqNotification(`Не все слова влезли (${canFitCount}/${values.length}). Остаток будет в следующем пакете.`, 'warn');
                }

                await fillFields(visible, valuesToFit);

                // ВАЖНО: сохраняем в pending ТОЛЬКО те слова, которые влезли
                preparePendingMinuses(valuesToFit);

                setTimeout(() => tryCloseResultPopup(), 1200);
                resolve();
            } else {
                log.modal(`Попытка ${attempt}: полей не найдено, повтор`);
                waitForInputFieldsAsync(modal, values, attempt + 1, resolve, reject);
            }
        }, 300);
    }

    function preparePendingMinuses(values) {
        const currentPage = parseInt(currentPageKey.split(':')[1]) || 1;
        const newPending = values.map(val => ({
            raw: val,
            page: currentPage
        }));

        if (!Array.isArray(pendingSentMinuses)) {
            pendingSentMinuses = [];
        }

        pendingSentMinuses.push(...newPending);
        syncLocalToGlobal();
        rebuildCampaignMinusList();
    }


    async function fillFields(inputs, values) {
        // Очищаем поля перед заполнением
        inputs.forEach((input) => {
            if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') input.value = ''; else input.textContent = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const n = values.length; // Используем длину values, так как мы уже сделали Math.min выше
        for (let i = 0; i < n; i++) {
            const el = inputs[i];
            const val = values[i];
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = val;
            } else {
                el.textContent = val;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
            if (el.isContentEditable) el.dispatchEvent(new Event('keyup', { bubbles: true }));
        }

        // **КРИТИЧЕСКИ ВАЖНО: Переключаем на "В кампанию" и снимаем "Добавлять в группу"**
        await delay(100);

        // Находим модальное окно
        const modal = document.querySelector('[role="dialog"]');
        if (modal) {
            // 1. Переключаем радио на "В кампанию"
            const radios = Array.from(modal.querySelectorAll('input[type="radio"]'));
            const campaignRadio = radios.find(r => {
                const label = r.closest('label') || r.nextElementSibling;
                const text = label?.textContent || '';
                return text.includes('кампанию') || text.includes('campaign');
            });

            if (campaignRadio && !campaignRadio.checked) {
                log.modal('Переключаем на "В кампанию"');
                campaignRadio.click();
                await delay(50);
            }

            // 2. Снимаем галочку "Добавлять в группу"
            const checkboxes = Array.from(modal.querySelectorAll('input[type="checkbox"]'));
            const groupCheckbox = checkboxes.find(ch => {
                const label = ch.closest('label') || ch.nextElementSibling;
                const text = label?.textContent || '';
                return text.includes('группу') || text.includes('group');
            });

            if (groupCheckbox && groupCheckbox.checked) {
                log.modal('Снимаем галочку "Добавлять в группу"');
                groupCheckbox.click();
            }
        }
    }

    // Время начала текущей операции отправки (для защиты от race condition)
    let currentSendStartTime = 0;

    // Время когда последний раз видели попап результата (для определения "нового" попапа)
    let lastPopupSeenTime = 0;

    function findResultPopup() {
        // Сначала ищем по точному селектору Яндекса
        const popup = document.querySelector('.popup.popup_visibility_visible.b-confirm');
        if (popup) {
            const text = popup.textContent || '';
            if (text.includes('Добавлено') && text.includes('минус')) {
                return popup;
            }
        }

        // Fallback: ищем по тексту
        const candidates = document.querySelectorAll('.popup, [role="dialog"], div, section');
        for (const el of candidates) {
            const t = el.textContent || '';
            if (!t) continue;
            if (t.includes('Добавлено') && t.includes('минус')) {
                // Проверяем что это видимый элемент
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return el.closest('.popup') || el.closest('[role="dialog"]') || el;
                }
            }
        }
        return null;
    }

    let lastResultPopupSuccessTime = 0;

    function tryCloseResultPopup() {
        // КРИТИЧНО: выполняем только во время активной отправки
        if (!isSending) {
            return false;
        }

        const pop = findResultPopup();
        if (!pop) return false;

        log.modal('tryCloseResultPopup: найден попап результата');

        // Улучшенный поиск кнопки OK
        // 1. Сначала по классу Яндекса
        let ok = pop.querySelector('.b-confirm__yes, button.button_action_confirm');

        // 2. Fallback: по тексту
        if (!ok) {
            const allButtons = Array.from(pop.querySelectorAll('button, span[role="button"], div[role="button"], a'));
            ok = allButtons.find(el => {
                const s = (el.textContent || '').trim().toLowerCase();
                return s === 'ok' || s === 'ок' || s === 'хорошо' || s === 'понятно' || s === 'закрыть';
            });
        }

        if (ok) {
            log.modal('Нажимаем кнопку OK');

            // Используем несколько способов клика для надёжности
            ok.click();
            ok.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

            // Prevent double success logic (debounce 1.5 seconds)
            // OK нажимается ВСЕГДА, но логика обработки только если debounce прошёл
            if (Date.now() - lastResultPopupSuccessTime < 1500) {
                log.modal('Debounce: OK нажат, но логика пропущена');
                return true; // Возвращаем true т.к. OK нажат
            }

            // ЗАЩИТА от race condition: проверяем есть ли pendingSentMinuses
            // Если их 0, значит это старый попап от предыдущей операции
            if (pendingSentMinuses.length === 0) {
                log.modal('SKIP: pendingSentMinuses пустой - это старый попап');
                return true;
            }

            lastResultPopupSuccessTime = Date.now();

            // После успешного сохранения:
            // Переносим pendingSentMinuses в importedMinuses и sentHistory
            log.sync('Обрабатываем pendingSentMinuses', { count: pendingSentMinuses.length });

            pendingSentMinusesBackup = [...pendingSentMinuses]; // Сохраняем в глобальную переменную

            if (pendingSentMinuses.length > 0) {
                for (const item of pendingSentMinuses) {
                    // Добавляем в importedMinuses
                    if (!importedMinuses.some(imp => imp.raw === item.raw)) {
                        importedMinuses.push({
                            id: `imp:${Date.now()}_${Math.random()}`,
                            raw: item.raw,
                            source: 'table', // Различаем: из таблицы, не импортированные
                            importedAt: Date.now(),
                            deleted: false
                        });
                    }

                    // Добавляем в историю
                    addToSentHistory(item.raw, null, [item.page]);
                }

                log.success(`Добавлено ${pendingSentMinuses.length} минусов в importedMinuses`);

                // КРИТИЧНО: Очищаем pendingSentMinuses сразу после обработки
                // чтобы не накапливались между пакетами
                pendingSentMinuses = [];

                // Сохраняем дату последней отправки
                lastSendDate = Date.now();
                saveLastSendDate();
                updateLastSendDateUI();

                // Обновляем UI и синхронизируем
                syncLocalToGlobal();
                rebuildCampaignMinusList();
                updateHighlights();
            }

            // Если это НЕ пакетная отправка - очищаем только отправленные слова из selections
            if (batchQueue.length === 0) {
                const countBefore = selections.size;
                const sentCount = pendingSentMinusesBackup.length;

                if (sentCount > 0) {
                    log.selection(`Обычная отправка: удаляем ${sentCount} отправленных слов из selections`);

                    // Удаляем только те, что были в бэкапе (т.е. реально попали в поля)
                    for (const item of pendingSentMinusesBackup) {
                        for (const [key, sel] of selections.entries()) {
                            if (sel.display === item.raw) {
                                selections.delete(key);
                                break;
                            }
                        }
                    }

                    const remaining = selections.size;
                    syncLocalToGlobal();
                    resetClearAllButton();
                    updateUI();
                    updateHighlights();

                    if (remaining > 0) {
                        showYdsqNotification(`Отправлено ${sentCount}. Осталось: ${remaining}. Автоотправка...`, 'info');

                        // Автоматическая повторная отправка оставшихся минусов
                        log.batch(`Осталось ${remaining} минусов - запускаем автоотправку`);
                        isSending = false; // Сбрасываем флаг перед повторной отправкой

                        setTimeout(() => {
                            if (selections.size > 0) {
                                log.batch('=== АВТОПОВТОРНАЯ ОТПРАВКА ===');
                                sendToMinusPhrases();
                            }
                        }, 2000);
                    } else {
                        showYdsqNotification(`Все выбранные слова (${sentCount}) отправлены`, 'success');
                    }
                }

                pendingSentMinuses = [];
            }
            // При пакетной отправке selections очищаются в sendBatch

            return true;
        }

        // Если кнопка OK не найдена - пробуем найти любую кнопку закрытия
        const close = pop.querySelector('button[aria-label="Закрыть"], button[aria-label="Close"], button.close');
        if (close) {
            log.modal('Нажимаем кнопку Закрыть');
            close.click();
            return true;
        }

        return false;
    }

    function setupResultPopupObserver() {
        tryCloseResultPopup();
        const o = new MutationObserver(() => { tryCloseResultPopup(); });
        o.observe(document.body, { childList: true, subtree: true });
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

                // МИГРАЦИЯ: Добавляем deleted: false к старым записям
                importedMinuses = importedMinuses.map(imp => {
                    if (imp.deleted === undefined) {
                        imp.deleted = false;
                    }
                    return imp;
                });

                panelPosition = data.panelPosition || { left: 'auto', right: '15px', top: '15px' };
                phraseCounter = data.phraseCounter || 0;

                // Восстановить selections
                if (data.selections) {
                    selections.clear();
                    let selCount = 0;
                    for (const [key, val] of Object.entries(data.selections)) {
                        selections.set(key, val);
                        selCount++;
                    }
                    console.log(`[YD-SQ] 💾 LOAD: Загружено ${selCount} выделений, ${importedMinuses.length} имп/эксп минусов, ${sentHistory.length} в истории`);
                }

                rebuildCampaignMinusList();

                // Форсируем пересчет кэша импортированных правил
                lastImportedMinusesRef = null;
                cachedImportedRules = null;
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

            // ОТЛАДКА: логируем что сохраняем
            console.log(`[YD-SQ] 💾 SAVE: ${Object.keys(selectionsObj).length} sel, ${importedMinuses.length} imp, ${sentHistory.length} hist`);

            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.error('[YD-SQ] Ошибка сохранения состояния:', err);
        }
    }

    function rebuildCampaignMinusList() {
        campaignMinusList.clear();
        for (const imp of importedMinuses) {
            campaignMinusList.add(imp.raw);
        }
    }

    // ==================== ДАТА ПОСЛЕДНЕЙ ОТПРАВКИ ====================

    function saveLastSendDate() {
        try {
            const campaignId = getCampaignId();
            const key = `yd-sq-last-send:${campaignId}`;
            localStorage.setItem(key, lastSendDate.toString());
            log.sync('Дата отправки сохранена', new Date(lastSendDate).toLocaleString());
        } catch (err) {
            console.error('[YD-SQ] Ошибка сохранения даты:', err);
        }
    }

    function loadLastSendDate() {
        try {
            const campaignId = getCampaignId();
            const key = `yd-sq-last-send:${campaignId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                lastSendDate = parseInt(saved);
                log.sync('Дата отправки загружена', new Date(lastSendDate).toLocaleString());
            }
        } catch (err) {
            console.error('[YD-SQ] Ошибка загрузки даты:', err);
        }
    }

    function updateLastSendDateUI() {
        const container = document.getElementById('yd-sq-last-send-info');
        if (!container) return;

        if (lastSendDate) {
            const date = new Date(lastSendDate);
            const dateStr = date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            container.innerHTML = `
                <span class="yd-sq-last-send-label">📤 Последняя отправка:</span>
                <span class="yd-sq-last-send-date">${dateStr} в ${timeStr}</span>
            `;
            container.style.display = 'flex';
        } else {
            container.innerHTML = `
                <span class="yd-sq-last-send-label">📤 Минусы ещё не отправлялись</span>
            `;
            container.style.display = 'flex';
        }
    }

    // ==================== СИНХРОНИЗАЦИЯ С ИСТОРИЕЙ ИЗМЕНЕНИЙ ====================

    const SYNC_HISTORY_KEY_PREFIX = 'yd-sq-synced:';
    const SYNC_IN_PROGRESS_KEY = 'yd-sq-sync-in-progress';

    // Проверяем, была ли уже синхронизация для этой кампании
    function isCampaignSynced(campaignId) {
        return localStorage.getItem(`${SYNC_HISTORY_KEY_PREFIX}${campaignId}`) === 'true';
    }

    function markCampaignSynced(campaignId) {
        localStorage.setItem(`${SYNC_HISTORY_KEY_PREFIX}${campaignId}`, 'true');
    }

    // Apple-стиль уведомления (toast)
    function showSyncToast(message, type = 'info', duration = 3000) {
        // Удаляем предыдущий toast
        const existing = document.getElementById('yd-sq-sync-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'yd-sq-sync-toast';
        toast.className = `yd-sq-sync-toast yd-sq-sync-toast-${type}`;

        const icons = {
            info: '🔄',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        toast.innerHTML = `
            <span class="yd-sq-sync-toast-icon">${icons[type]}</span>
            <span class="yd-sq-sync-toast-text">${message}</span>
        `;

        document.body.appendChild(toast);

        // Анимация появления
        requestAnimationFrame(() => {
            toast.classList.add('yd-sq-sync-toast-visible');
        });

        // Автоскрытие
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('yd-sq-sync-toast-visible');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    // Показать прогресс синхронизации
    function showSyncProgress(step, total, message) {
        let progressEl = document.getElementById('yd-sq-sync-progress');

        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.id = 'yd-sq-sync-progress';
            progressEl.className = 'yd-sq-sync-progress';
            document.body.appendChild(progressEl);

            requestAnimationFrame(() => {
                progressEl.classList.add('yd-sq-sync-progress-visible');
            });
        }

        const percent = Math.round((step / total) * 100);

        progressEl.innerHTML = `
            <div class="yd-sq-sync-progress-header">
                <span class="yd-sq-sync-progress-icon">🔄</span>
                <span class="yd-sq-sync-progress-title">Синхронизация</span>
            </div>
            <div class="yd-sq-sync-progress-message">${message}</div>
            <div class="yd-sq-sync-progress-bar-container">
                <div class="yd-sq-sync-progress-bar" style="width: ${percent}%"></div>
            </div>
            <div class="yd-sq-sync-progress-percent">${percent}%</div>
        `;

        return progressEl;
    }

    function hideSyncProgress() {
        const progressEl = document.getElementById('yd-sq-sync-progress');
        if (progressEl) {
            progressEl.classList.remove('yd-sq-sync-progress-visible');
            setTimeout(() => progressEl.remove(), 300);
        }
    }

    // Форматирование даты для API (ISO формат с временем)
    function formatDateForHistoryApi(date, isEndDate = false) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        // dateFrom: T21:00:00 (начало дня в UTC+3)
        // dateTo: T20:59:59 (конец дня в UTC+3)
        const time = isEndDate ? 'T20:59:59' : 'T21:00:00';
        return `${y}-${m}-${d}${time}`;
    }

    // Получение CSRF токена из cookies
    function getCsrfToken() {
        const match = document.cookie.match(/_direct_csrf_token=([^;]+)/);
        return match ? match[1] : '';
    }

    // Запрос к API истории изменений (GraphQL userActionLog)
    async function fetchHistoryApi(ulogin, campaignId, dateFrom, dateTo) {
        try {
            const url = `https://direct.yandex.ru/web-api/user-action-log/api?operationName=userActionLog&ulogin=${encodeURIComponent(ulogin)}`;

            const csrfToken = getCsrfToken();

            // GraphQL запрос (упрощённая версия)
            const graphqlQuery = `query userActionLog($login:String$campaignIds:[Long!]$limit:Int=200$token:String$dateFrom:LocalDateTime$dateTo:LocalDateTime$categories:[CategoryInput!]$order:OrderInput){userActionLog(clientLogin:$login campaignIds:$campaignIds limit:$limit pageToken:$token dateFrom:$dateFrom dateTo:$dateTo categories:$categories order:$order){nextPageToken logRecords{datetime user{login}event{...on CampaignValueChangeEvent{__typename category clientId campaign{id name}}...on CampaignListChangeEvent{__typename category clientId campaign{id name}}}}}}`;

            const payload = {
                operationName: 'userActionLog',
                variables: {
                    order: 'DESC',
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                    categories: ['CAMPAIGN_MINUS_WORDS'],
                    campaignIds: [campaignId],
                    adGroupIds: null,
                    adIds: null,
                    logins: null,
                    changeSources: null,
                    limit: 50,
                    token: null,
                    login: ulogin
                },
                query: graphqlQuery
            };

            log.sync('API запрос:', url);
            log.sync('Payload variables:', JSON.stringify(payload.variables));

            const headers = {
                'Content-Type': 'application/json',
                'Accept': '*/*, application/json',
                'dna-operation-name': 'userActionLog',
                'x-direct-api': '1'
            };

            // Добавляем CSRF токен если есть
            if (csrfToken) {
                headers['x-csrf-token'] = csrfToken;
            }

            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: headers,
                body: JSON.stringify(payload)
            });

            log.sync('HTTP статус:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                log.error('API вернул ошибку:', { status: response.status, body: errorText.slice(0, 500) });
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Детальное логирование для отладки
            log.sync('API ответ получен:', {
                hasData: !!data.data,
                hasUserActionLog: !!data.data?.userActionLog,
                recordsCount: data.data?.userActionLog?.logRecords?.length || 0
            });

            return data;
        } catch (error) {
            log.error('Ошибка API истории:', error.message || error);
            return null;
        }
    }

    // Поиск даты последней чистки минус-фраз в ответе API
    function findMinusPhraseInApiResponse(data) {
        try {
            // Структура ответа GraphQL: data.data.userActionLog.logRecords[]
            const logRecords = data?.data?.userActionLog?.logRecords || [];

            log.sync(`Получено ${logRecords.length} записей из API`);

            if (logRecords.length === 0) {
                log.sync('Нет записей в ответе');
                return null;
            }

            // Логируем первый элемент для отладки
            if (logRecords.length > 0) {
                log.sync('Пример записи:', JSON.stringify(logRecords[0]).slice(0, 400));
            }

            // Ищем записи о минус-фразах
            for (const record of logRecords) {
                // Проверяем категорию события
                const category = record.event?.category || '';

                // Если категория CAMPAIGN_MINUS_WORDS — это то что нам нужно
                if (category === 'CAMPAIGN_MINUS_WORDS' ||
                    category.includes('MINUS') ||
                    category.includes('minus')) {

                    // Берём дату из datetime
                    const dateStr = record.datetime;

                    if (dateStr) {
                        const parsedDate = new Date(dateStr);
                        if (!Number.isNaN(parsedDate.getTime())) {
                            log.sync('Найдена запись минус-фраз:', {
                                date: parsedDate.toISOString(),
                                category: category,
                                campaign: record.event?.campaign?.name || 'N/A'
                            });
                            return parsedDate;
                        }
                    }
                }
            }

            log.sync('Записи о минус-фразах не найдены в ответе');
            return null;
        } catch (error) {
            log.error('Ошибка парсинга API:', error);
            return null;
        }
    }


    // Умный поиск по периодам через API
    async function smartSyncFromHistory(ulogin, campaignId, onProgress) {
        const today = new Date();

        // Периоды для поиска (от короткого к длинному)
        const periods = [
            { days: 30, label: 'последний месяц' },
            { days: 90, label: 'последние 3 месяца' },
            { days: 365, label: 'последний год' }
        ];

        for (let i = 0; i < periods.length; i++) {
            const period = periods[i];
            const step = i + 1;
            const total = periods.length;

            if (onProgress) {
                onProgress(step, total + 1, `Проверяю ${period.label}...`);
            }

            const dateFrom = new Date(today);
            dateFrom.setDate(dateFrom.getDate() - period.days);

            log.sync(`Запрашиваю API за ${period.label}`);

            const apiResponse = await fetchHistoryApi(
                ulogin,
                campaignId,
                formatDateForHistoryApi(dateFrom, false),
                formatDateForHistoryApi(today, true)
            );

            if (apiResponse) {
                const foundDate = findMinusPhraseInApiResponse(apiResponse);

                if (foundDate) {
                    if (onProgress) {
                        onProgress(total + 1, total + 1, 'Дата найдена!');
                    }
                    return foundDate;
                }
            }

            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Не найдено за весь год
        if (onProgress) {
            onProgress(periods.length + 1, periods.length + 1, 'Записей не найдено');
        }


        return null;
    }

    // Основная функция синхронизации
    async function syncLastSendDate(showUI = true) {
        const campaignId = getCampaignId();
        const ulogin = getUlogin();

        if (!campaignId || !ulogin) {
            if (showUI) {
                showSyncToast('Не удалось определить кампанию', 'error');
            }
            return false;
        }

        // Проверяем, не идёт ли уже синхронизация
        if (sessionStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true') {
            if (showUI) {
                showSyncToast('Синхронизация уже выполняется...', 'warning');
            }
            return false;
        }

        sessionStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');

        try {
            // Показываем прогресс
            const onProgress = showUI ? showSyncProgress : null;

            if (showUI) {
                showSyncProgress(0, 4, 'Подключаюсь к истории изменений...');
            }

            // Умный поиск
            const foundDate = await smartSyncFromHistory(ulogin, campaignId, onProgress);

            if (foundDate) {
                // Нашли дату!
                lastSendDate = foundDate.getTime();
                saveLastSendDate();
                updateLastSendDateUI();
                markCampaignSynced(campaignId);

                if (showUI) {
                    hideSyncProgress();
                    const dateStr = foundDate.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    showSyncToast(`Дата синхронизирована: ${dateStr}`, 'success', 4000);
                }

                log.sync('Дата синхронизирована из истории', foundDate.toISOString());
                return true;

            } else {
                // Не нашли
                markCampaignSynced(campaignId);

                if (showUI) {
                    hideSyncProgress();
                    showSyncToast('Записей о минус-фразах не найдено', 'info', 4000);
                }

                log.sync('Минус-фразы в истории не найдены');
                return false;
            }

        } catch (error) {
            log.error('Ошибка синхронизации:', error);

            if (showUI) {
                hideSyncProgress();
                showSyncToast('Ошибка синхронизации', 'error');
            }

            return false;

        } finally {
            sessionStorage.removeItem(SYNC_IN_PROGRESS_KEY);
        }
    }

    // Получение ulogin из URL
    function getUlogin() {
        const params = new URLSearchParams(window.location.search);
        return params.get('ulogin') || '';
    }

    // Автосинхронизация при первом запуске в кампании
    function checkAndAutoSync() {
        const campaignId = getCampaignId();

        if (!campaignId) return;

        // Если кампания уже синхронизирована — пропускаем
        if (isCampaignSynced(campaignId)) {
            log.sync('Кампания уже синхронизирована');
            return;
        }

        // Если уже есть lastSendDate (записано расширением ранее) — не синхронизируем автоматически
        loadLastSendDate();
        if (lastSendDate) {
            log.sync('Есть сохранённая дата, автосинхронизация не требуется');
            markCampaignSynced(campaignId);
            return;
        }

        // Показываем приветственное сообщение и запускаем синхронизацию
        log.sync('Первый запуск в кампании — автосинхронизация');

        // Небольшая задержка для загрузки UI
        setTimeout(() => {
            showSyncToast('Первый запуск — определяю дату последней чистки...', 'info', 3000);

            setTimeout(() => {
                syncLastSendDate(true);
            }, 1000);
        }, 1500);
    }

    // Инъекция стилей для синхронизации
    function injectSyncStyles() {
        if (document.getElementById('yd-sq-sync-styles')) return;

        const style = document.createElement('style');
        style.id = 'yd-sq-sync-styles';
        style.textContent = `
            /* Кнопка синхронизации даты */
            .yd-sq-last-send-row {
                display: flex;
                align-items: center;
                gap: 6px;
                width: 100%;
            }

            .yd-sq-sync-date-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                padding: 0;
                border: none;
                background: transparent;
                color: #9ca3af;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.15s ease;
                flex-shrink: 0;
            }

            .yd-sq-sync-date-btn:hover {
                background: rgba(32, 85, 152, 0.1);
                color: #205598;
            }

            .yd-sq-sync-date-btn:active {
                transform: scale(0.95);
            }

            .yd-sq-sync-date-btn.syncing svg {
                animation: yd-sq-spin 1s linear infinite;
            }

            @keyframes yd-sq-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Toast уведомления (Apple-стиль) */
            .yd-sq-sync-toast {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(-20px);
                z-index: 999999999;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 20px;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transition: opacity 0.3s ease, transform 0.3s ease;
                pointer-events: none;
            }

            .yd-sq-sync-toast-visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            .yd-sq-sync-toast-icon {
                font-size: 18px;
            }

            .yd-sq-sync-toast-text {
                color: #fff;
                font-size: 14px;
                font-weight: 500;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .yd-sq-sync-toast-success {
                background: rgba(16, 185, 129, 0.95);
            }

            .yd-sq-sync-toast-error {
                background: rgba(239, 68, 68, 0.95);
            }

            .yd-sq-sync-toast-warning {
                background: rgba(245, 158, 11, 0.95);
            }

            /* Прогресс синхронизации */
            .yd-sq-sync-progress {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                z-index: 999999999;
                width: 320px;
                padding: 24px;
                background: #fff;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
                opacity: 0;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            .yd-sq-sync-progress-visible {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }

            .yd-sq-sync-progress-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }

            .yd-sq-sync-progress-icon {
                font-size: 24px;
                animation: yd-sq-spin 2s linear infinite;
            }

            .yd-sq-sync-progress-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .yd-sq-sync-progress-message {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .yd-sq-sync-progress-bar-container {
                height: 6px;
                background: #e5e7eb;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .yd-sq-sync-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #205598, #2F6FDB);
                border-radius: 3px;
                transition: width 0.3s ease;
            }

            .yd-sq-sync-progress-percent {
                font-size: 12px;
                color: #9ca3af;
                text-align: right;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            /* Overlay для прогресса */
            .yd-sq-sync-progress::before {
                content: '';
                position: fixed;
                top: -100vh;
                left: -100vw;
                width: 300vw;
                height: 300vh;
                background: rgba(0, 0, 0, 0.3);
                z-index: -1;
            }
        `;

        document.head.appendChild(style);
    }

    // ==================== АВТОРЕДИРЕКТ НА ПРАВИЛЬНЫЙ URL ====================

    function formatDateForUrl(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Вычисляет правильный период на основе lastSendDate
    function calculateCorrectPeriod() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        let dateFrom, dateTo;

        if (lastSendDate) {
            const sendDate = new Date(lastSendDate);
            sendDate.setHours(0, 0, 0, 0);

            const dayAfterSend = new Date(sendDate);
            dayAfterSend.setDate(dayAfterSend.getDate() + 1);

            if (sendDate >= yesterday) {
                // Отправка была сегодня или вчера → показываем только вчерашний день
                dateFrom = formatDateForUrl(yesterday);
                dateTo = formatDateForUrl(yesterday);
            } else {
                // Отправка была раньше → показываем период
                dateFrom = formatDateForUrl(dayAfterSend);
                dateTo = formatDateForUrl(yesterday);

                if (dayAfterSend > yesterday) {
                    dateFrom = formatDateForUrl(yesterday);
                    dateTo = formatDateForUrl(yesterday);
                }
            }
        } else {
            // Если не было отправок - берём 14 дней назад до вчера
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            dateFrom = formatDateForUrl(twoWeeksAgo);
            dateTo = formatDateForUrl(yesterday);
        }

        return { dateFrom, dateTo };
    }

    function checkAndRedirectUrl() {
        const currentUrl = window.location.href;

        // Проверяем что мы на странице статистики Директа
        if (!currentUrl.includes('direct.yandex.ru') ||
            !currentUrl.includes('stat_type=search_queries')) {
            return; // Не трогаем другие страницы
        }

        const url = new URL(currentUrl);
        const params = url.searchParams;

        // Получаем текущие параметры
        const cid = params.get('cid');
        const ulogin = params.get('ulogin');

        if (!cid || !ulogin) {
            log.warn('Не найдены cid или ulogin в URL');
            return;
        }

        // Проверяем есть ли уже ВСЕ необходимые параметры для правильного формата
        const hasAllRequiredParams =
            params.get('show_stat') === '1' &&
            params.get('group_by_date') === 'none' &&
            params.get('page_size') === '100' &&
            params.get('group_by')?.includes('match_type') &&
            params.get('group_by')?.includes('matched_phrase');

        // ВАЖНО: Проверяем, была ли эта кампания уже проверена
        // Если да и базовые параметры есть — не трогаем период (пользователь мог изменить вручную)
        const isSameCampaign = lastCheckedCampaignId === cid;

        if (isSameCampaign && hasAllRequiredParams) {
            log.info('Кампания уже проверена, базовые параметры есть → не трогаем период');
            return;
        }

        // Загружаем дату последней отправки для ТЕКУЩЕЙ кампании
        loadLastSendDate();

        // Вычисляем правильный период для текущей кампании
        const expectedPeriod = calculateCorrectPeriod();
        const currentDateFrom = params.get('date_from');
        const currentDateTo = params.get('date_to');

        // Проверяем соответствует ли текущий период правильному
        const isPeriodCorrect =
            currentDateFrom === expectedPeriod.dateFrom &&
            currentDateTo === expectedPeriod.dateTo;

        // Если все параметры верны И период правильный — просто запоминаем кампанию
        if (hasAllRequiredParams && isPeriodCorrect) {
            log.info('URL уже в правильном формате со всеми параметрами и правильным периодом');
            lastCheckedCampaignId = cid;
            sessionStorage.setItem('yd-sq-last-checked-cid', cid);
            return;
        }

        // Если это НОВАЯ кампания или нет базовых параметров — делаем редирект        
        if (!isSameCampaign) {
            log.info(`Новая кампания: ${cid} (была: ${lastCheckedCampaignId})`);
        }
        if (!hasAllRequiredParams) {
            log.info('Нет базовых параметров, нужен редирект');
        }
        if (hasAllRequiredParams && !isPeriodCorrect && !isSameCampaign) {
            log.info(`Период неверный: текущий ${currentDateFrom}→${currentDateTo}, нужен ${expectedPeriod.dateFrom}→${expectedPeriod.dateTo}`);
        }

        log.info('Выполняем редирект');

        // Используем уже вычисленный период (loadLastSendDate уже вызван выше)
        const { dateFrom, dateTo } = expectedPeriod;

        log.info(`Редирект: период ${dateFrom} - ${dateTo}`);

        // Формируем правильный URL
        const newUrl = `https://direct.yandex.ru/registered/main.pl?` +
            `show_stat=1&cmd=showStat&stat_periods=&ulogin=${ulogin}` +
            `&stat_type=search_queries&cid=${cid}&single_camp=1` +
            `&group_by_date=none&page_size=100` +
            `&date_from=${dateFrom}&date_to=${dateTo}` +
            `&attribution_model=automatic&with_nds=0` +
            `&columns=shows%2Cclicks%2Cctr%2Csum%2Cav_sum%2Caconv%2Cagoalcost%2Cagoalnum` +
            `&group_by=search_query%2Cadgroup%2Ccontextcond_orig%2Cmatch_type%2Cmatched_phrase%2Ctargeting_category` +
            `&columns_positions=shows%2Ceshows%2Cclicks%2Cctr%2Cectr%2Csum%2Cav_sum%2Cfp_shows_avg_pos%2Cavg_x%2Cfp_clicks_avg_pos%2Cbounce_ratio%2Cadepth%2Caconv%2Cagoalcost%2Cagoalnum%2Cagoalroi%2Cagoalcrr%2Cagoalincome` +
            `&group_by_positions=search_query%2Cadgroup%2Cbanner%2Ccontextcond_orig%2Ccriterion_type%2Cmatch_type%2Cmatched_phrase%2Ctext_source%2Cpage_group%2Cposition%2Ctargeting_category%2Cautotargeting_brand_option%2Cprisma_income_grade%2Cltv_level%2Coffer_attributes_name%2Coffer_attributes_vendor%2Coffer_attributes_category%2Cbanner_title%2Cbanner_body%2Cbanner_href`;

        // Проверяем что URL отличается
        if (currentUrl !== newUrl) {
            log.success('Редирект на оптимизированный URL');
            // Запоминаем cid чтобы после редиректа не делать его повторно
            lastCheckedCampaignId = cid;
            sessionStorage.setItem('yd-sq-last-checked-cid', cid);
            // Уведомление убрано по просьбе пользователя
            window.location.replace(newUrl);
        } else {
            // URL не изменился, просто запоминаем кампанию
            lastCheckedCampaignId = cid;
            sessionStorage.setItem('yd-sq-last-checked-cid', cid);
        }
    }


    // ==================== УВЕДОМЛЕНИЯ ====================

    function showYdsqNotification(message, type = 'info') {
        // Иконки для разных типов уведомлений (Apple SF Symbols style)
        const icons = {
            info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
            </svg>`,
            success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"/>
            </svg>`,
            warn: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>`,
            error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6"/>
                <path d="M9 9l6 6"/>
            </svg>`
        };

        const notification = document.createElement('div');
        notification.className = `yd-sq-notification yd-sq-notification-${type}`;
        notification.innerHTML = `
            <span class="yd-sq-notification-icon">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Анимация появления
        requestAnimationFrame(() => {
            notification.classList.add('yd-sq-notification-show');
        });

        // Автоскрытие
        setTimeout(() => {
            notification.classList.remove('yd-sq-notification-show');
            setTimeout(() => notification.remove(), 350);
        }, 3500);
    }

    // ==================== ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ ====================

    let clearAllUndoState = null;

    function resetClearAllButton() {
        const btn = document.getElementById('yd-sq-clear-all');
        if (btn && btn.dataset.undoMode === 'true') {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
            btn.title = 'Очистить всё';
            delete btn.dataset.undoMode;
            btn.style.background = '';
            btn.style.color = '';
            clearAllUndoState = null;
        }
    }

    function setupGlobalListeners() {
        // Скролл пользователя
        window.addEventListener('scroll', () => {
            lastManualScrollTime = Date.now();
        }, { passive: true });

        // Завершение фразы при клике вне слов активной строки
        document.addEventListener('click', (e) => {
            if (phraseInProgress) {
                // Ignore clicks on phrase buttons
                if (e.target.closest('.yd-phrase-actions')) return;

                // Check if click is on a word
                const clickedWord = e.target.closest('.yd-word');
                if (clickedWord) return;

                // Check if click is inside the active row
                const clickedRow = e.target.closest('[data-yd-row-id]');
                if (clickedRow && clickedRow.dataset.ydRowId === phraseInProgress.rowId) {
                    // Click inside active row but not on a word - ignore
                    return;
                }

                // Click is outside active row - show confirm
                if (confirm('Отменить фразу и снять все выделения в этой строке?')) {
                    cancelPhraseBuilding();
                }
            }
        });

        // Клавиши
        document.addEventListener('keydown', (e) => {
            if (phraseInProgress) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    finalizePhraseBuilding(false);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelPhraseBuilding();
                }
            }
        });

        // Делегирование для кнопок панели
        document.body.addEventListener('click', (e) => {
            // Кнопка "Очист ить все"
            const clearAllBtn = e.target.closest('#yd-sq-clear-all');
            if (clearAllBtn) {
                console.log('[YD-SQ] Кнопка "Очистить все" нажата');
                console.log('[YD-SQ] undoMode:', clearAllBtn.dataset.undoMode);
                console.log('[YD-SQ] selections.size:', selections.size);

                if (clearAllBtn.dataset.undoMode === 'true') {
                    console.log('[YD-SQ] Режим Вернуть');
                    // Режим "Вернуть" - восстанавливаем состояние
                    if (clearAllUndoState) {
                        selections.clear();
                        for (const [key, val] of clearAllUndoState) {
                            selections.set(key, val);
                        }

                        // Восстанавливаем чекбоксы
                        for (const sel of selections.values()) {
                            if (sel.pageKey === currentPageKey && sel.rowId) {
                                ensureRowChecked(sel.rowId);
                            }
                        }

                        syncLocalToGlobal();
                        updateUI();
                        showYdsqNotification('Очистка отменена', 'success');
                    }
                    resetClearAllButton();
                } else {
                    console.log('[YD-SQ] Режим Очистить');
                    // Режим "Очистить"
                    if (selections.size === 0) {
                        console.log('[YD-SQ] Нет выделений');
                        showYdsqNotification('Нет выделений для очистки', 'info');
                        return;
                    }

                    console.log('[YD-SQ] Сохраняем состояние, размер:', selections.size);
                    // Сохраняем состояние
                    clearAllUndoState = new Map(selections);

                    console.log('[YD-SQ] Снимаем чекбоксы');
                    // Снимаем чекбоксы для текущей страницы
                    for (const sel of selections.values()) {
                        if (sel.pageKey === currentPageKey && sel.rowId) {
                            const cb = getRowCheckbox(sel.rowId);
                            if (cb && cb.checked) {
                                clickCheckbox(cb, false);
                                delete cb.dataset.ydAuto;
                            }
                        }
                    }

                    console.log('[YD-SQ] Очищаем selections');
                    selections.clear();
                    pushUndo('clear_all', 'Очищены все выделения');
                    syncLocalToGlobal();
                    console.log('[YD-SQ] Вызываем updateUI');
                    updateUI();
                    console.log('[YD-SQ] Переключаем кнопку');

                    // Переключаем кнопку в режим "Вернуть"
                    clearAllBtn.textContent = 'Вернуть ↩';
                    clearAllBtn.dataset.undoMode = 'true';
                    clearAllBtn.style.background = '#e6f7ff';
                    clearAllBtn.style.color = '#1890ff';
                    console.log('[YD-SQ] Готово');
                }
            }

            // Кнопка "Очистить импортированные"
            const clearImpBtn = e.target.closest('#yd-sq-clear-imported');
            if (clearImpBtn) {
                if (importedMinuses.length === 0) {
                    showYdsqNotification('Список импортированных пуст', 'info');
                    return;
                }

                if (clearImpBtn.dataset.confirming === 'true') {
                    // Второе нажатие - выполняем очистку
                    importedMinuses = [];
                    syncLocalToGlobal();
                    updateHighlights();
                    updateUI();
                    showYdsqNotification('Список импортированных очищен', 'success');

                    // Сброс кнопки
                    clearImpBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
                    delete clearImpBtn.dataset.confirming;
                    clearImpBtn.style.background = '';
                    clearImpBtn.style.color = '';
                } else {
                    // Первое нажатие - запрашиваем подтверждение
                    clearImpBtn.dataset.confirming = 'true';
                    const originalHtml = clearImpBtn.innerHTML;
                    clearImpBtn.textContent = 'Точно?';
                    clearImpBtn.style.background = '#ff4d4f';
                    clearImpBtn.style.color = 'white';

                    // Сброс через 3 секунды
                    setTimeout(() => {
                        if (clearImpBtn.dataset.confirming === 'true') {
                            clearImpBtn.innerHTML = originalHtml;
                            delete clearImpBtn.dataset.confirming;
                            clearImpBtn.style.background = '';
                            clearImpBtn.style.color = '';
                        }
                    }, 3000);
                }
            }
        });
    }

    function setupMinusModalObserver() {
        const observer = new MutationObserver(() => {
            const textarea = findMinusPhrasesTextarea();
            if (textarea && !textarea.dataset.ydSqObserved) {
                textarea.dataset.ydSqObserved = 'true';
                syncCampaignDataFromTextarea(textarea);

                textarea.addEventListener('input', () => {
                    syncCampaignDataFromTextarea(textarea);
                });

                textarea.addEventListener('change', () => {
                    syncCampaignDataFromTextarea(textarea);
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function findMinusPhrasesTextarea() {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const dialog of dialogs) {
            const title = dialog.querySelector('h3, .title, [class*="Title"]');
            if (title && (title.textContent.includes('Минус-фразы') || title.textContent.includes('Минус слова'))) {
                return dialog.querySelector('textarea');
            }
        }
        return null;
    }

    function syncCampaignDataFromTextarea(textarea) {
        const text = textarea.value || '';
        const phrases = normalizeMinusInput(text);

        const existingMap = new Map(importedMinuses.map(m => [m.raw, m]));
        const newImported = [];
        let changed = false;

        for (const phrase of phrases) {
            if (existingMap.has(phrase)) {
                newImported.push(existingMap.get(phrase));
            } else {
                newImported.push({
                    id: `imp:${Date.now()}_${Math.random()}`,
                    raw: phrase,
                    importedAt: Date.now()
                });
                changed = true;
            }
        }

        if (newImported.length !== importedMinuses.length) {
            changed = true;
        }

        if (changed) {
            importedMinuses = newImported;
            syncLocalToGlobal();
            rebuildCampaignMinusList();
            updateHighlights();
            updateUI();
        }
    }

    // ==================== CSS СТИЛИ ====================

    function injectStyles() {
        if (document.getElementById('yd-sq-styles')) return;

        const style = document.createElement('style');
        style.id = 'yd-sq-styles';
        style.textContent = `
            /* ===== ОСНОВНЫЕ ПЕРЕМЕННЫЕ ===== */
            :root {
                --yd-primary: #205598;
                --yd-primary-light: #2F6FDB;
                --yd-primary-bg: #E3F2FD;
                --yd-accent: #E46924;
                --yd-success: #28a745;
                --yd-success-bg: #E8F5E9;
                --yd-danger: #dc3545;
                --yd-danger-bg: #FFEBEE;
                --yd-purple: #7c3aed;
                --yd-purple-bg: #F3E5F5;
                --yd-text: #333333;
                --yd-text-muted: #9CA3AF;
                --yd-text-secondary: #6b7280;
                --yd-bg: #ffffff;
                --yd-bg-header: #F9FAFB;
                --yd-bg-hover: #F5F7FA;
                --yd-border: #E1E4E8;
                --yd-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08);
                --yd-radius: 12px;
                --yd-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', system-ui, sans-serif;
            }

            /* ===== CUSTOM SCROLLBARS ===== */
            #yd-sq-panel ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            #yd-sq-panel ::-webkit-scrollbar-track {
                background: transparent;
            }
            #yd-sq-panel ::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.15);
                border-radius: 3px;
            }
            #yd-sq-panel ::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 0, 0, 0.25);
            }

            /* ===== ПАНЕЛЬ (Floating Layer) ===== */
            #yd-sq-panel {
                position: fixed;
                z-index: 9999999;
                background: var(--yd-bg);
                border: 1px solid var(--yd-border);
                border-radius: var(--yd-radius);
                box-shadow: var(--yd-shadow);
                font-size: 14px;
                width: 340px;
                height: 500px;
                box-sizing: border-box;
                overflow: hidden;
                font-family: var(--yd-font);
                color: var(--yd-text);
                display: flex;
                flex-direction: column;
                transition: transform 0.2s ease, opacity 0.2s ease;
            }

            #yd-sq-panel.yd-sq-panel-minimizing {
                transform: scale(0.3) translate(50%, 100%);
                opacity: 0;
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            }

            #yd-sq-panel.yd-sq-panel-appearing {
                animation: yd-panel-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes yd-panel-appear {
                from {
                    transform: scale(0.3) translate(50%, 100%);
                    opacity: 0;
                }
                to {
                    transform: scale(1) translate(0, 0);
                    opacity: 1;
                }
            }

            #yd-sq-panel * { box-sizing: border-box; }

            /* ===== FLOATING PILL ===== */
            .yd-sq-pill {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999999;
                background: var(--yd-bg);
                border: 1px solid var(--yd-border);
                border-radius: 25px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-family: var(--yd-font);
                font-size: 13px;
                font-weight: 600;
                color: var(--yd-text);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                user-select: none;
            }

            .yd-sq-pill.yd-sq-pill-appear {
                animation: yd-pill-appear 0.3s ease;
            }

            @keyframes yd-pill-appear {
                from { transform: scale(0.5); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            .yd-sq-pill.yd-sq-pill-dragging {
                cursor: grabbing;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
            }

            .yd-sq-pill:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
            }

            .yd-sq-pill-badge {
                background: var(--yd-text-muted);
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                min-width: 20px;
                text-align: center;
                transition: background 0.2s ease;
            }

            .yd-sq-pill-badge.has-items {
                background: var(--yd-primary);
            }

            /* ===== RESIZE HANDLES ===== */
            .yd-sq-resize-handle {
                position: absolute;
                background: transparent;
                z-index: 10;
            }
            .yd-sq-resize-n { top: -4px; left: 10px; right: 10px; height: 8px; cursor: ns-resize; }
            .yd-sq-resize-s { bottom: -4px; left: 10px; right: 10px; height: 8px; cursor: ns-resize; }
            .yd-sq-resize-e { top: 10px; bottom: 10px; right: -4px; width: 8px; cursor: ew-resize; }
            .yd-sq-resize-w { top: 10px; bottom: 10px; left: -4px; width: 8px; cursor: ew-resize; }
            .yd-sq-resize-ne { top: -4px; right: -4px; width: 14px; height: 14px; cursor: nesw-resize; }
            .yd-sq-resize-nw { top: -4px; left: -4px; width: 14px; height: 14px; cursor: nwse-resize; }
            .yd-sq-resize-se { bottom: -4px; right: -4px; width: 14px; height: 14px; cursor: nwse-resize; }
            .yd-sq-resize-sw { bottom: -4px; left: -4px; width: 14px; height: 14px; cursor: nesw-resize; }
            .yd-sq-resize-handle:hover { background: rgba(47, 111, 219, 0.15); }

            /* ===== HEADER ===== */
            #yd-sq-panel .yd-sq-header {
                flex: 0 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 14px;
                border-bottom: 1px solid var(--yd-border);
                background: var(--yd-bg-header);
                cursor: grab;
                user-select: none;
            }

            .yd-sq-header-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .yd-sq-logo { flex-shrink: 0; }

            .yd-sq-title {
                font-weight: 600;
                font-size: 14px;
                color: var(--yd-text);
            }

            .yd-sq-header-right {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .yd-sq-icon-btn {
                background: none;
                border: none;
                padding: 6px;
                cursor: pointer;
                color: var(--yd-text-secondary);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
            }

            .yd-sq-icon-btn:hover {
                background: var(--yd-bg-hover);
                color: var(--yd-text);
            }

            /* Small icon buttons in section headers */
            .yd-sq-icon-btn-sm {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: var(--yd-text-muted);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
            }

            .yd-sq-icon-btn-sm:hover {
                background: var(--yd-bg-hover);
                color: var(--yd-text);
            }

            /* Sync button special styles */
            .yd-sq-sync-btn {
                color: var(--yd-primary);
            }
            .yd-sq-sync-btn:hover {
                background: rgba(0, 122, 255, 0.1);
            }
            .yd-sq-sync-btn.syncing svg {
                animation: yd-spin 1s linear infinite;
            }
            @keyframes yd-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Source icon (📥 or ➕) */
            .yd-sq-source-icon {
                font-size: 10px;
                flex-shrink: 0;
                opacity: 0.6;
            }

            /* Text button (Import) */
            .yd-sq-text-btn {
                background: none;
                border: none;
                padding: 4px 8px;
                cursor: pointer;
                color: var(--yd-text-muted);
                font-size: 11px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 4px;
                border-radius: 4px;
                transition: all 0.15s ease;
            }

            .yd-sq-text-btn:hover {
                background: var(--yd-bg-hover);
                color: var(--yd-primary);
            }

            /* ===== BODY (flex container) ===== */
            #yd-sq-panel-body, .yd-sq-body {
                flex: 1 1 auto;
                padding: 12px 14px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                min-height: 0;
            }

            /* ===== SECTIONS ===== */
            .yd-sq-section {
                flex-shrink: 0;
            }

            /* Секция ВЫБРАНО - занимает всё доступное место, имеет свой скролл */
            .yd-sq-section-selected {
                flex: 1 1 auto;
                display: flex;
                flex-direction: column;
                min-height: 100px;
                overflow: hidden;
            }

            .yd-sq-section-header {
                position: sticky;
                top: 0;
                z-index: 10;
                background: var(--yd-bg);
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
            }

            .yd-sq-section-header-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .yd-sq-section-header-right {
                display: flex;
                align-items: center;
                gap: 2px;
            }

            .yd-sq-section-label {
                font-size: 11px;
                font-weight: 600;
                color: var(--yd-text-secondary);
                letter-spacing: 0.5px;
            }

            .yd-sq-section-label-muted {
                font-size: 11px;
                font-weight: 600;
                color: var(--yd-text-muted);
                letter-spacing: 0.5px;
            }

            .yd-sq-badge {
                background: var(--yd-primary);
                color: white;
                font-size: 11px;
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 10px;
                min-width: 20px;
                text-align: center;
            }

            .yd-sq-badge-muted {
                background: var(--yd-bg-hover);
                color: var(--yd-text-muted);
                font-size: 10px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 8px;
            }

            .yd-sq-badge-green {
                background: var(--yd-success);
            }

            /* ===== LIST ===== */
            #yd-sq-panel .yd-sq-list {
                flex: 1 1 auto;
                overflow-y: auto;
                background: var(--yd-bg);
                scroll-behavior: smooth;
            }

            #yd-sq-panel .yd-sq-empty {
                padding: 40px 16px;
                text-align: center;
                color: var(--yd-text-muted);
                font-size: 13px;
            }

            .yd-sq-empty-placeholder {
                padding: 12px 16px;
                text-align: center;
                color: var(--yd-text-muted);
            }

            .yd-sq-empty-icon {
                opacity: 0.15;
                margin-bottom: 12px;
            }

            .yd-sq-empty-text {
                margin-bottom: 4px;
                color: var(--yd-text-secondary);
            }

            .yd-sq-empty-hint {
                font-size: 11px;
                color: var(--yd-text-muted);
            }

            /* ===== ITEMS ===== */
            #yd-sq-panel .yd-sq-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 10px;
                margin-bottom: 0;
                background: var(--yd-bg);
                border: none;
                border-radius: 0;
                transition: background 0.1s ease;
                position: relative;
            }

            #yd-sq-panel .yd-sq-item:hover {
                background: var(--yd-bg-hover);
            }

            /* Delete button - крайний левый, hover-only */
            .yd-sq-item-delete {
                opacity: 0;
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: var(--yd-text-muted);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.1s ease;
                flex-shrink: 0;
            }

            #yd-sq-panel .yd-sq-item:hover .yd-sq-item-delete {
                opacity: 1;
            }

            .yd-sq-item-delete:hover {
                color: var(--yd-danger);
                background: var(--yd-danger-bg);
            }

            /* Badge Type - кликабельный для смены типа */
            .yd-sq-badge-type {
                font-size: 10px;
                font-weight: 600;
                padding: 3px 6px;
                border-radius: 4px;
                background: var(--yd-bg-hover);
                color: var(--yd-text-muted);
                cursor: pointer;
                transition: all 0.1s ease;
                flex-shrink: 0;
                min-width: 26px;
                text-align: center;
                border: 1px solid transparent;
            }

            .yd-sq-badge-type:hover {
                border-color: var(--yd-text-muted);
            }

            .yd-sq-badge-strict {
                background: var(--yd-danger-bg);
                color: var(--yd-danger);
            }

            .yd-sq-badge-quote {
                background: var(--yd-purple-bg);
                color: var(--yd-purple);
            }

            .yd-sq-badge-bracket {
                background: var(--yd-primary-bg);
                color: var(--yd-primary);
            }

            /* Item text - кликабельный для редактирования */
            .yd-sq-item-text {
                flex: 1;
                font-size: 14px;
                color: var(--yd-text);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                cursor: text;
                padding: 2px 4px;
                border-radius: 4px;
                transition: background 0.1s ease;
            }

            .yd-sq-item-text:hover {
                background: rgba(0, 0, 0, 0.03);
            }

            .yd-sq-item-building-hint {
                font-size: 10px;
                color: var(--yd-primary);
                margin-left: 4px;
                flex-shrink: 0;
            }

            /* Item states */
            #yd-sq-panel .yd-sq-item-building {
                background: var(--yd-primary-bg);
            }

            #yd-sq-panel .yd-sq-item-deleted {
                opacity: 0.4;
            }

            #yd-sq-panel .yd-sq-item-deleted .yd-sq-item-text {
                text-decoration: line-through;
            }

            #yd-sq-panel .yd-sq-item-strict .yd-sq-item-text::before {
                content: "!";
                font-weight: 700;
                color: var(--yd-danger);
                margin-right: 4px;
            }

            /* Item text */
            .yd-sq-item-text {
                flex: 1;
                font-size: 13px;
                color: var(--yd-text);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Item actions - hidden by default */
            .yd-sq-item-actions {
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.15s ease;
            }

            #yd-sq-panel .yd-sq-item:hover .yd-sq-item-actions {
                opacity: 1;
            }

            .yd-sq-item-action {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: var(--yd-text-secondary);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
            }

            .yd-sq-item-action:hover {
                background: var(--yd-bg-hover);
                color: var(--yd-text);
            }

            .yd-sq-item-action.danger:hover {
                color: var(--yd-danger);
                background: rgba(220, 53, 69, 0.1);
            }

            /* ===== ACCORDION ===== */
            .yd-sq-accordion {
                border-top: 1px solid var(--yd-border);
                padding-top: 8px;
                margin-top: 8px;
            }

            .yd-sq-accordion-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                cursor: pointer;
            }

            .yd-sq-accordion-header-left {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
            }

            .yd-sq-accordion-header-left:hover {
                opacity: 0.7;
            }

            .yd-sq-accordion-arrow {
                color: var(--yd-text-muted);
                transition: transform 0.2s ease;
            }

            .yd-sq-accordion-content {
                display: none;
                max-height: 150px;
                overflow-y: auto;
            }

            .yd-sq-accordion-open .yd-sq-accordion-content {
                display: block;
            }

            /* ===== FOOTER ===== */
            .yd-sq-footer {
                flex: 0 0 auto;
                padding: 12px 14px;
                border-top: 1px solid var(--yd-border);
                background: var(--yd-bg);
            }

            /* ===== PRIMARY CTA ===== */
            #yd-sq-panel .yd-sq-btn-primary {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                padding: 12px 16px;
                background: var(--yd-primary);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            #yd-sq-panel .yd-sq-btn-primary:hover {
                background: var(--yd-primary-light);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(32, 85, 152, 0.3);
            }

            #yd-sq-panel .yd-sq-btn-primary:active {
                transform: translateY(0);
            }

            #yd-sq-panel .yd-sq-btn-primary:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            /* Успешная отправка — анимация */
            #yd-sq-panel .yd-sq-btn-primary.success {
                background: var(--yd-success) !important;
            }

            /* ===== FOOTER BUTTONS ===== */
            .yd-sq-footer-buttons {
                display: flex;
                align-items: stretch;
                gap: 8px;
                margin-bottom: 6px;
            }

            /* Главная кнопка занимает всё доступное место */
            .yd-sq-footer-buttons .yd-sq-btn-primary {
                flex: 1;
            }

            /* Кнопка синхронизации — компактная иконка */
            #yd-sq-panel .yd-sq-btn-icon {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                padding: 0;
                color: var(--yd-text-secondary);
                background: var(--yd-bg-secondary);
                border: 1px solid var(--yd-border);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }

            #yd-sq-panel .yd-sq-btn-icon:hover {
                background: var(--yd-bg);
                border-color: var(--yd-primary);
                color: var(--yd-primary);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            #yd-sq-panel .yd-sq-btn-icon:active {
                transform: translateY(0);
            }

            #yd-sq-panel .yd-sq-btn-icon.syncing svg {
                animation: yd-sq-spin 1s linear infinite;
            }

            /* ===== DROPDOWN MENU ===== */
            .yd-sq-dropdown {
                position: relative;
            }

            .yd-sq-dropdown-trigger {
                background: transparent;
            }

            .yd-sq-dropdown-menu {
                position: absolute;
                bottom: 100%;
                right: 0;
                min-width: 170px;
                margin-bottom: 4px;
                background: var(--yd-bg);
                border: 1px solid var(--yd-border);
                border-radius: 10px;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transform: translateY(8px);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .yd-sq-dropdown.open .yd-sq-dropdown-menu {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .yd-sq-dropdown-item {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                padding: 10px 12px;
                font-size: 12px;
                color: var(--yd-text);
                background: transparent;
                border: none;
                cursor: pointer;
                transition: background 0.15s;
                text-align: left;
            }

            .yd-sq-dropdown-item:hover {
                background: var(--yd-bg-secondary);
            }

            .yd-sq-dropdown-item:first-child {
                border-radius: 7px 7px 0 0;
            }

            .yd-sq-dropdown-item:last-child {
                border-radius: 0 0 7px 7px;
            }

            .yd-sq-dropdown-item-danger {
                color: var(--yd-danger);
            }

            .yd-sq-dropdown-item-danger:hover {
                background: rgba(255, 77, 79, 0.1);
            }

            .yd-sq-dropdown-divider {
                height: 1px;
                background: var(--yd-border);
                margin: 4px 0;
            }

            /* ===== STATUS TEXT ===== */
            .yd-sq-status-text {
                font-size: 10px;
                color: var(--yd-text-muted);
                text-align: center;
                margin-top: 4px;
            }

            .yd-sq-status-text.success {
                color: var(--yd-success);
            }

            /* Legacy */
            .yd-sq-status {
                font-size: 11px;
                color: var(--yd-text-secondary);
                text-align: center;
                padding: 8px 0 0;
            }

            .yd-sq-status-success {
                color: var(--yd-success);
            }

            /* ===== HELP TOOLTIP ===== */
            .yd-sq-help-tooltip {
                position: absolute;
                top: 48px;
                right: 10px;
                background: var(--yd-text);
                color: white;
                padding: 12px 14px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 100;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            }

            .yd-sq-help-title {
                font-weight: 600;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
            }

            .yd-sq-help-row {
                margin-bottom: 4px;
            }

            .yd-sq-help-tooltip kbd {
                background: rgba(255,255,255,0.2);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: inherit;
                font-size: 11px;
                margin-right: 4px;
            }

            /* Legacy compatibility */
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

            #yd-sq-panel .yd-sq-btn-import {
                flex: 1;
                min-width: 100px;
            }

            #yd-sq-panel .yd-sq-btn-copy-imported {
                flex: 1;
                min-width: 100px;
            }

            #yd-sq-panel .yd-sq-btn-clear-imported {
                flex: 0;
                min-width: auto;
                width: auto;
                padding: 10px 12px;
            }

            #yd-sq-panel .yd-sq-hint {
                font-size: 11px;
                color: #888;
                margin-top: 8px;
                line-height: 1.5;
                padding-top: 8px;
                border-top: 1px solid #eee;
            }

            #yd-sq-panel .yd-sq-hint strong {
                color: #555;
                font-weight: 600;
            }

            /* ДАТА ПОСЛЕДНЕЙ ОТПРАВКИ */
            .yd-sq-last-send-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                font-size: 11px;
                color: #666;
                padding: 8px 10px;
                margin-top: 8px;
                background: linear-gradient(135deg, #f8fff8, #f0f8f0);
                border-radius: 6px;
                border-left: 3px solid #28a745;
            }

            .yd-sq-last-send-label {
                color: #555;
            }

            .yd-sq-last-send-date {
                font-weight: 600;
                color: #28a745;
                font-size: 12px;
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
                background: rgba(47, 111, 219, 0.1);
            }

            /* Отключаем hover для импортированных слов */
            .yd-imported-minus:hover {
                background: var(--yd-success-bg) !important;
            }

            /* Одиночное слово - синий */
            .yd-selected-soft {
                background: var(--yd-primary-bg) !important;
                border: 1px solid var(--yd-primary) !important;
                border-radius: 2px;
            }

            /* Строгое слово */
            .yd-selected-strict {
                background: rgba(220, 53, 69, 0.15) !important;
                border: 1px solid var(--yd-danger) !important;
                border-radius: 2px;
            }

            /* Фраза - фиолетовый */
            .yd-selected-phrase {
                background: var(--yd-purple-bg) !important;
                border: 1px solid var(--yd-purple) !important;
                border-radius: 2px;
            }

            /* Строящаяся фраза */
            .yd-phrase-building {
                background: var(--yd-primary-bg) !important;
                border: 2px dashed var(--yd-primary) !important;
                border-radius: 2px;
                animation: yd-phrase-blink 1.5s infinite ease-in-out;
            }

            @keyframes yd-phrase-blink {
                0% { opacity: 1; }
                50% { opacity: 0.6; }
                100% { opacity: 1; }
            }

            .yd-primary-soft {
                box-shadow: 0 0 0 2px var(--yd-primary) inset;
                font-weight: 600;
            }

            .yd-primary-strict {
                box-shadow: 0 0 0 2px var(--yd-danger) inset;
                background: rgba(220, 53, 69, 0.15) !important;
                font-weight: 600;
            }

            /* Уже добавлено - серый с tooltip */
            .yd-imported-minus {
                background: var(--yd-success-bg) !important;
                color: var(--yd-text-secondary) !important;
                text-decoration: none !important;
                opacity: 0.65;
                cursor: default !important;
                position: relative;
            }

            /* Apple-style tooltip для imported минусов */
            .yd-imported-minus[data-tooltip]::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: calc(100% + 6px);
                left: 50%;
                transform: translateX(-50%) scale(0.95);
                background: rgba(30, 30, 30, 0.95);
                color: #fff;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 500;
                letter-spacing: -0.2px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .yd-imported-minus[data-tooltip]:hover::after {
                opacity: 1;
                transform: translateX(-50%) scale(1);
            }

            .yd-row-deactivated {
                opacity: 0.5;
                pointer-events: none;
                filter: grayscale(100%);
            }

            .yd-phrase-actions {
                display: inline-flex; gap: 4px; margin-left: 8px; vertical-align: middle;
            }
            .yd-phrase-btn {
                border: 1px solid #ccc; background: #fff; padding: 2px 6px;
                border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: 600;
                line-height: 1; color: #333; transition: all 0.2s;
            }
            .yd-phrase-btn:hover { background: #f0f0f0; border-color: #999; }
            .yd-phrase-btn-done { color: #28a745; border-color: #28a745; }
            .yd-phrase-btn-done:hover { background: #e6ffec; }
            .yd-phrase-btn-cancel { color: #dc3545; border-color: #dc3545; }
            .yd-phrase-btn-cancel:hover { background: #ffe6e6; }

            /* COPY КНОПКА */
            .yd-copy-query-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
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

            /* Контейнер для кнопок действий */
            .yd-query-actions {
                display: inline-flex;
                gap: 4px;
                margin-left: 8px;
                vertical-align: middle;
            }

            /* Кнопка поиска в Яндекс */
            .yd-search-query-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
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
            tr:hover .yd-search-query-btn,
            [role="row"]:hover .yd-copy-query-btn,
            [role="row"]:hover .yd-search-query-btn {
                opacity: 1;
            }

            .yd-copy-query-btn:hover {
                background: #fff;
                border-color: #4a90e2;
                color: #4a90e2;
            }

            .yd-search-query-btn:hover {
                background: #fff;
                border-color: #ff6600;
                color: #ff6600;
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

            /* ==================== УВЕДОМЛЕНИЯ (Apple Style) ==================== */
            .yd-sq-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 18px;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 500;
                letter-spacing: -0.2px;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                box-shadow: 
                    0 4px 24px rgba(0, 0, 0, 0.12),
                    0 1px 3px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                opacity: 0;
                transform: translateX(100%) scale(0.9);
                transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 380px;
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .yd-sq-notification-icon {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .yd-sq-notification-show {
                opacity: 1;
                transform: translateX(0) scale(1);
            }

            .yd-sq-notification-info {
                background: rgba(10, 132, 255, 0.9);
                color: #fff;
            }

            .yd-sq-notification-success {
                background: rgba(48, 209, 88, 0.9);
                color: #fff;
            }

            .yd-sq-notification-warn {
                background: rgba(255, 159, 10, 0.9);
                color: #fff;
            }

            .yd-sq-notification-error {
                background: rgba(255, 69, 58, 0.9);
                color: #fff;
            }

            /* ДИАЛОГ ПОДТВЕРЖДЕНИЯ */
            #yd-sq-confirm-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2147483647;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            #yd-sq-confirm-overlay.yd-sq-confirm-show {
                opacity: 1;
            }

            .yd-sq-confirm-dialog {
                background: #fff;
                border-radius: 12px;
                padding: 24px;
                min-width: 340px;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                transform: scale(0.9);
                transition: transform 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }

            #yd-sq-confirm-overlay.yd-sq-confirm-show .yd-sq-confirm-dialog {
                transform: scale(1);
            }

            .yd-sq-confirm-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 12px;
            }

            .yd-sq-confirm-text {
                font-size: 14px;
                color: #555;
                margin-bottom: 8px;
            }

            .yd-sq-confirm-text strong {
                color: #4a90e2;
                font-weight: 700;
            }

            .yd-sq-confirm-hint {
                font-size: 12px;
                color: #888;
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .yd-sq-confirm-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .yd-sq-confirm-btn {
                padding: 10px 24px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .yd-sq-confirm-cancel {
                background: #f0f0f0;
                color: #666;
            }

            .yd-sq-confirm-cancel:hover {
                background: #e0e0e0;
            }

            .yd-sq-confirm-ok {
                background: linear-gradient(135deg, #4a90e2, #357abd);
                color: #fff;
            }

            .yd-sq-confirm-ok:hover {
                background: linear-gradient(135deg, #357abd, #2a5f8f);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
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
// ==================== МОДУЛЬ: ПЛОЩАДКИ (stat_type=pages) ====================
// Автоматическое выделение площадок по правилам
// Работает только на страницах с stat_type=pages
(function () {
    'use strict';

    // === Проверка: панель появляется только если stat_type=pages ===
    if (!location.href.toLowerCase().includes("stat_type=pages")) {
        return;
    }

    console.log("[YD-PL] 🚀 Модуль площадок инициализируется...");

    // ==================== КОНСТАНТЫ ====================
    const STORAGE_KEY = 'yd-pl-settings';
    const DEFAULT_TEMPLATES = {
        'Стандарт': 'com., dsp, puzzle, game, teskin',
        'Мобильные': 'com., android, ios, app, mobile',
        'Игры': 'game, puzzle, play, casino, slot'
    };

    // ==================== СОСТОЯНИЕ ====================
    let settings = loadSettings();


    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('[YD-PL] Ошибка загрузки настроек:', e);
        }
        return {
            templates: { ...DEFAULT_TEMPLATES },
            currentTemplate: 'Стандарт',
            panelPosition: { top: '15px', right: '15px' },
            panelSize: { width: 340, height: 420 },
            filters: {
                domains: DEFAULT_TEMPLATES['Стандарт'],
                minClicks: '',
                minCtr: '',
                maxCpc: '',
                maxSpend: ''
            },
            mode: 'and'
        };
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('[YD-PL] Ошибка сохранения настроек:', e);
        }
    }

    // ==================== УТИЛИТЫ ====================
    function parseNumber(text) {
        if (!text) return NaN;
        return parseFloat(
            text.replace(/\u00A0/g, ' ')
                .replace(/\s+/g, '')
                .replace(',', '.')
                .replace(/[^0-9.\-]/g, '')
        );
    }

    function isGreyElement(el) {
        if (!el || !window.getComputedStyle) return false;
        const color = window.getComputedStyle(el).color;
        const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!m) return false;
        const [r, g, b] = m.slice(1).map(Number);
        const diffRG = Math.abs(r - g);
        const diffGB = Math.abs(g - b);
        const diffRB = Math.abs(r - b);
        if (diffRG > 10 || diffGB > 10 || diffRB > 10) return false;
        return (r + g + b) / 3 > 80;
    }

    function getValNum(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const val = el.value.trim();
        return val ? Number(val.replace(',', '.')) : null;
    }

    // ==================== ПОДСЧЁТ ПЛОЩАДОК ====================
    function countMatchingRows() {
        const rows = document.querySelectorAll('tbody tr');
        const domainInput = document.getElementById('yd-pl-domain-patterns');
        const domainPatterns = domainInput ? domainInput.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];

        const minClicks = getValNum('yd-pl-min-clicks');
        const minCtr = getValNum('yd-pl-min-ctr');
        const maxCpc = getValNum('yd-pl-max-cpc');
        const maxSpend = getValNum('yd-pl-max-spend');
        const mode = document.querySelector('input[name="yd-pl-mode"]:checked')?.value || 'and';

        let count = 0;

        rows.forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (!checkbox || checkbox.disabled) return;

            const tds = row.querySelectorAll('td');
            if (tds.length < 6) return;

            const domainCell = tds[0];
            const domainEl = domainCell.querySelector('a') || domainCell;
            if (isGreyElement(domainEl)) return;

            const clicks = parseNumber(tds[2].textContent);
            const ctr = parseNumber(tds[3].textContent);
            const spend = parseNumber(tds[4].textContent);
            const cpc = parseNumber(tds[5].textContent);

            const conditions = [];

            if (domainPatterns.length > 0) {
                const domain = domainEl.textContent.trim().toLowerCase();
                const ok = domainPatterns.some(p => {
                    if (!p) return false;
                    if (p === 'com.') return domain.startsWith('com.');
                    return domain.startsWith(p) || domain.includes(p);
                });
                conditions.push(ok);
            }

            if (minClicks !== null) conditions.push(clicks >= minClicks);
            if (minCtr !== null) conditions.push(ctr >= minCtr);
            if (maxCpc !== null) conditions.push(cpc <= maxCpc);
            if (maxSpend !== null) conditions.push(spend <= maxSpend);

            if (conditions.length === 0) return;

            const pass = mode === 'and' ? conditions.every(Boolean) : conditions.some(Boolean);
            if (pass && !checkbox.checked) count++;
        });

        return count;
    }

    // ==================== ЛОГИКА ВЫДЕЛЕНИЯ ====================
    function selectPlacements() {
        const rows = document.querySelectorAll('tbody tr');
        if (!rows.length) {
            showNotification('Строк не найдено', 'error');
            return;
        }

        const domainInput = document.getElementById('yd-pl-domain-patterns');
        const domainPatterns = domainInput.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        const minClicks = getValNum('yd-pl-min-clicks');
        const minCtr = getValNum('yd-pl-min-ctr');
        const maxCpc = getValNum('yd-pl-max-cpc');
        const maxSpend = getValNum('yd-pl-max-spend');
        const mode = document.querySelector('input[name="yd-pl-mode"]:checked')?.value || 'and';

        let count = 0;

        rows.forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (!checkbox) return;

            const tds = row.querySelectorAll('td');
            if (tds.length < 6) return;

            const domainCell = tds[0];
            const domainEl = domainCell.querySelector('a') || domainCell;
            if (isGreyElement(domainEl)) return;

            const clicks = parseNumber(tds[2].textContent);
            const ctr = parseNumber(tds[3].textContent);
            const spend = parseNumber(tds[4].textContent);
            const cpc = parseNumber(tds[5].textContent);

            const conditions = [];

            if (domainPatterns.length > 0) {
                const domain = domainEl.textContent.trim().toLowerCase();
                const ok = domainPatterns.some(p => {
                    if (!p) return false;
                    if (p === 'com.') return domain.startsWith('com.');
                    return domain.startsWith(p) || domain.includes(p);
                });
                conditions.push(ok);
            }

            if (minClicks !== null) conditions.push(clicks >= minClicks);
            if (minCtr !== null) conditions.push(ctr >= minCtr);
            if (maxCpc !== null) conditions.push(cpc <= maxCpc);
            if (maxSpend !== null) conditions.push(spend <= maxSpend);

            if (conditions.length === 0) return;

            const pass = mode === 'and' ? conditions.every(Boolean) : conditions.some(Boolean);

            if (!pass) return;

            if (!checkbox.checked && !checkbox.disabled) {
                checkbox.click();
                count++;
            }
        });

        showNotification(`Выделено: ${count}`, 'success');
        updateStats();
        saveCurrentFilters();
    }

    function clearAllSelections() {
        let count = 0;
        document.querySelectorAll('tbody tr').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked && !checkbox.disabled) {
                checkbox.click();
                count++;
            }
        });
        showNotification(`Снято: ${count}`, 'info');
        updateStats();
    }

    function resetAllFilters() {
        document.getElementById('yd-pl-domain-patterns').value = '';
        document.getElementById('yd-pl-min-clicks').value = '';
        document.getElementById('yd-pl-min-ctr').value = '';
        document.getElementById('yd-pl-max-cpc').value = '';
        document.getElementById('yd-pl-max-spend').value = '';
        document.querySelector('input[name="yd-pl-mode"][value="and"]').checked = true;
        updatePreview();
        showNotification('Фильтры сброшены', 'info');
    }

    function saveCurrentFilters() {
        settings.filters = {
            domains: document.getElementById('yd-pl-domain-patterns').value,
            minClicks: document.getElementById('yd-pl-min-clicks').value,
            minCtr: document.getElementById('yd-pl-min-ctr').value,
            maxCpc: document.getElementById('yd-pl-max-cpc').value,
            maxSpend: document.getElementById('yd-pl-max-spend').value
        };
        settings.mode = document.querySelector('input[name="yd-pl-mode"]:checked')?.value || 'and';
        saveSettings();
    }

    // ==================== UI ====================
    function updateStats() {
        const total = document.querySelectorAll('tbody tr input[type="checkbox"]').length;
        const checked = document.querySelectorAll('tbody tr input[type="checkbox"]:checked').length;
        const statsEl = document.getElementById('yd-pl-stats');
        if (statsEl) {
            statsEl.textContent = `${checked} / ${total}`;
        }
    }

    function updatePreview() {
        const count = countMatchingRows();
        const previewEl = document.getElementById('yd-pl-preview');
        if (previewEl) {
            previewEl.textContent = count > 0 ? `Будет выделено: ${count}` : 'Нет совпадений';
            previewEl.className = count > 0 ? 'yd-pl-preview yd-pl-preview-active' : 'yd-pl-preview';
        }
    }

    function showNotification(message, type = 'info') {
        const existing = document.getElementById('yd-pl-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'yd-pl-notification';
        notification.className = `yd-pl-notification yd-pl-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('yd-pl-notification-hide');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    function updateTemplateSelect() {
        const select = document.getElementById('yd-pl-template-select');
        if (!select) return;
        select.innerHTML = '';
        for (const name of Object.keys(settings.templates)) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === settings.currentTemplate) opt.selected = true;
            select.appendChild(opt);
        }
    }

    // ==================== СОЗДАНИЕ ПАНЕЛИ ====================
    function createControlPanel() {
        if (document.getElementById('yd-pl-panel')) return;

        injectStyles();

        const panel = document.createElement('div');
        panel.id = 'yd-pl-panel';
        panel.innerHTML = `
            <!-- Header -->
            <div class="yd-pl-header" id="yd-pl-panel-header">
                <div class="yd-pl-header-left">
                    <svg class="yd-pl-logo" width="20" height="20" viewBox="0 0 100 100">
                        <circle cx="38" cy="38" r="28" fill="none" stroke="#205598" stroke-width="8"/>
                        <line x1="58" y1="58" x2="85" y2="85" stroke="#205598" stroke-width="10" stroke-linecap="round"/>
                        <rect x="22" y="28" width="32" height="6" rx="2" fill="#E46924"/>
                        <rect x="22" y="42" width="24" height="6" rx="2" fill="#205598"/>
                    </svg>
                    <div class="yd-pl-title-group">
                        <span class="yd-pl-title">YD Helper</span>
                        <span class="yd-pl-subtitle">Площадки</span>
                    </div>
                </div>
                <div class="yd-pl-header-right">
                    <span id="yd-pl-stats" class="yd-pl-badge">0 / 0</span>
                    <button id="yd-pl-help-btn" class="yd-pl-icon-btn" title="Справка">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </button>
                    <button id="yd-pl-panel-toggle" class="yd-pl-icon-btn" title="Свернуть">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div id="yd-pl-panel-body" class="yd-pl-body">
                <!-- Секция: ШАБЛОНЫ -->
                <div class="yd-pl-section">
                    <div class="yd-pl-section-header">
                        <span class="yd-pl-section-label">ШАБЛОНЫ</span>
                        <div class="yd-pl-section-actions">
                            <button id="yd-pl-template-save" class="yd-pl-icon-btn-sm" title="Сохранить текущие настройки как шаблон">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                    <polyline points="17 21 17 13 7 13 7 21"/>
                                    <polyline points="7 3 7 8 15 8"/>
                                </svg>
                            </button>
                            <button id="yd-pl-template-delete" class="yd-pl-icon-btn-sm" title="Удалить шаблон">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <select id="yd-pl-template-select" class="yd-pl-select"></select>
                </div>

                <!-- Секция: ФИЛЬТРЫ -->
                <div class="yd-pl-section">
                    <div class="yd-pl-section-header">
                        <span class="yd-pl-section-label">ФИЛЬТРЫ</span>
                        <button id="yd-pl-reset-filters" class="yd-pl-icon-btn-sm" title="Сбросить все фильтры">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Домены -->
                    <div class="yd-pl-field-group">
                        <label class="yd-pl-label-sm">Паттерны доменов</label>
                        <textarea id="yd-pl-domain-patterns" class="yd-pl-textarea" rows="2" 
                            placeholder="com., dsp, puzzle, game...">${settings.filters.domains}</textarea>
                    </div>

                    <!-- Числовые фильтры -->
                    <div class="yd-pl-grid">
                        <div class="yd-pl-field">
                            <label class="yd-pl-label-sm">Мин. кликов</label>
                            <input id="yd-pl-min-clicks" class="yd-pl-input-sm" type="number" min="0" 
                                placeholder="—" value="${settings.filters.minClicks}">
                        </div>
                        <div class="yd-pl-field">
                            <label class="yd-pl-label-sm">Мин. CTR %</label>
                            <input id="yd-pl-min-ctr" class="yd-pl-input-sm" type="number" min="0" step="0.01" 
                                placeholder="—" value="${settings.filters.minCtr}">
                        </div>
                        <div class="yd-pl-field">
                            <label class="yd-pl-label-sm">Макс. CPC ₽</label>
                            <input id="yd-pl-max-cpc" class="yd-pl-input-sm" type="number" min="0" step="0.01" 
                                placeholder="—" value="${settings.filters.maxCpc}">
                        </div>
                        <div class="yd-pl-field">
                            <label class="yd-pl-label-sm">Макс. расход ₽</label>
                            <input id="yd-pl-max-spend" class="yd-pl-input-sm" type="number" min="0" step="0.01" 
                                placeholder="—" value="${settings.filters.maxSpend}">
                        </div>
                    </div>

                    <!-- Режим -->
                    <div class="yd-pl-mode-row">
                        <span class="yd-pl-label-sm">Условия:</span>
                        <div class="yd-pl-toggle-group">
                            <label class="yd-pl-toggle ${settings.mode === 'and' ? 'active' : ''}">
                                <input type="radio" name="yd-pl-mode" value="and" ${settings.mode === 'and' ? 'checked' : ''}>
                                <span>И (все)</span>
                            </label>
                            <label class="yd-pl-toggle ${settings.mode === 'or' ? 'active' : ''}">
                                <input type="radio" name="yd-pl-mode" value="or" ${settings.mode === 'or' ? 'checked' : ''}>
                                <span>ИЛИ (любое)</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Предпросмотр -->
                <div id="yd-pl-preview" class="yd-pl-preview">Введите фильтры...</div>
            </div>

            <!-- Footer -->
            <div class="yd-pl-footer">
                <button id="yd-pl-apply" class="yd-pl-btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Выделить</span>
                </button>
                <button id="yd-pl-clear" class="yd-pl-btn-secondary" title="Снять все галочки">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <!-- Help Tooltip -->
            <div id="yd-pl-help-tooltip" class="yd-pl-help-tooltip" style="display:none;">
                <div class="yd-pl-help-title">Горячие клавиши</div>
                <div class="yd-pl-help-row"><kbd>Alt+P</kbd> — выделить по фильтрам</div>
                <div class="yd-pl-help-row"><kbd>Alt+Shift+P</kbd> — снять все галочки</div>
                <div class="yd-pl-help-divider"></div>
                <div class="yd-pl-help-row">com. — строго с начала домена</div>
                <div class="yd-pl-help-row">dsp — вхождение в любом месте</div>
            </div>

            <!-- Resize handles -->
            <div class="yd-pl-resize-handle yd-pl-resize-n" data-resize="n"></div>
            <div class="yd-pl-resize-handle yd-pl-resize-s" data-resize="s"></div>
            <div class="yd-pl-resize-handle yd-pl-resize-e" data-resize="e"></div>
            <div class="yd-pl-resize-handle yd-pl-resize-w" data-resize="w"></div>
            <div class="yd-pl-resize-handle yd-pl-resize-se" data-resize="se"></div>
        `;

        document.body.appendChild(panel);

        // Применить размер и позицию
        panel.style.width = settings.panelSize.width + 'px';
        panel.style.height = settings.panelSize.height + 'px';
        panel.style.top = settings.panelPosition.top;
        panel.style.right = settings.panelPosition.right;

        // Floating Pill
        const pill = document.createElement('div');
        pill.id = 'yd-pl-pill';
        pill.className = 'yd-pl-pill';
        pill.style.display = 'none';
        pill.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 100 100">
                <circle cx="38" cy="38" r="28" fill="none" stroke="#205598" stroke-width="8"/>
                <line x1="58" y1="58" x2="85" y2="85" stroke="#205598" stroke-width="10" stroke-linecap="round"/>
            </svg>
            <span>Площадки</span>
            <span id="yd-pl-pill-count" class="yd-pl-pill-badge">0</span>
        `;
        document.body.appendChild(pill);

        // Инициализация
        updateTemplateSelect();
        updateStats();
        setTimeout(updatePreview, 100);

        // Event Listeners
        setupEventListeners(panel, pill);
        makeDraggable(panel, document.getElementById('yd-pl-panel-header'));
        makeDraggable(pill, pill);
        makeResizable(panel);
    }

    function setupEventListeners(panel, pill) {
        // Toggle panel
        document.getElementById('yd-pl-panel-toggle').addEventListener('click', () => {
            panel.classList.add('yd-pl-panel-minimizing');
            setTimeout(() => {
                panel.style.display = 'none';
                panel.classList.remove('yd-pl-panel-minimizing');
                pill.style.display = 'flex';
                updatePillCount();
            }, 200);
        });

        pill.addEventListener('click', () => {
            pill.style.display = 'none';
            panel.style.display = 'flex';
        });

        // Help tooltip
        const helpBtn = document.getElementById('yd-pl-help-btn');
        const helpTooltip = document.getElementById('yd-pl-help-tooltip');
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            helpTooltip.style.display = helpTooltip.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', () => {
            helpTooltip.style.display = 'none';
        });

        // Template select
        document.getElementById('yd-pl-template-select').addEventListener('change', (e) => {
            const name = e.target.value;
            settings.currentTemplate = name;
            document.getElementById('yd-pl-domain-patterns').value = settings.templates[name] || '';
            saveSettings();
            updatePreview();
        });

        // Template save
        document.getElementById('yd-pl-template-save').addEventListener('click', () => {
            const name = prompt('Название шаблона:', 'Мой шаблон');
            if (!name) return;
            settings.templates[name] = document.getElementById('yd-pl-domain-patterns').value;
            settings.currentTemplate = name;
            saveSettings();
            updateTemplateSelect();
            showNotification(`Шаблон "${name}" сохранён`, 'success');
        });

        // Template delete
        document.getElementById('yd-pl-template-delete').addEventListener('click', () => {
            const name = document.getElementById('yd-pl-template-select').value;
            if (Object.keys(DEFAULT_TEMPLATES).includes(name)) {
                showNotification('Встроенные шаблоны нельзя удалить', 'error');
                return;
            }
            if (!confirm(`Удалить шаблон "${name}"?`)) return;
            delete settings.templates[name];
            settings.currentTemplate = Object.keys(settings.templates)[0];
            saveSettings();
            updateTemplateSelect();
            showNotification(`Шаблон "${name}" удалён`, 'info');
        });

        // Reset filters
        document.getElementById('yd-pl-reset-filters').addEventListener('click', resetAllFilters);

        // Main buttons
        document.getElementById('yd-pl-apply').addEventListener('click', selectPlacements);
        document.getElementById('yd-pl-clear').addEventListener('click', clearAllSelections);

        // Toggle mode styling
        document.querySelectorAll('input[name="yd-pl-mode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.yd-pl-toggle').forEach(t => t.classList.remove('active'));
                radio.closest('.yd-pl-toggle').classList.add('active');
                updatePreview();
            });
        });

        // Live preview on input change
        ['yd-pl-domain-patterns', 'yd-pl-min-clicks', 'yd-pl-min-ctr', 'yd-pl-max-cpc', 'yd-pl-max-spend'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', debounce(updatePreview, 300));
            }
        });

        // Stats observer
        const tbody = document.querySelector('tbody');
        if (tbody) {
            new MutationObserver(() => {
                updateStats();
                updatePreview();
            }).observe(tbody, { childList: true, subtree: true, attributes: true });
        }
    }

    function updatePillCount() {
        const checked = document.querySelectorAll('tbody tr input[type="checkbox"]:checked').length;
        const el = document.getElementById('yd-pl-pill-count');
        if (el) el.textContent = checked;
    }

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    // ==================== DRAG & RESIZE ====================
    function makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.style.left = (startLeft + e.clientX - startX) + 'px';
            element.style.top = (startTop + e.clientY - startY) + 'px';
            element.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging && element.id === 'yd-pl-panel') {
                settings.panelPosition = {
                    top: element.style.top,
                    right: 'auto',
                    left: element.style.left
                };
                saveSettings();
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
    }

    function makeResizable(panel) {
        const handles = panel.querySelectorAll('.yd-pl-resize-handle');
        let isResizing = false;
        let startX, startY, startW, startH, startL, startT, direction;

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isResizing = true;
                direction = handle.dataset.resize;
                startX = e.clientX;
                startY = e.clientY;
                const rect = panel.getBoundingClientRect();
                startW = rect.width;
                startH = rect.height;
                startL = rect.left;
                startT = rect.top;
                document.body.style.userSelect = 'none';
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (direction.includes('e')) panel.style.width = Math.max(280, startW + dx) + 'px';
            if (direction.includes('w')) {
                panel.style.width = Math.max(280, startW - dx) + 'px';
                panel.style.left = (startL + dx) + 'px';
            }
            if (direction.includes('s')) panel.style.height = Math.max(300, startH + dy) + 'px';
            if (direction.includes('n')) {
                panel.style.height = Math.max(300, startH - dy) + 'px';
                panel.style.top = (startT + dy) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                settings.panelSize = {
                    width: parseInt(panel.style.width),
                    height: parseInt(panel.style.height)
                };
                saveSettings();
            }
            isResizing = false;
            document.body.style.userSelect = '';
        });
    }

    // ==================== СТИЛИ ====================
    function injectStyles() {
        if (document.getElementById('yd-pl-styles')) return;

        const style = document.createElement('style');
        style.id = 'yd-pl-styles';
        style.textContent = `
            /* ===== ПАНЕЛЬ ПЛОЩАДОК ===== */
            #yd-pl-panel {
                position: fixed;
                z-index: 9999999;
                background: #ffffff;
                border: 1px solid #E1E4E8;
                border-radius: 12px;
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', system-ui, sans-serif;
                font-size: 14px;
                color: #333;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                min-width: 280px;
                min-height: 300px;
            }

            #yd-pl-panel.yd-pl-panel-minimizing {
                transform: scale(0.3);
                opacity: 0;
                transition: all 0.3s ease;
            }

            #yd-pl-panel * { box-sizing: border-box; }

            /* Header - идентичен модулю запросов */
            .yd-pl-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
                border-bottom: 1px solid #E1E4E8;
                cursor: grab;
                flex-shrink: 0;
            }

            .yd-pl-header:active { cursor: grabbing; }

            .yd-pl-header-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .yd-pl-logo { flex-shrink: 0; }

            .yd-pl-title-group {
                display: flex;
                flex-direction: column;
                line-height: 1.2;
            }

            .yd-pl-title {
                font-weight: 600;
                font-size: 14px;
                color: #205598;
            }

            .yd-pl-subtitle {
                font-size: 10px;
                color: #9CA3AF;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .yd-pl-header-right {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .yd-pl-badge {
                font-size: 11px;
                color: #205598;
                background: #E3F2FD;
                padding: 3px 8px;
                border-radius: 10px;
                font-weight: 600;
            }

            .yd-pl-icon-btn {
                background: none;
                border: none;
                padding: 6px;
                cursor: pointer;
                color: #9CA3AF;
                border-radius: 6px;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .yd-pl-icon-btn:hover {
                background: rgba(32, 85, 152, 0.1);
                color: #205598;
            }

            .yd-pl-icon-btn-sm {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: #9CA3AF;
                border-radius: 4px;
                transition: all 0.15s ease;
            }

            .yd-pl-icon-btn-sm:hover {
                background: rgba(32, 85, 152, 0.1);
                color: #205598;
            }

            /* Body */
            .yd-pl-body {
                flex: 1;
                padding: 12px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .yd-pl-section {
                background: #FAFBFC;
                border: 1px solid #E1E4E8;
                border-radius: 8px;
                padding: 10px;
            }

            .yd-pl-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .yd-pl-section-label {
                font-size: 10px;
                font-weight: 700;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .yd-pl-section-actions {
                display: flex;
                gap: 4px;
            }

            .yd-pl-label-sm {
                font-size: 11px;
                color: #6b7280;
                margin-bottom: 4px;
                display: block;
            }

            .yd-pl-select {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #E1E4E8;
                border-radius: 6px;
                font-size: 13px;
                background: #fff;
                cursor: pointer;
            }

            .yd-pl-select:focus {
                outline: none;
                border-color: #205598;
                box-shadow: 0 0 0 3px rgba(32, 85, 152, 0.1);
            }

            .yd-pl-field-group {
                margin-bottom: 10px;
            }

            .yd-pl-textarea {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #E1E4E8;
                border-radius: 6px;
                font-size: 12px;
                font-family: inherit;
                resize: vertical;
                min-height: 50px;
            }

            .yd-pl-textarea:focus {
                outline: none;
                border-color: #205598;
                box-shadow: 0 0 0 3px rgba(32, 85, 152, 0.1);
            }

            .yd-pl-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 10px;
            }

            .yd-pl-field { }

            .yd-pl-input-sm {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #E1E4E8;
                border-radius: 6px;
                font-size: 12px;
            }

            .yd-pl-input-sm:focus {
                outline: none;
                border-color: #205598;
                box-shadow: 0 0 0 3px rgba(32, 85, 152, 0.1);
            }

            .yd-pl-mode-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .yd-pl-toggle-group {
                display: flex;
                background: #E5E7EB;
                border-radius: 6px;
                padding: 2px;
            }

            .yd-pl-toggle {
                padding: 4px 10px;
                font-size: 11px;
                color: #6b7280;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .yd-pl-toggle input { display: none; }

            .yd-pl-toggle.active {
                background: #fff;
                color: #205598;
                font-weight: 600;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            .yd-pl-preview {
                text-align: center;
                padding: 8px;
                font-size: 12px;
                color: #9CA3AF;
                background: #F9FAFB;
                border-radius: 6px;
            }

            .yd-pl-preview.yd-pl-preview-active {
                color: #28a745;
                background: #E8F5E9;
                font-weight: 500;
            }

            /* Footer - идентичен модулю запросов */
            .yd-pl-footer {
                display: flex;
                gap: 8px;
                padding: 12px;
                border-top: 1px solid #E1E4E8;
                background: #FAFBFC;
                flex-shrink: 0;
            }

            .yd-pl-btn-primary {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px 16px;
                background: linear-gradient(135deg, #205598, #1a4578);
                color: #fff;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .yd-pl-btn-primary:hover {
                background: linear-gradient(135deg, #1a4578, #153a60);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(32, 85, 152, 0.3);
            }

            .yd-pl-btn-secondary {
                padding: 10px 12px;
                background: #F3F4F6;
                color: #6b7280;
                border: 1px solid #E1E4E8;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .yd-pl-btn-secondary:hover {
                background: #E5E7EB;
                color: #333;
            }

            /* Help Tooltip */
            .yd-pl-help-tooltip {
                position: absolute;
                top: 50px;
                right: 10px;
                background: #1F2937;
                color: #fff;
                padding: 12px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 10;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                min-width: 200px;
            }

            .yd-pl-help-title {
                font-weight: 600;
                margin-bottom: 8px;
                color: #E5E7EB;
            }

            .yd-pl-help-row {
                margin-bottom: 4px;
                color: #D1D5DB;
            }

            .yd-pl-help-row kbd {
                background: #374151;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                margin-right: 6px;
            }

            .yd-pl-help-divider {
                height: 1px;
                background: #374151;
                margin: 8px 0;
            }

            /* Resize handles */
            .yd-pl-resize-handle {
                position: absolute;
                background: transparent;
            }

            .yd-pl-resize-n { top: 0; left: 10px; right: 10px; height: 6px; cursor: n-resize; }
            .yd-pl-resize-s { bottom: 0; left: 10px; right: 10px; height: 6px; cursor: s-resize; }
            .yd-pl-resize-e { right: 0; top: 10px; bottom: 10px; width: 6px; cursor: e-resize; }
            .yd-pl-resize-w { left: 0; top: 10px; bottom: 10px; width: 6px; cursor: w-resize; }
            .yd-pl-resize-se { right: 0; bottom: 0; width: 12px; height: 12px; cursor: se-resize; }

            /* Floating Pill */
            .yd-pl-pill {
                position: fixed;
                bottom: 80px;
                right: 20px;
                z-index: 9999998;
                background: #ffffff;
                border: 1px solid #E1E4E8;
                border-radius: 20px;
                padding: 8px 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                color: #205598;
                transition: all 0.2s ease;
            }

            .yd-pl-pill:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            }

            .yd-pl-pill-badge {
                background: #E46924;
                color: #fff;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: 600;
            }

            /* Notification */
            .yd-pl-notification {
                position: fixed;
                bottom: 120px;
                right: 20px;
                z-index: 99999999;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                animation: yd-pl-notify-in 0.3s ease;
            }

            .yd-pl-notification-success { background: #10B981; color: #fff; }
            .yd-pl-notification-error { background: #EF4444; color: #fff; }
            .yd-pl-notification-info { background: #3B82F6; color: #fff; }

            .yd-pl-notification-hide {
                animation: yd-pl-notify-out 0.3s ease forwards;
            }

            @keyframes yd-pl-notify-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes yd-pl-notify-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            /* Scrollbar */
            .yd-pl-body::-webkit-scrollbar { width: 6px; }
            .yd-pl-body::-webkit-scrollbar-track { background: transparent; }
            .yd-pl-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
        `;

        document.head.appendChild(style);
    }

    // ==================== ГОРЯЧИЕ КЛАВИШИ ====================
    document.addEventListener('keydown', e => {
        if (e.altKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (e.shiftKey) {
                clearAllSelections();
            } else {
                selectPlacements();
            }
        }
    });

    // ==================== ЗАПУСК ====================
    function init() {
        if (document.body) {
            createControlPanel();
            console.log("[YD-PL] ✅ Модуль площадок загружен (v2.0)");
        } else {
            setTimeout(init, 200);
        }
    }

    init();

})();

// ==================== МОДУЛЬ: СПИСОК КАМПАНИЙ ====================
// Добавляет пункт "Статистика" с popover-меню (эталон Яндекс Директа)
// Работает на странице списка кампаний
(function () {
    'use strict';

    // === Проверка URL: страница списка кампаний ===
    const url = location.href.toLowerCase();

    // Активация: содержит /dna/ или /wizard/
    if (!url.includes('/dna/') && !url.includes('/wizard/') && !url.includes('direct.yandex.ru')) {
        return;
    }

    // Исключения: страницы редактирования
    if (url.includes('/edit') || url.includes('/groups') || url.includes('/ads')) {
        return;
    }

    // Исключения: страницы статистики
    if (url.includes('stat_type=') || url.includes('cmd=showcampstat') || url.includes('cmd=showstat')) {
        return;
    }

    console.log("[YD-CL] 🚀 Модуль списка кампаний инициализируется...");

    // ==================== СОСТОЯНИЕ ====================
    let activePopover = null;
    let activeTriggerId = null;

    // ==================== УТИЛИТЫ ДЛЯ ДАТ ====================
    function getDateRange() {
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 30);

        return {
            d1: fromDate.getDate(),
            m1: fromDate.getMonth() + 1,
            y1: fromDate.getFullYear(),
            d2: today.getDate(),
            m2: today.getMonth() + 1,
            y2: today.getFullYear()
        };
    }

    function buildStatsUrl(cid, ulogin, statType) {
        const dates = getDateRange();
        const baseUrl = 'https://direct.yandex.ru/registered/main.pl';

        if (statType === 'pages') {
            return `${baseUrl}?cmd=showCampStat&stat_type=pages&group=none&with_nds=0&cid=${cid}&ulogin=${ulogin}&y1=${dates.y1}&m1=${dates.m1}&d1=${dates.d1}&y2=${dates.y2}&m2=${dates.m2}&d2=${dates.d2}&isStat=1`;
        } else {
            return `${baseUrl}?cmd=showStat&stat_type=search_queries&cid=${cid}&ulogin=${ulogin}&date_from=${dates.y1}-${String(dates.m1).padStart(2, '0')}-${String(dates.d1).padStart(2, '0')}&date_to=${dates.y2}-${String(dates.m2).padStart(2, '0')}-${String(dates.d2).padStart(2, '0')}&group_by=day&goal_id=0&attribution=LAC&page_size=100`;
        }
    }

    // ==================== ИЗВЛЕЧЕНИЕ ДАННЫХ КАМПАНИИ ====================
    function extractCampaignInfo(cell) {
        const links = cell.querySelectorAll('a[href]');
        let cid = null;
        let ulogin = null;

        for (const link of links) {
            const href = link.getAttribute('href') || '';

            const cidMatch = href.match(/cid=(\d+)/i) || href.match(/\/(\d+)\/?$/);
            if (cidMatch) cid = cidMatch[1];

            const uloginMatch = href.match(/ulogin=([^&]+)/i);
            if (uloginMatch) ulogin = uloginMatch[1];
        }

        if (!ulogin) {
            ulogin = new URLSearchParams(location.search).get('ulogin') || '';
        }

        if (!cid) {
            const testId = cell.getAttribute('data-testid') || '';
            const cidFromTestId = testId.match(/(\d+)_name-with-links/);
            if (cidFromTestId) cid = cidFromTestId[1];
        }

        return { cid, ulogin };
    }

    // ==================== POPOVER ====================
    function closePopover() {
        if (activePopover) {
            activePopover.remove();
            activePopover = null;
            activeTriggerId = null;
        }
    }

    function createPopover(trigger, cid, ulogin) {
        const popover = document.createElement('div');
        popover.className = 'yd-cl-popover';
        popover.innerHTML = `
            <a href="${buildStatsUrl(cid, ulogin, 'pages')}" target="_blank" class="yd-cl-popover-item">
                По площадкам
            </a>
            <a href="${buildStatsUrl(cid, ulogin, 'queries')}" target="_blank" class="yd-cl-popover-item">
                Поисковые запросы
            </a>
        `;

        document.body.appendChild(popover);

        // Позиционирование относительно триггера
        const rect = trigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();

        let top = rect.bottom + window.scrollY + 4;
        let left = rect.left + window.scrollX;

        // Проверка выхода за правый край
        if (left + popoverRect.width > window.innerWidth) {
            left = window.innerWidth - popoverRect.width - 8;
        }

        popover.style.top = top + 'px';
        popover.style.left = left + 'px';

        // Анимация появления
        requestAnimationFrame(() => {
            popover.classList.add('yd-cl-popover-visible');
        });

        return popover;
    }

    function handleTriggerClick(e, trigger, cid, ulogin) {
        e.preventDefault();
        e.stopPropagation();

        const triggerId = `${cid}_trigger`;

        // Если этот же popover открыт — закрываем
        if (activeTriggerId === triggerId) {
            closePopover();
            return;
        }

        // Закрываем предыдущий
        closePopover();

        // Открываем новый
        activePopover = createPopover(trigger, cid, ulogin);
        activeTriggerId = triggerId;
    }

    // ==================== СОЗДАНИЕ ТРИГГЕРА ====================
    function createStatsTrigger(cell) {
        const { cid, ulogin } = extractCampaignInfo(cell);

        if (!cid) {
            return null;
        }

        // Триггер — только текст, как у Яндекса
        const trigger = document.createElement('span');
        trigger.className = 'dc-Link dc-Link_color_supplementary';
        trigger.setAttribute('role', 'link');
        trigger.setAttribute('data-yd-cl-stats-trigger', 'true');
        trigger.setAttribute('data-cid', cid);
        trigger.textContent = 'Статистика';
        trigger.style.cursor = 'pointer';
        trigger.style.marginLeft = '8px'; // Отступ от предыдущего элемента

        trigger.addEventListener('click', (e) => {
            handleTriggerClick(e, trigger, cid, ulogin);
        });

        return trigger;
    }

    // ==================== ОБРАБОТКА ЯЧЕЕК ====================
    function processCell(cell) {
        // Уже добавлен кастомный триггер
        if (cell.querySelector('[data-yd-cl-stats-trigger]')) {
            return;
        }

        // Есть нативный триггер Яндекса
        if (cell.querySelector('[data-testid="CampaignStatisticsTrigger"]')) {
            return;
        }

        // Ищем ссылки "Перейти" и "Редактировать"
        const allLinks = cell.querySelectorAll('.dc-Link');
        let lastActionLink = null;

        for (const link of allLinks) {
            const text = link.textContent.trim();
            if (text === 'Перейти' || text === 'Редактировать') {
                lastActionLink = link; // Запоминаем последнюю
            }
        }

        if (!lastActionLink) {
            return;
        }

        // Добавляем триггер ПОСЛЕ последней ссылки действия
        const trigger = createStatsTrigger(cell);
        if (trigger) {
            // Вставляем после lastActionLink
            if (lastActionLink.nextSibling) {
                lastActionLink.parentNode.insertBefore(trigger, lastActionLink.nextSibling);
            } else {
                lastActionLink.parentNode.appendChild(trigger);
            }

            // Добавляем класс для расширения ширины ячейки
            cell.classList.add('yd-cl-expanded-cell');
        }
    }



    // ==================== НАБЛЮДАТЕЛЬ ====================
    function scanAndProcess() {
        // Проверяем наличие Grid.Row — признак страницы списка
        const rows = document.querySelectorAll('[data-testid^="Grid.Row-"]');
        if (rows.length === 0) {
            return;
        }

        // Ищем ячейки с названиями кампаний
        const cells = document.querySelectorAll('[data-testid$="_name-with-links"]');

        cells.forEach(cell => {
            processCell(cell);
        });
    }

    function setupObserver() {
        const observer = new MutationObserver(() => {
            clearTimeout(setupObserver._timeout);
            setupObserver._timeout = setTimeout(scanAndProcess, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    // ==================== ГЛОБАЛЬНЫЕ СОБЫТИЯ ====================
    function setupGlobalEvents() {
        // Закрытие popover по клику вне
        document.addEventListener('click', (e) => {
            if (!activePopover) return;

            // Клик внутри popover — не закрываем (ссылки сами откроются)
            if (activePopover.contains(e.target)) {
                return;
            }

            // Клик по триггеру обрабатывается отдельно
            if (e.target.hasAttribute('data-yd-cl-stats-trigger')) {
                return;
            }

            closePopover();
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closePopover();
            }
        });

        // Закрытие при скролле
        window.addEventListener('scroll', closePopover, { passive: true });
    }

    // ==================== СТИЛИ ====================
    function injectStyles() {
        if (document.getElementById('yd-cl-styles')) return;

        const style = document.createElement('style');
        style.id = 'yd-cl-styles';
        style.textContent = `
            /* Popover — рендерится в body */
            .yd-cl-popover {
                position: absolute;
                z-index: 10000;
                background: #fff;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                padding: 4px 0;
                min-width: 180px;
                opacity: 0;
                transform: translateY(-4px);
                transition: opacity 0.15s ease, transform 0.15s ease;
            }

            .yd-cl-popover-visible {
                opacity: 1;
                transform: translateY(0);
            }

            /* Пункты popover */
            .yd-cl-popover-item {
                display: block;
                padding: 10px 16px;
                color: #000;
                text-decoration: none;
                font-size: 13px;
                line-height: 18px;
                white-space: nowrap;
                transition: background-color 0.1s ease;
            }

            .yd-cl-popover-item:hover {
                background-color: #f5f5f5;
                text-decoration: none;
            }

            .yd-cl-popover-item:first-child {
                border-radius: 6px 6px 0 0;
            }

            .yd-cl-popover-item:last-child {
                border-radius: 0 0 6px 6px;
            }

            /* Расширение ВСЕХ ячеек столбца "Название" для консистентной ширины */
            /* Ячейки данных */
            [data-testid$="_name-with-links"] {
                min-width: 280px !important;
            }

            /* Заголовок столбца "Название" */
            [data-testid="Grid.Header-name"],
            [data-testid*="Header"][data-testid*="name"] {
                min-width: 280px !important;
            }

            /* Контейнер действий — nowrap для одной строки */
            [data-testid$="_name-with-links"] .dc-Stack_type_horizontal {
                flex-wrap: nowrap !important;
                white-space: nowrap;
            }
        `;


        document.head.appendChild(style);
    }

    // ==================== ИНИЦИАЛИЗАЦИЯ ====================
    function init() {
        if (!document.body) {
            setTimeout(init, 200);
            return;
        }

        injectStyles();
        setupGlobalEvents();
        setupObserver();

        // Сканирование с задержками для React
        setTimeout(scanAndProcess, 500);
        setTimeout(scanAndProcess, 1500);
        setTimeout(scanAndProcess, 3000);

        console.log("[YD-CL] ✅ Модуль списка кампаний загружен (v2.0 — эталон)");
    }

    init();

})();
























