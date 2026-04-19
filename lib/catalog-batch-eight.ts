/**
 * 截图 8 品：详情文案覆盖（商品主数据见 `data/products.ts` 的 PRODUCT_POOL）。
 */

import { BATCH_EIGHT_IDS, PRODUCT_POOL, type ProductPoolItem } from "@/data/products"

export type BatchEightPoolItem = ProductPoolItem

export type BatchEightDetailOverride = {
  originalPrice: number
  title: string
  interestSavedText: string
  parameterPrimary: string
  parameterSecondary: string
  benefitTitle: string
  benefitDesc: string
  benefitSubDesc: string
  benefitActionText: string
  storeName: string
}

/** @deprecated 使用 `PRODUCT_POOL` 与 `BATCH_EIGHT_IDS` */
export const BATCH_EIGHT_POOL: BatchEightPoolItem[] = PRODUCT_POOL.filter((p) =>
  (BATCH_EIGHT_IDS as readonly string[]).includes(p.id),
)

export const BATCH_EIGHT_DETAIL_OVERRIDES: Record<string, BatchEightDetailOverride> = {
  "onikuma-g67": {
    originalPrice: 206,
    title: "【6期免息】ONIKUMA G67 电竞级磁轴有线机械键盘 67键 全键热插拔 等高线",
    interestSavedText: "分期免息",
    parameterPrimary: "ONIKUMA / 广东省东莞",
    parameterSecondary: "品牌 · 产地",
    benefitTitle: "发货与保障",
    benefitDesc: "48小时内发货 · 包邮",
    benefitSubDesc: "晚发必赔 · 极速退款",
    benefitActionText: "查看",
    storeName: "千盛甄选",
  },
  "ugreen-mech-kb108": {
    originalPrice: 255,
    title: "【3期免息】绿联机械键盘有线红轴办公静音108键 PBT双色注塑 消音底棉",
    interestSavedText: "省利息约5.73",
    parameterPrimary: "绿联 / UGREEN",
    parameterSecondary: "品牌",
    benefitTitle: "物流",
    benefitDesc: "现货 · 预计付款后48小时内发货",
    benefitSubDesc: "晚发必赔 · 无忧售后 · 正品保障",
    benefitActionText: "进店",
    storeName: "新硕品质家电汇",
  },
  "mijia-microwave-20l": {
    originalPrice: 309,
    title: "【3期免息】米家微波炉 20L 白色 旋钮操控",
    interestSavedText: "分期免息",
    parameterPrimary: "小米 / 米家 · 广东省",
    parameterSecondary: "品牌 · 产地",
    benefitTitle: "发货",
    benefitDesc: "48小时内发货 · 浙江金华 · 包邮",
    benefitSubDesc: "晚发必赔 · 极速退款",
    benefitActionText: "查看",
    storeName: "良品甄选",
  },
  "mijia-toothbrush-pro": {
    originalPrice: 211,
    title: "【3期免息】米家声波扫振电动牙刷 Pro 深层清洁 多规格可选",
    interestSavedText: "分期免息",
    parameterPrimary: "米家 · 适用人群：成人",
    parameterSecondary: "型号 · 人群",
    benefitTitle: "发货",
    benefitDesc: "48小时内发货 · 浙江金华 · 包邮",
    benefitSubDesc: "晚发必赔 · 极速退款",
    benefitActionText: "查看",
    storeName: "良品甄选",
  },
  "mijia-shaver-s302": {
    originalPrice: 235,
    title: "【3期免息】米家电动剃须刀 S302 旋转三刀头",
    interestSavedText: "分期免息",
    parameterPrimary: "米家 · 型号 S302",
    parameterSecondary: "品牌 · 型号",
    benefitTitle: "发货",
    benefitDesc: "48小时内发货 · 浙江金华 · 包邮",
    benefitSubDesc: "晚发必赔 · 极速退款",
    benefitActionText: "查看",
    storeName: "良品甄选",
  },
  "mijia-flosser-f300": {
    originalPrice: 170,
    title: "【3期免息】米家便携式冲牙器 F300 多喷嘴",
    interestSavedText: "分期免息",
    parameterPrimary: "米家 · 便携款 · F300 · 三喷嘴",
    parameterSecondary: "品牌 · 产地",
    benefitTitle: "发货",
    benefitDesc: "48小时内发货 · 浙江金华 · 包邮",
    benefitSubDesc: "晚发必赔 · 极速退款",
    benefitActionText: "查看",
    storeName: "良品甄选",
  },
  "mijia-pocket-printer-pro": {
    originalPrice: 599,
    title: "【3期免息】米家口袋照片打印机 Pro",
    interestSavedText: "分期免息",
    parameterPrimary: "小米 / 米家 · 广东省",
    parameterSecondary: "品牌 · 产地",
    benefitTitle: "发货",
    benefitDesc: "48小时内发货 · 浙江金华 · 包邮",
    benefitSubDesc: "晚发必赔 · 极速退款",
    benefitActionText: "查看",
    storeName: "良品甄选",
  },
  "insta360-ace-pro-2": {
    originalPrice: 2999,
    title: "【3期免息】影石 Insta360 Ace Pro 2 8K 运动相机 AI 双芯 徕卡镜头 防抖",
    interestSavedText: "省利息68.26",
    parameterPrimary: "影石 / Insta360 · 视角约157°",
    parameterSecondary: "品牌 · 规格",
    benefitTitle: "活动",
    benefitDesc: "支持以旧换新（以平台规则为准）",
    benefitSubDesc: "正品保障 · 极速退款",
    benefitActionText: "查看",
    storeName: "官方旗舰店",
  },
}

export function getBatchEightById(id: string): { pool: BatchEightPoolItem; detail: BatchEightDetailOverride } | null {
  if (!(BATCH_EIGHT_IDS as readonly string[]).includes(id)) return null
  const pool = PRODUCT_POOL.find((p) => p.id === id)
  if (!pool) return null
  const detail = BATCH_EIGHT_DETAIL_OVERRIDES[id]
  if (!detail) return null
  return { pool, detail }
}
