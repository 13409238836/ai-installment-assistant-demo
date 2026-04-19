import type { ProductPoolItemDTO } from "@/lib/ai-plan"

/** localStorage `bundle_items` 中存储的商品条目（与 AI 方案卡片一致） */
export type BundleItem = ProductPoolItemDTO

export const BUNDLE_ITEMS_STORAGE_KEY = "bundle_items"

export function parseBundleItems(raw: string | null): BundleItem[] | null {
  if (raw == null || raw === "") return null
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0] as Record<string, unknown>
    if (typeof first?.id !== "string" || typeof first?.itemTotalPrice !== "number") return null
    return data as BundleItem[]
  } catch {
    return null
  }
}
