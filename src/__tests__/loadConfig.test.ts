import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadConfig, parseConfigArgs } from "../config/loadConfig.js";
import { StoreRegistry } from "../registry/StoreRegistry.js";

describe("loadConfig", () => {
  let registry: StoreRegistry;
  let tempDir: string;

  beforeEach(() => {
    registry = new StoreRegistry();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-mcp-test-"));
    // Clear environment variables
    delete process.env.SHOPIFY_STORES_CONFIG;
    delete process.env.SHOPIFY_ACCESS_TOKEN;
    delete process.env.MYSHOPIFY_DOMAIN;
  });

  afterEach(() => {
    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Reset environment variables
    delete process.env.SHOPIFY_STORES_CONFIG;
    delete process.env.SHOPIFY_ACCESS_TOKEN;
    delete process.env.MYSHOPIFY_DOMAIN;
  });

  describe("config file via --config", () => {
    it("should load stores from JSON config file", () => {
      const configPath = path.join(tempDir, "config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          stores: {
            acme: {
              domain: "acme.myshopify.com",
              accessToken: "shpat_xxx",
            },
            beta: {
              domain: "beta.myshopify.com",
              accessToken: "shpat_yyy",
            },
          },
          defaultStore: "acme",
        })
      );

      loadConfig(registry, { configPath });

      expect(registry.size).toBe(2);
      expect(registry.hasStore("acme")).toBe(true);
      expect(registry.hasStore("beta")).toBe(true);
      expect(registry.getDefaultAlias()).toBe("acme");
    });

    it("should throw error for non-existent config file", () => {
      expect(() =>
        loadConfig(registry, { configPath: "/nonexistent/path.json" })
      ).toThrow(/not found/);
    });

    it("should throw error for invalid JSON", () => {
      const configPath = path.join(tempDir, "invalid.json");
      fs.writeFileSync(configPath, "not valid json");

      expect(() => loadConfig(registry, { configPath })).toThrow(
        /Invalid JSON/
      );
    });

    it("should throw error for invalid config structure", () => {
      const configPath = path.join(tempDir, "invalid-structure.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          stores: {
            acme: {
              // missing required fields
            },
          },
        })
      );

      expect(() => loadConfig(registry, { configPath })).toThrow(
        /Invalid config structure/
      );
    });
  });

  describe("SHOPIFY_STORES_CONFIG env var", () => {
    it("should load from JSON string in env var", () => {
      process.env.SHOPIFY_STORES_CONFIG = JSON.stringify({
        stores: {
          acme: {
            domain: "acme.myshopify.com",
            accessToken: "shpat_xxx",
          },
        },
      });

      loadConfig(registry);

      expect(registry.size).toBe(1);
      expect(registry.hasStore("acme")).toBe(true);
    });

    it("should load from file path in env var", () => {
      const configPath = path.join(tempDir, "config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          stores: {
            acme: {
              domain: "acme.myshopify.com",
              accessToken: "shpat_xxx",
            },
          },
        })
      );

      process.env.SHOPIFY_STORES_CONFIG = configPath;

      loadConfig(registry);

      expect(registry.size).toBe(1);
      expect(registry.hasStore("acme")).toBe(true);
    });
  });

  describe("legacy env vars fallback", () => {
    it("should load from SHOPIFY_ACCESS_TOKEN and MYSHOPIFY_DOMAIN", () => {
      process.env.SHOPIFY_ACCESS_TOKEN = "shpat_xxx";
      process.env.MYSHOPIFY_DOMAIN = "mystore.myshopify.com";

      loadConfig(registry);

      expect(registry.size).toBe(1);
      expect(registry.hasStore("default")).toBe(true);
      expect(registry.getDefaultAlias()).toBe("default");
    });
  });

  describe("CLI args fallback", () => {
    it("should load from accessToken and domain options", () => {
      loadConfig(registry, {
        accessToken: "shpat_xxx",
        domain: "mystore.myshopify.com",
      });

      expect(registry.size).toBe(1);
      expect(registry.hasStore("default")).toBe(true);
    });

    it("should throw error when only accessToken is provided", () => {
      expect(() => loadConfig(registry, { accessToken: "shpat_xxx" })).toThrow(
        /Both --accessToken and --domain are required/
      );
    });

    it("should throw error when only domain is provided", () => {
      expect(() =>
        loadConfig(registry, { domain: "mystore.myshopify.com" })
      ).toThrow(/Both --accessToken and --domain are required/);
    });
  });

  describe("no configuration", () => {
    it("should throw error when no configuration found", () => {
      expect(() => loadConfig(registry)).toThrow(
        /No Shopify store configuration found/
      );
    });
  });

  describe("priority", () => {
    it("should prefer --config over env vars", () => {
      const configPath = path.join(tempDir, "config.json");
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          stores: {
            fromFile: {
              domain: "fromfile.myshopify.com",
              accessToken: "shpat_file",
            },
          },
        })
      );

      process.env.SHOPIFY_STORES_CONFIG = JSON.stringify({
        stores: {
          fromEnv: {
            domain: "fromenv.myshopify.com",
            accessToken: "shpat_env",
          },
        },
      });

      loadConfig(registry, { configPath });

      expect(registry.hasStore("fromFile")).toBe(true);
      expect(registry.hasStore("fromEnv")).toBe(false);
    });
  });
});

describe("parseConfigArgs", () => {
  it("should parse --config argument", () => {
    const options = parseConfigArgs(["--config", "/path/to/config.json"]);
    expect(options.configPath).toBe("/path/to/config.json");
  });

  it("should parse --accessToken argument", () => {
    const options = parseConfigArgs(["--accessToken", "shpat_xxx"]);
    expect(options.accessToken).toBe("shpat_xxx");
  });

  it("should parse --domain argument", () => {
    const options = parseConfigArgs(["--domain", "mystore.myshopify.com"]);
    expect(options.domain).toBe("mystore.myshopify.com");
  });

  it("should parse multiple arguments", () => {
    const options = parseConfigArgs([
      "--accessToken",
      "shpat_xxx",
      "--domain",
      "mystore.myshopify.com",
    ]);
    expect(options.accessToken).toBe("shpat_xxx");
    expect(options.domain).toBe("mystore.myshopify.com");
  });

  it("should return empty object for no arguments", () => {
    const options = parseConfigArgs([]);
    expect(options).toEqual({});
  });
});
