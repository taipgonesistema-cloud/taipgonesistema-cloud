// Captura cookies do Claude via Playwright e salva no .claude.env
// npm init -y && npm install playwright && npx playwright install chromium
// node claude-cookies.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const NEEDED = [
  'sessionKey',
  'cf_clearance',
  '__cf_bm',
  '_cfuvid',
  'lastActiveOrg',
  'anthropic-device-id',
];

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Abrindo claude.ai — faça login manualmente na janela que abriu.');
  console.log('Após o login, quando carregar o dashboard, pressione ENTER aqui pra capturar os cookies.\n');

  await page.goto('https://claude.ai', { waitUntil: 'domcontentloaded' });

  // Espera o usuário apertar ENTER no terminal
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  const cookies = await context.cookies();
  const allCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // Mapeia cookies necessarios pro .env
  const envMap = {};
  for (const c of cookies) {
    const name = c.name;
    const val = c.value;

    if (name === 'sessionKey') envMap.SESSION_KEY = val;
    else if (name === 'cf_clearance') envMap.CF_CLEARANCE = val;
    else if (name === '__cf_bm') envMap.CF_BM = val;
    else if (name === '_cfuvid') envMap.CF_UVFID = val;
    else if (name === 'lastActiveOrg') envMap.LAST_ACTIVE_ORG = val;
    else if (name === 'anthropic-device-id') envMap.ANTHROPIC_DEVICE_ID = val;
  }

  // Pega ORG_ID do lastActiveOrg
  const orgCookie = cookies.find(c => c.name === 'lastActiveOrg');
  if (orgCookie) envMap.ORG_ID = orgCookie.value;

  // Tenta pegar conversation_id (se existir uma conversa aberta)
  try {
    const url = page.url();
    const match = url.match(/\/chat\/([a-f0-9-]+)/);
    if (match) envMap.CONVERSATION_ID = match[1];
  } catch {}

  envMap.MODEL = 'claude-sonnet-4-6';

  // Salva .claude.env
  const envPath = path.join(__dirname, '.claude.env');
  const lines = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');

  const missing = NEEDED.filter(k => !envMap[k.replace(/_/g, '').toLowerCase()] && !envMap[k]);

  console.log(`\nCookies salvos em .claude.env`);
  console.log(`Conversation ID: ${envMap.CONVERSATION_ID || 'nao detectado'}`);
  if (missing.length) console.log(`AUSENTES: ${missing.join(', ')}`);
  else console.log('Todos os cookies essenciais capturados!');

  await browser.close();
  process.exit(0);
})();
