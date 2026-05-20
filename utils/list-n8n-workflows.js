const fs = require('fs');

function loadEnv(path) {
  const env = {};
  const content = fs.readFileSync(path, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');

    env[key] = value;
  }

  return env;
}

async function main() {
  const env = loadEnv('.env');
  const token = env.N8N_API_KEY || env.N8N_TOKEN || env.N8N_API_TOKEN || env.N8N_PUBLIC_API_KEY || env.N8N_ENV;
  const baseUrl = (env.N8N_BASE_URL || 'https://kisuke-n8n.ebmtg1.easypanel.host').replace(/\/$/, '');

  if (!token) {
    throw new Error('Token nao encontrado no .env. Use N8N_API_KEY=...');
  }

  const response = await fetch(`${baseUrl}/api/v1/workflows`, {
    headers: {
      'X-N8N-API-KEY': token,
      Accept: 'application/json',
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const body = JSON.parse(text);
  const workflows = Array.isArray(body.data) ? body.data : body;

  console.log(JSON.stringify(
    workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
    })),
    null,
    2,
  ));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
