import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

const ListStoresInputSchema = z.object({});

type ListStoresInput = z.infer<typeof ListStoresInputSchema>;

const listStores = {
  name: "list-stores",
  description:
    "List all configured Shopify stores. Returns store aliases and domains. Use this to discover available stores before making queries.",
  schema: ListStoresInputSchema,

  initialize() {},

  execute: (_input: ListStoresInput) => {
    const stores = storeRegistry.listStores();
    const defaultAlias = storeRegistry.getDefaultAlias();

    if (stores.length === 0) {
      return {
        stores: [],
        defaultStore: null,
        message: "No stores configured.",
      };
    }

    return {
      stores: stores.map((store: { alias: string; domain: string }) => ({
        alias: store.alias,
        domain: store.domain,
        isDefault: store.alias === defaultAlias,
      })),
      defaultStore: defaultAlias,
      message: `${stores.length} store(s) configured.${defaultAlias ? ` Default: ${defaultAlias}` : " No default set."}`,
    };
  },
};

export { listStores };
