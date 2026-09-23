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
    timeout: 120000,
    output: null,
    help: false
  };

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
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('-')) {
      options.prompt = arg;
    }
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

    console.log('[ChatGPT Scraper] Entering prompt...');
    await inputElement.focus();
    await inputElement.click();
    await new Promise(r => setTimeout(r, 400));

    // Reliable input insertion across React / Lexical editors
    const typed = await page.evaluate((text) => {
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
          return true;
        } else {
          // Use execCommand to simulate native text entry for Lexical / ProseMirror
          document.execCommand('selectAll', false, null);
          const success = document.execCommand('insertText', false, text);
          if (!success || !el.innerText || el.innerText.trim().length === 0) {
            el.innerText = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return true;
        }
      }
      return false;
    }, prompt);

    if (!typed) {
      await page.keyboard.type(prompt.slice(0, 100));
    }

    // Give a short pause for the UI state to enable send button
    await new Promise(r => setTimeout(r, 800));

    // Look for send button or press Enter
    const sendButtonSelectorCandidates = [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Ask ChatGPT"]',
      '#composer-submit-button',
      'button:has(svg)'
    ];

    let clicked = false;
    for (const btnSelector of sendButtonSelectorCandidates) {
      try {
        const btn = await page.$(btnSelector);
        if (btn) {
          const isDisabled = await page.evaluate(b => b.disabled || b.getAttribute('aria-disabled') === 'true', btn);
          if (!isDisabled) {
            await btn.click();
            clicked = true;
            break;
          }
        }
      } catch {
        // continue
      }
    }

    if (!clicked) {
      // Fallback to pressing Enter
      await page.keyboard.press('Enter');
    }

    console.log('[ChatGPT Scraper] Prompt sent! Waiting for response to generate...');

    // Wait for generation to start and complete
    // ChatGPT displays a stop button (data-testid="stop-button" or aria-label="Stop generating") while generating
    await new Promise(r => setTimeout(r, 2000));

    const startTime = Date.now();
    let isGenerating = true;

    while (isGenerating) {
      if (Date.now() - startTime > options.timeout) {
        throw new Error(`Timeout after ${options.timeout / 1000}s waiting for ChatGPT response.`);
      }

      const stopBtn = await page.$('button[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label="Stop streaming"]');
      if (!stopBtn) {
        // Double check after 1.5s to avoid race conditions right when sending
        await new Promise(r => setTimeout(r, 1500));
        const stopBtnRetry = await page.$('button[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label="Stop streaming"]');
        if (!stopBtnRetry) {
          isGenerating = false;
        }
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log('[ChatGPT Scraper] Response complete. Extracting output...');

    // Extract assistant's last message
    const result = await page.evaluate(() => {
      // ChatGPT assistant messages are identified by [data-message-author-role="assistant"]
      const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
      if (assistantMessages.length > 0) {
        const lastMsg = assistantMessages[assistantMessages.length - 1];
        // The markdown container inside
        const markdownBody = lastMsg.querySelector('.markdown') || lastMsg;
        return {
          text: markdownBody.innerText.trim(),
          html: markdownBody.innerHTML.trim()
        };
      }

      // Alternative fallback selector
      const turns = document.querySelectorAll('article');
      if (turns.length > 0) {
        const lastTurn = turns[turns.length - 1];
        return {
          text: lastTurn.innerText.trim(),
          html: lastTurn.innerHTML.trim()
        };
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

