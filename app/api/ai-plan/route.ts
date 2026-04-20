import { NextRequest, NextResponse } from "next/server"
import { DEFAULT_REFUSAL_MESSAGE } from "@/lib/ai-plan"

type PoolItem = {
  id: string
  name: string
  itemTotalPrice: number
  installments: number
  installmentPrice: number
  tags: string[]
  image: string
  detailImage?: string
}

function buildSystemPrompt(productPool: PoolItem[]) {
  const poolJson = JSON.stringify(productPool)
  return `你是「分期生活」里的智能精算师助手，只负责**意图识别**与**可选的商品搭配方案**输出。你必须**只输出一个 JSON 对象**，不要 Markdown 代码围栏，不要额外说明文字。

【第一步：意图识别（必须遵守）】
先判断用户这句话是否属于以下**购物/分期场景**之一：
- 需要推荐商品、搭配套装、选购、预算、月供、分期、免息、凑单等；
- 或明确描述商品品类/场景（如学习、电竞、办公）并可能带预算。

若用户只是在**闲聊、身份问答、无关话题**（例如「你是谁」「你在干嘛」「天气如何」），或**没有任何购物/分期相关意图**，则**不要**从商品库中选品，**不要**编造商品。

【第二步：输出结构（必须严格遵守）】
仅允许两种顶层结构：

1) 闲聊 / 非购物意图：
{
  "type": "chat",
  "message": "可简短回复用户（可选，客户端可能使用固定话术）"
}

2) 购物 / 分期意图：
{
  "type": "shopping",
  "plan": {
    "planTitle": "方案标题（简洁专业，不要使用 emoji）",
    "items": [
      从【商品库】中选出的商品。每一项只需保证能对应到库中 id；若无法选出符合预算与需求的组合，**必须**将 items 设为 []，且不要胡乱拼凑不相关商品。
    ]
  }
}

【商品库】（仅当 type 为 shopping 且确有搭配需求时使用）：
${poolJson}

【预算与月供（shopping 时强制）】
- 若用户给出了**目标月供金额**（如「月供300」「每月500块」「预算不超过400」），则所选商品组合的总月供（各 SKU 的 installmentPrice 之和）必须落在该目标金额的 **±10%** 以内。若商品库中**不存在**满足该约束的组合，**必须**返回 items 为 []，不得强行推荐。
- 若用户**未**给出明确月供/预算数字，则不做 ±10% 数值约束，但仍须合理搭配，避免无关商品。

【空结果】
当无法满足预算或库里没有合适商品时：type 仍为 "shopping"，plan.items 为 []，planTitle 可为空字符串。

【字段说明】
- shopping 时，plan.items 中每条在服务端会按 id 与商品库对齐；你应只使用库中已存在的 id；禁止编造 id 或价格。`
}

function resolveItemsFromPool(rawItems: unknown[], pool: PoolItem[]): PoolItem[] {
  if (!Array.isArray(rawItems)) return []
  const byId = new Map(pool.map((p) => [p.id, p]))
  const resolved: PoolItem[] = []
  for (const row of rawItems) {
    if (!row || typeof row !== "object") continue
    const id = (row as { id?: string }).id
    if (!id || typeof id !== "string") continue
    const canonical = byId.get(id)
    if (canonical) resolved.push({ ...canonical })
  }
  return resolved
}

/**
 * 从用户输入中提取「目标月供」数值（元）。提取不到则返回 null，表示不做 ±10% 校验。
 */
function extractMonthlyBudgetYuan(text: string): number | null {
  const s = text.trim()
  if (!s) return null
  const patterns: RegExp[] = [
    /(?:月供|每月|月预算|每个月|预算|一月|一个月)[^\d]{0,8}?(\d{1,5})(?:\s*[元块])?/,
    /(\d{1,5})\s*(?:元|块)?\s*(?:\/\s*月|每月|每个月|月供)(?:\s*(?:以内|左右|上下))?/,
    /(?:不超过|大概|约|左右|最多|至少|最少)\s*(\d{1,5})\s*(?:元|块)?/,
    /(?:^|[^\d])(\d{2,5})\s*(?:元|块)(?:[^\d]|$)/,
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > 0 && n < 1_000_000) return n
    }
  }
  return null
}

function totalMonthlyInstallment(items: PoolItem[]): number {
  return items.reduce((sum, it) => sum + it.installmentPrice, 0)
}

