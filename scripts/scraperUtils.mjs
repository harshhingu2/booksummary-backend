import fs from 'fs';
import path from 'path';

export const LOW_RAM_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-infobars',
  '--disable-blink-features=AutomationControlled',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--no-first-run',
  '--mute-audio',
  '--disk-cache-size=1',
  '--media-cache-size=1',
  '--aggressive-cache-discard',
  '--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints,CalculateNativeWinOcclusion',
  '--js-flags=--max-old-space-size=256',
];

const DISPOSABLE_PROFILE_PATHS = [
  'Default/Cache',
  'Default/Code Cache',
  'Default/GPUCache',
  'Default/DawnCache',
  'Default/DawnGraphiteCache',
  'Default/DawnWebGPUCache',
  'Default/Service Worker/CacheStorage',
  'Default/Service Worker/ScriptCache',
  'ShaderCache',
  'GrShaderCache',
  'GPUPersistentCache',
  'GraphiteDawnCache',
  'Crashpad',
  'BrowserMetrics',
  'BrowserMetrics-spare.pma',
  'component_crx_cache',
  'extensions_crx_cache',
  'OptimizationGuideModelsManifest',
  'OnDeviceHeadSuggestModel',
  'WidevineCdm',
];

/**
 * Remove heavy browser cache/metrics bloat from a Chrome userDataDir
 * while preserving cookies, localStorage, IndexedDB, and login state.
 */
export function pruneProfileCache(profileDir) {
  if (!profileDir || !fs.existsSync(profileDir)) return;
  for (const rel of DISPOSABLE_PROFILE_PATHS) {
    const target = path.join(profileDir, rel);
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    } catch {
      // Ignore locked files
    }
  }
}

/**
 * Force-kill the Chromium process if graceful close hangs or leaves orphans.
 */
export function forceKillBrowserProcess(browser) {
  try {
    const proc = browser?.process?.();
    if (!proc || proc.killed) return;
    try {
      proc.kill('SIGKILL');
    } catch {}
  } catch {}
}

/**
 * Gracefully close Puppeteer browser with a hard timeout, then force-kill if still alive.
 */
export async function closeBrowserSafely(browser, profileDir) {
  if (!browser) return;
  try {
    await Promise.race([
      browser.close(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch {}
  forceKillBrowserProcess(browser);
  pruneProfileCache(profileDir);
}

/**
 * Ensure Chromium is killed if Node receives SIGINT/SIGTERM/SIGHUP (e.g. cron timeout or Kill button).
 */
export function registerShutdownHooks(getBrowser, profileDir) {
  const cleanupAndExit = (signal) => {
    try {
      const browser = getBrowser?.();
      forceKillBrowserProcess(browser);
      pruneProfileCache(profileDir);
    } catch {}
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };

  process.once('SIGTERM', () => cleanupAndExit('SIGTERM'));
  process.once('SIGINT', () => cleanupAndExit('SIGINT'));
  process.once('SIGHUP', () => cleanupAndExit('SIGHUP'));
}

/**
 * Abort heavy media and font requests to reduce renderer RAM usage without breaking app scripts/auth.
 */
export async function setupLowRamPage(page) {
  try {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'media' || type === 'font') {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });
  } catch {
    // Ignore if interception already enabled
  }
}
