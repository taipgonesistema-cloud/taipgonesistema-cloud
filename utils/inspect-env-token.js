const fs = require('fs');

const env = {};
const content = fs.readFileSync('.env', 'utf8');

for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

  const separator = trimmed.indexOf('=');
  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  value = value.replace(/^['"]|['"]$/g, '');
  env[key] = value;
}

for (const [key, value] of Object.entries(env)) {
  console.log(`${key}: length=${value.length}, starts=${value.slice(0, 8)}, hasBearer=${value.toLowerCase().startsWith('bearer ')}`);
}
