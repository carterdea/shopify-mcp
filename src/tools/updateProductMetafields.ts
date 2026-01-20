import type { GraphQLClient } from "graphql-request";
import { z } from "zod";

const inputSchema = z.object({
  productId: z.string().describe("The product ID (numeric or GID format)"),
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
    .describe("Array of metafields to set on the product"),
});

type Input = z.infer<typeof inputSchema>;

let shopifyClient: GraphQLClient;

export const updateProductMetafields = {
  name: "update-product-metafields",
  description: "Update or create metafields on a Shopify product",
  schema: inputSchema.shape,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  async execute(input: Input) {
    try {
      // Convert productId to GID format if it's numeric
      const productGid = input.productId.startsWith("gid://")
        ? input.productId
        : `gid://shopify/Product/${input.productId}`;

      const mutation = `
        mutation SetProductMetafields($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              createdAt
              updatedAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const metafieldsInput = input.metafields.map((metafield) => ({
        ownerId: productGid,
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
        throw new Error(`Failed to update product metafields: ${errors}`);
      }

      return {
        metafields: data.metafieldsSet.metafields,
        productId: productGid,
      };
    } catch (error: any) {
      console.error("Error updating product metafields:", error);
      throw new Error(`Failed to update product metafields: ${error.message}`);
    }
  },
};
