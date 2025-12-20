const sharp = require('sharp');
const path = require('path');

const sourceImage = 'C:/Users/Sergey01/.gemini/antigravity/brain/be614d13-d2ab-4628-86ac-3e33cd75a7bd/extension_icon_1766203405007.png';
const outputDir = './icons';

const sizes = [16, 48, 128];

async function generateIcons() {
    for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon${size}.png`);
        await sharp(sourceImage)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`Created: ${outputPath}`);
    }
    console.log('All icons generated!');
}

generateIcons().catch(console.error);
