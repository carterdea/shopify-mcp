import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

const inputSchema = z.object({
  storeAlias: z.string().optional(),
  metafieldId: z
    .string()
    .describe(
      "The metafield ID in GID format (e.g., 'gid://shopify/Metafield/123456')"
    ),
});

type Input = z.infer<typeof inputSchema>;

export const deleteMetafield = {
  name: "delete-metafield",
  description: "Delete a metafield from Shopify",
  schema: inputSchema.shape,

  initialize() {},

  async execute(input: Input) {
    try {
      const { storeAlias, metafieldId } = input;
      const client = storeRegistry.getClient(storeAlias);
      const storeInfo = storeRegistry.getStoreInfo(storeAlias);

      const mutation = `
        mutation DeleteMetafield($input: MetafieldDeleteInput!) {
          metafieldDelete(input: $input) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          id: metafieldId,
        },
      };

      const data = await client.request<any>(mutation, variables);

      if (data.metafieldDelete.userErrors.length > 0) {
        const errors = data.metafieldDelete.userErrors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(", ");
        throw new Error(`Failed to delete metafield: ${errors}`);
      }

      return {
        deletedId: data.metafieldDelete.deletedId,
        success: true,
        store: storeInfo,
      };
    } catch (error: any) {
      console.error("Error deleting metafield:", error);
      throw new Error(`Failed to delete metafield: ${error.message}`);
    }
  },
};
