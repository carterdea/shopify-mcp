import { GraphQLClient } from "graphql-request";
import { z } from "zod";

const inputSchema = z.object({
  ownerType: z.enum([
    "PRODUCT",
    "PRODUCT_VARIANT",
    "CUSTOMER",
    "ORDER",
    "COLLECTION",
    "ARTICLE",
    "BLOG",
    "PAGE",
    "SHOP",
  ]).optional().describe("Filter definitions by resource type"),
  namespace: z.string().optional().describe("Filter by namespace"),
  first: z.number().default(50).describe("Number of definitions to retrieve (default: 50)"),
});

type Input = z.infer<typeof inputSchema>;

let shopifyClient: GraphQLClient;

export const getMetafieldDefinitions = {
  name: "get-metafield-definitions",
  description: "Get metafield definitions from Shopify, optionally filtered by owner type or namespace",
  schema: inputSchema.shape,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  async execute(input: Input) {
    try {
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
        first: input.first,
        ownerType: input.ownerType,
        namespace: input.namespace,
      };

      const data = await shopifyClient.request<any>(query, variables);

      const definitions = data.metafieldDefinitions.edges.map((edge: any) => edge.node);

      return {
        metafieldDefinitions: definitions,
        count: definitions.length,
      };
    } catch (error: any) {
      console.error("Error fetching metafield definitions:", error);
      throw new Error(`Failed to fetch metafield definitions: ${error.message}`);
    }
  },
};
