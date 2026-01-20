import { gql } from "graphql-request";
import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

// Input schema for getCustomers
const GetCustomersInputSchema = z.object({
  storeAlias: z.string().optional(),
  searchQuery: z.string().optional(),
  limit: z.number().default(10),
});

type GetCustomersInput = z.infer<typeof GetCustomersInputSchema>;

const getCustomers = {
  name: "get-customers",
  description: "Get customers or search by name/email",
  schema: GetCustomersInputSchema,

  initialize() {},

  execute: async (input: GetCustomersInput) => {
    try {
      const { storeAlias, searchQuery, limit } = input;
      const client = storeRegistry.getClient(storeAlias);
      const storeInfo = storeRegistry.getStoreInfo(storeAlias);

      const query = gql`
        query GetCustomers($first: Int!, $query: String) {
          customers(first: $first, query: $query) {
            edges {
              node {
                id
                firstName
                lastName
                email
                phone
                createdAt
                updatedAt
                tags
                defaultAddress {
                  address1
                  address2
                  city
                  provinceCode
                  zip
                  country
                  phone
                }
                addresses {
                  address1
                  address2
                  city
                  provinceCode
                  zip
                  country
                  phone
                }
                amountSpent {
                  amount
                  currencyCode
                }
                numberOfOrders
              }
            }
          }
        }
      `;

      const variables = {
        first: limit,
        query: searchQuery,
      };

      const data = (await client.request(query, variables)) as {
        customers: any;
      };

      // Extract and format customer data
      const customers = data.customers.edges.map((edge: any) => {
        const customer = edge.node;

        return {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          tags: customer.tags,
          defaultAddress: customer.defaultAddress,
          addresses: customer.addresses,
          amountSpent: customer.amountSpent,
          numberOfOrders: customer.numberOfOrders,
        };
      });

      return { customers, store: storeInfo };
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw new Error(
        `Failed to fetch customers: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { getCustomers };
