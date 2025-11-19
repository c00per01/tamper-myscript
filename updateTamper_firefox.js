// updateTamper_firefox.js
// Р—Р°РїСѓСЃРєР°РµС‚ СЃРёСЃС‚РµРјРЅС‹Р№ Firefox СЃ СѓРєР°Р·Р°РЅРЅС‹Рј РїСЂРѕС„РёР»РµРј + Tampermonkey.

const { firefox } = require('playwright');
const { execSync } = require('child_process');

(async () => {
  // Р“Р°СЂР°РЅС‚РёСЂРѕРІР°РЅРЅРѕ Р·Р°РІРµСЂС€Р°РµРј РІСЃРµ РїСЂРѕС†РµСЃСЃС‹ Firefox РїРµСЂРµРґ Р·Р°РїСѓСЃРєРѕРј
  try {
    // РСЃРїРѕР»СЊР·СѓРµРј PowerShell РєРѕРјР°РЅРґСѓ РґР»СЏ РѕСЃС‚Р°РЅРѕРІРєРё РїСЂРѕС†РµСЃСЃРѕРІ
    execSync('powershell -Command "Stop-Process -Name firefox -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
    console.log('Old Firefox processes stopped.');
  } catch (e) {
    // РРіРЅРѕСЂРёСЂСѓРµРј РѕС€РёР±РєСѓ, РµСЃР»Рё РїСЂРѕС†РµСЃСЃРѕРІ РЅРµ Р±С‹Р»Рѕ
  }

  const rawUrl = 'https://raw.githubusercontent.com/c00per01/tamper-myscript/main/myscript.user.js';

  // === РќРђР§РђР›Рћ Р‘Р›РћРљРђ Р—РђРџРЈРЎРљРђ ===
  const profilePath = "C:\\Users\\Sergey01\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\automation-tamper-bundled";
  const firefoxExecutable = process.env.LOCALAPPDATA + "\\ms-playwright\\firefox-1495\\firefox\\firefox.exe";

  console.log("Using profile:", profilePath);
  console.log("Using firefox executable:", firefoxExecutable);

  const context = await firefox.launchPersistentContext(profilePath, {
    executablePath: firefoxExecutable,
    headless: false,
    timeout: 600000,
    args: [
      // РїСЂРё РЅРµРѕР±С…РѕРґРёРјРѕСЃС‚Рё РјРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ Р°СЂРіСѓРјРµРЅС‚С‹
    ],
    firefoxUserPrefs: {
      // РѕС‚РєР»СЋС‡Р°РµРј WebRender/GPU С‡С‚РѕР±С‹ РёР·Р±РµР¶Р°С‚СЊ shader-cache / РєСЂР°С€РµР№
      "gfx.webrender.all": false,
      "layers.acceleration.disabled": true,
      "webgl.disabled": true,
      "dom.ipc.processCount": 1
    }
  });
  // === РљРћРќР•Р¦ Р‘Р›РћРљРђ Р—РђРџРЈРЎРљРђ ===

  const page = await context.newPage();

  try {
    console.log('Opening raw URL:', rawUrl);
    await page.goto(rawUrl, { waitUntil: 'load', timeout: 15000 });

    const candidates = [
      'text=Install',
      'text=Install this script',
      'text=Install script',
      'text=Update',
      'text=Install userscript',
      'text=РЈСЃС‚Р°РЅРѕРІРёС‚СЊ',
      'text=РћР±РЅРѕРІРёС‚СЊ'
    ];

    let clicked = false;

    for (const sel of candidates) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        console.log('Clicking:', sel);
        await el.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('Install button not detected. If Firefox shows a browser-level dialog вЂ” click Install manually.');
    }

    await page.screenshot({ path: 'tamper_update_firefox_result.png', fullPage: true });
    console.log('Saved screenshot: tamper_update_firefox_result.png');

  } catch (err) {
    console.log('Error:', err.message);
  }
})();

