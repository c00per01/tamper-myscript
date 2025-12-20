const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Сначала обновляем content.js
console.log('Step 1: Building content.js...');
const source = fs.readFileSync('myscript.user.js', 'utf8');
const cleanedSource = source.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\r?\n?/, '');
fs.writeFileSync('content.js', cleanedSource, 'utf8');
console.log(`Created content.js (${cleanedSource.length} bytes)`);

// 2. Получаем версию из manifest.json
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;
console.log(`Extension version: ${version}`);

// 3. Список файлов для включения в архив
const filesToInclude = [
    'manifest.json',
    'content.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    '_locales/ru/messages.json',
    '_locales/en/messages.json'
];

// 4. Проверяем что все файлы существуют
console.log('\nStep 2: Checking files...');
for (const file of filesToInclude) {
    if (!fs.existsSync(file)) {
        console.error(`ERROR: File not found: ${file}`);
        process.exit(1);
    }
    console.log(`  ✓ ${file}`);
}

// 5. Создаём папку dist если её нет
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// 6. Создаём ZIP-архив с помощью PowerShell
const zipName = `yandex-direct-helper-v${version}.zip`;
const zipPath = path.join('dist', zipName);

// Удаляем старый архив если есть
if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
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
    console.log(`\n✅ Created: ${zipPath}`);

    // Получаем размер архива
    const stats = fs.statSync(zipPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
} catch (e) {
    console.error('Error creating ZIP:', e.message);
}

// Удаляем временную папку
fs.rmSync(tempDir, { recursive: true });

console.log('\n📦 Extension is ready for upload to Chrome Web Store and Firefox Add-ons!');
console.log('\nNext steps:');
console.log('1. Chrome: https://chrome.google.com/webstore/devconsole');
console.log('2. Firefox: https://addons.mozilla.org/developers/');
