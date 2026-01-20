import type { GraphQLClient } from "graphql-request";
import { z } from "zod";

const inputSchema = z.object({
  metafieldId: z
    .string()
    .describe(
      "The metafield ID in GID format (e.g., 'gid://shopify/Metafield/123456')"
    ),
});

type Input = z.infer<typeof inputSchema>;

let shopifyClient: GraphQLClient;

export const deleteMetafield = {
  name: "delete-metafield",
  description: "Delete a metafield from Shopify",
  schema: inputSchema.shape,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  async execute(input: Input) {
    try {
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
          id: input.metafieldId,
        },
      };

      const data = await shopifyClient.request<any>(mutation, variables);

      if (data.metafieldDelete.userErrors.length > 0) {
        const errors = data.metafieldDelete.userErrors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(", ");
        throw new Error(`Failed to delete metafield: ${errors}`);
      }

      return {
        deletedId: data.metafieldDelete.deletedId,
        success: true,
      };
    } catch (error: any) {
      console.error("Error deleting metafield:", error);
      throw new Error(`Failed to delete metafield: ${error.message}`);
    }
  },
};
