#!/usr/bin/env node
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USER_DATA_DIR = path.resolve(__dirname, '../.chatgpt_profile');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    login: false,
    prompt: '',
    headless: false, // Default to visible for stability with Cloudflare & interactive use
    timeout: 180000,
    output: null,
    help: false
  };

  const promptParts = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--login') {
      options.login = true;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--headful' || arg === '--no-headless') {
      options.headless = false;
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--timeout' || arg === '-t') {
      options.timeout = parseInt(args[++i], 10) * 1000;
    } else if (arg === '--prompt' || arg === '-p') {
      options.prompt = args[++i] || '';
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      promptParts.push(arg);
    }
  }

  if (!options.prompt && promptParts.length > 0) {
    options.prompt = promptParts.join(' ');
  }

  return options;
}

function printHelp() {
  console.log(`
ChatGPT Puppeteer Scraper

Usage:
  node scripts/chatgptScraper.mjs [options] [prompt]

Options:
  --login              Open browser to log into ChatGPT manually and save session
  --headless           Run in headless mode (recommended after logging in once)
  --headful            Run with visible browser window (default)
  -o, --output <file>  Save extracted response to a file
  -t, --timeout <sec>  Timeout waiting for response in seconds (default: 120)
  -h, --help           Show this help message

Examples:
  1. First time setup / login:
     node scripts/chatgptScraper.mjs --login

  2. Send a prompt (visible browser window):
     node scripts/chatgptScraper.mjs "Summarize Atomic Habits in 5 key takeaways"

  3. Send a prompt headless and save to file:
     node scripts/chatgptScraper.mjs --headless -o summary.md "Write a short summary of Deep Work"
`);
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

const DEBUG_DIR = path.resolve(__dirname, '../public/debug_screenshots');
const ROOT_DEBUG_DIR = path.resolve(__dirname, '../debug_screenshots');

async function takeDebugScreenshot(page, stepName) {
  try {
    if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
    if (!fs.existsSync(ROOT_DEBUG_DIR)) fs.mkdirSync(ROOT_DEBUG_DIR, { recursive: true });

    const filename = `${stepName}.png`;
    const targetPath = path.join(DEBUG_DIR, filename);
    const rootTargetPath = path.join(ROOT_DEBUG_DIR, filename);

    await page.screenshot({ path: targetPath, fullPage: false });
    try {
      fs.copyFileSync(targetPath, rootTargetPath);
    } catch {}

    console.log(`[ChatGPT Scraper Debug] Screenshot saved: ${filename}`);
  } catch (err) {
    console.warn(`[ChatGPT Scraper Debug] Could not capture screenshot for ${stepName}:`, err.message);
  }
}

async function launchBrowser(headless = false) {
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  function findChromeExecutable() {
    // 0. Environment variables
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
      return process.env.CHROME_BIN;
    }

    // 1. System Chrome / Chromium locations (Windows + Linux VPS)
    const fallbackPaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null
    ].filter(Boolean);

    const systemChrome = fallbackPaths.find(p => fs.existsSync(p));
    if (systemChrome) return systemChrome;

    // 2. Check puppeteer cache directory for any installed chrome binary
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const cacheDir = homeDir ? path.join(homeDir, '.cache', 'puppeteer') : null;
    if (cacheDir && fs.existsSync(cacheDir)) {
      const walkSync = (dir) => {
        let results = [];
        try {
          const list = fs.readdirSync(dir);
          for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
              results = results.concat(walkSync(fullPath));
            } else if (file.toLowerCase() === 'chrome.exe' || file === 'chrome') {
              results.push(fullPath);
            }
          }
        } catch {
          // ignore read errors
        }
        return results;
      };
      const found = walkSync(cacheDir);
      if (found.length > 0) {
        return found[found.length - 1];
      }
    }

    return null;
  }

  const chromeExe = findChromeExecutable();

  const isLinux = process.platform === 'linux';
  const launchOptions = {
    headless: headless ? true : false,
    userDataDir: USER_DATA_DIR,
    defaultViewport: { width: 1920, height: 1080 },
    protocolTimeout: 180000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    ]
  };

  if (chromeExe) {
    launchOptions.executablePath = chromeExe;
  }

  const browser = await puppeteer.launch(launchOptions);

  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.setViewport({ width: 1920, height: 1080 });
  const ua = isLinux
    ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
  await page.setUserAgent(ua);

  // Stealth evasions for datacenter VPS environments
  await page.evaluateOnNewDocument(() => {
    // 1. Hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // 2. Mock plugins
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    // 3. Mock languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    // 4. Disguise Linux VPS SwiftShader/llvmpipe WebGL to look like real desktop GPU
    try {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) return 'Google Inc. (NVIDIA)';
        if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        return getParameter.apply(this, [parameter]);
      };
      if (window.WebGL2RenderingContext) {
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (parameter) {
          if (parameter === 37445) return 'Google Inc. (NVIDIA)';
          if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
          return getParameter2.apply(this, [parameter]);
        };
      }
    } catch {}
    // 5. Ensure window.chrome runtime exists
    if (!window.chrome) {
      window.chrome = { runtime: {} };
    }
  });

  return { browser, page };
}

