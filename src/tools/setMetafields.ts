import type { GraphQLClient } from "graphql-request";
import { z } from "zod";

const inputSchema = z.object({
  ownerId: z
    .string()
    .describe(
      "The resource ID in GID format (e.g., 'gid://shopify/Product/123' or 'gid://shopify/Customer/456')"
    ),
  metafields: z
    .array(
      z.object({
        namespace: z.string().describe("Namespace for the metafield"),
        key: z.string().describe("Key for the metafield"),
        value: z
          .string()
          .describe("Value for the metafield (as string, even for JSON)"),
        type: z
          .string()
          .describe(
            "Type of the metafield (e.g., 'single_line_text_field', 'json', 'number_integer')"
          ),
      })
    )
    .describe("Array of metafields to set on the resource"),
});

type Input = z.infer<typeof inputSchema>;

let shopifyClient: GraphQLClient;

export const setMetafields = {
  name: "set-metafields",
  description:
    "Create or update metafields on any Shopify resource (Product, Variant, Customer, Order, Collection, etc.)",
  schema: inputSchema.shape,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  async execute(input: Input) {
    try {
      const mutation = `
        mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              createdAt
              updatedAt
              owner {
                ... on Product {
                  id
                  title
                }
                ... on ProductVariant {
                  id
                  title
                }
                ... on Customer {
                  id
                  email
                }
                ... on Order {
                  id
                  name
                }
                ... on Collection {
                  id
                  title
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const metafieldsInput = input.metafields.map((metafield) => ({
        ownerId: input.ownerId,
        namespace: metafield.namespace,
        key: metafield.key,
        value: metafield.value,
        type: metafield.type,
      }));

      const variables = {
        metafields: metafieldsInput,
      };

      const data = await shopifyClient.request<any>(mutation, variables);

      if (data.metafieldsSet.userErrors.length > 0) {
        const errors = data.metafieldsSet.userErrors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(", ");
        throw new Error(`Failed to set metafields: ${errors}`);
      }

      return {
        metafields: data.metafieldsSet.metafields,
        ownerId: input.ownerId,
      };
    } catch (error: any) {
      console.error("Error setting metafields:", error);
      throw new Error(`Failed to set metafields: ${error.message}`);
    }
  },
};
