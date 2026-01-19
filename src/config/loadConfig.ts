import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { StoreConfig, StoreRegistry } from "../registry/StoreRegistry.js";

// Schema for a single store configuration
const StoreConfigSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  accessToken: z.string().min(1, "Access token is required"),
  apiVersion: z.string().optional(),
});

// Schema for the full config file
const ConfigFileSchema = z.object({
  stores: z.record(z.string(), StoreConfigSchema),
  defaultStore: z.string().optional(),
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

interface LoadConfigOptions {
  configPath?: string;
  accessToken?: string;
  domain?: string;
}

/**
 * Load configuration and populate the store registry.
 *
 * Priority:
 * 1. Config file path via --config CLI arg
 * 2. SHOPIFY_STORES_CONFIG env var (JSON string or file path)
 * 3. Legacy single-store env vars (SHOPIFY_ACCESS_TOKEN, MYSHOPIFY_DOMAIN)
 * 4. --accessToken + --domain CLI args
 */
export function loadConfig(
  registry: StoreRegistry,
  options: LoadConfigOptions = {}
): void {
  // Priority 1: Config file via --config
  if (options.configPath) {
    loadFromConfigFile(registry, options.configPath);
    return;
  }

  // Priority 2: SHOPIFY_STORES_CONFIG env var
  const storesConfigEnv = process.env.SHOPIFY_STORES_CONFIG;
  if (storesConfigEnv && storesConfigEnv !== "undefined") {
    loadFromStoresConfigEnv(registry, storesConfigEnv);
    return;
  }

  // Priority 3: Legacy env vars (single store)
  const envAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const envDomain = process.env.MYSHOPIFY_DOMAIN;
  const hasEnvConfig = envAccessToken && envAccessToken !== "undefined" && envDomain && envDomain !== "undefined";

  if (hasEnvConfig) {
    registry.register("default", {
      domain: envDomain,
      accessToken: envAccessToken,
    });
    registry.setDefault("default");
    return;
  }

  // Priority 4: CLI args (single store) - require both if either is provided
  if (options.accessToken && options.domain) {
    registry.register("default", {
      domain: options.domain,
      accessToken: options.accessToken,
    });
    registry.setDefault("default");
    return;
  }

  if (options.accessToken || options.domain) {
    throw new Error(
      "Both --accessToken and --domain are required when using CLI arguments."
    );
  }

  // No configuration found
  throw new Error(
    "No Shopify store configuration found. Please provide one of:\n" +
      "  1. A config file via --config <path>\n" +
      "  2. SHOPIFY_STORES_CONFIG environment variable (JSON or file path)\n" +
      "  3. SHOPIFY_ACCESS_TOKEN and MYSHOPIFY_DOMAIN environment variables\n" +
      "  4. --accessToken and --domain CLI arguments"
  );
}

/**
 * Load configuration from a JSON file.
 */
function loadFromConfigFile(registry: StoreRegistry, configPath: string): void {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(absolutePath, "utf-8");
  } catch (_err) {
    throw new Error(`Failed to read config file: ${absolutePath}`);
  }

  parseAndRegisterConfig(registry, fileContent, `config file: ${absolutePath}`);
}

/**
 * Load configuration from SHOPIFY_STORES_CONFIG env var.
 * Can be either a JSON string or a file path.
 */
function loadFromStoresConfigEnv(
  registry: StoreRegistry,
  envValue: string
): void {
  // Check if it's a file path
  if (
    envValue.endsWith(".json") ||
    envValue.startsWith("/") ||
    envValue.startsWith("./")
  ) {
    const absolutePath = path.resolve(envValue);
    if (fs.existsSync(absolutePath)) {
      loadFromConfigFile(registry, absolutePath);
      return;
    }
  }

  // Try to parse as JSON string
  parseAndRegisterConfig(registry, envValue, "SHOPIFY_STORES_CONFIG env var");
}

/**
 * Parse JSON config and register all stores.
 */
function parseAndRegisterConfig(
  registry: StoreRegistry,
  jsonString: string,
  source: string
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Invalid JSON in ${source}: ${(err as Error).message}`);
  }

  const result = ConfigFileSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid config structure in ${source}:\n${errors}`);
  }

  const config = result.data;

  // Register all stores
  for (const [alias, storeConfig] of Object.entries(config.stores)) {
    registry.register(alias, storeConfig as StoreConfig);
  }

  // Set default if specified
  if (config.defaultStore) {
    registry.setDefault(config.defaultStore);
  }

  // Validate at least one store was registered
  if (registry.size === 0) {
    throw new Error(`No stores defined in ${source}`);
  }
}

/**
 * Parse CLI arguments for config options.
 */
export function parseConfigArgs(args: string[]): LoadConfigOptions {
  const options: LoadConfigOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--config" && nextArg) {
      options.configPath = nextArg;
      i++;
    } else if (arg === "--accessToken" && nextArg) {
      options.accessToken = nextArg;
      i++;
    } else if (arg === "--domain" && nextArg) {
      options.domain = nextArg;
      i++;
    }
  }

  return options;
}
