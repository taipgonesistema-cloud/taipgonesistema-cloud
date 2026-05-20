const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  const env = {};
  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const separator = trimmed.indexOf('=');
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

async function request(baseUrl, token, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'X-N8N-API-KEY': token,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${path}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function main() {
  const env = loadEnv('.env');
  const token = env.N8N_API_KEY || env.N8N_TOKEN || env.N8N_API_TOKEN || env.N8N_PUBLIC_API_KEY || env.N8N_ENV;
  const baseUrl = (env.N8N_BASE_URL || 'https://kisuke-n8n.ebmtg1.easypanel.host').replace(/\/$/, '');
  const exportDir = path.join(__dirname, 'workflows');

  if (!token) {
    throw new Error('Token nao encontrado no .env');
  }

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const body = await request(baseUrl, token, '/api/v1/workflows');
  const workflows = Array.isArray(body.data) ? body.data : body;

  for (const workflow of workflows) {
    const detail = await request(baseUrl, token, `/api/v1/workflows/${workflow.id}`);
    const safeName = (detail.name || detail.id).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = path.join(exportDir, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(detail, null, 2), 'utf8');
    console.log(`${safeName}.json`);
  }

  console.log(`\nExportados ${workflows.length} workflows para ${exportDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
