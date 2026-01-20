import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

const inputSchema = z.object({
  storeAlias: z.string().optional(),
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

export const updateProductMetafields = {
  name: "update-product-metafields",
  description: "Update or create metafields on a Shopify product",
  schema: inputSchema.shape,

  initialize() {},

  async execute(input: Input) {
    try {
      const { storeAlias, productId, metafields } = input;
      const client = storeRegistry.getClient(storeAlias);
      const storeInfo = storeRegistry.getStoreInfo(storeAlias);

      // Convert productId to GID format if it's numeric
      const productGid = productId.startsWith("gid://")
        ? productId
        : `gid://shopify/Product/${productId}`;

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

      const metafieldsInput = metafields.map((metafield) => ({
        ownerId: productGid,
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
        throw new Error(`Failed to update product metafields: ${errors}`);
      }

      return {
        metafields: data.metafieldsSet.metafields,
        productId: productGid,
        store: storeInfo,
      };
    } catch (error: any) {
      console.error("Error updating product metafields:", error);
      throw new Error(`Failed to update product metafields: ${error.message}`);
    }
  },
};
