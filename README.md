# Shopify MCP Server

(please leave a star if you like!)

MCP Server for Shopify API, enabling interaction with store data through GraphQL API. This server provides tools for managing products, customers, orders, and more.

**📦 Package Name: `shopify-mcp`**
**🚀 Command: `shopify-mcp` (NOT `shopify-mcp-server`)**

<a href="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp/badge" alt="Shopify MCP server" />
</a>

## Features

- **Multi-Store Support**: Connect to multiple Shopify stores and switch between them
- **Product Management**: Search, retrieve, and create product information
- **Customer Management**: Load customer data and manage customer tags
- **Order Management**: Advanced order querying and filtering
- **Metafield Management**: Create definitions, manage metafields on any resource
- **GraphQL Integration**: Direct integration with Shopify's GraphQL Admin API
- **Comprehensive Error Handling**: Clear error messages for API and authentication issues

## Prerequisites

1. Node.js (version 18 or higher)
2. Shopify Custom App Access Token (see setup instructions below)

## Setup

### Shopify Access Token

To use this MCP server, you'll need to create a custom app in your Shopify store:

1. From your Shopify admin, go to **Settings** > **Apps and sales channels**
2. Click **Develop apps** (you may need to enable developer preview first)
3. Click **Create an app**
4. Set a name for your app (e.g., "Shopify MCP Server")
5. Click **Configure Admin API scopes**
6. Select the following scopes:
   - `read_products`, `write_products`
   - `read_customers`, `write_customers`
   - `read_orders`, `write_orders`
7. Click **Save**
8. Click **Install app**
9. Click **Install** to give the app access to your store data
10. After installation, you'll see your **Admin API access token**
11. Copy this token - you'll need it for configuration

## Configuration

### Single Store (Simple)

For a single store, you can use command-line arguments or environment variables.

#### Claude Desktop Configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": [
        "shopify-mcp",
        "--accessToken",
        "<YOUR_ACCESS_TOKEN>",
        "--domain",
        "<YOUR_SHOP>.myshopify.com"
      ]
    }
  }
}
```

#### Environment Variables

Create a `.env` file with your Shopify credentials:

```
SHOPIFY_ACCESS_TOKEN=your_access_token
MYSHOPIFY_DOMAIN=your-store.myshopify.com
```

### Multi-Store Configuration

For managing multiple Shopify stores, create a JSON configuration file:

#### Config File Format

Create a file (e.g., `shopify-stores.json`):

```json
{
  "stores": {
    "acme": {
      "domain": "acme-widgets.myshopify.com",
      "accessToken": "shpat_xxx"
    },
    "beta": {
      "domain": "beta-goods.myshopify.com",
      "accessToken": "shpat_yyy"
    },
    "staging": {
      "domain": "my-store-staging.myshopify.com",
      "accessToken": "shpat_zzz"
    }
  },
  "defaultStore": "acme"
}
```

#### Claude Desktop with Multi-Store

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": [
        "shopify-mcp",
        "--config",
        "/path/to/shopify-stores.json"
      ]
    }
  }
}
```

#### Using SHOPIFY_STORES_CONFIG Environment Variable

You can also provide the configuration via an environment variable:

```bash
# As a file path
export SHOPIFY_STORES_CONFIG=/path/to/shopify-stores.json

# Or as inline JSON
export SHOPIFY_STORES_CONFIG='{"stores":{"acme":{"domain":"acme.myshopify.com","accessToken":"shpat_xxx"}}}'
```

### Configuration Priority

The server loads configuration in this order (first match wins):

1. `--config` CLI argument (path to JSON file)
2. `SHOPIFY_STORES_CONFIG` environment variable (JSON string or file path)
3. Legacy single-store env vars (`SHOPIFY_ACCESS_TOKEN` + `MYSHOPIFY_DOMAIN`)
4. `--accessToken` + `--domain` CLI arguments

### Using Multiple Stores

Once configured with multiple stores, you can:

1. **List available stores**: Use the `list-stores` tool to see all configured stores
2. **Target a specific store**: Add `storeAlias` parameter to any tool call
3. **Use the default store**: Omit `storeAlias` to use the default (or the only configured store)

Example tool calls:

```json
// List all configured stores
{ "tool": "list-stores" }

// Get products from specific store
{ "tool": "get-products", "storeAlias": "beta", "limit": 10 }

// Get products from default store
{ "tool": "get-products", "limit": 10 }
```

All tool responses include a `store` object with `alias` and `domain` to confirm which store was queried.

## Available Tools

### Store Management

1. `list-stores`
   - List all configured Shopify stores
   - Returns store aliases, domains, and which is the default

### Product Management

1. `get-products`

   - Get all products or search by title
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `searchTitle` (optional string): Filter products by title
     - `limit` (number): Maximum number of products to return

