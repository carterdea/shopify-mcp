#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { z } from "zod";
import { loadConfig, parseConfigArgs } from "./config/loadConfig.js";
// Import registry and config
import { storeRegistry } from "./registry/StoreRegistry.js";
import { createMetafieldDefinition } from "./tools/createMetafieldDefinition.js";
import { createProduct } from "./tools/createProduct.js";
import { deleteMetafield } from "./tools/deleteMetafield.js";
// Import tools
import { getCustomerOrders } from "./tools/getCustomerOrders.js";
import { getCustomers } from "./tools/getCustomers.js";
import { getMetafieldDefinitions } from "./tools/getMetafieldDefinitions.js";
import { getOrderById } from "./tools/getOrderById.js";
import { getOrders } from "./tools/getOrders.js";
import { getProductById } from "./tools/getProductById.js";
import { getProducts } from "./tools/getProducts.js";
import { listStores } from "./tools/listStores.js";
import { setMetafields } from "./tools/setMetafields.js";
import { updateCustomer } from "./tools/updateCustomer.js";
import { updateOrder } from "./tools/updateOrder.js";
import { updateProductMetafields } from "./tools/updateProductMetafields.js";

// Load environment variables from .env file (if it exists)
dotenv.config();

// Parse command line arguments
const configOptions = parseConfigArgs(process.argv.slice(2));

// Load configuration into store registry
try {
  loadConfig(storeRegistry, configOptions);
} catch (error) {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

// Initialize tools (no client needed - they use registry directly)
getProducts.initialize();
getProductById.initialize();
getCustomers.initialize();
getOrders.initialize();
getOrderById.initialize();
updateOrder.initialize();
getCustomerOrders.initialize();
updateCustomer.initialize();
createProduct.initialize();
createMetafieldDefinition.initialize();
getMetafieldDefinitions.initialize();
updateProductMetafields.initialize();
setMetafields.initialize();
deleteMetafield.initialize();
listStores.initialize();

// Set up MCP server
const server = new McpServer({
  name: "shopify",
  version: "2.0.0",
  description:
    "MCP Server for Shopify API with multi-store support, enabling interaction with store data through GraphQL API",
});

// Common storeAlias schema for all tools
const storeAliasSchema = z
  .string()
  .optional()
  .describe(
    "Store alias to target. If omitted, uses the default store. Use list-stores to see available stores."
  );

// Add list-stores tool
server.tool("list-stores", {}, async () => {
  const result = await listStores.execute({});
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
  };
});

// Add tools with storeAlias parameter
server.tool(
  "get-products",
  {
    storeAlias: storeAliasSchema,
    searchTitle: z.string().optional(),
    limit: z.number().default(10),
  },
  async (args) => {
    const result = await getProducts.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "get-product-by-id",
  {
    storeAlias: storeAliasSchema,
    productId: z.string().min(1),
  },
  async (args) => {
    const result = await getProductById.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "get-customers",
  {
    storeAlias: storeAliasSchema,
    searchQuery: z.string().optional(),
    limit: z.number().default(10),
  },
  async (args) => {
    const result = await getCustomers.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "get-orders",
  {
    storeAlias: storeAliasSchema,
    status: z.enum(["any", "open", "closed", "cancelled"]).default("any"),
    limit: z.number().default(10),
  },
  async (args) => {
    const result = await getOrders.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "get-order-by-id",
  {
    storeAlias: storeAliasSchema,
    orderId: z.string().min(1),
  },
  async (args) => {
    const result = await getOrderById.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "update-order",
  {
    storeAlias: storeAliasSchema,
    id: z.string().min(1),
    tags: z.array(z.string()).optional(),
    email: z.string().email().optional(),
    note: z.string().optional(),
    customAttributes: z
      .array(
        z.object({
          key: z.string(),
          value: z.string(),
        })
      )
      .optional(),
    metafields: z
      .array(
        z.object({
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional(),
        })
      )
      .optional(),
    shippingAddress: z
      .object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        company: z.string().optional(),
        country: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        province: z.string().optional(),
        zip: z.string().optional(),
      })
      .optional(),
  },
  async (args) => {
    const result = await updateOrder.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "get-customer-orders",
  {
    storeAlias: storeAliasSchema,
    customerId: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    limit: z.number().default(10),
  },
  async (args) => {
    const result = await getCustomerOrders.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "update-customer",
  {
    storeAlias: storeAliasSchema,
    id: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    note: z.string().optional(),
    taxExempt: z.boolean().optional(),
    metafields: z
      .array(
        z.object({
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional(),
        })
      )
      .optional(),
  },
  async (args) => {
    const result = await updateCustomer.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "create-product",
  {
    storeAlias: storeAliasSchema,
    title: z.string().min(1),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
  },
  async (args) => {
    const result = await createProduct.execute(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "create-metafield-definition",
  createMetafieldDefinition.schema,
  async (args: Record<string, unknown>) => {
    const result = await createMetafieldDefinition.execute(args as Parameters<typeof createMetafieldDefinition.execute>[0]);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "get-metafield-definitions",
  getMetafieldDefinitions.schema,
  async (args: Record<string, unknown>) => {
    const result = await getMetafieldDefinitions.execute(args as Parameters<typeof getMetafieldDefinitions.execute>[0]);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "update-product-metafields",
  updateProductMetafields.schema,
  async (args: Record<string, unknown>) => {
    const result = await updateProductMetafields.execute(args as Parameters<typeof updateProductMetafields.execute>[0]);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "set-metafields",
  setMetafields.schema,
  async (args: Record<string, unknown>) => {
    const result = await setMetafields.execute(args as Parameters<typeof setMetafields.execute>[0]);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "delete-metafield",
  deleteMetafield.schema,
  async (args: Record<string, unknown>) => {
    const result = await deleteMetafield.execute(args as Parameters<typeof deleteMetafield.execute>[0]);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
server
  .connect(transport)
  .then(() => {})
  .catch((error: unknown) => {
    console.error("Failed to start Shopify MCP Server:", error);
  });
