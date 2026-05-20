// Conecta no Chrome real já logado no Claude e salva cookies
// node claude-cookies-real.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();

  console.log('Conectado no Chrome real.');
  await page.goto('https://claude.ai', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const cookies = await context.cookies();

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

  const orgCookie = cookies.find(c => c.name === 'lastActiveOrg');
  if (orgCookie) envMap.ORG_ID = orgCookie.value;

  try {
    const url = page.url();
    const match = url.match(/\/chat\/([a-f0-9-]+)/);
    if (match) envMap.CONVERSATION_ID = match[1];
  } catch {}

  envMap.MODEL = 'claude-sonnet-4-6';

  const envPath = path.join(__dirname, '.claude.env');
  const lines = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');

  console.log(`Salvo em .claude.env`);
  console.log(`Conversation ID: ${envMap.CONVERSATION_ID || 'n/a'}`);

  await browser.close();
})();