async function handleCloudflareChallenge(page) {
  try {
    const isChallengePresent = await page.evaluate(() => {
      const text = document.body ? document.body.innerText || '' : '';
      return (
        text.includes('Verify you are human') ||
        text.includes('Just a moment...') ||
        !!document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
        !!document.querySelector('iframe[src*="turnstile"]') ||
        !!document.querySelector('#challenge-stage')
      );
    });

    if (!isChallengePresent) return true;

    console.log('[ChatGPT Scraper] Cloudflare "Verify you are human" challenge detected!');
    await takeDebugScreenshot(page, 'cloudflare_turnstile_detected');

    // Attempt to click the Turnstile checkbox up to 6 times
    for (let attempt = 1; attempt <= 6; attempt++) {
      console.log(`[ChatGPT Scraper] Cloudflare Turnstile solve attempt ${attempt}/6...`);

      // Strategy A: Frame selector click inside Turnstile iframe
      let frameClicked = false;
      for (const frame of page.frames()) {
        const url = frame.url();
        if (url.includes('challenges.cloudflare.com') || url.includes('turnstile')) {
          const selectors = [
            'input[type="checkbox"]',
            'label.ctp-checkbox-label',
            '#challenge-stage',
            'span.mark',
            '.ctp-checkbox-label input',
            'div.stage'
          ];
          for (const sel of selectors) {
            try {
              const el = await frame.$(sel);
              if (el) {
                await el.click({ delay: 50 + Math.random() * 50 });
                frameClicked = true;
                console.log(`[ChatGPT Scraper] Clicked Turnstile selector in frame: ${sel}`);
                break;
              }
            } catch {}
          }
        }
        if (frameClicked) break;
      }

      // Strategy B: Bounding box native mouse click
      try {
        const iframes = await page.$$(
          'iframe[src*="challenges.cloudflare.com"], iframe[src*="turnstile"], iframe[title*="Cloudflare"], iframe[title*="challenge"]'
        );
        for (const iframe of iframes) {
          const box = await iframe.boundingBox();
          if (box && box.width > 0 && box.height > 0) {
            // Checkbox is ~28px from left edge, vertically centered in the 65px widget
            const clickX = box.x + Math.min(28, box.width * 0.15);
            const clickY = box.y + (box.height / 2);
            await page.mouse.move(clickX, clickY, { steps: 5 });
            await new Promise(r => setTimeout(r, 200));
            await page.mouse.click(clickX, clickY, { delay: 80 });
            console.log(`[ChatGPT Scraper] Native mouse clicked Turnstile checkbox at (${Math.round(clickX)}, ${Math.round(clickY)})`);
          }
        }
      } catch (err) {
        console.warn('[ChatGPT Scraper] Mouse click warning:', err.message);
      }

      // Wait 3.5s for Turnstile verification to clear
      await new Promise(r => setTimeout(r, 3500));

      // Check if prompt textarea appeared
      const inputFound = await page.$('#prompt-textarea, div.ProseMirror, textarea');
      if (inputFound) {
        console.log('[ChatGPT Scraper] Cloudflare Turnstile successfully solved!');
        await takeDebugScreenshot(page, 'cloudflare_turnstile_passed');

        // Save fresh cookies back to chatgpt_cookies.json
        try {
          const client = await page.target().createCDPSession();
          const { cookies } = await client.send('Network.getAllCookies');
          const cookiePath = path.resolve(__dirname, '../chatgpt_cookies.json');
          fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
          console.log(`[ChatGPT Scraper] Saved ${cookies.length} refreshed cookies to chatgpt_cookies.json`);
        } catch {}

        return true;
      }
    }
  } catch (challengeErr) {
    console.warn('[ChatGPT Scraper] Cloudflare challenge handler warning:', challengeErr.message);
  }
  return false;
}

