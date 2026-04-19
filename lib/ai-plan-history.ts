/** localStorage 中 AI 方案管家多段对话的存储键 */
export const AI_PLAN_HISTORY_STORAGE_KEY = "ai_plan_history"

export type AiPlanChatMessage = {
  role: "ai" | "user"
  type: "text" | "card"
  content: string
  planTitle?: string
  items?: Array<{
    id: string
    name: string
    itemTotalPrice: number
    installments: number
    installmentPrice: number
    tags: string[]
    image: string
    detailImage?: string
  }>
}

export type AiPlanChatSession = {
  id: string
  title: string
  updatedAt: number
  messages: AiPlanChatMessage[]
  /** 用户手动重命名后，同步 messages 时不再用首条用户话覆盖标题 */
  titleLocked?: boolean
}

export type AiPlanHistoryPersisted = {
  version: 1
  activeSessionId: string
  sessions: AiPlanChatSession[]
}

export function titleFromFirstUserMessage(messages: AiPlanChatMessage[]): string {
  const first = messages.find((m) => m.role === "user" && m.type === "text")?.content?.trim()
  if (!first) return "新对话"
  return first.slice(0, 10)
}

export function cloneAiPlanMessages(messages: AiPlanChatMessage[]): AiPlanChatMessage[] {
  return messages.map((m) => ({
    ...m,
    items: m.items?.map((it) => ({ ...it, tags: [...it.tags] })),
  }))
}

function isMessageLike(x: unknown): x is AiPlanChatMessage {
  if (!x || typeof x !== "object") return false
  const o = x as Record<string, unknown>
  return (o.role === "ai" || o.role === "user") && (o.type === "text" || o.type === "card") && typeof o.content === "string"
}

export function parseAiPlanHistory(raw: string | null): AiPlanHistoryPersisted | null {
  if (raw == null || raw === "") return null
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== "object") return null
    const root = data as Record<string, unknown>
    if (!Array.isArray(root.sessions)) return null
    const sessions: AiPlanChatSession[] = []
    for (const s of root.sessions) {
      if (!s || typeof s !== "object") continue
      const rec = s as Record<string, unknown>
      if (typeof rec.id !== "string") continue
      if (!Array.isArray(rec.messages) || rec.messages.length === 0) continue
      if (!rec.messages.every(isMessageLike)) continue
      sessions.push({
        id: rec.id,
        title: typeof rec.title === "string" ? rec.title : titleFromFirstUserMessage(rec.messages as AiPlanChatMessage[]),
        updatedAt: typeof rec.updatedAt === "number" ? rec.updatedAt : Date.now(),
        messages: rec.messages as AiPlanChatMessage[],
        titleLocked: rec.titleLocked === true,
      })
    }
    if (sessions.length === 0) return null
    const activeSessionId =
      typeof root.activeSessionId === "string" && sessions.some((x) => x.id === root.activeSessionId)
        ? root.activeSessionId
        : sessions.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b)).id
    return { version: 1, activeSessionId, sessions }
  } catch {
    return null
  }
}

export function serializeAiPlanHistory(payload: AiPlanHistoryPersisted): string {
  return JSON.stringify(payload)
}
