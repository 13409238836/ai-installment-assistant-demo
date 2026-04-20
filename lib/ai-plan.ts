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

/** 与后端 refusal 及前端展示一致 */
export const DEFAULT_REFUSAL_MESSAGE =
  "抱歉，根据您的预算和需求，商品库中暂时没有合适的完美方案，您可以尝试提高预算或更改需求哦～"

/**
 * 闲聊意图：前端使用固定话术，不展示模型自由回复（避免漂移）。
 * 段落之间用空行（\\n\\n）分隔，便于 AiChatPanel 拆成多段排版。
 */
export const AI_CHAT_INTENT_FIXED_REPLY = `您好，我是您的专属智能精算师！只需告诉我您的月供预算或期待场景，我会为您一键搭配最优的分期方案。

您可以试着这样问我：「月供200，配齐电竞外设」「推荐一套考研无纸化学习套装」等。`

export type GeneratePlanOutcome =
  | { kind: "chat" }
  | { kind: "plan"; planTitle: string; items: ProductPoolItemDTO[] }
  | { kind: "refusal"; message: string }

type ShoppingPayload = {
  type: "shopping"
  plan: { planTitle: string; items: ProductPoolItemDTO[] }
}

/**
 * 调用服务端代理，向通义千问请求分期搭配方案（密钥仅保存在服务端环境变量）。
 * 返回区分闲聊 / 方案 / 无合适商品，不再单一抛错表示「无数据」。
 */
export async function generatePlanFromLLM(
  userMessage: string,
  currentPool: ProductPoolItemDTO[],
): Promise<GeneratePlanOutcome> {
  const res = await fetch("/api/ai-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage, productPool: currentPool }),
  })

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error("响应不是合法 JSON")
  }

  const obj = data as Record<string, unknown>

  if (!res.ok) {
    throw new Error(typeof obj.error === "string" ? obj.error : `请求失败 (${res.status})`)
  }

  if (obj.type === "chat") {
    return { kind: "chat" }
  }

  if (obj.type === "refusal") {
    const msg = obj.message
    return {
      kind: "refusal",
      message: typeof msg === "string" && msg.trim() ? msg.trim() : DEFAULT_REFUSAL_MESSAGE,
    }
  }

  if (obj.type === "shopping" && obj.plan && typeof obj.plan === "object") {
    const plan = obj.plan as { planTitle?: unknown; items?: unknown }
    const planTitle = typeof plan.planTitle === "string" ? plan.planTitle.trim() : ""
    const items = Array.isArray(plan.items) ? (plan.items as ProductPoolItemDTO[]) : []
    if (!planTitle || items.length === 0) {
      return { kind: "refusal", message: DEFAULT_REFUSAL_MESSAGE }
    }
    return { kind: "plan", planTitle, items }
  }

  throw new Error("智能方案返回格式异常，请稍后重试")
}
