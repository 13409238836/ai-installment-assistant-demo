import type { ProductPoolItemDTO } from "@/lib/ai-plan"

export type GetAlternativeStrategy = "closest-price" | "random"

/**
 * 智能替换：以 `current.tags[0]` 为核心类目，在商品池中找同类其它商品。
 * - 默认：优先选总价最接近当前商品的候选；并列时随机。
 * - random：在候选中完全随机。
 */
export function getAlternativeProduct(
  current: ProductPoolItemDTO,
  fullPool: ProductPoolItemDTO[],
  options?: { strategy?: GetAlternativeStrategy },
): ProductPoolItemDTO | null {
  const core = current.tags[0]?.trim()
  if (!core) return null

  const candidates = fullPool.filter((p) => p.id !== current.id && p.tags.includes(core))
  if (candidates.length === 0) return null

  const strategy = options?.strategy ?? "closest-price"
  if (strategy === "random") {
    return candidates[Math.floor(Math.random() * candidates.length)]!
  }

  const target = current.itemTotalPrice
  const sorted = [...candidates].sort(
    (a, b) => Math.abs(a.itemTotalPrice - target) - Math.abs(b.itemTotalPrice - target),
  )
  const bestDiff = Math.abs(sorted[0]!.itemTotalPrice - target)
  const tied = sorted.filter((c) => Math.abs(c.itemTotalPrice - target) === bestDiff)
  return tied[Math.floor(Math.random() * tied.length)]!
}