2. `get-product-by-id`

   - Get a specific product by ID
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `productId` (string): ID of the product to retrieve

3. `create-product`
   - Create new product in store
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `title` (string): Title of the product
     - `descriptionHtml` (string): Description of the product
     - `vendor` (string): Vendor of the product
     - `productType` (string): Type of the product
     - `tags` (string): Tags of the product
     - `status` (string): Status of the product "ACTIVE", "DRAFT", "ARCHIVED". Default "DRAFT"

### Customer Management

1. `get-customers`

   - Get customers or search by name/email
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `searchQuery` (optional string): Filter customers by name or email
     - `limit` (optional number, default: 10): Maximum number of customers to return

2. `update-customer`

   - Update a customer's information
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `id` (string, required): Shopify customer ID (numeric ID only, like "6276879810626")
     - `firstName` (string, optional): Customer's first name
     - `lastName` (string, optional): Customer's last name
     - `email` (string, optional): Customer's email address
     - `phone` (string, optional): Customer's phone number
     - `tags` (array of strings, optional): Tags to apply to the customer
     - `note` (string, optional): Note about the customer
     - `taxExempt` (boolean, optional): Whether the customer is exempt from taxes
     - `metafields` (array of objects, optional): Customer metafields for storing additional data

3. `get-customer-orders`
   - Get orders for a specific customer
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `customerId` (string, required): Shopify customer ID (numeric ID only, like "6276879810626")
     - `limit` (optional number, default: 10): Maximum number of orders to return

### Order Management

1. `get-orders`

   - Get orders with optional filtering
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `status` (optional string): Filter by order status
     - `limit` (optional number, default: 10): Maximum number of orders to return

2. `get-order-by-id`

   - Get a specific order by ID
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `orderId` (string, required): Full Shopify order ID (e.g., "gid://shopify/Order/6090960994370")

3. `update-order`

   - Update an existing order with new information
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `id` (string, required): Shopify order ID
     - `tags` (array of strings, optional): New tags for the order
     - `email` (string, optional): Update customer email
     - `note` (string, optional): Order notes
     - `customAttributes` (array of objects, optional): Custom attributes for the order
     - `metafields` (array of objects, optional): Order metafields
     - `shippingAddress` (object, optional): Shipping address information

### Metafield Management

1. `create-metafield-definition`

   - Create a metafield definition to define schema for metafields
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `namespace` (string, required): Namespace for the metafield (e.g., 'custom')
     - `key` (string, required): Key for the metafield (e.g., 'warranty_info')
     - `name` (string, required): Human-readable name for the metafield
     - `type` (string, required): Type of the metafield (e.g., 'single_line_text_field', 'json', 'number_integer', 'boolean', 'date', 'product_reference', etc.)
     - `ownerType` (string, required): Resource type this applies to (PRODUCT, PRODUCT_VARIANT, CUSTOMER, ORDER, COLLECTION, etc.)
     - `description` (string, optional): Description of the metafield
     - `validations` (array, optional): Validation rules for the metafield

2. `get-metafield-definitions`

   - Retrieve metafield definitions from your store
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `ownerType` (string, optional): Filter by resource type (PRODUCT, CUSTOMER, ORDER, etc.)
     - `namespace` (string, optional): Filter by namespace
     - `first` (number, optional, default: 50): Number of definitions to retrieve

3. `update-product-metafields`

   - Update or create metafields on a product
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `productId` (string, required): Product ID (numeric or GID format)
     - `metafields` (array, required): Array of metafield objects with:
       - `namespace` (string): Namespace for the metafield
       - `key` (string): Key for the metafield
       - `value` (string): Value as string (even for JSON)
       - `type` (string): Type of the metafield

4. `set-metafields`

   - Create or update metafields on any Shopify resource (Product, Variant, Customer, Order, Collection, etc.)
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `ownerId` (string, required): Resource ID in GID format (e.g., 'gid://shopify/Product/123')
     - `metafields` (array, required): Array of metafield objects with:
       - `namespace` (string): Namespace for the metafield
       - `key` (string): Key for the metafield
       - `value` (string): Value as string (even for JSON)
       - `type` (string): Type of the metafield

5. `delete-metafield`

   - Delete a metafield from Shopify
   - Inputs:
     - `storeAlias` (optional string): Target store alias
     - `metafieldId` (string, required): Metafield ID in GID format (e.g., 'gid://shopify/Metafield/123456')

## Migration from v1.x

If you're upgrading from a single-store setup, your existing configuration will continue to work. The server automatically treats legacy environment variables as a store with the alias "default".

To take advantage of multi-store support:

1. Create a JSON config file with your stores
2. Update your Claude Desktop config to use `--config`
3. Optionally add `storeAlias` to your tool calls to target specific stores

## Debugging

If you encounter issues, check Claude Desktop's MCP logs:

```
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## License

MIT
