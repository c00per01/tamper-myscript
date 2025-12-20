const fs = require('fs');
const path = require('path');

// Читаем исходный файл
const source = fs.readFileSync('myscript.user.js', 'utf8');

// Удаляем Tampermonkey-заголовок (строки между // ==UserScript== и // ==/UserScript==)
const cleanedSource = source.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\r?\n?/, '');

// Записываем чистую версию
fs.writeFileSync('content.js', cleanedSource, 'utf8');

console.log('Created content.js (clean version without Tampermonkey headers)');
console.log(`Size: ${cleanedSource.length} bytes`);
