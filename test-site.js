/* global process */
/**
 * Comprehensive site testing script for the GB Automation landing page.
 * Starts an isolated Vite dev server so tests do not attach to another repo.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

async function waitForServer(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Timed out waiting for Vite at ${baseUrl}`);
}

async function startViteServer() {
  const viteBin = resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
  if (!existsSync(viteBin)) {
    throw new Error('Vite binary missing. Run npm install before npm test.');
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  log(`\n🔍 Starting isolated Vite dev server on port ${port}...`, 'blue');

  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  let stopping = false;
  child.once('exit', (code) => {
    if (!stopping && code !== 0 && code !== null) {
      log(`Vite exited early with code ${code}`, 'red');
      if (output.trim()) log(output.trim(), 'yellow');
    }
  });

  await waitForServer(baseUrl);
  log(`✓ Vite server ready at ${baseUrl}`, 'green');
  return { baseUrl, child, stop: () => { stopping = true; } };
}

async function stopViteServer(server) {
  const child = server?.child;
  if (!child || child.killed) return;
  server.stop?.();
  child.kill('SIGTERM');
  await new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
      resolveStop();
    }, 2000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolveStop();
    });
  });
}

async function testEndpoint(url, testName) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      log(`✓ ${testName}: PASSED`, 'green');
      return { passed: true, status: response.status };
    }
    log(`✗ ${testName}: FAILED (Status ${response.status})`, 'red');
    return { passed: false, status: response.status };
  } catch (error) {
    log(`✗ ${testName}: ERROR - ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

async function testHtmlContains(baseUrl, pattern, testName) {
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    if (pattern.test(html)) {
      log(`✓ ${testName}`, 'green');
      return { passed: true };
    }
    log(`✗ ${testName}`, 'red');
    return { passed: false };
  } catch (error) {
    log(`✗ ${testName}: ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

async function testSourceContains(baseUrl, path, checks) {
  const results = [];
  try {
    const response = await fetch(`${baseUrl}${path}`);
    const code = await response.text();
    if (!response.ok) {
      log(`✗ ${path} loads: FAILED (Status ${response.status})`, 'red');
      return checks.map(() => ({ passed: false, status: response.status }));
    }
    log(`✓ ${path} loads`, 'green');
    results.push({ passed: true });

    for (const check of checks) {
      if (check.pattern.test(code)) {
        log(`✓ ${check.name} found in ${path}`, 'green');
        results.push({ passed: true });
      } else {
        log(`✗ ${check.name} missing in ${path}`, 'red');
        results.push({ passed: false });
      }
    }
  } catch (error) {
    log(`✗ Failed to analyze ${path}: ${error.message}`, 'red');
    return checks.map(() => ({ passed: false, error: error.message }));
  }
  return results;
}

async function runTests() {
  log('\n=================================', 'bold');
  log('GB AUTOMATION - SITE TEST SUITE', 'bold');
  log('=================================\n', 'bold');

  let server;
  const results = [];

  try {
    server = await startViteServer();
    const { baseUrl } = server;

    log('\n📋 Running tests...\n', 'blue');

    results.push(await testEndpoint(baseUrl, 'Main page loads'));
    results.push(await testHtmlContains(baseUrl, /id="root"/, 'React root element found'));
    results.push(await testEndpoint(`${baseUrl}/src/main.jsx`, 'Main.jsx loads'));
    results.push(await testEndpoint(`${baseUrl}/src/index.css`, 'CSS loads'));

    const components = ['Hero', 'Features', 'Process', 'Pricing', 'ContactForm', 'Footer'];
    for (const component of components) {
      results.push(await testEndpoint(
        `${baseUrl}/src/components/${component}.jsx`,
        `${component} component loads`,
      ));
    }

    results.push(...await testSourceContains(baseUrl, '/src/App.jsx', [
      { pattern: /react-router-dom/, name: 'React Router import' },
      { pattern: /ClientPortalBoundary/, name: 'Generic client portal boundary' },
      { pattern: /\/clients\/:clientSlug\/\*/, name: 'Generic client route path' },
      { pattern: /export default App/, name: 'Default export' },
    ]));

    results.push(...await testSourceContains(baseUrl, '/src/clients/registry/tenantRegistry.js', [
      { pattern: /gbautomation/, name: 'gbautomation tenant policy' },
      { pattern: /jid5274/, name: 'jid5274 tenant policy' },
      { pattern: /tenant-gbautomation/, name: 'gbautomation auth group' },
      { pattern: /tenant-jid5274/, name: 'jid5274 auth group' },
    ]));
  } finally {
    await stopViteServer(server);
  }

  const passed = results.filter((result) => result.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  log('\n=================================', 'bold');
  log('TEST RESULTS', 'bold');
  log('=================================', 'bold');
  log(`\nPassed: ${passed}/${total} (${percentage}%)`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n✅ ALL TESTS PASSED!', 'green');
  } else {
    log('\n❌ SOME TESTS FAILED', 'red');
    process.exitCode = 1;
  }
}

runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exitCode = 1;
});
