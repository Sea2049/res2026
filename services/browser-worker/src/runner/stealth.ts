import { BrowserContext } from "playwright";

const RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 2560, height: 1440 },
];

const HARDWARE_CONCURRENCY = [4, 8, 16];

export async function applyStealthScripts(context: BrowserContext): Promise<void> {
  const resolution = RESOLUTIONS[Math.floor(Math.random() * RESOLUTIONS.length)];
  const hardwareConcurrency =
    HARDWARE_CONCURRENCY[Math.floor(Math.random() * HARDWARE_CONCURRENCY.length)];

  await context.addInitScript(
    ({ width, height, concurrency }) => {
      // Remove webdriver flag
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
        configurable: true,
      });

      // Remove __playwright and related automation properties
      const keysToDelete = [
        "__playwright",
        "__pw_manual",
        "__selenium_unwrapped",
        "_selenium",
        "_Selenium_IDE_Recorder",
        "__webdriver_script_fn",
        "__webdriver_evaluate",
        "__fxdriver_evaluate",
        "__driver_evaluate",
        "__webdriver_unwrapped",
        "__driver_unwrapped",
        "__selenium_evaluate",
        "__fxdriver_unwrapped",
      ];
      for (const key of keysToDelete) {
        try {
          delete (window as Record<string, unknown>)[key];
        } catch {
          // ignore
        }
      }

      // Fake plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => {
          const plugins = [
            { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer", description: "Portable Document Format" },
            { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai", description: "" },
            { name: "Native Client", filename: "internal-nacl-plugin", description: "" },
          ];
          return Object.assign(plugins, {
            item: (i: number) => plugins[i] || null,
            namedItem: (name: string) => plugins.find((p) => p.name === name) || null,
            refresh: () => {},
            length: plugins.length,
          });
        },
        configurable: true,
      });

      // Language settings
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
        configurable: true,
      });

      Object.defineProperty(navigator, "language", {
        get: () => "en-US",
        configurable: true,
      });

      // Chrome object
      if (!(window as Record<string, unknown>).chrome) {
        Object.defineProperty(window, "chrome", {
          value: {
            runtime: {
              id: undefined,
              connect: () => {},
              sendMessage: () => {},
            },
            loadTimes: () => {},
            csi: () => {},
            app: {},
          },
          configurable: true,
          writable: true,
        });
      }

      // Hardware concurrency
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => concurrency,
        configurable: true,
      });

      // Screen dimensions
      Object.defineProperty(screen, "width", {
        get: () => width,
        configurable: true,
      });
      Object.defineProperty(screen, "height", {
        get: () => height,
        configurable: true,
      });
      Object.defineProperty(screen, "availWidth", {
        get: () => width,
        configurable: true,
      });
      Object.defineProperty(screen, "availHeight", {
        get: () => height - 40,
        configurable: true,
      });
      Object.defineProperty(window, "innerWidth", {
        get: () => width,
        configurable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        get: () => height - 80,
        configurable: true,
      });
      Object.defineProperty(window, "outerWidth", {
        get: () => width,
        configurable: true,
      });
      Object.defineProperty(window, "outerHeight", {
        get: () => height,
        configurable: true,
      });

      // Notification permissions (avoid permission prompt leaking automation)
      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) => {
          if ((parameters as PermissionDescriptor).name === "notifications") {
            return Promise.resolve({ state: "denied" } as PermissionStatus);
          }
          return originalQuery.call(window.navigator.permissions, parameters);
        };
      }
    },
    { width: resolution.width, height: resolution.height, concurrency: hardwareConcurrency }
  );
}
