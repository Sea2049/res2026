import { Browser, chromium } from "playwright";

export interface LaunchOptions {
  headless: boolean;
  display?: string;
  executablePath?: string;
}

export const DEFAULT_ARGS: string[] = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-blink-features=AutomationControlled",
  "--disable-infobars",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--no-first-run",
  "--no-zygote",
  "--disable-gpu",
  "--hide-scrollbars",
  "--mute-audio",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-domain-reliability",
  "--disable-extensions",
  "--disable-features=AudioServiceOutOfProcess",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-notifications",
  "--disable-offer-store-unmasked-wallet-cards",
  "--disable-popup-blocking",
  "--disable-print-preview",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-sync",
  "--force-color-profile=srgb",
  "--metrics-recording-only",
  "--safebrowsing-disable-auto-update",
  "--password-store=basic",
  "--use-mock-keychain",
  "--window-size=1920,1080",
];

export async function launchBrowser(opts: LaunchOptions): Promise<Browser> {
  if (opts.display && process.platform !== "win32") {
    process.env.DISPLAY = opts.display;
  }

  const browser = await chromium.launch({
    headless: opts.headless,
    executablePath: opts.executablePath,
    args: DEFAULT_ARGS,
    ignoreDefaultArgs: ["--enable-automation"],
  });

  return browser;
}

export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
  } catch {
    // ignore errors on close
  }
}
