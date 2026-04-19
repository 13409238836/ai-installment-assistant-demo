import { NextRequest, NextResponse } from "next/server"

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
  return `你是一个专业的电商智能精算师。你的任务是根据用户的需求，从指定的【商品库】中挑选出最合适的商品（通常是1件核心大件+1件配件；若用户明确要求电竞外设、键鼠显示器等多件组合，也可选择多件），并以严格的 JSON 格式输出搭配方案。

【商品库】：
${poolJson}

【输出格式要求（必须是合法的 JSON，且仅输出 JSON，不要 Markdown 代码围栏）】：
{
  "planTitle": "给你起一个有吸引力的方案标题（简洁专业，不要使用 emoji）",
  "items": [
    这里填入你从商品库中选出的商品：每一项必须是商品库中已存在的一条记录，且必须包含与商品库完全一致的字段（id、name、itemTotalPrice、installments、installmentPrice、tags、image、如有则含 detailImage）。禁止编造商品库中不存在的 id 或价格。
  ]
}`
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

    let parsed: { planTitle?: string; items?: unknown[] }
    try {
      parsed = JSON.parse(content) as { planTitle?: string; items?: unknown[] }
    } catch {
      return NextResponse.json({ error: "大模型返回的不是合法 JSON 对象" }, { status: 502 })
    }

    const planTitle = typeof parsed.planTitle === "string" ? parsed.planTitle.trim() : ""
    const resolvedItems = resolveItemsFromPool(parsed.items ?? [], productPool)

    if (!planTitle || resolvedItems.length === 0) {
      return NextResponse.json(
        { error: "模型输出无法映射到商品库（请检查 item id 是否在库内）", planTitle, items: [] },
        { status: 422 },
      )
    }

    return NextResponse.json({ planTitle, items: resolvedItems })
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
