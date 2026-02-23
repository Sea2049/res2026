import { Response } from "playwright";

export type ChallengeType = "cloudflare" | "captcha" | "rate_limit" | "forbidden" | "none";

export interface ChallengeResult {
  detected: boolean;
  type: ChallengeType;
  confidence: number;
}

export function detectChallenge(html: string, statusCode: number): ChallengeResult {
  const lower = html.toLowerCase();

  // HTTP status code checks
  if (statusCode === 429) {
    return { detected: true, type: "rate_limit", confidence: 1.0 };
  }

  if (statusCode === 403) {
    // Check for Cloudflare-specific 403
    if (
      lower.includes("attention required") ||
      lower.includes("cf-browser-verification") ||
      lower.includes("cf-challenge-running") ||
      lower.includes("cloudflare")
    ) {
      return { detected: true, type: "cloudflare", confidence: 0.95 };
    }
    return { detected: true, type: "forbidden", confidence: 1.0 };
  }

  // Cloudflare challenge patterns (any status)
  if (
    lower.includes("cf-browser-verification") ||
    lower.includes("cf-challenge-running") ||
    lower.includes("just a moment") && lower.includes("cloudflare")
  ) {
    return { detected: true, type: "cloudflare", confidence: 0.9 };
  }

  // CAPTCHA patterns
  if (lower.includes("g-recaptcha") || lower.includes("hcaptcha")) {
    return { detected: true, type: "captcha", confidence: 0.95 };
  }

  return { detected: false, type: "none", confidence: 1.0 };
}

export async function detectChallengeFromResponse(response: Response): Promise<ChallengeResult> {
  const statusCode = response.status();
  let html = "";

  try {
    html = await response.text();
  } catch {
    // If we can't read the body, rely on status only
  }

  return detectChallenge(html, statusCode);
}
