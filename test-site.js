/**
 * Comprehensive Site Testing Script
 * Tests all critical functionality of the GB Automation landing page
 */

import { createServer as createViteServer } from 'vite';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function testEndpoint(url, testName) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      log(`✓ ${testName}: PASSED`, 'green');
      return { passed: true, status: response.status };
    } else {
      log(`✗ ${testName}: FAILED (Status ${response.status})`, 'red');
      return { passed: false, status: response.status };
    }
  } catch (error) {
    log(`✗ ${testName}: ERROR - ${error.message}`, 'red');
    return { passed: false, error: error.message };
  }
}

async function startViteServer() {
  log('\n🔍 Starting isolated Vite dev server for this checkout...', 'blue');

  const server = await createViteServer({
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  });

  await server.listen();

  const localUrl = server.resolvedUrls?.local?.[0];
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : null;

  if (!localUrl || !port) {
    await server.close();
    throw new Error('Vite server started without a resolvable local URL');
  }

  log(`✓ Started Vite server on port ${port}`, 'green');
  return { server, baseUrl: localUrl.replace(/\/$/, '') };
}

async function runTests() {
  log('\n=================================', 'bold');
  log('GB AUTOMATION - SITE TEST SUITE', 'bold');
  log('=================================\n', 'bold');

  let server;
  let baseUrl;

  try {
    ({ server, baseUrl } = await startViteServer());

    const results = [];

    log('\n📋 Running tests...\n', 'blue');

    // Test 1: Main page loads
    results.push(await testEndpoint(baseUrl, 'Main page loads'));

    // Test 2: Check for React app initialization
    try {
      const response = await fetch(baseUrl);
      const html = await response.text();

      if (html.includes('id="root"')) {
        log('✓ React root element found', 'green');
        results.push({ passed: true });
      } else {
        log('✗ React root element missing', 'red');
        results.push({ passed: false });
      }
    } catch (error) {
      log(`✗ Failed to check React root: ${error.message}`, 'red');
      results.push({ passed: false });
    }

    // Test 3: Main JavaScript entry point
    results.push(await testEndpoint(`${baseUrl}/src/main.jsx`, 'Main.jsx loads'));

    // Test 4: App component
    results.push(await testEndpoint(`${baseUrl}/src/App.jsx`, 'App.jsx loads'));

    // Test 5: CSS loads
    results.push(await testEndpoint(`${baseUrl}/src/index.css`, 'CSS loads'));

    // Test 6: Check all components exist
    const components = ['Hero', 'Features', 'Process', 'Pricing', 'ContactForm', 'Footer'];

    for (const component of components) {
      results.push(await testEndpoint(
        `${baseUrl}/src/components/${component}.jsx`,
        `${component} component loads`
      ));
    }

    // Test 7: Check for common JavaScript errors
    try {
      const response = await fetch(`${baseUrl}/src/App.jsx`);
      const code = await response.text();

      const commonIssues = [
        { pattern: /react_jsx-dev-runtime|react-router-dom/, name: 'React runtime import' },
        { pattern: /export default/, name: 'Default export' },
      ];

      for (const issue of commonIssues) {
        if (issue.pattern.test(code)) {
          log(`✓ ${issue.name} found in App.jsx`, 'green');
          results.push({ passed: true });
        } else {
          log(`✗ ${issue.name} missing in App.jsx`, 'red');
          results.push({ passed: false });
        }
      }
    } catch (error) {
      log(`✗ Failed to analyze App.jsx: ${error.message}`, 'red');
      results.push({ passed: false });
    }

    // Summary
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    log('\n=================================', 'bold');
    log('TEST RESULTS', 'bold');
    log('=================================', 'bold');
    log(`\nPassed: ${passed}/${total} (${percentage}%)`, passed === total ? 'green' : 'yellow');

    if (passed === total) {
      log('\n✅ ALL TESTS PASSED!', 'green');
      log(`\n🌐 Tested site URL: ${baseUrl}`, 'blue');
    } else {
      log('\n❌ SOME TESTS FAILED', 'red');
      log('\nPlease check the errors above and fix them.\n', 'yellow');
    }

    process.exitCode = passed === total ? 0 : 1;
  } finally {
    if (server) {
      await server.close();
    }
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exitCode = 1;
});
