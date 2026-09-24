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

  const launchOptions = {
    headless: headless ? 'new' : false,
    userDataDir: USER_DATA_DIR,
    defaultViewport: null,
    protocolTimeout: 300000, // 5 minutes to prevent CDP callFunctionOn timeouts during long streaming
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-infobars',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  };

  if (chromeExe) {
    launchOptions.executablePath = chromeExe;
  }

  const browser = await puppeteer.launch(launchOptions);



  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  return { browser, page };
}

async function handleLoginMode() {
  console.log('\n[ChatGPT Scraper] Launching browser for manual login...');
  console.log(`[ChatGPT Scraper] Using persistent profile directory: ${USER_DATA_DIR}`);

  const { browser, page } = await launchBrowser(false);
  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'networkidle2', timeout: 60000 });
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
    await page.goto('https://chatgpt.com/', { waitUntil: 'networkidle2', timeout: 60000 });

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
      'div[contenteditable="true"]',
      'div[role="textbox"]',
      'textarea[tabindex="0"]',
      'textarea[placeholder*="Ask ChatGPT"]',
      '[data-placeholder*="Ask ChatGPT"]'
    ];

    let inputElement = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const selector of inputSelectorCandidates) {
        try {
          await page.waitForSelector(selector, { timeout: 8000 });
          inputElement = await page.$(selector);
          if (inputElement) break;
        } catch {
          // try next
        }
      }
      if (inputElement) break;
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!inputElement) {
      // Last resort: evaluate any contenteditable or textarea on page
      inputElement = await page.$('div[contenteditable="true"], textarea');
    }

    if (!inputElement) {
      throw new Error('Could not find ChatGPT input box. ChatGPT might be presenting a verification challenge or UI updated.');
    }

    console.log('[ChatGPT Scraper] Dismissing any overlay dialogs if present...');
    await page.evaluate(() => {
      const closeSelectors = [
        'button#onetrust-accept-btn-handler',
        'button[data-testid="close-dialog-button"]',
        'button[aria-label="Close"]',
        'div[role="dialog"] button'
      ];
      for (const sel of closeSelectors) {
        document.querySelectorAll(sel).forEach(b => {
          try { b.click(); } catch {}
        });
      }
    });

    console.log('[ChatGPT Scraper] Entering prompt into editor...');
    await page.evaluate((el) => {
      el.focus();
    }, inputElement);
    await inputElement.click({ delay: 50 }).catch(() => {});
    await new Promise(r => setTimeout(r, 400));

    // Reliable input insertion across React / Lexical editors
    await page.evaluate((text) => {
      const el = document.querySelector('#prompt-textarea') || 
                 document.querySelector('div[contenteditable="true"]') || 
                 document.querySelector('div[role="textbox"]') || 
                 document.querySelector('textarea');
      if (el) {
        el.focus();
        if (el.tagName === 'TEXTAREA') {
          el.value = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Lexical editor paragraph nodes
          el.innerHTML = '';
          const lines = text.split('\n');
          for (const line of lines) {
            const p = document.createElement('p');
            p.textContent = line.length > 0 ? line : '\u00A0';
            el.appendChild(p);
          }
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, prompt);

    console.log('[ChatGPT Scraper] Triggering state update...');
    // Keystrokes to trigger Lexical React state update and enable the send button
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 500));

    console.log('[ChatGPT Scraper] Submitting prompt...');
    // Look for send button or press Enter
    const sendButtonSelectorCandidates = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      '#composer-submit-button',
      'button[data-testid="composer-speech-button"] + button',
      'form button[type="submit"]'
    ];

    let clicked = false;
    for (const btnSelector of sendButtonSelectorCandidates) {
      try {
        const btn = await page.$(btnSelector);
        if (btn) {
          const isDisabled = await page.evaluate(b => b.disabled || b.getAttribute('aria-disabled') === 'true', btn);
          if (!isDisabled) {
            // Click natively via DOM evaluate so it never hangs on coordinate hit-testing
            await page.evaluate(b => b.click(), btn);
            clicked = true;
            console.log(`[ChatGPT Scraper] Clicked send button via selector: ${btnSelector}`);
            break;
          }
        }
      } catch {
        // continue
      }
    }

    if (!clicked) {
      console.log('[ChatGPT Scraper] Send button not enabled, falling back to Enter key...');
      await page.keyboard.press('Enter');
    }

    console.log('[ChatGPT Scraper] Prompt sent! Waiting for response to generate...');

    // Wait at least 4 seconds for generation to commence and render first tokens
    await new Promise(r => setTimeout(r, 4000));

    const startTime = Date.now();
    let isGenerating = true;
    let lastLength = 0;
    let stableCount = 0;

    while (isGenerating) {
      if (Date.now() - startTime > options.timeout) {
        throw new Error(`Timeout after ${options.timeout / 1000}s waiting for ChatGPT response.`);
      }

      // Check if Stop button exists (active streaming)
      const isStopPresent = await page.evaluate(() => {
        const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"]');
        return !!stopBtn;
      });

      // Check current text length of the latest response
      const currentTextLength = await page.evaluate(() => {
        const assistantMsgs = document.querySelectorAll('[data-message-author-role="assistant"]');
        if (assistantMsgs.length > 0) {
          const last = assistantMsgs[assistantMsgs.length - 1];
          const md = last.querySelector('.markdown, .prose') || last;
          return (md.innerText || md.textContent || '').trim().length;
        }

        const turns = document.querySelectorAll('article, [data-testid^="conversation-turn-"]');
        if (turns.length > 1) {
          const lastTurn = turns[turns.length - 1];
          const md = lastTurn.querySelector('.markdown, .prose') || lastTurn;
          return (md.innerText || md.textContent || '').trim().length;
        }

        const allProse = document.querySelectorAll('.markdown, .prose');
        if (allProse.length > 0) {
          const last = allProse[allProse.length - 1];
          return (last.innerText || last.textContent || '').trim().length;
        }

        return 0;
      });

      if (isStopPresent) {
        stableCount = 0;
        lastLength = currentTextLength;
        await new Promise(r => setTimeout(r, 2000));
      } else {
        // Stop button is gone. Check if content has stopped changing and has substantial length (> 50 chars)
        if (currentTextLength > 50 && currentTextLength === lastLength) {
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

    // Extract assistant's last message
    const result = await page.evaluate(() => {
      // 1. Check data-message-author-role="assistant"
      const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
      if (assistantMessages.length > 0) {
        const lastMsg = assistantMessages[assistantMessages.length - 1];
        const markdownBody = lastMsg.querySelector('.markdown, .prose') || lastMsg;
        const text = markdownBody.innerText?.trim() || markdownBody.textContent?.trim() || '';
        if (text) {
          return {
            text: text,
            html: markdownBody.innerHTML?.trim() || text
          };
        }
      }

      // 2. Modern ChatGPT: article turns
      const turns = document.querySelectorAll('article, [data-testid^="conversation-turn-"]');
      if (turns.length > 0) {
        for (let i = turns.length - 1; i >= 0; i--) {
          const turn = turns[i];
          const md = turn.querySelector('.markdown, .prose') || turn;
          const text = md.innerText?.trim() || md.textContent?.trim() || '';
          if (text && text.length > 20) {
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
        if (text) {
          return {
            text: text,
            html: lastBlock.innerHTML?.trim() || text
          };
        }
      }

      return null;
    });

    if (!result || !result.text) {
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
    try {
      const debugScreenshotPath = path.resolve(process.cwd(), 'chatgpt_scraper_error.png');
      await page.screenshot({ path: debugScreenshotPath });
      console.log(`[ChatGPT Scraper] Debug screenshot saved to ${debugScreenshotPath}`);
    } catch {
      // ignore screenshot failure
    }
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

