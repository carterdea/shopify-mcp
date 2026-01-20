import { beforeEach, describe, expect, it } from "bun:test";
import { StoreRegistry } from "../registry/StoreRegistry.js";

describe("StoreRegistry", () => {
  let registry: StoreRegistry;

  beforeEach(() => {
    registry = new StoreRegistry();
  });

  describe("register", () => {
    it("should register a store with the given alias", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      expect(registry.hasStore("acme")).toBe(true);
      expect(registry.size).toBe(1);
    });

    it("should normalize alias to lowercase", () => {
      registry.register("ACME", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      expect(registry.hasStore("acme")).toBe(true);
      expect(registry.hasStore("ACME")).toBe(true);
      expect(registry.hasStore("Acme")).toBe(true);
    });

    it("should register multiple stores", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.register("beta", {
        domain: "beta.myshopify.com",
        accessToken: "shpat_yyy",
      });

      expect(registry.size).toBe(2);
      expect(registry.hasStore("acme")).toBe(true);
      expect(registry.hasStore("beta")).toBe(true);
    });

    it("should invalidate cached client when re-registering", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      const client1 = registry.getClient("acme");

      // Re-register with different credentials
      registry.register("acme", {
        domain: "acme-new.myshopify.com",
        accessToken: "shpat_yyy",
      });

      const client2 = registry.getClient("acme");

      // Should be a new client instance
      expect(client1).not.toBe(client2);
    });
  });

  describe("setDefault", () => {
    it("should set the default store", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.setDefault("acme");

      expect(registry.getDefaultAlias()).toBe("acme");
    });

    it("should throw error for non-existent store", () => {
      expect(() => registry.setDefault("nonexistent")).toThrow(/not found/);
    });

    it("should be case-insensitive", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.setDefault("ACME");

      expect(registry.getDefaultAlias()).toBe("acme");
    });
  });

  describe("getDefaultAlias", () => {
    it("should return null when no stores registered", () => {
      expect(registry.getDefaultAlias()).toBeNull();
    });

    it("should return the only store when one store registered", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      expect(registry.getDefaultAlias()).toBe("acme");
    });

    it("should return null when multiple stores and no default set", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.register("beta", {
        domain: "beta.myshopify.com",
        accessToken: "shpat_yyy",
      });

      expect(registry.getDefaultAlias()).toBeNull();
    });

    it("should return default when set", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.register("beta", {
        domain: "beta.myshopify.com",
        accessToken: "shpat_yyy",
      });
      registry.setDefault("beta");

      expect(registry.getDefaultAlias()).toBe("beta");
    });
  });

  describe("getClient", () => {
    it("should return a client for registered store", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      const client = registry.getClient("acme");
      expect(client).toBeDefined();
    });

    it("should return same client instance for same alias (caching)", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      const client1 = registry.getClient("acme");
      const client2 = registry.getClient("acme");
      expect(client1).toBe(client2);
    });

    it("should use default store when alias not provided", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      const client = registry.getClient();
      expect(client).toBeDefined();
    });

    it("should throw error for non-existent store", () => {
      expect(() => registry.getClient("nonexistent")).toThrow(/not found/);
    });

    it("should throw error when no default and multiple stores", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.register("beta", {
        domain: "beta.myshopify.com",
        accessToken: "shpat_yyy",
      });

      expect(() => registry.getClient()).toThrow(
        /No store specified and no default store set/
      );
    });

    it("should be case-insensitive for alias lookup", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      const client1 = registry.getClient("acme");
      const client2 = registry.getClient("ACME");
      const client3 = registry.getClient("Acme");

      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
    });
  });

  describe("getStoreInfo", () => {
    it("should return store info for registered store", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      const info = registry.getStoreInfo("acme");
      expect(info).toEqual({
        alias: "acme",
        domain: "acme.myshopify.com",
      });
    });

    it("should use default store when alias not provided", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });

      const info = registry.getStoreInfo();
      expect(info.alias).toBe("acme");
    });

    it("should throw error for non-existent store", () => {
      expect(() => registry.getStoreInfo("nonexistent")).toThrow(/not found/);
    });
  });

  describe("listStores", () => {
    it("should return empty array when no stores", () => {
      expect(registry.listStores()).toEqual([]);
    });

    it("should return all registered stores", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.register("beta", {
        domain: "beta.myshopify.com",
        accessToken: "shpat_yyy",
      });

      const stores = registry.listStores();
      expect(stores).toHaveLength(2);
      expect(stores).toContainEqual({
        alias: "acme",
        domain: "acme.myshopify.com",
      });
      expect(stores).toContainEqual({
        alias: "beta",
        domain: "beta.myshopify.com",
      });
    });
  });

  describe("listAliases", () => {
    it("should return empty array when no stores", () => {
      expect(registry.listAliases()).toEqual([]);
    });

    it("should return all registered aliases", () => {
      registry.register("acme", {
        domain: "acme.myshopify.com",
        accessToken: "shpat_xxx",
      });
      registry.register("beta", {
        domain: "beta.myshopify.com",
        accessToken: "shpat_yyy",
      });

      const aliases = registry.listAliases();
      expect(aliases).toHaveLength(2);
      expect(aliases).toContain("acme");
      expect(aliases).toContain("beta");
    });
  });
});
