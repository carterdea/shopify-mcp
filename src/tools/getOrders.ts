import { gql } from "graphql-request";
import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

// Input schema for getOrders
const GetOrdersInputSchema = z.object({
  storeAlias: z.string().optional(),
  status: z.enum(["any", "open", "closed", "cancelled"]).default("any"),
  limit: z.number().default(10),
});

type GetOrdersInput = z.infer<typeof GetOrdersInputSchema>;

const getOrders = {
  name: "get-orders",
  description: "Get orders with optional filtering by status",
  schema: GetOrdersInputSchema,

  initialize() {},

  execute: async (input: GetOrdersInput) => {
    try {
      const { storeAlias, status, limit } = input;
      const client = storeRegistry.getClient(storeAlias);
      const storeInfo = storeRegistry.getStoreInfo(storeAlias);

      // Build query filters
      let queryFilter = "";
      if (status !== "any") {
        queryFilter = `status:${status}`;
      }

      const query = gql`
        query GetOrders($first: Int!, $query: String) {
          orders(first: $first, query: $query) {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                subtotalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalShippingPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalTaxSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                customer {
                  id
                  firstName
                  lastName
                  email
                }
                shippingAddress {
                  address1
                  address2
                  city
                  provinceCode
                  zip
                  country
                  phone
                }
                lineItems(first: 10) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      originalTotalSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                      variant {
                        id
                        title
                        sku
                      }
                    }
                  }
                }
                tags
                note
              }
            }
          }
        }
      `;

      const variables = {
        first: limit,
        query: queryFilter || undefined,
      };

      const data = (await client.request(query, variables)) as {
        orders: any;
      };

      // Extract and format order data
      const orders = data.orders.edges.map((edge: any) => {
        const order = edge.node;

        // Format line items
        const lineItems = order.lineItems.edges.map((lineItemEdge: any) => {
          const lineItem = lineItemEdge.node;
          return {
            id: lineItem.id,
            title: lineItem.title,
            quantity: lineItem.quantity,
            originalTotal: lineItem.originalTotalSet.shopMoney,
            variant: lineItem.variant
              ? {
                  id: lineItem.variant.id,
                  title: lineItem.variant.title,
                  sku: lineItem.variant.sku,
                }
              : null,
          };
        });

        return {
          id: order.id,
          name: order.name,
          createdAt: order.createdAt,
          financialStatus: order.displayFinancialStatus,
          fulfillmentStatus: order.displayFulfillmentStatus,
          totalPrice: order.totalPriceSet.shopMoney,
          subtotalPrice: order.subtotalPriceSet.shopMoney,
          totalShippingPrice: order.totalShippingPriceSet.shopMoney,
          totalTax: order.totalTaxSet.shopMoney,
          customer: order.customer
            ? {
                id: order.customer.id,
                firstName: order.customer.firstName,
                lastName: order.customer.lastName,
                email: order.customer.email,
              }
            : null,
          shippingAddress: order.shippingAddress,
          lineItems,
          tags: order.tags,
          note: order.note,
        };
      });

      return { orders, store: storeInfo };
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error(
        `Failed to fetch orders: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { getOrders };
