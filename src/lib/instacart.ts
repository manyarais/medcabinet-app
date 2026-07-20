// Instacart Developer Platform — shopping list link (dev stub).
// POST /idp/v1/products/products_link → { products_link_url }.
// Multi-item `line_items` is ready for a future "running low" batch.

export type InstacartLineItem = {
  name: string;
  quantity?: number;
};

const DEV_BASE = "https://connect.dev.instacart.tools";

export function isInstacartConfigured(): boolean {
  return Boolean(process.env.INSTACART_API_KEY?.trim());
}

/**
 * Create an Instacart shopping-list page URL for one or more products.
 * Requires INSTACART_API_KEY. Response field: products_link_url.
 */
export async function createInstacartShoppingListUrl(
  items: InstacartLineItem[],
  title = "Pillio restock",
): Promise<string> {
  const key = process.env.INSTACART_API_KEY?.trim();
  if (!key) {
    throw new Error("Instacart is not configured.");
  }

  const lineItems = items
    .map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity ?? 1,
    }))
    .filter((item) => item.name.length > 0);

  if (lineItems.length === 0) {
    throw new Error("At least one product name is required.");
  }

  const response = await fetch(`${DEV_BASE}/idp/v1/products/products_link`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      title,
      link_type: "shopping_list",
      line_items: lineItems,
    }),
  });

  const json = (await response.json().catch(() => ({}))) as {
    products_link_url?: string;
    url?: string;
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      json.error ?? json.message ?? `Instacart request failed (${response.status}).`,
    );
  }

  const url = json.products_link_url ?? json.url;
  if (!url || typeof url !== "string") {
    throw new Error("Instacart did not return a shopping list URL.");
  }
  return url;
}
