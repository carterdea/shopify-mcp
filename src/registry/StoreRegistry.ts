import { GraphQLClient } from "graphql-request";

export interface StoreConfig {
  domain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface StoreInfo {
  alias: string;
  domain: string;
}

const DEFAULT_API_VERSION = "2024-01";

export class StoreRegistry {
  private readonly stores: Map<string, StoreConfig> = new Map();
  private readonly clients: Map<string, GraphQLClient> = new Map();
  private defaultStoreAlias: string | null = null;

  /**
   * Register a store with the given alias and configuration.
   * Aliases are case-insensitive (lowercased internally).
   */
  register(alias: string, config: StoreConfig): void {
    const normalizedAlias = alias.toLowerCase();
    this.stores.set(normalizedAlias, {
      ...config,
      apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    });
    // Invalidate cached client if re-registering
    this.clients.delete(normalizedAlias);
  }

  /**
   * Set the default store alias.
   */
  setDefault(alias: string): void {
    const normalizedAlias = alias.toLowerCase();
    if (!this.stores.has(normalizedAlias)) {
      throw new Error(
        `Cannot set default: store "${alias}" not found. Available stores: ${this.listAliases().join(", ")}`
      );
    }
    this.defaultStoreAlias = normalizedAlias;
  }

  /**
   * Check if a store with the given alias exists.
   */
  hasStore(alias: string): boolean {
    return this.stores.has(alias.toLowerCase());
  }

  /**
   * Get the default store alias if set, or the only store if there's just one.
   */
  getDefaultAlias(): string | null {
    if (this.defaultStoreAlias) {
      return this.defaultStoreAlias;
    }
    if (this.stores.size === 1) {
      return Array.from(this.stores.keys())[0];
    }
    return null;
  }

  /**
   * Get or create a GraphQL client for the specified store.
   * If alias is omitted, uses the default store.
   */
  getClient(alias?: string): GraphQLClient {
    const resolvedAlias = this.resolveAlias(alias);
    const normalizedAlias = resolvedAlias.toLowerCase();

    // Return cached client if available
    const cachedClient = this.clients.get(normalizedAlias);
    if (cachedClient) {
      return cachedClient;
    }

    // Create new client
    const config = this.stores.get(normalizedAlias);
    if (!config) {
      throw new Error(
        `Store "${alias}" not found. Available stores: ${this.listAliases().join(", ")}`
      );
    }

    const client = new GraphQLClient(
      `https://${config.domain}/admin/api/${config.apiVersion}/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": config.accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    this.clients.set(normalizedAlias, client);
    return client;
  }

  /**
   * Get store info (alias and domain) for the specified store.
   */
  getStoreInfo(alias?: string): StoreInfo {
    const resolvedAlias = this.resolveAlias(alias);
    const normalizedAlias = resolvedAlias.toLowerCase();
    const config = this.stores.get(normalizedAlias);

    if (!config) {
      throw new Error(
        `Store "${alias}" not found. Available stores: ${this.listAliases().join(", ")}`
      );
    }

    return {
      alias: resolvedAlias,
      domain: config.domain,
    };
  }

  /**
   * List all registered store aliases.
   */
  listAliases(): string[] {
    return Array.from(this.stores.keys());
  }

  /**
   * List all registered stores with their info.
   */
  listStores(): StoreInfo[] {
    return Array.from(this.stores.entries()).map(([alias, config]) => ({
      alias,
      domain: config.domain,
    }));
  }

  /**
   * Get the number of registered stores.
   */
  get size(): number {
    return this.stores.size;
  }

  /**
   * Resolve the alias to use - either the provided one or the default.
   */
  private resolveAlias(alias?: string): string {
    if (alias) {
      const normalizedAlias = alias.toLowerCase();
      if (!this.stores.has(normalizedAlias)) {
        throw new Error(
          `Store "${alias}" not found. Available stores: ${this.listAliases().join(", ")}`
        );
      }
      return normalizedAlias;
    }

    const defaultAlias = this.getDefaultAlias();
    if (!defaultAlias) {
      throw new Error(
        `No store specified and no default store set. Available stores: ${this.listAliases().join(", ")}. ` +
          "Please specify a storeAlias parameter or configure a defaultStore."
      );
    }

    return defaultAlias;
  }
}

// Singleton instance for the application
export const storeRegistry = new StoreRegistry();
