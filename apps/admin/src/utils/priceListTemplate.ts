/**
 * Price-list templates are the **same** Excel format as product templates.
 * One header set, one mental model. This file is a thin wrapper around
 * `downloadProductTemplate` that switches the price source from the
 * product's own pricing to the price list's overlay.
 *
 * For an existing list, "Download current items" emits every product as a
 * row; only products that are on the list have their Prijs* / BtwPercent
 * columns filled. Cost / stock / track-stock columns are blanked because
 * they don't apply at the list level.
 */

import { fetchAllProducts } from '../services/products'
import { fetchPriceListItems } from '../services/priceLists'
import { ymdInAms } from './dateRange'
import {
  downloadProductTemplate,
  type PriceOverlay,
} from './productTemplate'
import type { UnitType } from '../types'

/** Build a blank product-template-format file for a price list. */
export async function downloadBlankPriceListTemplate(): Promise<void> {
  await downloadProductTemplate({ includeOwnerColumns: false })
}

/**
 * Build and download the current contents of a price list as an editable
 * product-template-format file. Re-uploading the file via the import flow
 * replaces the list's prices.
 */
export async function downloadCurrentPriceList(
  priceListId: string,
  listName: string,
): Promise<void> {
  const [products, items] = await Promise.all([
    fetchAllProducts(),
    fetchPriceListItems(priceListId),
  ])

  // Build overlay from list items
  const prices = new Map<string, Map<UnitType, number>>()
  const tax = new Map<string, number>()
  for (const it of items) {
    // Cost-only rows (null price) carry no price to export — skip them.
    if (it.price_cents != null) {
      if (!prices.has(it.product_id)) prices.set(it.product_id, new Map())
      prices.get(it.product_id)!.set(it.unit_type, it.price_cents)
    }
    if (it.tax_rate != null && !tax.has(it.product_id)) {
      tax.set(it.product_id, it.tax_rate)
    }
  }

  const dateStr = ymdInAms()
  const safeName = listName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const overlay: PriceOverlay = {
    prices,
    tax,
    filename: `${safeName || 'price-list'}-${dateStr}.xlsx`,
  }

  await downloadProductTemplate({
    includeOwnerColumns: false,
    existingProducts: products,
    priceOverlay: overlay,
  })
}
