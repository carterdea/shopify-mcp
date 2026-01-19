import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

const inputSchema = z.object({
  storeAlias: z.string().optional(),
  ownerType: z
    .enum([
      "PRODUCT",
      "PRODUCT_VARIANT",
      "CUSTOMER",
      "ORDER",
      "COLLECTION",
      "ARTICLE",
      "BLOG",
      "PAGE",
      "SHOP",
    ])
    .optional()
    .describe("Filter definitions by resource type"),
  namespace: z.string().optional().describe("Filter by namespace"),
  first: z
    .number()
    .default(50)
    .describe("Number of definitions to retrieve (default: 50)"),
});

type Input = z.infer<typeof inputSchema>;

export const getMetafieldDefinitions = {
  name: "get-metafield-definitions",
  description:
    "Get metafield definitions from Shopify, optionally filtered by owner type or namespace",
  schema: inputSchema.shape,

  initialize() {},

  async execute(input: Input) {
    try {
      const { storeAlias, ...queryFields } = input;
      const client = storeRegistry.getClient(storeAlias);
      const storeInfo = storeRegistry.getStoreInfo(storeAlias);

      const query = `
        query GetMetafieldDefinitions($first: Int!, $ownerType: MetafieldOwnerType, $namespace: String) {
          metafieldDefinitions(first: $first, ownerType: $ownerType, namespace: $namespace) {
            edges {
              node {
                id
                name
                namespace
                key
                description
                type {
                  name
                }
                ownerType
                validations {
                  name
                  value
                }
                pinnedPosition
              }
            }
          }
        }
      `;

      const variables = {
        first: queryFields.first,
        ownerType: queryFields.ownerType,
        namespace: queryFields.namespace,
      };

      const data = await client.request<any>(query, variables);

      const definitions = data.metafieldDefinitions.edges.map(
        (edge: any) => edge.node
      );

      return {
        metafieldDefinitions: definitions,
        count: definitions.length,
        store: storeInfo,
      };
    } catch (error: any) {
      console.error("Error fetching metafield definitions:", error);
      throw new Error(
        `Failed to fetch metafield definitions: ${error.message}`
      );
    }
  },
};
