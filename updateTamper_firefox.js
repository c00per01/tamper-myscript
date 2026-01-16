const { firefox } = require('playwright');

(async () => {
    // Используем проверенный рабочий профиль
    const userDataDir = 'C:\\projects\\tamper-myscript\\firefox_profile';
    const rawUrl = 'https://raw.githubusercontent.com/c00per01/tamper-myscript/main/myscript.user.js'; // Публичная ссылка на GitHub

    console.log('--- RUNNING UPDATE (BACKGROUND MODE) ---');

    let context;
    try {
        context = await firefox.launchPersistentContext(userDataDir, {
            headless: true,
            acceptDownloads: true,
            args: ['--start-minimized'] // Запуск в свернутом режиме
        });

        const page = await context.newPage();

        // Обработчик диалоговых окон (Tampermonkey может использовать их для подтверждения)
        page.on('dialog', async (dialog) => {
            console.log('Dialog detected:', dialog.message());
            try {
                await dialog.accept(); // Принимает диалог (OK/Update)
                console.log('Dialog accepted.');
            } catch (err) {
                console.error('Failed to accept dialog:', err);
            }
        });

        console.log('Navigating to GitHub raw file...');

        // --- БЛОК ЗАЩИТЫ ОТ NS_ERROR_ABORT ---
        // Tampermonkey перехватывает запрос к .user.js, что может вызвать ошибку сети в Playwright
        try {
            await page.goto(rawUrl, { waitUntil: 'domcontentloaded' });
        } catch (err) {
            if (err.message.includes('NS_ERROR_ABORT')) {
                console.log('Tampermonkey intercepted the request. Expecting dialog or update...');
            } else {
                console.error('Navigation error:', err.message);
            }
        }
        // ---------------------------------------

        // Даем немного времени на обработку событий (диалога)
        // Но не используем жесткий waitForTimeout для ожидания кнопки
        // Ожидание нужно, чтобы скрипт не закрылся раньше, чем отработает диалог
        await page.waitForTimeout(2000);

        console.log('Closing browser context...');
        await context.close();

    } catch (e) {
        console.error('ERROR during UPDATE:', e.message);
        if (context) {
            try { await context.close(); } catch (z) { }
        }
    }
})();
