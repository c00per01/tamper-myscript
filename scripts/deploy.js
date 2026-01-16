/**
 * DEPLOY.JS - Единый скрипт деплоя
 * ================================
 * 
 * Что делает:
 * 1. Проверяет синтаксис myscript.user.js
 * 2. Автоматически увеличивает patch-версию (если не --no-bump)
 * 3. Синхронизирует версию во всех файлах
 * 4. Создаёт content.js для Chrome Extension
 * 5. Собирает ZIP для Chrome Web Store
 * 6. Коммитит и пушит в GitHub (для Tampermonkey)
 * 
 * Использование:
 *   npm run deploy          - bump версии + сборка + git push
 *   npm run deploy:nobump   - сборка БЕЗ bump версии + git push
 *   npm run build           - только локальная сборка без git
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    step: (num, msg) => console.log(`\n${colors.bright}[Шаг ${num}]${colors.reset} ${msg}`),
    header: (msg) => {
        console.log('\n' + '═'.repeat(60));
        console.log(`  ${colors.bright}${msg}${colors.reset}`);
        console.log('═'.repeat(60));
    }
};

// Параметры
const args = process.argv.slice(2);
const noBump = args.includes('--no-bump');
const noPush = args.includes('--no-push');
const dryRun = args.includes('--dry-run');

log.header('🚀 DEPLOY - Автоматический деплой');

if (noBump) log.warn('Режим --no-bump: версия НЕ будет увеличена');
if (noPush) log.warn('Режим --no-push: git push НЕ будет выполнен');
if (dryRun) log.warn('Режим --dry-run: изменения НЕ будут сохранены');

// ===========================================
// ШАГ 1: ПРОВЕРКА СИНТАКСИСА
// ===========================================
log.step(1, 'Проверка синтаксиса JavaScript...');

try {
    execSync('node -c myscript.user.js', { stdio: 'pipe' });
    log.success('Синтаксис OK');
} catch (e) {
    log.error('Синтаксическая ошибка в myscript.user.js!');
    console.log(e.stderr?.toString() || e.message);
    process.exit(1);
}

// ===========================================
// ШАГ 2: ЧТЕНИЕ И ОБНОВЛЕНИЕ ВЕРСИИ
// ===========================================
log.step(2, 'Управление версией...');

let source = fs.readFileSync('myscript.user.js', 'utf8');
const versionMatch = source.match(/@version\s+(\d+)\.(\d+)\.(\d+)/);

if (!versionMatch) {
    log.error('Не найдена версия в формате @version X.Y.Z');
    process.exit(1);
}

let [, major, minor, patch] = versionMatch.map((v, i) => i === 0 ? v : parseInt(v));
const oldVersion = `${major}.${minor}.${patch}`;

if (!noBump) {
    patch += 1;
    const newVersion = `${major}.${minor}.${patch}`;
    source = source.replace(/@version\s+\S+/, `@version ${newVersion}`);
    log.success(`Версия: ${oldVersion} → ${newVersion}`);
} else {
    log.info(`Версия остаётся: ${oldVersion}`);
}

const version = `${major}.${minor}.${patch}`;

// ===========================================
// ШАГ 3: СОХРАНЕНИЕ myscript.user.js
// ===========================================
log.step(3, 'Сохранение myscript.user.js...');

if (!dryRun) {
    fs.writeFileSync('myscript.user.js', source, 'utf8');
    log.success(`myscript.user.js сохранён (v${version})`);
} else {
    log.info('[DRY-RUN] myscript.user.js НЕ сохранён');
}

// ===========================================
// ШАГ 4: СОЗДАНИЕ content.js
// ===========================================
log.step(4, 'Создание content.js для Chrome Extension...');

const cleanedSource = source.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\r?\n?/, '');

if (!dryRun) {
    fs.writeFileSync('content.js', cleanedSource, 'utf8');
    log.success(`content.js создан (${(cleanedSource.length / 1024).toFixed(1)} KB)`);
} else {
    log.info('[DRY-RUN] content.js НЕ создан');
}

// ===========================================
// ШАГ 5: ОБНОВЛЕНИЕ manifest.json
// ===========================================
log.step(5, 'Синхронизация manifest.json...');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const oldManifestVersion = manifest.version;

// Chrome Web Store версия (major >= 1)
const storeVersion = major === 0 ? `1.${minor}.${patch}` : version;

if (manifest.version !== storeVersion) {
    manifest.version = storeVersion;
    if (!dryRun) {
        fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 4), 'utf8');
        log.success(`manifest.json: ${oldManifestVersion} → ${storeVersion}`);
    } else {
        log.info(`[DRY-RUN] manifest.json: ${oldManifestVersion} → ${storeVersion}`);
    }
} else {
    log.success(`manifest.json уже синхронизирован (${storeVersion})`);
}

// ===========================================
// ШАГ 6: СОЗДАНИЕ ZIP ДЛЯ CHROME WEB STORE
// ===========================================
log.step(6, 'Создание ZIP для Chrome Web Store...');

const filesToInclude = [
    'manifest.json',
    'content.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    '_locales/ru/messages.json',
    '_locales/en/messages.json'
];

// Проверяем файлы
for (const file of filesToInclude) {
    if (!fs.existsSync(file)) {
        log.error(`Файл не найден: ${file}`);
        process.exit(1);
    }
}

if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

const zipPath = path.join('dist', 'extension-latest.zip');
if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
}

if (!dryRun) {
    // Создаём временную папку
    const tempDir = 'dist/temp_ext';
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'icons'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '_locales', 'ru'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '_locales', 'en'), { recursive: true });

    for (const file of filesToInclude) {
        fs.copyFileSync(file, path.join(tempDir, file));
    }

    try {
        execSync(`powershell Compress-Archive -Path "${tempDir}/*" -DestinationPath "${zipPath}" -Force`, { stdio: 'pipe' });
        const stats = fs.statSync(zipPath);
        log.success(`ZIP создан: ${zipPath} (${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
        log.error('Ошибка создания ZIP: ' + e.message);
        process.exit(1);
    }

    fs.rmSync(tempDir, { recursive: true });

    // VERSION.txt
    const versionInfo = `Версия: ${version}
Store версия: ${storeVersion}
Дата сборки: ${new Date().toLocaleString('ru-RU')}
`;
    fs.writeFileSync('dist/VERSION.txt', versionInfo, 'utf8');
} else {
    log.info('[DRY-RUN] ZIP НЕ создан');
}

// ===========================================
// ШАГ 7: GIT COMMIT & PUSH
// ===========================================
if (!noPush && !dryRun) {
    log.step(7, 'Git: коммит и push в GitHub...');

    try {
        // Проверяем есть ли изменения
        const status = execSync('git status --porcelain', { encoding: 'utf8' });

        if (status.includes('myscript.user.js') || status.includes('manifest.json') || status.includes('content.js')) {
            execSync('git add myscript.user.js manifest.json content.js', { stdio: 'pipe' });
            execSync(`git commit -m "deploy: v${version}"`, { stdio: 'pipe' });
            log.success(`Коммит создан: "deploy: v${version}"`);

            execSync('git push origin main', { stdio: 'pipe' });
            log.success('Push в GitHub выполнен');
        } else {
            log.info('Нет изменений для коммита');
        }
    } catch (e) {
        log.error('Ошибка Git: ' + (e.stderr?.toString() || e.message));
        process.exit(1);
    }
} else if (noPush) {
    log.step(7, 'Git: пропущен (--no-push)');
} else {
    log.step(7, '[DRY-RUN] Git: пропущен');
}

// ===========================================
// ИТОГ
// ===========================================
log.header('✅ ДЕПЛОЙ ЗАВЕРШЁН');

console.log(`
   📦 Версия: ${colors.bright}${version}${colors.reset}
   
   Файлы:
   • myscript.user.js - для Tampermonkey (GitHub)
   • content.js - для Chrome Extension  
   • dist/extension-latest.zip - для Chrome Web Store
   
   Tampermonkey URL:
   ${colors.cyan}https://raw.githubusercontent.com/c00per01/tamper-myscript/main/myscript.user.js${colors.reset}
   
   Для обновления в Tampermonkey:
   1. Tampermonkey → Dashboard → [скрипт] → Settings
   2. Нажать "Check for updates"
`);
