import { FingerprintGenerator } from "fingerprint-generator";
import { FingerprintInjector } from "fingerprint-injector";
import type { BrowserContext, Browser } from "playwright";
import type { ProxyConfig } from "../proxy/proxy-pool";

const generator = new FingerprintGenerator();
const injector = new FingerprintInjector();

type FingerprintResult = ReturnType<FingerprintGenerator["getFingerprint"]>;

export interface GeneratedFingerprint {
  fingerprint: FingerprintResult;
}

export function generateFingerprint(): GeneratedFingerprint {
  return {
    fingerprint: generator.getFingerprint({
      browsers: ["chrome"],
      operatingSystems: ["windows"],
      locales: ["en-US"],
    }),
  };
}

export interface CreateContextOptions {
  storageState?: string;
  proxy?: ProxyConfig;
}

/**
 * Create a new BrowserContext with a randomly generated fingerprint.
 * The fingerprint drives userAgent and viewport so all three signals
 * (HTTP request UA header, navigator.userAgent, UA-CH headers) stay
 * consistent and avoid bot-detection mismatches.
 */
export async function createContextWithFingerprint(
  browser: Browser,
  options?: CreateContextOptions
): Promise<BrowserContext> {
  const { fingerprint } = generateFingerprint();

  const fp = fingerprint.fingerprint;
  const screen = fp.screen as { width?: number; height?: number } | undefined;

  const contextOptions: Parameters<Browser["newContext"]>[0] = {
    userAgent: fp.navigator.userAgent as string,
    viewport: screen?.width && screen?.height
      ? { width: screen.width, height: screen.height }
      : { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  };

  if (options?.storageState) {
    contextOptions.storageState = options.storageState;
  }

  if (options?.proxy) {
    const p = options.proxy;
    contextOptions.proxy = {
      server: p.server,
      ...(p.username ? { username: p.username } : {}),
      ...(p.password ? { password: p.password } : {}),
    };
  }

  const context = await browser.newContext(contextOptions);

  await injector.attachFingerprintToPlaywright(context, fingerprint);

  return context;
}
