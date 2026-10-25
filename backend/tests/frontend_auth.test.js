import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const PROFILE_DIR = path.join(__dirname, '../tmp/chrome-auth-test');

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let total = 0;
let passed = 0;
let failed = 0;

function report(name, isPass, detail = '') {
  total++;
  if (isPass) {
    passed++;
    console.log(`✓ [PASS] ${total}. ${name}`);
  } else {
    failed++;
    console.error(`✗ [FAIL] ${total}. ${name}${detail ? ': ' + detail : ''}`);
  }
}

async function run() {
  console.log('================================================================');
  console.log(' HealthLens AI: Frontend Authentication UI & Workflow Test Suite');
  console.log('================================================================\n');

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9223',
      `--user-data-dir=${PROFILE_DIR}`,
      '--disable-gpu',
      '--no-first-run',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let versionData = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:9223/json/version');
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await sleep(250);
  }

  if (!versionData) {
    chrome.kill();
    throw new Error('Failed to connect to Chrome on port 9223');
  }

  const newTabRes = await fetch('http://localhost:9223/json/new', { method: 'PUT' });
  const tabData = await newTabRes.json();
  const cdp = new CDPClient(tabData.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  await cdp.send('Page.navigate', { url: 'http://localhost:5173' });
  await sleep(1500);

  // 1. Initial State: Sign In and Register Buttons in Navbar
  try {
    const hasAuthButtons = await cdp.eval(`(() => {
      const loginBtn = document.getElementById('navbar-login-btn');
      const registerBtn = document.getElementById('navbar-register-btn');
      return !!(loginBtn && registerBtn);
    })()`);
    report('Initial landing page displays "Sign In" and "Register" in navbar', hasAuthButtons);
  } catch (err) {
    report('Initial landing page displays "Sign In" and "Register" in navbar', false, err.message);
  }

  // 2. Click Register Button -> Switches to Register Page
  try {
    await cdp.eval(`document.getElementById('navbar-register-btn').click()`);
    await sleep(400);

    const isRegisterView = await cdp.eval(`(() => {
      const title = document.querySelector('h2');
      const nameInput = document.getElementById('fullName');
      return title?.innerText.includes('Create Your Account') && !!nameInput;
    })()`);
    report('Clicking "Register" navigates to the registration form', isRegisterView);
  } catch (err) {
    report('Clicking "Register" navigates to the registration form', false, err.message);
  }

  // 3. Client Validation: Empty Submission
  try {
    await cdp.eval(`document.getElementById('register-submit-btn').click()`);
    await sleep(300);

    const hasValidationError = await cdp.eval(`(() => {
      return document.body.innerText.includes('Please enter your full name');
    })()`);
    report('Submitting empty registration form shows validation error', hasValidationError);
  } catch (err) {
    report('Submitting empty registration form shows validation error', false, err.message);
  }

  // 4. Fill form with valid details and submit
  const testEmail = `dr_alex_${Date.now()}@healthlens.ai`;
  const testPassword = 'Password123!';
  const testName = 'Dr. Alex Mercer';

  try {
    await cdp.eval(`(() => {
      function setVal(id, val) {
        const el = document.getElementById(id);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setVal('fullName', '${testName}');
      setVal('email', '${testEmail}');
      setVal('password', '${testPassword}');
      setVal('confirmPassword', '${testPassword}');
    })()`);
    await sleep(300);

    await cdp.eval(`document.getElementById('register-submit-btn').click()`);
    await sleep(1500);

    const afterRegister = await cdp.eval(`(() => {
      const bodyText = document.body.innerText;
      const userChip = bodyText.includes('${testName}');
      const logoutBtn = !!document.getElementById('navbar-logout-btn');
      return userChip && logoutBtn;
    })()`);
    report('Successful registration logs user in and displays user chip in navbar', afterRegister);
  } catch (err) {
    report('Successful registration logs user in and displays user chip in navbar', false, err.message);
  }

  // 5. Logout Functionality
  try {
    await cdp.eval(`document.getElementById('navbar-logout-btn').click()`);
    await sleep(800);

    const loggedOut = await cdp.eval(`(() => {
      const loginBtn = document.getElementById('navbar-login-btn');
      const registerBtn = document.getElementById('navbar-register-btn');
      const userChip = document.body.innerText.includes('${testName}');
      return !!(loginBtn && registerBtn) && !userChip;
    })()`);
    report('Clicking "Sign Out" revokes session and restores auth buttons', loggedOut);
  } catch (err) {
    report('Clicking "Sign Out" revokes session and restores auth buttons', false, err.message);
  }

  // 6. Navigate to Sign In Page
  try {
    await cdp.eval(`document.getElementById('navbar-login-btn').click()`);
    await sleep(400);

    const isLoginView = await cdp.eval(`(() => {
      const title = document.querySelector('h2');
      const emailInput = document.getElementById('login-email');
      return title?.innerText.includes('Sign In to HealthLens') && !!emailInput;
    })()`);
    report('Clicking "Sign In" navigates to the login form', isLoginView);
  } catch (err) {
    report('Clicking "Sign In" navigates to the login form', false, err.message);
  }

  // 7. Invalid Login Credentials (Generic Error)
  try {
    await cdp.eval(`(() => {
      function setVal(id, val) {
        const el = document.getElementById(id);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setVal('login-email', '${testEmail}');
      setVal('login-password', 'WrongPassword123!');
    })()`);
    await sleep(200);

    await cdp.eval(`document.getElementById('login-submit-btn').click()`);
    await sleep(1000);

    const hasGenericError = await cdp.eval(`(() => {
      return document.body.innerText.includes('Invalid email or password');
    })()`);
    report('Invalid credentials display generic error message', hasGenericError);
  } catch (err) {
    report('Invalid credentials display generic error message', false, err.message);
  }

  // 8. Successful Login with Correct Credentials
  try {
    await cdp.eval(`(() => {
      function setVal(id, val) {
        const el = document.getElementById(id);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setVal('login-password', '${testPassword}');
    })()`);
    await sleep(200);

    await cdp.eval(`document.getElementById('login-submit-btn').click()`);
    await sleep(1500);

    const afterLogin = await cdp.eval(`(() => {
      const bodyText = document.body.innerText;
      const userChip = bodyText.includes('${testName}');
      const hasDropzone = !!document.getElementById('upload-card');
      return userChip && hasDropzone;
    })()`);
    report('Successful login redirects to analyzer with authenticated session', afterLogin);
  } catch (err) {
    report('Successful login redirects to analyzer with authenticated session', false, err.message);
  }

  // 9. Report Analysis Still Works for Authenticated User
  try {
    const docNode = await cdp.send('DOM.getDocument');
    const fileInputNode = await cdp.send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#report-file-input',
    });

    const testPdf = path.join(FIXTURES_DIR, 'valid_medical_single.pdf');
    await cdp.send('DOM.setFileInputFiles', {
      nodeId: fileInputNode.nodeId,
      files: [testPdf],
    });
    await sleep(500);

    await cdp.eval(`document.getElementById('upload-submit-btn').click()`);
    await sleep(3500);

    const hasDashboard = await cdp.eval(`(() => {
      const summary = document.getElementById('upload-new-report-btn');
      const table = document.querySelector('table');
      return !!(summary && table);
    })()`);
    report('Authenticated user can analyze reports and view results dashboard', hasDashboard);
  } catch (err) {
    report('Authenticated user can analyze reports and view results dashboard', false, err.message);
  }

  chrome.kill();

  console.log('\n================================================================');
  console.log(' Frontend Auth Test Suite Summary');
  console.log('================================================================');
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
