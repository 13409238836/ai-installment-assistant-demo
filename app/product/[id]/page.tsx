import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Star } from "lucide-react"
import { BATCH_EIGHT_IDS } from "@/data/products"
import { getBatchEightById } from "@/lib/catalog-batch-eight"

type PageProps = { params: Promise<{ id: string }> }

export function generateStaticParams() {
  return BATCH_EIGHT_IDS.map((id) => ({ id }))
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const row = getBatchEightById(id)
  if (!row) return { title: "商品" }
  return { title: `${row.pool.name} · 分期生活` }
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params
  const row = getBatchEightById(id)
  if (!row) notFound()

  const { pool, detail } = row
  const hero = pool.detailImage ?? pool.image

  return (
    <div className="min-h-dvh bg-[#f6f6f6] pb-28 [font-family:'PingFang_SC','PingFang SC','SF Pro Display','Helvetica Neue',sans-serif]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-3 py-2 backdrop-blur">
        <Link href="/" className="rounded-full p-2 text-gray-800 hover:bg-gray-100" aria-label="返回首页">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-semibold text-gray-800">商品详情</span>
        <button type="button" className="rounded-full p-2 text-gray-600 hover:bg-gray-100" aria-label="收藏">
          <Star className="h-5 w-5" />
        </button>
      </header>

      <div className="bg-white">
        <div className="relative h-[min(52vh,420px)] w-full bg-white">
          <Image src={hero} alt={pool.name} fill className="object-contain object-center" priority sizes="100vw" unoptimized />
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-baseline font-bold text-red-500">
            <span className="mr-0.5 text-lg">¥</span>
            <span className="text-2xl">{pool.itemTotalPrice}</span>
            <span className="ml-2 text-base font-medium text-gray-400 line-through">¥{detail.originalPrice}</span>
          </div>
          <h1 className="mt-2 text-base font-semibold leading-snug text-gray-800">{detail.title}</h1>
          <div className="mt-3 rounded-md bg-[#fff4f4] px-3 py-2">
            <p className="text-sm text-gray-700">
              <span className="mr-2 rounded bg-blue-500 px-1.5 py-0.5 text-xs text-white">{pool.installments}期</span>
              <span className="mr-2 rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">免息</span>
              {detail.interestSavedText}{" "}
              <span className="font-semibold">¥{pool.installmentPrice}/期</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2 bg-white">
        <div className="flex items-center bg-white px-4 py-3">
          <span className="w-12 shrink-0 text-sm text-gray-500">参数</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm text-gray-800">{detail.parameterPrimary}</span>
            <span className="text-xs text-gray-500">{detail.parameterSecondary}</span>
          </div>
        </div>
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-base font-semibold text-gray-800">{detail.benefitTitle}</p>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <div className="min-w-0 pr-2">
              <p className="text-sm text-gray-800">{detail.benefitDesc}</p>
              <p className="text-xs text-gray-500">{detail.benefitSubDesc}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#fff1f3] px-3 py-1 text-sm font-medium text-red-500">{detail.benefitActionText}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 bg-white px-4 py-4">
        <p className="text-xl font-semibold text-gray-800">{detail.storeName}</p>
        <p className="mt-2 text-sm text-gray-500">商品配图来自你提供的截图，价格与分期信息以页面展示为准。</p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#ff1f4b] text-lg font-semibold text-white"
        >
          免息购 ¥{pool.itemTotalPrice}
        </Link>
      </div>
    </div>
  )
}