function withinBudgetBand(total: number, budget: number, ratio = 0.1): boolean {
  const low = budget * (1 - ratio)
  const high = budget * (1 + ratio)
  return total >= low && total <= high
}

type ModelJson =
  | { type: "chat"; message?: string }
  | { type: "shopping"; plan?: { planTitle?: string; items?: unknown[] } }
  | { type?: string; planTitle?: string; items?: unknown[] }

function parseModelPayload(content: string): ModelJson | null {
  try {
    return JSON.parse(content) as ModelJson
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: "服务端未配置 DASHSCOPE_API_KEY，请在环境变量中设置通义千问 API Key" },
      { status: 500 },
    )
  }

  let body: { userMessage?: string; productPool?: PoolItem[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "无效的 JSON 请求体" }, { status: 400 })
  }

  const userMessage = typeof body.userMessage === "string" ? body.userMessage.trim() : ""
  const productPool = Array.isArray(body.productPool) ? body.productPool : []
  if (!userMessage) {
    return NextResponse.json({ error: "userMessage 不能为空" }, { status: 400 })
  }
  if (productPool.length === 0) {
    return NextResponse.json({ error: "productPool 不能为空" }, { status: 400 })
  }

  const systemContent = buildSystemPrompt(productPool)
  const budgetYuan = extractMonthlyBudgetYuan(userMessage)

  try {
    const upstream = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-plus",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userMessage },
        ],
      }),
    })

    const rawText = await upstream.text()
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `通义千问接口错误: ${upstream.status}`, detail: rawText.slice(0, 2000) },
        { status: 502 },
      )
    }

    let completion: {
      choices?: Array<{ message?: { content?: string } }>
    }
    try {
      completion = JSON.parse(rawText) as typeof completion
    } catch {
      return NextResponse.json({ error: "无法解析大模型响应 JSON" }, { status: 502 })
    }

    const content = completion.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "大模型返回内容为空" }, { status: 502 })
    }

    const parsed = parseModelPayload(content.trim())
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "大模型返回的不是合法 JSON 对象" }, { status: 502 })
    }

    // 兼容旧版：顶层 { planTitle, items }，无 type 字段
    const rawTop = parsed as Record<string, unknown>
    const legacy = rawTop.type === undefined && Array.isArray(rawTop.items)
    if (legacy) {
      const p = parsed as { planTitle?: string; items?: unknown[] }
      const planTitle = typeof p.planTitle === "string" ? p.planTitle.trim() : ""
      const resolved = resolveItemsFromPool((p.items ?? []) as unknown[], productPool)
      if (resolved.length === 0) {
        return NextResponse.json({ type: "refusal", message: DEFAULT_REFUSAL_MESSAGE })
      }
      const total = totalMonthlyInstallment(resolved)
      if (budgetYuan != null && !withinBudgetBand(total, budgetYuan)) {
        return NextResponse.json({ type: "refusal", message: DEFAULT_REFUSAL_MESSAGE })
      }
      if (!planTitle) {
        return NextResponse.json({ error: "模型输出缺少 planTitle" }, { status: 422 })
      }
      return NextResponse.json({
        type: "shopping",
        plan: { planTitle, items: resolved },
      })
    }

    if (parsed.type === "chat") {
      return NextResponse.json({ type: "chat" })
    }

    if (parsed.type === "shopping") {
      const plan = parsed.plan
      const rawItems = plan?.items
      const planTitle = typeof plan?.planTitle === "string" ? plan.planTitle.trim() : ""
      const resolvedItems = resolveItemsFromPool(Array.isArray(rawItems) ? rawItems : [], productPool)

      if (resolvedItems.length === 0) {
        return NextResponse.json({ type: "refusal", message: DEFAULT_REFUSAL_MESSAGE })
      }

      const total = totalMonthlyInstallment(resolvedItems)
      if (budgetYuan != null && !withinBudgetBand(total, budgetYuan)) {
        return NextResponse.json({ type: "refusal", message: DEFAULT_REFUSAL_MESSAGE })
      }

      if (!planTitle) {
        return NextResponse.json({ error: "shopping 方案缺少 planTitle" }, { status: 422 })
      }

      return NextResponse.json({
        type: "shopping",
        plan: { planTitle, items: resolvedItems },
      })
    }

    return NextResponse.json({ error: "模型返回的 type 无效" }, { status: 422 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
