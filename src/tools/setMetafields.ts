import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

const inputSchema = z.object({
  storeAlias: z.string().optional(),
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

export const setMetafields = {
  name: "set-metafields",
  description:
    "Create or update metafields on any Shopify resource (Product, Variant, Customer, Order, Collection, etc.)",
  schema: inputSchema.shape,

  initialize() {},

  async execute(input: Input) {
    try {
      const { storeAlias, ownerId, metafields } = input;
      const client = storeRegistry.getClient(storeAlias);
      const storeInfo = storeRegistry.getStoreInfo(storeAlias);

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

      const metafieldsInput = metafields.map((metafield) => ({
        ownerId,
        namespace: metafield.namespace,
        key: metafield.key,
        value: metafield.value,
        type: metafield.type,
      }));

      const variables = {
        metafields: metafieldsInput,
      };

      const data = await client.request<any>(mutation, variables);

      if (data.metafieldsSet.userErrors.length > 0) {
        const errors = data.metafieldsSet.userErrors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(", ");
        throw new Error(`Failed to set metafields: ${errors}`);
      }

      return {
        metafields: data.metafieldsSet.metafields,
        ownerId,
        store: storeInfo,
      };
    } catch (error: any) {
      console.error("Error setting metafields:", error);
      throw new Error(`Failed to set metafields: ${error.message}`);
    }
  },
};
