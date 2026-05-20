// Claude Web Chat Proxy — com suporte a .claude.env
// node claude-proxy.js
// Depois: curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"prompt":"fala oi"}'

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const CLAUDE_HOST = 'claude.ai';

// --- Carrega .claude.env ---
function loadEnv(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const sep = trimmed.indexOf('=');
      const key = trimmed.slice(0, sep).trim();
      let value = trimmed.slice(sep + 1).trim();
      value = value.replace(/^['"]|['"]$/g, '');
      env[key] = value;
    }
  } catch {}
  return env;
}

const env = loadEnv(path.join(__dirname, '.claude.env'));

// --- Monta cookie string a partir das variaveis do env ---
function buildCookieString() {
  const parts = [];
  if (env.SESSION_KEY) parts.push(`sessionKey=${env.SESSION_KEY}`);
  if (env.CF_CLEARANCE) parts.push(`cf_clearance=${env.CF_CLEARANCE}`);
  if (env.CF_BM) parts.push(`__cf_bm=${env.CF_BM}`);
  if (env.CF_UVFID) parts.push(`_cfuvid=${env.CF_UVFID}`);
  if (env.LAST_ACTIVE_ORG) parts.push(`lastActiveOrg=${env.LAST_ACTIVE_ORG}`);
  if (env.ANTHROPIC_DEVICE_ID) parts.push(`anthropic-device-id=${env.ANTHROPIC_DEVICE_ID}`);
  // tracking/preferencias estaticas que ajudam
  parts.push('ajs_anonymous_id=claudeai.v1.7c92ef6b-9276-474f-bfb1-bfa97cebaa91');
  parts.push('CH-prefers-color-scheme=dark');
  parts.push('__ssid=bb0c2127-820a-4bc4-b012-916412e258ae');
  parts.push('activitySessionId=' + uuid());
  return parts.join('; ');
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// --- Server HTTP ---
const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/chat') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Use POST /chat');
  }

  let body = '';
  req.on('data', chunk => (body += chunk));
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      handleChat(data, res);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('JSON invalido: ' + e.message);
    }
  });
});

function handleChat(data, res) {
  const prompt = data.prompt;
  const orgId = data.org_id || env.ORG_ID;
  const conversationId = data.conversation_id || env.CONVERSATION_ID;
  const model = data.model || env.MODEL || 'claude-sonnet-4-6';
  const cookies = data.cookies || buildCookieString();

  if (!prompt) { res.writeHead(400); return res.end('Falta prompt'); }
  if (!orgId || !conversationId) { res.writeHead(400); return res.end('Falta org_id ou conversation_id — bota no .claude.env'); }

  const requestBody = JSON.stringify({
    prompt,
    timezone: 'America/Sao_Paulo',
    personalized_styles: [{
      type: 'default', key: 'Default', name: 'Normal',
      nameKey: 'normal_style_name', prompt: 'Normal\n',
      summary: 'Default responses from Claude', summaryKey: 'normal_style_summary',
      isDefault: true,
    }],
    locale: 'pt-BR',
    model,
    tools: [],
    turn_message_uuids: { human_message_uuid: uuid(), assistant_message_uuid: uuid() },
    attachments: [], files: [], sync_sources: [],
    rendering_mode: 'messages',
    create_conversation_params: {
      name: '', model, include_conversation_preferences: true,
      paprika_mode: 'extended', compass_mode: null,
      is_temporary: false, enabled_imagine: true,
    },
  });

  const options = {
    hostname: CLAUDE_HOST,
    path: `/api/organizations/${orgId}/chat_conversations/${conversationId}/completion`,
    method: 'POST',
    headers: {
      'accept': 'text/event-stream',
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'anthropic-client-platform': 'web_claude_ai',
      'anthropic-device-id': env.ANTHROPIC_DEVICE_ID || uuid(),
      'content-type': 'application/json',
      'cookie': cookies,
      'origin': 'https://claude.ai',
      'referer': 'https://claude.ai/new',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const claudeReq = https.request(options, claudeRes => {
    claudeRes.on('data', chunk => res.write(chunk));
    claudeRes.on('end', () => res.end());
  });

  claudeReq.on('error', err => {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  });

  claudeReq.write(requestBody);
  claudeReq.end();
  claudeReq.setTimeout(60000, () => { claudeReq.destroy(); res.end(); });
}

server.listen(PORT, () => {
  console.log(`Claude proxy rodando em http://localhost:${PORT}`);
  console.log(`POST /chat com { "prompt": "..." }`);
  if (!env.SESSION_KEY) console.log('AVISO: .claude.env nao encontrado ou vazio — passe cookies manualmente');
});
