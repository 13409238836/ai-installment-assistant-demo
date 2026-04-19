"use client"

import Link from "next/link"
import type { ProductPoolItem } from "@/data/products"
import { BATCH_EIGHT_DETAIL_OVERRIDES } from "@/lib/catalog-batch-eight"
import { cn } from "@/lib/utils"

const IMAGE_FALLBACK = "/placeholder.svg"

export type WaterfallProductCardProps = {
  item: ProductPoolItem
  className?: string
}

/** 首页瀑布流商品卡片：展示分期价 + 主图 */
export function WaterfallProductCard({ item, className }: WaterfallProductCardProps) {
  const detail = BATCH_EIGHT_DETAIL_OVERRIDES[item.id]
  const originalPrice = detail?.originalPrice
  const interestSaved = detail?.interestSavedText

  const installmentBadge = [
    `${item.installments}期 免息`,
    interestSaved && !/^分期免息$/.test(interestSaved) ? interestSaved : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      href={`/product/${item.id}`}
      className={cn(
        "cff-product-card block bg-white rounded-2xl p-2.5 flex flex-col overflow-hidden text-inherit no-underline shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-opacity duration-150 outline-none ring-offset-2 focus-visible:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400",
        className,
      )}
    >
      <div className="cff-product-thumb relative aspect-square bg-gradient-to-b from-muted/30 to-muted rounded-xl mb-2 overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="h-full w-full object-cover rounded-xl p-2"
          onError={(ev) => {
            const t = ev.currentTarget
            t.onerror = null
            t.src = IMAGE_FALLBACK
          }}
        />
      </div>
      <div className="cff-product-meta grid grid-rows-[16px_20px_22px] gap-y-1 items-start min-w-0">
        <p className="cff-product-title text-[12px] leading-4 text-foreground truncate min-h-0 min-w-0">{item.name}</p>
        <div className="flex items-center min-h-0">
          <div className="inline-flex max-w-full items-center rounded-full bg-[#FFF2E6] text-[#FF6A00] pl-2 pr-2 py-0.5 text-[11px] leading-4 font-semibold">
            <span className="truncate">{installmentBadge || `${item.installments}期 免息`}</span>
          </div>
        </div>
        <div className="flex items-end gap-0.5">
          <span className="text-[#111111] text-[13px] leading-none font-semibold self-end">¥</span>
          <span className="text-[#111111] text-[18px] leading-none font-bold tracking-[-0.2px] tabular-nums self-end">
            {item.installmentPrice.toFixed(2)}
          </span>
          <span className="text-[#111111] text-[13px] leading-none font-semibold self-end">/期</span>
          {typeof originalPrice === "number" && (
            <span className="text-[#9BA0AA] text-[11px] leading-none ml-auto tabular-nums self-end">
              ¥{originalPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
