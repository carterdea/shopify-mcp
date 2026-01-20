import type { GraphQLClient } from "graphql-request";
import { z } from "zod";

const inputSchema = z.object({
  namespace: z
    .string()
    .describe("Namespace for the metafield (e.g., 'custom')"),
  key: z.string().describe("Key for the metafield (e.g., 'warranty_info')"),
  name: z.string().describe("Human-readable name for the metafield"),
  type: z
    .enum([
      "boolean",
      "color",
      "date",
      "date_time",
      "dimension",
      "json",
      "money",
      "multi_line_text_field",
      "number_decimal",
      "number_integer",
      "rating",
      "rich_text_field",
      "single_line_text_field",
      "url",
      "volume",
      "weight",
      "file_reference",
      "page_reference",
      "product_reference",
      "variant_reference",
      "collection_reference",
      "list.single_line_text_field",
      "list.product_reference",
      "list.variant_reference",
      "list.collection_reference",
      "list.file_reference",
      "list.page_reference",
    ])
    .describe("Type of the metafield"),
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
    .describe("The resource type this metafield definition applies to"),
  description: z.string().optional().describe("Description of the metafield"),
  validations: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .describe("Validation rules for the metafield"),
});

type Input = z.infer<typeof inputSchema>;

let shopifyClient: GraphQLClient;

export const createMetafieldDefinition = {
  name: "create-metafield-definition",
  description:
    "Create a metafield definition for a specific resource type in Shopify",
  schema: inputSchema.shape,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  async execute(input: Input) {
    try {
      const mutation = `
        mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
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
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        definition: {
          namespace: input.namespace,
          key: input.key,
          name: input.name,
          type: input.type,
          ownerType: input.ownerType,
          description: input.description,
          validations: input.validations,
        },
      };

      const data = await shopifyClient.request<any>(mutation, variables);

      if (data.metafieldDefinitionCreate.userErrors.length > 0) {
        const errors = data.metafieldDefinitionCreate.userErrors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(", ");
        throw new Error(`Failed to create metafield definition: ${errors}`);
      }

      return {
        metafieldDefinition: data.metafieldDefinitionCreate.createdDefinition,
      };
    } catch (error: any) {
      console.error("Error creating metafield definition:", error);
      throw new Error(
        `Failed to create metafield definition: ${error.message}`
      );
    }
  },
};
