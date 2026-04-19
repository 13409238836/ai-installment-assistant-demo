"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, ChevronRight, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BundleItem } from "@/lib/bundle-items"

/** 仅 UI 用：按商品 id 给出规格/颜色选项 */
function specOptionsForProduct(id: string): string[] {
  if (id === "mijia-flosser-f300") return ["白色", "薄荷绿"]
  if (id === "mijia-toothbrush-pro") return ["白色", "蓝色"]
  if (id === "mijia-microwave-20l") return ["白色"]
  if (id === "mijia-shaver-s302") return ["深空灰", "银色"]
  return ["官方标配", "礼盒装"]
}

export type CheckoutSheetProps = {
  open: boolean
  onClose: () => void
  items: BundleItem[] | null
}

/** 截图风格：支付宝小图标占位 */
function AlipayMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1677FF] text-[10px] font-bold text-white", className)}
      aria-hidden
    >
      支
    </span>
  )
}

function HuabeiMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1677FF] to-[#0056d6] text-[9px] font-bold leading-tight text-white",
        className,
      )}
      aria-hidden
    >
      花
    </span>
  )
}

export function CheckoutSheet({ open, onClose, items }: CheckoutSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [sheetEnter, setSheetEnter] = useState(false)
  const [specById, setSpecById] = useState<Record<string, string>>({})
  const [payMethod, setPayMethod] = useState<"installment" | "alipay">("installment")
  const [term, setTerm] = useState<3 | 6>(3)
  const [installmentDetailOpen, setInstallmentDetailOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setInstallmentDetailOpen(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !items?.length) {
      setSheetEnter(false)
      return
    }
    const next: Record<string, string> = {}
    for (const it of items) {
      const opts = specOptionsForProduct(it.id)
      next[it.id] = opts[0] ?? "官方标配"
    }
    setSpecById(next)
    const id = requestAnimationFrame(() => setSheetEnter(true))
    return () => cancelAnimationFrame(id)
  }, [open, items])

  const totalPrice = useMemo(
    () => (items ?? []).reduce((s, it) => s + it.itemTotalPrice, 0),
    [items],
  )

  /**
   * 阶梯分期：前 minTerm 期内所有商品均在还款；之后仅剩余期数 > minTerm 的商品继续还。
   * phase1Monthly = Σ installmentPrice（与「首月月供构成」合计一致）
   * phase2Monthly = Σ( installmentPrice | installments > minTerm )
   */
  const steppedInstallment = useMemo(() => {
    const list = items ?? []
    if (list.length === 0) return null
    const minTerm = Math.min(...list.map((it) => it.installments))
    const maxTerm = Math.max(...list.map((it) => it.installments))
    const phase1Monthly = list.reduce((s, it) => s + it.installmentPrice, 0)
    const phase2Monthly = list
      .filter((it) => it.installments > minTerm)
      .reduce((s, it) => s + it.installmentPrice, 0)
    const isUniformTerms = minTerm === maxTerm
    return { minTerm, maxTerm, phase1Monthly, phase2Monthly, isUniformTerms }
  }, [items])

  const firstMonthInstallmentTotal = steppedInstallment?.phase1Monthly ?? 0

  const monthly3Equal = totalPrice > 0 ? totalPrice / 3 : 0
  const monthly6Equal = totalPrice > 0 ? totalPrice / 6 : 0
  const interestPerMonth6 = monthly6Equal > 0 ? Math.max(0.01, monthly6Equal * 0.03) : 0

  if (!mounted || typeof document === "undefined") return null
  if (!open || !items?.length) return null

  const layer = (
    <>
      <button
        type="button"
        aria-label="关闭"
        className={cn(
          "fixed inset-0 z-[5000] bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out",
          sheetEnter ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      {/* iOS Bottom Sheet：贴底 fixed，无居中留白；入场自屏幕下缘 translate-y-full → 0 */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[5001] mx-auto flex max-h-[min(88dvh,844px)] w-full max-w-[390px] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform sm:rounded-t-3xl",
          sheetEnter ? "translate-y-0" : "translate-y-full",
        )}
      >
          {/* 顶栏：截图右上关闭 */}
          <div className="relative flex shrink-0 items-center justify-end px-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
              aria-label="关闭"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>

          {/* 蓝色现货条 */}
          <div className="mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-lg bg-[#e8f4ff] px-3 py-2.5">
            <span className="shrink-0 rounded bg-[#1677FF] px-2 py-0.5 text-[11px] font-semibold text-white">现货</span>
            <span className="h-3 w-px shrink-0 bg-[#bcdcff]" aria-hidden />
            <span className="text-[13px] leading-snug text-[#333]">预计付款后48小时内发货</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between border-b border-gray-100 py-3 text-left"
            >
              <span className="text-[15px] font-medium text-[#ff2442]">请添加收货地址</span>
              <span className="flex items-center text-[14px] text-gray-900">
                添加地址 <ChevronRight className="h-4 w-4 text-gray-400" />
              </span>
            </button>

            <div className="space-y-4">
              {items.map((item) => {
                const opts = specOptionsForProduct(item.id)
                const current = specById[item.id] ?? opts[0]
                return (
                  <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-gray-900">{item.name}</p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xl font-bold leading-none text-[#ff5000]">
                            <span className="text-[15px]">¥</span>
                            {item.itemTotalPrice}
                            <span className="text-[14px] font-semibold">元</span>
                          </p>
                          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-[#f7f8fa] px-0.5 py-0.5">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded text-gray-400"
                              aria-hidden
                            >
                              −
                            </span>
                            <span className="min-w-[1.25rem] text-center text-sm font-medium text-gray-900">1</span>
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded text-gray-400"
                              aria-hidden
                            >
                              +
                            </span>
                          </div>
                        </div>
                        <p className="mt-1.5 text-right text-[11px] text-gray-400">限购1件</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="mb-2 text-[13px] text-gray-600">颜色</p>
                      <div className="flex flex-wrap gap-2">
                        {opts.map((o) => {
                          const selected = o === current
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() => setSpecById((prev) => ({ ...prev, [item.id]: o }))}
                              className={cn(
                                "rounded-md border px-3 py-1.5 text-[13px] font-medium transition",
                                selected
                                  ? "border-[#ff2442] bg-[#fff5f5] text-[#ff2442]"
                                  : "border-gray-200 bg-[#f7f8fa] text-gray-600",
                              )}
                            >
                              {o}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-1 divide-y divide-gray-100 border-t border-gray-100">
              <div className="flex items-center justify-between py-3 text-[14px]">
                <span className="text-gray-900">运费</span>
                <span className="text-[13px] text-gray-400">请先完善收货地址</span>
              </div>
              <button type="button" className="flex w-full items-center justify-between py-3 text-[14px]">
                <span className="text-gray-900">备注</span>
                <span className="flex items-center text-[13px] text-gray-400">
                  无备注 <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => setPayMethod("alipay")}
                className="flex w-full items-center justify-between border-b border-gray-50 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <AlipayMark />
                  <span className="text-[15px] font-medium text-gray-900">支付宝</span>
                </div>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    payMethod === "alipay" ? "border-[#1677FF]" : "border-gray-300",
                  )}
                >
                  {payMethod === "alipay" && <span className="h-2.5 w-2.5 rounded-full bg-[#1677FF]" />}
                </span>
              </button>

              <div className="py-2">
                <button
                  type="button"
                  onClick={() => setPayMethod("installment")}
                  className="flex w-full items-center justify-between gap-2 py-3 text-left"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <HuabeiMark className="mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[15px] font-semibold text-gray-900">花呗分期</span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-[#1677FF] px-1.5 py-0.5 text-[10px] font-medium text-white">
                          3期分期
                        </span>
                        <span className="rounded bg-[#ff2442] px-1.5 py-0.5 text-[10px] font-medium text-white">免息</span>
                      </div>
                    </div>
                  </div>
                  {payMethod === "installment" ? (
                    <Check className="h-5 w-5 shrink-0 text-[#ff2442]" strokeWidth={2.5} />
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300" aria-hidden />
                  )}
                </button>

                {payMethod === "installment" && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => setTerm(3)}
                      className={cn(
                        "relative min-w-[148px] shrink-0 rounded-xl border-2 px-3 py-3 text-left transition",
                        term === 3
                          ? "border-[#87bfff] bg-[#eef6ff] shadow-sm"
                          : "border-transparent bg-[#f7f8fa]",
                      )}
                    >
                      {term === 3 && (
                        <span className="absolute right-2 top-2 rounded bg-[#ff8a00] px-1.5 py-0.5 text-[10px] font-medium text-white">
                          推荐
                        </span>
                      )}
                      <p className="text-lg font-bold text-[#1677FF]">
                        ¥{monthly3Equal.toFixed(2)}
                        <span className="text-[13px] font-semibold"> × 3期</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-[#ff2442] px-1 py-0.5 text-[10px] font-medium text-white">免息</span>
                        <span className="text-[11px] text-gray-500">0利息</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTerm(6)}
                      className={cn(
                        "min-w-[148px] shrink-0 rounded-xl border-2 px-3 py-3 text-left transition",
                        term === 6 ? "border-gray-300 bg-white shadow-sm" : "border-transparent bg-[#f7f8fa]",
                      )}
                    >
                      <p className="text-lg font-bold text-gray-800">
                        ¥{monthly6Equal.toFixed(2)}
                        <span className="text-[13px] font-semibold"> × 6期</span>
                      </p>
                      <p className="mt-2 text-[11px] text-[#ff5000]">
                        7.2折利息 <span className="text-gray-500">¥{interestPerMonth6.toFixed(2)}/期</span>
                      </p>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {payMethod === "alipay" && (
              <p className="mt-2 px-1 pb-2 text-center text-xs text-gray-400">选择支付宝将一次性付清 ¥{totalPrice}</p>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-gray-100 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[14px] text-gray-900">合计</span>
                <span className="text-xl font-bold text-gray-900">¥{totalPrice}</span>
              </div>
              {payMethod === "installment" && steppedInstallment && (
                <>
                  {steppedInstallment.isUniformTerms ? (
                    <p className="mt-2 text-[15px] font-bold leading-snug text-gray-900">
                      共 {steppedInstallment.minTerm} 期，月供约{" "}
                      <span className="text-[#ff2442]">¥{steppedInstallment.phase1Monthly.toFixed(2)}</span>
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-[15px] font-bold leading-snug text-gray-900">
                        前 {steppedInstallment.minTerm} 期月供约{" "}
                        <span className="text-[#ff2442]">¥{steppedInstallment.phase1Monthly.toFixed(2)}</span>
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                        {steppedInstallment.minTerm} 期后月供降至 ¥{steppedInstallment.phase2Monthly.toFixed(2)}（第{" "}
                        {steppedInstallment.minTerm + 1}-{steppedInstallment.maxTerm} 期）
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setInstallmentDetailOpen((v) => !v)}
                    className="mt-1 flex items-center gap-0.5 text-[12px] font-medium text-[#ff2442]"
                    aria-expanded={installmentDetailOpen}
                  >
                    明细
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", installmentDetailOpen ? "rotate-180" : "rotate-0")}
                      strokeWidth={2.5}
                    />
                  </button>
                  {installmentDetailOpen && items && (
                    <div className="mt-2 rounded-lg border border-gray-100 bg-[#f7f8fa] px-3 py-2.5 text-[11px] leading-relaxed text-gray-700">
                      <p className="mb-2 font-semibold text-gray-900">首月月供构成</p>
                      <ul className="space-y-1.5">
                        {items.map((it) => (
                          <li key={it.id} className="flex gap-1.5">
                            <span className="shrink-0 text-gray-400">·</span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2">{it.name}</span>
                              <span className="text-gray-500">
                                {" "}
                                （{it.installments}期）首月{" "}
                                <span className="font-semibold text-gray-900">¥{it.installmentPrice.toFixed(2)}</span>
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 border-t border-dashed border-gray-200 pt-2 text-gray-800">
                        首月合计{" "}
                        <span className="text-sm font-bold text-gray-900">¥{firstMonthInstallmentTotal.toFixed(2)}</span>
                        <span className="block pt-0.5 text-[10px] font-normal text-gray-500">
                          {steppedInstallment.isUniformTerms
                            ? "为各商品方案月供之和，与底部「共 N 期」月供一致；与上方「整单 3 期 / 6 期」示意选项无直接加总关系。"
                                .replace("N", String(steppedInstallment.minTerm))
                            : `为前 ${steppedInstallment.minTerm} 期内各商品月供之和，与底部「前 ${steppedInstallment.minTerm} 期月供」一致；与上方「整单 3 期 / 6 期」示意选项无直接加总关系。`}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <Button className="h-12 w-full rounded-full bg-[#ff2442] text-base font-semibold text-white shadow-sm hover:bg-[#e61e3a]">
              立即支付
            </Button>
          </div>
        </div>
    </>
  )

  return createPortal(layer, document.body)
}
