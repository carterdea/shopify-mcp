import { gql } from "graphql-request";
import { z } from "zod";
import { storeRegistry } from "../registry/StoreRegistry.js";

// Input schema for getting customer orders
const GetCustomerOrdersInputSchema = z.object({
  storeAlias: z.string().optional(),
  customerId: z.string().regex(/^\d+$/, "Customer ID must be numeric"),
  limit: z.number().default(10),
});

type GetCustomerOrdersInput = z.infer<typeof GetCustomerOrdersInputSchema>;

const getCustomerOrders = {
  name: "get-customer-orders",
  description: "Get orders for a specific customer",
  schema: GetCustomerOrdersInputSchema,

  initialize() {},

  execute: async (input: GetCustomerOrdersInput) => {
    try {
      const { storeAlias, customerId, limit } = input;
      const client = storeRegistry.getClient(storeAlias);
      const storeInfo = storeRegistry.getStoreInfo(storeAlias);

      // Query to get orders for a specific customer
      const query = gql`
        query GetCustomerOrders($query: String!, $first: Int!) {
          orders(query: $query, first: $first) {
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
                lineItems(first: 5) {
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
        query: `customer_id:${customerId}`,
        first: limit,
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
          lineItems,
          tags: order.tags,
          note: order.note,
        };
      });

      return { orders, store: storeInfo };
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      throw new Error(
        `Failed to fetch customer orders: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { getCustomerOrders };
