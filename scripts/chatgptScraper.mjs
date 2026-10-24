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
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DEBUG_SCREENSHOT_PATH = path.join(PUBLIC_DIR, 'debug_chatgpt.png');

async function saveDebugScreenshot(page, stepName) {
  try {
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    await page.screenshot({ path: DEBUG_SCREENSHOT_PATH, fullPage: false });
    console.log(`[ChatGPT Scraper Screenshot] Updated (${stepName}) -> public/debug_chatgpt.png`);
  } catch (err) {
    console.warn(`[ChatGPT Scraper Screenshot Failed] ${stepName}: ${err.message}`);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    login: false,
    prompt: '',
    headless: false,
    timeout: 420000,
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


async function launchBrowser(headless = false, useProfile = false) {
  function findChromeExecutable() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
      return process.env.CHROME_BIN;
    }

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
        } catch {}
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

  // Only use persistent profile directory when explicitly requested (e.g. during --login)
  // For headless scraping, using a clean profile with fresh session cookies prevents Cloudflare device-fingerprint bans.
  if (useProfile) {
    if (!fs.existsSync(USER_DATA_DIR)) {
      fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }
    launchOptions.userDataDir = USER_DATA_DIR;
  }

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

  // Attach diagnostic error listeners
  page.on('pageerror', err => {
    console.warn(`[ChatGPT Scraper PageError] ${err.message.slice(0, 160)}`);
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
      const inputFound = await page.$('#prompt-textarea, div.ProseMirror, textarea, textarea#mobile-composer-prompt');
      if (inputFound) {
        console.log('[ChatGPT Scraper] Cloudflare Turnstile successfully solved!');

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

  const { browser, page } = await launchBrowser(false, true);
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

  // Clean up any stale profile directory before headless run so it always starts fresh
  if (fs.existsSync(USER_DATA_DIR)) {
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
      console.log('[ChatGPT Scraper] Cleared stale profile cache (.chatgpt_profile)');
    } catch {}
  }

  console.log(`[ChatGPT Scraper] Launching browser (headless: ${options.headless})...`);
  const { browser, page } = await launchBrowser(options.headless, false);

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

    // Give time for client-side hydration & Turnstile loading
    await new Promise(r => setTimeout(r, 4000));
    await saveDebugScreenshot(page, 'after-navigation');

    // 1. Check and solve Cloudflare Turnstile if present right after navigation
    await handleCloudflareChallenge(page);
    await saveDebugScreenshot(page, 'after-challenge-check');

    // Check if login wall is shown
    const isLoginPromptVisible = await page.$('button[data-testid="login-button"], a[href*="/login"]');
    if (isLoginPromptVisible) {
      console.warn('\n[Warning] It seems you are not logged in. ChatGPT may limit requests or prompt for login.');
      console.warn('Consider running: node scripts/chatgptScraper.mjs --login\n');
      await saveDebugScreenshot(page, 'login-wall-detected');
    }

    // Wait for prompt input area across all modern ChatGPT UI variations
    console.log('[ChatGPT Scraper] Waiting for prompt input area...');
    const combinedInputSelector = '#prompt-textarea, div.ProseMirror, textarea[placeholder*="Ask"], textarea#mobile-composer-prompt, textarea.wcDTda_fallbackTextarea, div[contenteditable="true"], textarea';

    let inputElement = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        await page.waitForSelector(combinedInputSelector, { timeout: 3500 });
        inputElement = await page.$(combinedInputSelector);
        if (inputElement) break;
      } catch {}

      // If not found yet, check if Turnstile challenge appeared
      await handleCloudflareChallenge(page);
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!inputElement) {
      inputElement = await page.$('textarea, div[contenteditable="true"]');
    }

    if (!inputElement) {
      await saveDebugScreenshot(page, 'missing-input-box');
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

      // 2. Safe dismiss buttons by text
      const safeDismissTexts = ['stay logged out', 'dismiss', 'close', 'maybe later', 'not now', 'decline', 'got it'];
      document.querySelectorAll('div[role="dialog"] button, div[role="alertdialog"] button, div.modal button').forEach(b => {
        const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
        if (safeDismissTexts.includes(txt)) {
          try { b.click(); } catch {}
        }
      });
    });

    console.log('[ChatGPT Scraper] Entering prompt into editor...');
    // Focus the visible editable ProseMirror or prompt element (ignoring hidden fallback textareas)
    await page.evaluate(() => {
      const el = document.querySelector('div#prompt-textarea.ProseMirror') ||
                 document.querySelector('div#prompt-textarea') ||
                 document.querySelector('div.ProseMirror') ||
                 document.querySelector('#prompt-textarea') ||
                 document.querySelector('div[contenteditable="true"]') ||
                 document.querySelector('textarea:not([style*="display: none"]):not([hidden])');
      if (el) {
        el.focus();
        if (typeof el.click === 'function') try { el.click(); } catch {}
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Ensure ChatGPT outputs in Canvas / Code Block so extraction is clean and never leaks UI chrome
    const finalPrompt = prompt + "\n\nImportant: Output the HTML document in Canvas (or a single clean markdown HTML code block ```html ... ```). Do not include chat commentary outside the block.";

    // Type the prompt using CDP Input.insertText (cleanest for modern ProseMirror & React state)
    try {
      const client = await page.target().createCDPSession();
      await client.send('Input.insertText', { text: finalPrompt });
    } catch {
      await page.keyboard.type(finalPrompt, { delay: 2 });
    }

    await saveDebugScreenshot(page, 'prompt-entered');

    console.log('[ChatGPT Scraper] Submitting prompt...');
    await new Promise(r => setTimeout(r, 600));

    // Look for send button (or wait briefly up to 4s for it to become enabled)
    const sendButtonSelectorCandidates = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="submit"]',
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

    await saveDebugScreenshot(page, 'prompt-sent');

    console.log('[ChatGPT Scraper] Prompt sent! Waiting for response to generate...');

    // Wait at least 4 seconds for generation to commence and render first tokens
    await new Promise(r => setTimeout(r, 4000));

    const startTime = Date.now();
    let isGenerating = true;
    let lastLength = 0;
    let stableCount = 0;

    while (isGenerating) {
      if (Date.now() - startTime > options.timeout) {
        await saveDebugScreenshot(page, 'timeout-during-generation');
        throw new Error(`Timeout after ${options.timeout / 1000}s waiting for ChatGPT response.`);
      }

      // Check if Stop button exists (active streaming)
      const isStopPresent = await page.evaluate(() => {
        const stopBtn = document.querySelector(
          'button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="stop"]'
        );
        return !!stopBtn;
      });

      // Check current text length and completion indicators across all ChatGPT UI versions (including Canvas / Writing block)
      const responseState = await page.evaluate(() => {
        const hasFinishedActionButtons = !!document.querySelector(
          'button[aria-label*="Copy"], button[data-testid*="copy"], button[aria-label*="copy"], button[aria-label*="Read aloud"], button[aria-label*="Good response"]'
        );

        // Check Canvas / Artifact / Writing document block
        const canvasContainers = document.querySelectorAll(
          '[data-testid*="canvas"], [data-testid*="artifact"], div[class*="canvas"], div[class*="prose"], div.cm-content, div[role="region"], div[contenteditable="false"]'
        );
        let canvasText = '';
        for (const c of canvasContainers) {
          const t = (c.innerText || c.textContent || '').trim();
          if (t.length > canvasText.length) {
            canvasText = t;
          }
        }

        // 1. Check all assistant messages explicitly
        const assistantMsgs = document.querySelectorAll(
          '[data-message-author-role="assistant"], div[role="assistant"], div.agent-turn, article[data-testid*="assistant"], div[data-testid*="assistant"]'
        );
        let text = '';
        if (assistantMsgs.length > 0) {
          const last = assistantMsgs[assistantMsgs.length - 1];
          const md = last.querySelector('.markdown, .prose, div[class*="markdown"], pre, code') || last;
          text = (md.innerText || md.textContent || '').trim();
        }

        // 2. Check conversation turns from bottom up that are NOT user turns
        if (!text) {
          const turns = document.querySelectorAll('article, [data-testid^="conversation-turn-"]');
          for (let i = turns.length - 1; i >= 0; i--) {
            const turn = turns[i];
            const isUser = !!turn.querySelector('[data-message-author-role="user"]') ||
                           turn.getAttribute('data-message-author-role') === 'user' ||
                           !!turn.querySelector('div[data-testid="user-turn"]');
            if (!isUser) {
              const md = turn.querySelector('.markdown, .prose, div[class*="markdown"], pre, code') || turn;
              const extracted = (md.innerText || md.textContent || '').trim();
              if (extracted) {
                text = extracted;
                break;
              }
            }
          }
        }

        const finalText = canvasText.length > text.length ? canvasText : text;

        return {
          length: finalText.length,
          hasFinishedActionButtons,
          sampleText: finalText.slice(0, 80)
        };
      });

      const currentTextLength = responseState.length;

      if (isStopPresent) {
        stableCount = 0;
        lastLength = currentTextLength;
        await new Promise(r => setTimeout(r, 2000));
      } else {
        // Generation is complete if stop button is gone and:
        // 1. Copy or action buttons appeared, OR
        // 2. Text has arrived (> 100 chars) and remained stable for 2 consecutive checks
        if ((responseState.hasFinishedActionButtons && currentTextLength > 100) ||
            (currentTextLength > 100 && currentTextLength === lastLength && ++stableCount >= 2)) {
          isGenerating = false;
        } else if (currentTextLength > 0 && currentTextLength === lastLength) {
          stableCount++;
          if (stableCount >= 3) {
            isGenerating = false;
          } else {
            await new Promise(r => setTimeout(r, 2000));
          }
        } else if (currentTextLength > 0) {
          lastLength = currentTextLength;
          stableCount = 0;
          await new Promise(r => setTimeout(r, 2000));
        } else {
          // If length is still 0, wait and log progress
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    console.log('[ChatGPT Scraper] Response complete. Extracting output...');

    // Extract assistant's last message with comprehensive fallbacks (strictly Canvas / Code block / Assistant turn)
    const result = await page.evaluate(() => {
      // Helper to clean markdown code fences if wrapped in ```html ... ```
      function sanitizeHtmlOutput(raw) {
        if (!raw) return raw;
        let s = raw.trim();
        if (s.startsWith('```html')) {
          s = s.slice(7).trimStart();
        } else if (s.startsWith('```')) {
          s = s.slice(3).trimStart();
        }
        if (s.endsWith('```')) {
          s = s.slice(0, -3).trimEnd();
        }
        return s.trim();
      }

      // 1. Check for Canvas / Writing / Document widget first
      const canvasCandidate = document.querySelector(
        'div[data-testid*="canvas"] .prose, div[class*="canvas"] .prose, div[class*="writing"] .prose, div.cm-content, [data-testid="canvas-content"]'
      );
      if (canvasCandidate) {
        const text = (canvasCandidate.innerText || canvasCandidate.textContent || '').trim();
        if (text && text.length > 200 && !text.includes('Skip to content') && !text.startsWith('# DUMBSCROLL')) {
          return {
            text: sanitizeHtmlOutput(text),
            html: canvasCandidate.innerHTML?.trim() || text
          };
        }
      }

      // 2. Check pre / code block inside main or assistant messages (Canvas or HTML code blocks)
      const codeBlocks = document.querySelectorAll('main pre code, main pre, div[class*="code-block"], div[data-testid*="code-block"]');
      for (let i = codeBlocks.length - 1; i >= 0; i--) {
        const block = codeBlocks[i];
        const text = (block.innerText || block.textContent || '').trim();
        if (text && text.length > 200 && (text.includes('<h1>') || text.includes('<h2>') || text.includes('<p>') || text.includes('&lt;h1&gt;'))) {
          return {
            text: sanitizeHtmlOutput(text),
            html: text
          };
        }
      }

      // 3. Check assistant messages in the main conversation area only (explicitly ignore nav/aside/sidebar)
      const assistantMessages = document.querySelectorAll(
        'main [data-message-author-role="assistant"], main div[role="assistant"], main div.agent-turn, main article[data-testid*="assistant"]'
      );
      if (assistantMessages.length > 0) {
        for (let i = assistantMessages.length - 1; i >= 0; i--) {
          const msg = assistantMessages[i];
          const markdownBody = msg.querySelector('.markdown, .prose, div[class*="markdown"]') || msg;
          const text = (markdownBody.innerText || markdownBody.textContent || '').trim();
          if (text && text.length > 200 && !text.includes('Skip to content') && !text.startsWith('# DUMBSCROLL')) {
            return {
              text: sanitizeHtmlOutput(text),
              html: markdownBody.innerHTML?.trim() || text
            };
          }
        }
      }

      // 4. Conversation turns inside <main>
      const turns = document.querySelectorAll('main article, main [data-testid^="conversation-turn-"]');
      if (turns.length > 0) {
        for (let i = turns.length - 1; i >= 0; i--) {
          const turn = turns[i];
          const isUser = !!turn.querySelector('[data-message-author-role="user"]') ||
                         turn.getAttribute('data-message-author-role') === 'user' ||
                         !!turn.querySelector('div[data-testid="user-turn"]');
          if (!isUser) {
            const md = turn.querySelector('.markdown, .prose, div[class*="markdown"]') || turn;
            const text = (md.innerText || md.textContent || '').trim();
            if (text && text.length > 200 && !text.includes('Skip to content') && !text.startsWith('# DUMBSCROLL')) {
              return {
                text: sanitizeHtmlOutput(text),
                html: md.innerHTML?.trim() || text
              };
            }
          }
        }
      }

      // 5. Direct HTML snippet scanner inside <main> only (strictly avoiding sidebar / nav / header)
      const mainEl = document.querySelector('main') || document.body;
      const elementsInMain = mainEl.querySelectorAll('div, article, section');
      let bestMatch = null;
      let minLength = Infinity; // Find the most specific/tight container

      for (const el of elementsInMain) {
        if (el.closest('nav') || el.closest('aside') || el.closest('[data-message-author-role="user"]')) {
          continue;
        }
        const raw = (el.innerText || el.textContent || '').trim();
        if (
          raw.length > 250 &&
          raw.length < 50000 &&
          !raw.includes('Skip to content') &&
          !raw.startsWith('ChatGPT') &&
          !raw.startsWith('# DUMBSCROLL') &&
          (raw.includes('<h1>') || raw.includes('&lt;h1&gt;')) &&
          (raw.includes('<h2>') || raw.includes('&lt;h2&gt;') || raw.includes('<p>'))
        ) {
          if (raw.length < minLength) {
            minLength = raw.length;
            bestMatch = {
              text: sanitizeHtmlOutput(raw),
              html: el.innerHTML?.trim() || raw
            };
          }
        }
      }

      if (bestMatch) {
        return bestMatch;
      }

      return null;
    });

    if (!result || !result.text) {
      await saveDebugScreenshot(page, 'failed-extraction');
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

    // Success: clean up debug screenshot so only 1 debug screenshot remains when needed/failing
    if (fs.existsSync(DEBUG_SCREENSHOT_PATH)) {
      try {
        fs.unlinkSync(DEBUG_SCREENSHOT_PATH);
        console.log('[ChatGPT Scraper] Successful scrape! Removed debug screenshot.');
      } catch {}
    }

    return result;
  } catch (err) {
    console.error(`\n[ChatGPT Scraper Error] ${err.message}`);
    try {
      await saveDebugScreenshot(page, 'fatal-error');
    } catch {}
    throw err;
  } finally {
    try {
      await browser.close();
    } catch {}
    // Clean up temporary profile cache if created
    if (fs.existsSync(USER_DATA_DIR)) {
      try {
        fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
      } catch {}
    }
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