async function handleLoginMode() {
  console.log('\n[ChatGPT Scraper] Launching browser for manual login...');
  console.log(`[ChatGPT Scraper] Using persistent profile directory: ${USER_DATA_DIR}`);

  const { browser, page } = await launchBrowser(false);
  try {
    try {
      await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch {}
    console.log('\n======================================================');
    console.log('1. Log into your OpenAI / ChatGPT account in the browser.');
    console.log('2. Complete any CAPTCHA / 2FA challenges.');
    console.log('3. Once you see the chat interface ready, return here.');
    console.log('======================================================\n');

    await askQuestion('Press [ENTER] in this terminal once you are logged in and ready to save profile: ');

    // Export all session cookies using Chrome DevTools Protocol (CDP) for cross-platform Linux compatibility
    try {
      const client = await page.target().createCDPSession();
      const { cookies } = await client.send('Network.getAllCookies');
      const cookiePath = path.resolve(__dirname, '../chatgpt_cookies.json');
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      console.log(`[ChatGPT Scraper] Successfully exported ${cookies.length} cookies to chatgpt_cookies.json`);
    } catch (cookieErr) {
      console.warn('[ChatGPT Scraper] Failed to export cookies to JSON:', cookieErr.message);
    }

    console.log('[ChatGPT Scraper] Session saved successfully!');
  } catch (err) {
    console.error('[ChatGPT Scraper] Error during login session:', err.message);
  } finally {
    await browser.close();
  }
}

async function scrapeChatGPT(prompt, options) {
  if (!prompt || !prompt.trim()) {
    console.error('Error: Please provide a prompt or use --login.');
    process.exit(1);
  }

  console.log(`[ChatGPT Scraper] Launching browser (headless: ${options.headless})...`);
  const { browser, page } = await launchBrowser(options.headless);

  try {
    // Load session cookies if exported
    const cookiePath = path.resolve(__dirname, '../chatgpt_cookies.json');
    if (fs.existsSync(cookiePath)) {
      try {
        const rawCookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
        if (Array.isArray(rawCookies) && rawCookies.length > 0) {
          const sanitizedCookies = rawCookies.map(c => {
            const cookie = { ...c };
            if (cookie.expires && cookie.expires <= 0) {
              delete cookie.expires;
            }
            delete cookie.size;
            return cookie;
          });
          const client = await page.target().createCDPSession();
          await client.send('Network.setCookies', { cookies: sanitizedCookies });
          console.log(`[ChatGPT Scraper] Loaded ${sanitizedCookies.length} session cookies from chatgpt_cookies.json`);
        }
      } catch (cookieLoadErr) {
        console.warn('[ChatGPT Scraper] Could not import cookies from file:', cookieLoadErr.message);
      }
    }

    console.log('[ChatGPT Scraper] Navigating to https://chatgpt.com/ ...');
    try {
      await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    } catch (navErr) {
      console.warn(`[ChatGPT Scraper] Navigation warning: ${navErr.message}. Continuing to inspect page...`);
    }

    // Give 3.5s for client-side hydration & Turnstile loading
    await new Promise(r => setTimeout(r, 3500));
    await takeDebugScreenshot(page, '01_after_navigation');

    // 1. Check and solve Cloudflare Turnstile if present right after navigation
    await handleCloudflareChallenge(page);

    // Check if Cloudflare or login wall is shown
    const isLoginPromptVisible = await page.$('button[data-testid="login-button"], a[href*="/login"]');
    if (isLoginPromptVisible) {
      console.warn('\n[Warning] It seems you are not logged in. ChatGPT may limit requests or prompt for login.');
      console.warn('Consider running: node scripts/chatgptScraper.mjs --login\n');
    }

    // Wait for the prompt input area
    console.log('[ChatGPT Scraper] Waiting for prompt input area...');
    const inputSelectorCandidates = [
      '#prompt-textarea',
      'div#prompt-textarea',
      'div.ProseMirror',
      'div[contenteditable="true"]',
      'div[role="textbox"]',
      'textarea[tabindex="0"]',
      'textarea[placeholder*="Ask ChatGPT"]',
      '[data-placeholder*="Ask ChatGPT"]'
    ];

    let inputElement = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      for (const selector of inputSelectorCandidates) {
        try {
          await page.waitForSelector(selector, { timeout: 4000 });
          inputElement = await page.$(selector);
          if (inputElement) break;
        } catch {
          // try next
        }
      }
      if (inputElement) break;

      // If not found yet, check if Turnstile challenge appeared
      await handleCloudflareChallenge(page);
      await new Promise(r => setTimeout(r, 1500));
    }

    if (!inputElement) {
      // Last resort: evaluate any contenteditable or textarea on page
      inputElement = await page.$('div[contenteditable="true"], textarea');
    }

    // If still not found, try one final Cloudflare check
    if (!inputElement) {
      await handleCloudflareChallenge(page);
      inputElement = await page.$('#prompt-textarea, div.ProseMirror, div[contenteditable="true"], textarea');
    }

    if (!inputElement) {
      await takeDebugScreenshot(page, '99_input_box_not_found');
      throw new Error('Could not find ChatGPT input box. ChatGPT might be presenting an unresolved verification challenge or UI updated.');
    }

    console.log('[ChatGPT Scraper] Dismissing any overlay dialogs if present...');
    await page.evaluate(() => {
      // 1. Safe explicit close selectors
      const closeSelectors = [
        'button#onetrust-accept-btn-handler',
        'button[data-testid="close-dialog-button"]',
        'button[data-testid="close-button"]',
        'button[aria-label="Close"]',
        'button[aria-label="Dismiss"]',
        'button[aria-label="Close dialog"]'
      ];
      for (const sel of closeSelectors) {
        document.querySelectorAll(sel).forEach(b => {
          try { b.click(); } catch {}
        });
      }

      // 2. Safe dismiss buttons by text (e.g. "Stay logged out", "Dismiss", "Maybe later", "Not now")
      // NEVER click all buttons in div[role="dialog"] indiscriminately because that clicks "Log in" or "Sign up"!
      const safeDismissTexts = ['stay logged out', 'dismiss', 'close', 'maybe later', 'not now', 'decline', 'got it'];
      document.querySelectorAll('div[role="dialog"] button, div[role="alertdialog"] button, div.modal button').forEach(b => {
        const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
        if (safeDismissTexts.includes(txt)) {
          try { b.click(); } catch {}
        }
      });
    });
    await takeDebugScreenshot(page, '02_after_dialog_dismissal');

    console.log('[ChatGPT Scraper] Entering prompt into editor...');
    // Focus and click inside DOM safely without hanging on coordinate calculation
    await page.evaluate((el) => {
      if (el) {
        el.focus();
        try { el.click(); } catch {}
      }
    }, inputElement);
    await new Promise(r => setTimeout(r, 300));

    // Reliable input insertion for ProseMirror & Lexical editors:
    // Uses document.execCommand('insertText') which cleanly triggers ProseMirror transactions
    // and enables the submit button without crashing React state.
    const inserted = await page.evaluate((text) => {
      const el = document.querySelector('#prompt-textarea') || 
                 document.querySelector('div.ProseMirror') ||
                 document.querySelector('div[contenteditable="true"]') || 
                 document.querySelector('textarea');
      if (el) {
        el.focus();
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        } else {
          // For ProseMirror / contenteditable:
          document.execCommand('selectAll', false, null);
          const success = document.execCommand('insertText', false, text);
          if (success) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
          // Fallback if execCommand returned false
          el.innerText = text;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }));
          return true;
        }
      }
      return false;
    }, prompt);

    if (!inserted) {
      // Fallback: CDP Input.insertText
      try {
        const client = await page.target().createCDPSession();
        await client.send('Input.insertText', { text: prompt });
      } catch (cdpErr) {
        console.warn('[ChatGPT Scraper] CDP insertText fallback failed:', cdpErr.message);
      }
    }

    await takeDebugScreenshot(page, '03_after_prompt_typed');

    console.log('[ChatGPT Scraper] Submitting prompt...');
    await new Promise(r => setTimeout(r, 600));

    // Look for send button (or wait briefly up to 4s for it to become enabled)
    const sendButtonSelectorCandidates = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      '#composer-submit-button',
      'button[data-testid="composer-speech-button"] + button',
      'form button[type="submit"]'
    ];

    let clicked = false;
    for (let waitSec = 0; waitSec < 8; waitSec++) {
      for (const btnSelector of sendButtonSelectorCandidates) {
        try {
          const btn = await page.$(btnSelector);
          if (btn) {
            const isDisabled = await page.evaluate(b => b.disabled || b.getAttribute('aria-disabled') === 'true', btn);
            if (!isDisabled) {
              await page.evaluate(b => b.click(), btn);
              clicked = true;
              console.log(`[ChatGPT Scraper] Clicked send button via selector: ${btnSelector}`);
              break;
            }
          }
        } catch {}
      }
      if (clicked) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (!clicked) {
      console.log('[ChatGPT Scraper] Send button not enabled, falling back to Enter key...');
      await page.keyboard.press('Enter');
    }

    await takeDebugScreenshot(page, '04_after_send_clicked');

    console.log('[ChatGPT Scraper] Prompt sent! Waiting for response to generate...');

    // Wait at least 4 seconds for generation to commence and render first tokens
    await new Promise(r => setTimeout(r, 4000));

    const startTime = Date.now();
    let isGenerating = true;
    let lastLength = 0;
    let stableCount = 0;
    let tookGenerationScreenshot = false;

    while (isGenerating) {
      if (Date.now() - startTime > options.timeout) {
        await takeDebugScreenshot(page, '99_timeout_error');
        throw new Error(`Timeout after ${options.timeout / 1000}s waiting for ChatGPT response.`);
      }

      // Check if Stop button exists (active streaming)
      const isStopPresent = await page.evaluate(() => {
        const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"]');
        return !!stopBtn;
      });

      // Check current text length and completion indicators
      const responseState = await page.evaluate(() => {
        // Look for copy button or action buttons on the latest message (indicates finished generation)
        const hasFinishedActionButtons = !!document.querySelector(
          'article:last-of-type button[aria-label*="Copy"], [data-testid^="conversation-turn-"]:last-of-type button[aria-label*="Copy"], div.agent-turn:last-of-type button[aria-label*="Copy"], section[data-testid^="conversation-turn-"]:last-of-type button[aria-label*="Copy"]'
        );

        // Check modern ChatGPT role="assistant" or .agent-turn or .markdown.prose
        const assistantMsgs = document.querySelectorAll(
          '[data-message-author-role="assistant"], div[role="assistant"], div.agent-turn, section[data-testid^="conversation-turn-"]'
        );
        let text = '';
        if (assistantMsgs.length > 0) {
          const last = assistantMsgs[assistantMsgs.length - 1];
          const md = last.querySelector('.markdown, .prose') || last;
          text = (md.innerText || md.textContent || '').trim();
        }

        if (!text) {
          const allProse = document.querySelectorAll('.markdown, .prose');
          if (allProse.length > 0) {
            const last = allProse[allProse.length - 1];
            text = (last.innerText || last.textContent || '').trim();
          }
        }

        return {
          length: text.length,
          hasFinishedActionButtons
        };
      });

      const currentTextLength = responseState.length;

      // Capture a mid-generation snapshot once tokens start arriving
      if (!tookGenerationScreenshot && currentTextLength > 10) {
        await takeDebugScreenshot(page, '05_during_generation');
        tookGenerationScreenshot = true;
      }

      if (isStopPresent) {
        stableCount = 0;
        lastLength = currentTextLength;
        await new Promise(r => setTimeout(r, 2000));
      } else {
        // Stop button is gone.
        // If finished action buttons (like Copy) are present and length > 0, generation is complete!
        if (responseState.hasFinishedActionButtons && currentTextLength > 0) {
          isGenerating = false;
        } else if (currentTextLength > 0 && currentTextLength === lastLength) {
          stableCount++;
          // Require at least 2 consecutive stable checks (~4s) to guarantee completion
          if (stableCount >= 2) {
            isGenerating = false;
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
        } else {
          lastLength = currentTextLength;
          stableCount = 0;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    console.log('[ChatGPT Scraper] Response complete. Extracting output...');
    await takeDebugScreenshot(page, '06_generation_complete');

    // Extract assistant's last message
    const result = await page.evaluate(() => {
      // 1. Role assistant, agent-turn, conversation-turn
      const assistantMessages = document.querySelectorAll(
        '[data-message-author-role="assistant"], div[role="assistant"], div.agent-turn, section[data-testid^="conversation-turn-"]'
      );
      if (assistantMessages.length > 0) {
        for (let i = assistantMessages.length - 1; i >= 0; i--) {
          const msg = assistantMessages[i];
          const markdownBody = msg.querySelector('.markdown, .prose') || msg;
          const text = markdownBody.innerText?.trim() || markdownBody.textContent?.trim() || '';
          if (text && text.length > 0) {
            return {
              text: text,
              html: markdownBody.innerHTML?.trim() || text
            };
          }
        }
      }

      // 2. Modern ChatGPT: article turns
      const turns = document.querySelectorAll('article, [data-testid^="conversation-turn-"]');
      if (turns.length > 0) {
        for (let i = turns.length - 1; i >= 0; i--) {
          const turn = turns[i];
          const md = turn.querySelector('.markdown, .prose') || turn;
          const text = md.innerText?.trim() || md.textContent?.trim() || '';
          if (text && text.length > 0) {
            return {
              text: text,
              html: md.innerHTML?.trim() || text
            };
          }
        }
      }

      // 3. Fallback: all markdown or prose blocks
      const markdownBlocks = document.querySelectorAll('.markdown, .prose, [class*="agent-turn"]');
      if (markdownBlocks.length > 0) {
        const lastBlock = markdownBlocks[markdownBlocks.length - 1];
        const text = lastBlock.innerText?.trim() || lastBlock.textContent?.trim() || '';
        if (text && text.length > 0) {
          return {
            text: text,
            html: lastBlock.innerHTML?.trim() || text
          };
        }
      }

      return null;
    });

    if (!result || !result.text) {
      await takeDebugScreenshot(page, '99_parsing_failure');
      throw new Error('Failed to parse ChatGPT response content from the page.');
    }

    console.log('\n--- ChatGPT Response ---\n');
    console.log(result.text);
    console.log('\n-------------------------\n');

    if (options.output) {
      const outPath = path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outPath, result.text, 'utf-8');
      console.log(`[ChatGPT Scraper] Output saved to: ${outPath}`);
    }

    return result;
  } catch (err) {
    console.error(`\n[ChatGPT Scraper Error] ${err.message}`);
    await takeDebugScreenshot(page, '99_error_state');
    throw err;
  } finally {
    await browser.close();
  }
}

export { scrapeChatGPT, launchBrowser };

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    return;
  }

  if (options.login) {
    await handleLoginMode();
    return;
  }

  if (!options.prompt) {
    printHelp();
    return;
  }

  await scrapeChatGPT(options.prompt, options);
}

// Only invoke main when called directly from CLI
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

