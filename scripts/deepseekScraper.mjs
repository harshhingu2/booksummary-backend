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
const USER_DATA_DIR = path.resolve(__dirname, '../.deepseek_profile');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    login: false,
    prompt: '',
    headless: false,
    timeout: 180000,
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
DeepSeek Puppeteer Scraper

Usage:
  node scripts/deepseekScraper.mjs [options] [prompt]

Options:
  --login              Open browser to log into DeepSeek manually and save session
  --headless           Run in headless mode (default)
  --headful            Run with visible browser window
  -o, --output <file>  Save extracted response to a file
  -t, --timeout <sec>  Timeout waiting for response in seconds (default: 180)
  -h, --help           Show this help message

Examples:
  1. First time setup / login:
     node scripts/deepseekScraper.mjs --login

  2. Send a prompt (visible browser window):
     node scripts/deepseekScraper.mjs --headful "Summarize Atomic Habits in 5 key takeaways"

  3. Send a prompt headless and save to file:
     node scripts/deepseekScraper.mjs --headless -o summary.html "Write a short summary of Deep Work"
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
    const fallbackPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null
    ].filter(Boolean);

    const systemChrome = fallbackPaths.find(p => fs.existsSync(p));
    if (systemChrome) return systemChrome;

    const cacheDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Harsh', '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) {
      const walkSync = (dir) => {
        let results = [];
        try {
          const list = fs.readdirSync(dir);
          for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
              results = results.concat(walkSync(fullPath));
            } else if (file.toLowerCase() === 'chrome.exe') {
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
  console.log('\n[DeepSeek Scraper] Launching browser for manual login...');
  console.log(`[DeepSeek Scraper] Using persistent profile directory: ${USER_DATA_DIR}`);

  const { browser, page } = await launchBrowser(false);
  try {
    await page.goto('https://chat.deepseek.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('\n======================================================');
    console.log('1. Log into your DeepSeek account in the opened browser window.');
    console.log('2. Complete any CAPTCHA / 2FA or mobile code challenges.');
    console.log('3. Once you see the chat interface ready, return here.');
    console.log('======================================================\n');

    await askQuestion('Press [ENTER] in this terminal once you are logged in and ready to save profile: ');
    console.log('[DeepSeek Scraper] Session saved successfully!');
  } catch (err) {
    console.error('[DeepSeek Scraper] Error during login session:', err.message);
  } finally {
    await browser.close();
  }
}

async function scrapeDeepSeek(prompt, options = {}) {
  if (!prompt || !prompt.trim()) {
    console.error('Error: Please provide a prompt or use --login.');
    process.exit(1);
  }

  const timeout = options.timeout || 180000;
  const isHeadless = options.headless !== undefined ? options.headless : true;

  console.log(`[DeepSeek Scraper] Launching browser (headless: ${isHeadless})...`);
  const { browser, page } = await launchBrowser(isHeadless);

  try {
    console.log('[DeepSeek Scraper] Navigating to https://chat.deepseek.com/ ...');
    await page.goto('https://chat.deepseek.com/', { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait a brief moment for dynamic client rendering
    await new Promise(r => setTimeout(r, 2000));

    // Check if login wall is present
    const loginWall = await page.$('input[type="tel"], input[type="email"], input[placeholder*="Phone"], input[placeholder*="Email"]');
    if (loginWall) {
      console.warn('\n[Warning] It appears you are on the DeepSeek login page.');
      console.warn('Consider running: node scripts/deepseekScraper.mjs --login\n');
    }

    // Wait for the prompt input area
    console.log('[DeepSeek Scraper] Waiting for prompt input area...');
    const inputSelectorCandidates = [
      'textarea#chat-input',
      'textarea[placeholder*="Message DeepSeek"]',
      'textarea[placeholder*="DeepSeek"]',
      'textarea',
      'div[contenteditable="true"]'
    ];

    let inputElement = null;
    for (const selector of inputSelectorCandidates) {
      try {
        await page.waitForSelector(selector, { timeout: 8000 });
        inputElement = await page.$(selector);
        if (inputElement) break;
      } catch {
        // try next selector
      }
    }

    if (!inputElement) {
      throw new Error('Could not find DeepSeek input box. DeepSeek might be presenting a verification challenge or UI updated.');
    }

    console.log('[DeepSeek Scraper] Entering prompt...');
    await inputElement.click();
    await new Promise(r => setTimeout(r, 200));

    // DeepSeek is a React SPA: directly setting .value bypasses React's internal value tracker
    // We use HTMLTextAreaElement.prototype's native value descriptor setter + dispatch synthetic input event
    await page.evaluate((text) => {
      const el = document.querySelector('textarea#chat-input') ||
                 document.querySelector('textarea[placeholder*="DeepSeek"]') ||
                 document.querySelector('textarea') ||
                 document.querySelector('div[contenteditable="true"]');
      if (el) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
          )?.set || Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          )?.set;

          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, text);
          } else {
            el.value = text;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.focus();
          el.innerText = text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }, prompt);

    // Also simulate typing a trailing space and backspace via Puppeteer keyboard to trigger React onChange
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');

    await new Promise(r => setTimeout(r, 800));

    // Find and click send button (wait for it to become enabled)
    const sendButtonCandidates = [
      'div[role="button"][aria-label*="Send"]:not([aria-disabled="true"])',
      'button[aria-label*="Send"]:not(:disabled)',
      'div[aria-label="Send"]:not([aria-disabled="true"])',
      'button[type="submit"]:not(:disabled)',
      '.ds-icon-button:not([aria-disabled="true"])',
      'div[role="button"][aria-label*="Send"]',
      'button[aria-label*="Send"]'
    ];

    let clicked = false;
    for (const btnSelector of sendButtonCandidates) {
      const btn = await page.$(btnSelector);
      if (btn) {
        const canClick = await page.evaluate(b => {
          const style = window.getComputedStyle(b);
          return style.display !== 'none' && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
        }, btn);
        if (canClick) {
          await btn.click();
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      console.log('[DeepSeek Scraper] Send button not clickable, pressing Enter...');
      await page.keyboard.press('Enter');
    }

    console.log('[DeepSeek Scraper] Prompt sent! Waiting for response to generate...');
    await new Promise(r => setTimeout(r, 3000));

    // Wait for generation to start and complete
    const startTime = Date.now();
    let isGenerating = true;

    const stopButtonSelectors = [
      'div[role="button"][aria-label*="Stop"]',
      'button[aria-label*="Stop"]',
      'div.ds-stop-button'
    ];

    while (isGenerating) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout after ${timeout / 1000}s waiting for DeepSeek response.`);
      }

      let foundStopBtn = false;
      for (const stopSel of stopButtonSelectors) {
        const btn = await page.$(stopSel);
        if (btn) {
          foundStopBtn = true;
          break;
        }
      }

      if (!foundStopBtn) {
        await new Promise(r => setTimeout(r, 2000));
        let recheckStop = false;
        for (const stopSel of stopButtonSelectors) {
          const btn = await page.$(stopSel);
          if (btn) {
            recheckStop = true;
            break;
          }
        }
        if (!recheckStop) {
          isGenerating = false;
        }
      } else {
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    console.log('[DeepSeek Scraper] Response complete. Extracting output...');

    // Extract assistant message content
    const result = await page.evaluate(() => {
      // DeepSeek's assistant message container class
      const assistantContainers = Array.from(document.querySelectorAll(
        '.ds-assistant-message-main-content, [class*="ds-assistant-message-main-content"]'
      ));

      if (assistantContainers.length > 0) {
        const lastMsg = assistantContainers[assistantContainers.length - 1];
        if (lastMsg.innerText && lastMsg.innerText.trim()) {
          return {
            text: lastMsg.innerText.trim(),
            html: lastMsg.innerHTML.trim()
          };
        }
      }

      // 2. Search for all rendered markdown containers
      const allMarkdown = Array.from(document.querySelectorAll('.ds-markdown, .markdown, [class*="ds-markdown"]'));
      if (allMarkdown.length > 0) {
        // Filter for containers with substantial text
        for (let i = allMarkdown.length - 1; i >= 0; i--) {
          const md = allMarkdown[i];
          if (md.innerText && md.innerText.trim().length > 50) {
            return {
              text: md.innerText.trim(),
              html: md.innerHTML.trim()
            };
          }
        }
        const lastMd = allMarkdown[allMarkdown.length - 1];
        if (lastMd.innerText && lastMd.innerText.trim()) {
          return {
            text: lastMd.innerText.trim(),
            html: lastMd.innerHTML.trim()
          };
        }
      }

      // 3. Search for assistant message bubbles or chat turns
      const candidateNodes = Array.from(document.querySelectorAll(
        '[data-role="assistant"], [class*="chat-message-assistant"], [class*="message-assistant"], [class*="ds-chat-turn"], article'
      ));

      for (let i = candidateNodes.length - 1; i >= 0; i--) {
        const node = candidateNodes[i];
        const text = node.innerText ? node.innerText.trim() : '';
        if (text && text.length > 20 && !text.startsWith('User:') && !text.includes('Message DeepSeek')) {
          const innerMd = node.querySelector('.ds-assistant-message-main-content, .ds-markdown, .markdown');
          if (innerMd && innerMd.innerText.trim()) {
            return {
              text: innerMd.innerText.trim(),
              html: innerMd.innerHTML.trim()
            };
          }
          return {
            text: text,
            html: node.innerHTML.trim()
          };
        }
      }

      return null;
    });

    if (!result || !result.text) {
      throw new Error('Failed to parse DeepSeek response content from the page.');
    }

    console.log('\n--- DeepSeek Response ---\n');
    console.log(result.text);
    console.log('\n-------------------------\n');

    if (options.output) {
      const outPath = path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outPath, result.text, 'utf-8');
      console.log(`[DeepSeek Scraper] Output saved to: ${outPath}`);
    }

    return result;
  } catch (err) {
    console.error(`\n[DeepSeek Scraper Error] ${err.message}`);
    try {
      const debugScreenshotPath = path.resolve(process.cwd(), 'deepseek_scraper_error.png');
      await page.screenshot({ path: debugScreenshotPath });
      console.log(`[DeepSeek Scraper] Debug screenshot saved to ${debugScreenshotPath}`);
    } catch {
      // ignore screenshot failure
    }
    throw err;
  } finally {
    await browser.close();
  }
}

export { scrapeDeepSeek, launchBrowser };

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

  await scrapeDeepSeek(options.prompt, options);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
