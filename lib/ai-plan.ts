export type ProductPoolItemDTO = {
  id: string
  name: string
  itemTotalPrice: number
  installments: number
  installmentPrice: number
  tags: string[]
  image: string
  detailImage?: string
}

export type LLMPlanResult = {
  planTitle: string
  items: ProductPoolItemDTO[]
}

/**
 * 调用服务端代理，向通义千问请求分期搭配方案（密钥仅保存在服务端环境变量）。
 */
export async function generatePlanFromLLM(
  userMessage: string,
  currentPool: ProductPoolItemDTO[],
): Promise<LLMPlanResult> {
  const res = await fetch("/api/ai-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage, productPool: currentPool }),
  })
  const data = (await res.json()) as LLMPlanResult & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `请求失败 (${res.status})`)
  }
  if (!data.planTitle || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("模型返回数据不完整")
  }
  return { planTitle: data.planTitle, items: data.items }
}
