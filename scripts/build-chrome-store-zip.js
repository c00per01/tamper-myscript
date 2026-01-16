/**
 * BUILD-CHROME-STORE-ZIP.JS
 * =============================
 * Создаёт ZIP-архив для загрузки в Chrome Web Store / Firefox Add-ons
 * 
 * Что делает:
 * 1. Извлекает версию из myscript.user.js (@version)
 * 2. Конвертирует версию в формат Chrome Web Store (X.Y.Z где X >= 1)
 * 3. Обновляет manifest.json
 * 4. Создаёт content.js (скрипт без заголовка userscript)
 * 5. Упаковывает всё в dist/extension-latest.zip
 * 
 * Использование: npm run store
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('═══════════════════════════════════════════════════════════');
console.log('  📦 BUILD CHROME STORE ZIP');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Читаем myscript.user.js и создаём content.js
console.log('Step 1: Building content.js...');
const source = fs.readFileSync('myscript.user.js', 'utf8');
const cleanedSource = source.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\r?\n?/, '');
fs.writeFileSync('content.js', cleanedSource, 'utf8');
console.log(`   ✓ Created content.js (${cleanedSource.length} bytes)`);

// 2. Извлекаем версию из userscript
const versionMatch = source.match(/@version\s+(\S+)/);
const userscriptVersion = versionMatch ? versionMatch[1] : '0.0.0';
console.log(`   Userscript version: ${userscriptVersion}`);

// 3. Конвертируем в формат Chrome Web Store
// Chrome требует X.Y.Z где X >= 1
// Преобразуем 0.136.2 → 1.136.2 (добавляем 1 к major если он 0)
function toStoreVersion(version) {
    const parts = version.split('.').map(Number);

    // Если первая часть 0, делаем её 1
    if (parts[0] === 0) {
        parts[0] = 1;
    }

    // Chrome поддерживает до 4 частей
    while (parts.length < 3) {
        parts.push(0);
    }

    return parts.slice(0, 4).join('.');
}

const storeVersion = toStoreVersion(userscriptVersion);
console.log(`   Store version: ${storeVersion}`);

// 4. Обновляем manifest.json
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const oldManifestVersion = manifest.version;

if (manifest.version !== storeVersion) {
    manifest.version = storeVersion;
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 4), 'utf8');
    console.log(`   ✓ Updated manifest.json: ${oldManifestVersion} → ${storeVersion}`);
} else {
    console.log(`   ✓ manifest.json already up-to-date`);
}

// 5. Проверяем файлы для архива
console.log('\nStep 2: Checking files...');
const filesToInclude = [
    'manifest.json',
    'content.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    '_locales/ru/messages.json',
    '_locales/en/messages.json'
];

for (const file of filesToInclude) {
    if (!fs.existsSync(file)) {
        console.error(`   ✗ ERROR: File not found: ${file}`);
        process.exit(1);
    }
    console.log(`   ✓ ${file}`);
}

// 6. Создаём папку dist
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// 7. Создаём ZIP
const zipName = 'extension-latest.zip';
const zipPath = path.join('dist', zipName);

if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
    console.log('\n   Removed old extension-latest.zip');
}

console.log(`\nStep 3: Creating ${zipName}...`);

// Копируем файлы во временную папку
const tempDir = 'dist/temp_ext';
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(path.join(tempDir, 'icons'), { recursive: true });
fs.mkdirSync(path.join(tempDir, '_locales', 'ru'), { recursive: true });
fs.mkdirSync(path.join(tempDir, '_locales', 'en'), { recursive: true });

for (const file of filesToInclude) {
    const dest = path.join(tempDir, file);
    fs.copyFileSync(file, dest);
}

// Создаём ZIP
try {
    execSync(`powershell Compress-Archive -Path "${tempDir}/*" -DestinationPath "${zipPath}" -Force`, { stdio: 'inherit' });

    const stats = fs.statSync(zipPath);
    console.log(`\n   ✅ Created: ${zipPath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);

    // Создаём VERSION.txt
    const versionInfo = `Extension Version: ${storeVersion}
Userscript Version: ${userscriptVersion}
Built: ${new Date().toLocaleString('ru-RU')}
File: extension-latest.zip

Ready for upload to:
- Chrome Web Store: https://chrome.google.com/webstore/devconsole
- Firefox Add-ons: https://addons.mozilla.org/developers/
`;
    fs.writeFileSync('dist/VERSION.txt', versionInfo, 'utf8');
    console.log(`   Version info: dist/VERSION.txt`);

} catch (e) {
    console.error('Error creating ZIP:', e.message);
    process.exit(1);
}

// Удаляем временную папку
fs.rmSync(tempDir, { recursive: true });

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ✅ ГОТОВО! Файл готов для загрузки в Chrome Web Store');
console.log('═══════════════════════════════════════════════════════════');
console.log(`\n   📁 dist/extension-latest.zip (v${storeVersion})`);
console.log('\n   1. Chrome: https://chrome.google.com/webstore/devconsole');
console.log('   2. Firefox: https://addons.mozilla.org/developers/\n');
