import { Solver } from "@2captcha/captcha-solver";
import type { Page } from "playwright";

type CaptchaType = "recaptcha" | "hcaptcha";

/**
 * Optional CAPTCHA auto-solver backed by the 2captcha API.
 * Enabled only when the CAPTCHA_API_KEY environment variable is set.
 * When disabled every call to solve() returns false immediately,
 * preserving the original behaviour with zero runtime cost.
 */
export class CaptchaSolver {
  private solver: Solver | null;

  constructor() {
    const apiKey = process.env["CAPTCHA_API_KEY"];
    this.solver = apiKey ? new Solver(apiKey) : null;
  }

  get enabled(): boolean {
    return this.solver !== null;
  }

  /**
   * Attempt to solve the CAPTCHA on the given page.
   * Returns true if the token was successfully injected, false otherwise.
   */
  async solve(page: Page, type: CaptchaType): Promise<boolean> {
    if (!this.solver) return false;

    try {
      const sitekey = await this.extractSitekey(page, type);
      if (!sitekey) {
        console.warn("[captcha-solver] No sitekey found on page:", page.url());
        return false;
      }

      const pageUrl = page.url();
      let token: string;

      if (type === "hcaptcha") {
        const result = await this.solver.hcaptcha({ sitekey, pageurl: pageUrl });
        token = result.data;
      } else {
        const result = await this.solver.recaptcha({ googlekey: sitekey, pageurl: pageUrl });
        token = result.data;
      }

      await this.injectToken(page, token, type);
      return true;
    } catch (err) {
      console.warn("[captcha-solver] Failed to solve CAPTCHA:", err);
      return false;
    }
  }

  /** Extract the sitekey attribute from the CAPTCHA widget on the page. */
  private async extractSitekey(page: Page, type: CaptchaType): Promise<string | null> {
    return page.evaluate((t: CaptchaType) => {
      // hCaptcha
      if (t === "hcaptcha") {
        const el =
          document.querySelector<HTMLElement>("[data-hcaptcha-widget-id]") ??
          document.querySelector<HTMLElement>(".h-captcha");
        return el?.getAttribute("data-sitekey") ?? null;
      }
      // reCAPTCHA
      const el =
        document.querySelector<HTMLElement>(".g-recaptcha") ??
        document.querySelector<HTMLElement>("[data-sitekey]");
      return el?.getAttribute("data-sitekey") ?? null;
    }, type);
  }

  /** Inject the solved token back into the page's hidden response field. */
  private async injectToken(page: Page, token: string, type: CaptchaType): Promise<void> {
    await page.evaluate(
      ({ token, type }: { token: string; type: CaptchaType }) => {
        if (type === "hcaptcha") {
          const ta = document.querySelector<HTMLTextAreaElement>(
            "textarea[name='h-captcha-response']"
          );
          if (ta) ta.value = token;
        } else {
          const ta = document.querySelector<HTMLTextAreaElement>(
            "#g-recaptcha-response, textarea[name='g-recaptcha-response']"
          );
          if (ta) ta.value = token;
        }
      },
      { token, type }
    );
  }
}
