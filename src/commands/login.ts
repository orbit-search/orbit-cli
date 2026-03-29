import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { exec as execCb } from 'node:child_process';

const CONFIG_DIR = join(homedir(), '.orbit-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DEFAULT_HOST = 'https://orbitsearch.com';
const CALLBACK_TIMEOUT_MS = 300_000; // 5 minutes

export interface LoginOptions {
  key?: string;
  host?: string;
}

function saveApiKey(apiKey: string): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  let config: Record<string, unknown> = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      // Start fresh
    }
  }

  config.apiKey = apiKey;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function findOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Could not find open port')));
      }
    });
    srv.on('error', reject);
  });
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  // Direct key input mode
  if (options.key) {
    if (!options.key.startsWith('sk_orb_')) {
      console.error('Error: Invalid API key format. Keys should start with sk_orb_');
      process.exit(1);
    }
    saveApiKey(options.key);
    console.log('✓ API key saved to ~/.orbit-cli/config.json');
    return;
  }

  const host = options.host || DEFAULT_HOST;

  console.log('🔐 Authenticating with Orbit...\n');

  const port = await findOpenPort();
  const state = randomBytes(16).toString('hex');

  let callbackReceived = false;

  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/callback') {
      const key = url.searchParams.get('key');
      const returnedState = url.searchParams.get('state');

      // CORS headers for the browser request
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (!key || !returnedState) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing key or state');
        return;
      }

      if (returnedState !== state) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('State mismatch');
        return;
      }

      if (!key.startsWith('sk_orb_')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid key format');
        return;
      }

      callbackReceived = true;
      saveApiKey(key);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');

      console.log('\n✓ Authentication successful!');
      console.log(`  API key saved to ~/.orbit-cli/config.json`);
      console.log(`  Key prefix: ${key.slice(0, 12)}...`);
      console.log('\nYou can now use `orbit search` and other commands.\n');

      // Give the response time to send, then shut down
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const authUrl = `${host}/settings/cli-auth?port=${port}&state=${encodeURIComponent(state)}`;

    console.log(`  Opening browser for authentication...`);
    console.log(`  If it doesn't open, visit:\n`);
    console.log(`  ${authUrl}\n`);
    console.log(`  Waiting for authentication...`);

    // Open browser
    const platform = process.platform;
    const cmd =
      platform === 'darwin' ? 'open' :
      platform === 'win32' ? 'start' :
      'xdg-open';

    execCb(`${cmd} "${authUrl}"`, (err) => {
      if (err) {
        // Browser open failed — user can visit manually
      }
    });
  });

  // Timeout
  setTimeout(() => {
    if (!callbackReceived) {
      console.error('\n✗ Authentication timed out after 5 minutes.');
      console.error('  Run `orbit login` to try again.');
      server.close();
      process.exit(1);
    }
  }, CALLBACK_TIMEOUT_MS);
}
