"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  ChevronLeft,
  Star,
  MoreHorizontal,
  X,
  Search,
  ClipboardList,
  ChevronRight,
  Info,
  Percent,
  Gift,
  QrCode,
  Ticket,
  ArrowUp,
  MessageSquarePlus,
  History,
  CheckCircle2,
  RefreshCw,
  PencilLine,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { generatePlanFromLLM } from "@/lib/ai-plan"
import { BATCH_EIGHT_DETAIL_OVERRIDES } from "@/lib/catalog-batch-eight"
import { getAlternativeProduct } from "@/lib/get-alternative-product"
import { BATCH_EIGHT_IDS, PRODUCT_POOL, type ProductPoolItem as DataProductPoolItem } from "@/data/products"
import { WaterfallProductCard } from "@/components/product-card"
import { AiFloatingFab } from "@/components/ai-floating-fab"
import { BUNDLE_ITEMS_STORAGE_KEY, type BundleItem } from "@/lib/bundle-items"
import {
  AI_PLAN_HISTORY_STORAGE_KEY,
  cloneAiPlanMessages,
  parseAiPlanHistory,
  serializeAiPlanHistory,
  titleFromFirstUserMessage,
  type AiPlanChatMessage,
  type AiPlanChatSession,
} from "@/lib/ai-plan-history"
import { CheckoutSheet } from "@/components/checkout-sheet"

// Header Component - Sticky at top
function Header() {
  return (
    <header className="cff-header sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-white border-b h-14">
      <div className="flex items-center gap-2">
        <ChevronLeft className="w-5 h-5 text-foreground" />
        <h1 className="text-[22px] leading-6 font-extrabold tracking-[-0.4px] text-black [font-family:'PingFang_SC','PingFang SC','SF Pro Display','Helvetica Neue',sans-serif]">
          分期生活
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Star className="w-4 h-4 text-muted-foreground" />
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        <div className="cff-icon-btn w-5 h-5 rounded-full border border-muted-foreground flex items-center justify-center">
          <X className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}

// Credit Card Section
function CreditCardSection({ onOpenAiPanel }: { onOpenAiPanel: () => void }) {
  return (
    <div className="cff-credit mx-4 my-4 rounded-2xl bg-gradient-to-br from-[#5B6BE8] to-[#8B7CF7] p-4 text-white">
      <div className="cff-credit-row flex items-stretch justify-between gap-3">
        <div className="cff-credit-left flex min-w-0 flex-col justify-center gap-1.5">
          <p className="cff-balance-label text-[15px] font-bold text-white leading-tight">分期可用(元)</p>
          <p className="cff-balance-value text-[20px] leading-6 font-bold text-[#FFD6E7]">10000.00</p>
        </div>

        <button
          type="button"
          aria-label="智能方案管家"
          onClick={onOpenAiPanel}
          className="animate-ai-glow flex shrink-0 items-center gap-2 self-stretch rounded-2xl border border-white/50 bg-gradient-to-br from-white/30 to-white/10 px-5 py-2 backdrop-blur-md transition-transform active:scale-[0.98]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-8 w-8 shrink-0 text-white drop-shadow-md"
            aria-hidden
          >
            <rect x="5" y="7" width="14" height="10" rx="5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="10" cy="12" r="1" fill="currentColor" />
            <circle cx="14" cy="12" r="1" fill="currentColor" />
            <path d="M12 7V5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-bold text-white">智能方案管家</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/90" strokeWidth={2.25} />
        </button>
      </div>
      <div className="cff-credit-links flex items-center justify-between mt-5 gap-4">
        <div className="flex items-center gap-1">
          <span className="text-[13px] opacity-80">分期记录</span>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[13px] opacity-80">我的优惠</span>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </div>
      </div>
      <div className="cff-credit-footer flex items-center justify-between mt-2">
        <span className="text-[13px] font-bold text-white">查看还款情况</span>
        <div className="flex items-center gap-1">
          <Ticket className="w-3 h-3 text-white" />
          <span className="text-[13px] font-bold text-white">1张券待使用</span>
        </div>
      </div>
    </div>
  )
}

function AiChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const quickPrompts = ["月供 200 配齐电竞外设", "考研无纸化学习套装"]
  const welcomeText =
    "您好，我是您的专属智能精算师。请告诉我您想购买的商品、期待升级的生活场景，或是每个月期望的月供预算，我将为您精准搭配最优的分期组合方案。"
  type ProductDetail = {
    image: string
    salePrice: number
    originalPrice: number
    title: string
    installmentsTag: number
    interestSavedText: string
    installmentPrice: number
    parameterPrimary: string
    parameterSecondary: string
    benefitTitle: string
    benefitDesc: string
    benefitSubDesc: string
    benefitActionText: string
    storeName: string
    ctaText: string
  }
  type ProductPoolItem = {
    id: string
    name: string
    itemTotalPrice: number
    installments: number
    installmentPrice: number
    tags: string[]
    image: string
    detailImage?: string
  }
  type ChatMessage = AiPlanChatMessage
  type ChatSession = AiPlanChatSession
  type SelectedProduct = ProductPoolItem | null
  const productPool: ProductPoolItem[] = useMemo(() => PRODUCT_POOL, [])
  type ScenarioPick = { items: ProductPoolItem[]; planTitle: string }
  const pickScenario = useCallback(
    (query: string): ScenarioPick | null => {
      const normalized = query.toLowerCase()
      const isStudyScene = ["考研", "学习", "无纸化", "学习套装"].some((keyword) => normalized.includes(keyword))
      if (isStudyScene) {
        const coreTablet = productPool.find((product) => product.tags.includes("平板"))
        const accessoryHeadphone = productPool.find((product) => product.tags.includes("耳机"))
        if (!coreTablet || !accessoryHeadphone) return null
        return {
          items: [coreTablet, accessoryHeadphone],
          planTitle: "已为您生成：大学生无纸化学习套装",
        }
      }
      const isGamingPeripheralScene =
        normalized.includes("电竞") &&
        (normalized.includes("外设") || normalized.includes("配齐") || normalized.includes("200") || normalized.includes("键鼠") || normalized.includes("显示器"))
      if (isGamingPeripheralScene) {
        const monitor = productPool.find((p) => p.id === "monitor-aoc-27")
        const keyboard = productPool.find((p) => p.id === "keyboard-logitech-pro")
        const mouse = productPool.find((p) => p.id === "mouse-logitech-g502")
        if (!monitor || !keyboard || !mouse) return null
        return {
          items: [monitor, keyboard, mouse],
          planTitle: "已为您生成：月供约 200 元档电竞外设组合",
        }
      }
      return null
    },
    [productPool],
  )
  const getPlanStats = useCallback((planItems: ProductPoolItem[]) => {
    const allInstallments = planItems.map((item) => item.installments)
    const isMixedValue = new Set(allInstallments).size > 1
    const minInstallmentsValue = Math.min(...allInstallments)
    const totalMonthlyValue = planItems.reduce((sum, item) => sum + item.installmentPrice, 0)
    const totalPriceValue = planItems.reduce((sum, item) => sum + item.itemTotalPrice, 0)
    return {
      totalMonthly: totalMonthlyValue,
      totalPrice: totalPriceValue,
      isMixed: isMixedValue,
      minInstallments: minInstallmentsValue,
    }
  }, [])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResetAnimating, setIsResetAnimating] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState("")
  const activeSessionIdRef = useRef("")
  const [historyStorageReady, setHistoryStorageReady] = useState(false)
  const skipNextPersistRef = useRef(false)
  const skipPersistAfterHistoryPickRef = useRef(false)
  const dragStartY = useRef<number | null>(null)
  const loadingTimerRef = useRef<number | null>(null)
  const resetAnimationTimerRef = useRef<number | null>(null)
  const replaceToastTimerRef = useRef<number | null>(null)
  const [replaceToast, setReplaceToast] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", type: "text", content: welcomeText },
  ])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutItems, setCheckoutItems] = useState<BundleItem[] | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const editTitleRef = useRef("")
  const editTitleInputRef = useRef<HTMLInputElement>(null)
  const renameCancelledByEscapeRef = useRef(false)

  activeSessionIdRef.current = activeSessionId
  editTitleRef.current = editTitle

  useEffect(() => {
    if (!open) {
      setIsFullscreen(false)
      setIsHistoryOpen(false)
      setSelectedProduct(null)
      setIsCheckoutOpen(false)
      setCheckoutItems(null)
      setIsLoading(false)
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
      if (resetAnimationTimerRef.current) {
        window.clearTimeout(resetAnimationTimerRef.current)
        resetAnimationTimerRef.current = null
      }
      if (replaceToastTimerRef.current) {
        window.clearTimeout(replaceToastTimerRef.current)
        replaceToastTimerRef.current = null
      }
      setReplaceToast(null)
      setIsResetAnimating(false)
      setEditingSessionId(null)
      setDeletingSessionId(null)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current)
      }
      if (resetAnimationTimerRef.current) {
        window.clearTimeout(resetAnimationTimerRef.current)
      }
      if (replaceToastTimerRef.current) {
        window.clearTimeout(replaceToastTimerRef.current)
      }
    }
  }, [])

  const persistHistory = useCallback((sessions: ChatSession[], activeId: string) => {
    try {
      localStorage.setItem(
        AI_PLAN_HISTORY_STORAGE_KEY,
        serializeAiPlanHistory({ version: 1, activeSessionId: activeId, sessions }),
      )
    } catch {
      /* ignore */
    }
  }, [])

  const commitRenameForId = useCallback(
    (sessionId: string, nextTitleRaw: string) => {
      const trimmed = nextTitleRaw.trim() || "新对话"
      setChatSessions((prev) => {
        const next = prev.map((s) =>
          s.id === sessionId ? { ...s, title: trimmed, updatedAt: Date.now(), titleLocked: true } : s,
        )
        persistHistory(next, activeSessionIdRef.current)
        return next
      })
    },
    [persistHistory],
  )

  const saveRenameFromInput = useCallback(() => {
    if (renameCancelledByEscapeRef.current) {
      renameCancelledByEscapeRef.current = false
      return
    }
    if (!editingSessionId) return
    commitRenameForId(editingSessionId, editTitle)
    setEditingSessionId(null)
  }, [editingSessionId, editTitle, commitRenameForId])

  const startRenameSession = useCallback(
    (item: ChatSession) => {
      renameCancelledByEscapeRef.current = false
      setDeletingSessionId(null)
      if (editingSessionId && editingSessionId !== item.id) {
        commitRenameForId(editingSessionId, editTitle)
      }
      setEditingSessionId(item.id)
      setEditTitle(item.title)
    },
    [editingSessionId, editTitle, commitRenameForId],
  )

  const performDeleteSession = useCallback(
    (sessionId: string) => {
      setEditingSessionId((cur) => (cur === sessionId ? null : cur))
      const prev = chatSessions
      const wasActive = sessionId === activeSessionId
      const next = prev.filter((s) => s.id !== sessionId)
      if (next.length === 0) {
        const newId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
        const initialMessages: ChatMessage[] = [{ role: "ai", type: "text", content: welcomeText }]
        const initialSession: ChatSession = {
          id: newId,
          title: titleFromFirstUserMessage(initialMessages),
          updatedAt: Date.now(),
          messages: cloneAiPlanMessages(initialMessages),
        }
        setChatSessions([initialSession])
        setActiveSessionId(newId)
        setMessages(initialMessages)
        persistHistory([initialSession], newId)
        skipNextPersistRef.current = true
        return
      }
      const sorted = [...next].sort((a, b) => b.updatedAt - a.updatedAt)
      const nextActiveId = wasActive ? sorted[0]!.id : activeSessionId
      persistHistory(next, nextActiveId)
      setChatSessions(next)
      if (wasActive) {
        const pick = sorted[0]!
        setActiveSessionId(pick.id)
        setMessages(cloneAiPlanMessages(pick.messages))
        skipPersistAfterHistoryPickRef.current = true
      }
    },
    [chatSessions, activeSessionId, persistHistory, welcomeText],
  )

  const handleConfirmDeleteSession = useCallback(() => {
    if (!deletingSessionId) return
    performDeleteSession(deletingSessionId)
    setDeletingSessionId(null)
  }, [deletingSessionId, performDeleteSession])

  useEffect(() => {
    if (!isHistoryOpen) {
      setDeletingSessionId(null)
      if (editingSessionId) {
        commitRenameForId(editingSessionId, editTitleRef.current)
        setEditingSessionId(null)
      }
    }
  }, [isHistoryOpen, editingSessionId, commitRenameForId])

  useEffect(() => {
    if (!editingSessionId) return
    const id = requestAnimationFrame(() => {
      editTitleInputRef.current?.focus()
      editTitleInputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [editingSessionId])

  /** 客户端挂载后再读 localStorage，避免 hydration 与首屏不一致 */
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const parsed = parseAiPlanHistory(localStorage.getItem(AI_PLAN_HISTORY_STORAGE_KEY))
      if (parsed && parsed.sessions.length > 0) {
        const active =
          parsed.sessions.find((s) => s.id === parsed.activeSessionId) ??
          parsed.sessions.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b))
        skipNextPersistRef.current = true
        setChatSessions(parsed.sessions.map((s) => ({ ...s, messages: cloneAiPlanMessages(s.messages) })))
        setActiveSessionId(active.id)
        setMessages(cloneAiPlanMessages(active.messages))
      } else {
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
        const initialMessages: ChatMessage[] = [{ role: "ai", type: "text", content: welcomeText }]
        const initialSession: ChatSession = {
          id,
          title: titleFromFirstUserMessage(initialMessages),
          updatedAt: Date.now(),
          messages: cloneAiPlanMessages(initialMessages),
        }
        setChatSessions([initialSession])
        setActiveSessionId(id)
        setMessages(initialMessages)
        try {
          localStorage.setItem(
            AI_PLAN_HISTORY_STORAGE_KEY,
            serializeAiPlanHistory({
              version: 1,
              activeSessionId: id,
              sessions: [initialSession],
            }),
          )
        } catch {
          /* ignore */
        }
        skipNextPersistRef.current = true
      }
    } catch {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const initialMessages: ChatMessage[] = [{ role: "ai", type: "text", content: welcomeText }]
      setChatSessions([
        {
          id,
          title: titleFromFirstUserMessage(initialMessages),
          updatedAt: Date.now(),
          messages: cloneAiPlanMessages(initialMessages),
        },
      ])
      setActiveSessionId(id)
      setMessages(initialMessages)
      skipNextPersistRef.current = true
    } finally {
      setHistoryStorageReady(true)
    }
  }, [welcomeText])

  /** 当前对话变更后写回当前 session 与 localStorage */
  useEffect(() => {
    if (!historyStorageReady || !activeSessionId) return
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }
    if (skipPersistAfterHistoryPickRef.current) {
      skipPersistAfterHistoryPickRef.current = false
      return
    }
    const updatedAt = Date.now()
    setChatSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === activeSessionId)
      const nextMessages = cloneAiPlanMessages(messages)
      let next: ChatSession[]
      if (idx === -1) {
        const title = titleFromFirstUserMessage(messages)
        next = [...prev, { id: activeSessionId, title, updatedAt, messages: nextMessages }]
      } else {
        next = [...prev]
        const prevS = next[idx]
        const title = prevS.titleLocked ? prevS.title : titleFromFirstUserMessage(messages)
        next[idx] = { ...prevS, title, updatedAt, messages: nextMessages }
      }
      persistHistory(next, activeSessionId)
      return next
    })
  }, [messages, activeSessionId, historyStorageReady, persistHistory])

  const clonePlanItems = useCallback((planItems: ProductPoolItem[]) => {
    return planItems.map((item) => ({ ...item, tags: [...item.tags] }))
  }, [])

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const replacementIntent = (text.includes("第一个") || text.includes("平板")) && (text.includes("基础款") || text.includes("便宜"))

    setInputValue("")

    if (replacementIntent) {
      setMessages((prev) => {
        const withUser = [...prev, { role: "user" as const, type: "text" as const, content: text }]
        const lastPlanMessage = [...withUser]
          .reverse()
          .find((message) => message.role === "ai" && message.type === "card" && (message.items?.length ?? 0) > 0)
        if (!lastPlanMessage?.items?.length) {
          return [...withUser, { role: "ai" as const, type: "text" as const, content: "请先生成一个方案再进行替换哦" }]
        }
        const currentPlanItems = clonePlanItems(lastPlanMessage.items)
        const baseTablet = productPool.find((product) => product.tags.includes("平板") && product.tags.includes("基础款"))
        if (!baseTablet) {
          return [...withUser, { role: "ai" as const, type: "text" as const, content: "当前没有可替换的基础款平板商品" }]
        }
        currentPlanItems[0] = baseTablet
        return [
          ...withUser,
          {
            role: "ai" as const,
            type: "card" as const,
            content: "local-replace",
            planTitle: "没问题，已为您换成基础款配置",
            items: currentPlanItems,
          },
        ]
      })
      return
    }

    setIsLoading(true)
    setMessages((prev) => [...prev, { role: "user", type: "text", content: text }])

    try {
      const plan = await generatePlanFromLLM(text, productPool)
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          type: "card",
          content: "llm-plan",
          planTitle: plan.planTitle,
          items: clonePlanItems(plan.items),
        },
      ])
    } catch (e) {
      const scenario = pickScenario(text)
      if (scenario) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            type: "card",
            content: "fallback-scenario",
            planTitle: scenario.planTitle,
            items: clonePlanItems(scenario.items),
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            type: "text",
            content: `抱歉，智能方案暂时无法生成：${e instanceof Error ? e.message : "请稍后重试"}`,
          },
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }, [clonePlanItems, isLoading, inputValue, pickScenario, productPool])

  const onTopAreaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartY.current = e.clientY
  }

  const onTopAreaPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return
    const dy = e.clientY - dragStartY.current
    if (!isFullscreen && dy < -40) {
      setIsFullscreen(true)
      dragStartY.current = null
      return
    }
    if (isFullscreen && dy > 60) {
      setIsFullscreen(false)
      dragStartY.current = null
    }
  }

  const onTopAreaPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    dragStartY.current = null
  }

  const handleClose = () => {
    setIsFullscreen(false)
    setIsHistoryOpen(false)
    setSelectedProduct(null)
    setDeletingSessionId(null)
    onClose()
  }

  const handleResetChat = () => {
    setDeletingSessionId(null)
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current)
      loadingTimerRef.current = null
    }
    if (resetAnimationTimerRef.current) {
      window.clearTimeout(resetAnimationTimerRef.current)
      resetAnimationTimerRef.current = null
    }
    setIsLoading(false)
    setIsResetAnimating(true)
    setSelectedProduct(null)

    if (messages.length <= 1) {
      setMessages([{ role: "ai", type: "text", content: welcomeText }])
      setInputValue("")
      resetAnimationTimerRef.current = window.setTimeout(() => {
        setIsResetAnimating(false)
        resetAnimationTimerRef.current = null
      }, 180)
      return
    }

    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const freshMessages: ChatMessage[] = [{ role: "ai", type: "text", content: welcomeText }]
    const newSession: ChatSession = {
      id: newId,
      title: titleFromFirstUserMessage(freshMessages),
      updatedAt: Date.now(),
      messages: cloneAiPlanMessages(freshMessages),
    }
    setChatSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newId)
    setMessages(freshMessages)
    setInputValue("")
    resetAnimationTimerRef.current = window.setTimeout(() => {
      setIsResetAnimating(false)
      resetAnimationTimerRef.current = null
    }, 180)
  }

  const handleLoadHistory = (session: ChatSession) => {
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current)
      loadingTimerRef.current = null
    }
    setIsLoading(false)
    setInputValue("")
    skipPersistAfterHistoryPickRef.current = true
    setActiveSessionId(session.id)
    setMessages(cloneAiPlanMessages(session.messages))
    setIsHistoryOpen(false)
    setSelectedProduct(null)
    setDeletingSessionId(null)
  }

  const getProductDetail = useCallback((product: ProductPoolItem): ProductDetail => {
    const batchEightDetail = BATCH_EIGHT_DETAIL_OVERRIDES as Record<string, Partial<ProductDetail>>
    const detailOverrides: Record<string, Partial<ProductDetail>> = {
      ...batchEightDetail,
      "ipad-air-11-m4-128": {
        originalPrice: 5199,
        title: "【6期免息 赠手写笔】Apple苹果 iPad Air 11英寸 M4 芯片 128GB起 官方旗舰店",
        interestSavedText: "省利息215.96",
        parameterPrimary: "苹果/Apple...",
        parameterSecondary: "品牌",
        benefitTitle: "以旧换新",
        benefitDesc: "旧机回收##享专属补贴##",
        benefitSubDesc: "专业回收，快速到账",
        benefitActionText: "立即换新",
        storeName: "Apple产品权益智选旗舰店",
      },
      "ipad-air-13-m4-128": {
        originalPrice: 7199,
        title: "【12期免息】Apple苹果 iPad Air 13英寸 M4 芯片 128GB起 官方旗舰店",
        interestSavedText: "省利息491.18",
        parameterPrimary: "苹果/Apple...",
        parameterSecondary: "品牌",
        benefitTitle: "以旧换新",
        benefitDesc: "旧机回收##享专属补贴##",
        benefitSubDesc: "专业回收，快速到账",
        benefitActionText: "立即换新",
        storeName: "Apple产品权益智选旗舰店",
      },
      "edifier-lolli-clip": {
        originalPrice: 539,
        title: "漫步者（EDIFIER）Lolli Clip AI智能耳夹降噪蓝牙耳机 多语言互译",
        interestSavedText: "省利息11.48",
        parameterPrimary: "漫步者/EDIFIER...",
        parameterSecondary: "品牌",
        benefitTitle: "物流",
        benefitDesc: "现货，预计付款后48小时内发货",
        benefitSubDesc: "承诺在规定时间内发货，超时必赔",
        benefitActionText: "进店",
        storeName: "上海微意数码家电",
      },
      "1more-qc30": {
        originalPrice: 299,
        title: "万魔（1MORE）头戴式蓝牙耳机 QC30 双金标主动降噪",
        interestSavedText: "分期免息",
        parameterPrimary: "万魔/1MORE...",
        parameterSecondary: "品牌",
        benefitTitle: "发货",
        benefitDesc: "48小时内发货 浙江杭州 包邮",
        benefitSubDesc: "超时可赔付",
        benefitActionText: "查看",
        storeName: "嗨链小家电福利社",
      },
    }
    const merged = detailOverrides[product.id] ?? {}
    return {
      image: product.detailImage ?? product.image.replace("w=200&h=200", "w=1200&h=1200"),
      salePrice: product.itemTotalPrice,
      originalPrice: Math.round(product.itemTotalPrice * 1.08),
      title: product.name,
      installmentsTag: product.installments,
      interestSavedText: "省利息0.00",
      installmentPrice: product.installmentPrice,
      parameterPrimary: "品牌参数",
      parameterSecondary: "品牌",
      benefitTitle: "保障",
      benefitDesc: "晚发必赔 · 极速退款",
      benefitSubDesc: "平台保障，售后无忧",
      benefitActionText: "查看",
      storeName: "官方旗舰店",
      ctaText: `免息购 ¥${product.itemTotalPrice}`,
      ...merged,
      ctaText: `免息购 ¥${product.itemTotalPrice}`,
    }
  }, [])

  const showReplaceToast = useCallback((message: string) => {
    if (replaceToastTimerRef.current) {
      window.clearTimeout(replaceToastTimerRef.current)
      replaceToastTimerRef.current = null
    }
    setReplaceToast(message)
    replaceToastTimerRef.current = window.setTimeout(() => {
      setReplaceToast(null)
      replaceToastTimerRef.current = null
    }, 2500)
  }, [])

  const handleReplaceItem = useCallback(
    (messageIndex: number, itemIndex: number, planItems: ProductPoolItem[]) => {
      const current = planItems[itemIndex]
      if (!current) return
      const replacement = getAlternativeProduct(current, productPool)
      if (!replacement) {
        showReplaceToast("暂无更多同类商品")
        return
      }
      setMessages((prev) => {
        const targetMessage = prev[messageIndex]
        if (!targetMessage || targetMessage.type !== "card" || !targetMessage.items?.length) return prev
        const nextPlanItems = clonePlanItems(targetMessage.items)
        nextPlanItems[itemIndex] = replacement
        const nextMessages = [...prev]
        nextMessages[messageIndex] = {
          ...targetMessage,
          items: nextPlanItems,
        }
        return nextMessages
      })
      if (selectedProduct?.id === current.id) {
        setSelectedProduct(replacement)
      }
    },
    [clonePlanItems, productPool, selectedProduct, showReplaceToast],
  )

  const selectedProductDetail = selectedProduct ? getProductDetail(selectedProduct) : null

  return (
    <>
      {open && (
    <div className="absolute inset-0 z-[1200] pointer-events-auto">
      <button
        type="button"
        aria-label="关闭 AI 对话面板遮罩"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/20 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-gradient-to-b from-[#ffffff] to-[#fbfbfd] transition-[transform,height] duration-300 ease-in-out",
          isFullscreen ? "h-full rounded-none" : "h-[85%] rounded-t-3xl",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!isFullscreen) setIsFullscreen(true)
            }}
            onKeyDown={(e) => {
              if (!isFullscreen && (e.key === "Enter" || e.key === " ")) setIsFullscreen(true)
            }}
            onPointerDown={onTopAreaPointerDown}
            onPointerMove={onTopAreaPointerMove}
            onPointerUp={onTopAreaPointerEnd}
            onPointerCancel={onTopAreaPointerEnd}
            className="relative border-b border-gray-100 px-4 pb-2 touch-none cursor-ns-resize"
            style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
          >
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isFullscreen ? "pointer-events-none max-h-0 opacity-0" : "max-h-16 opacity-100",
              )}
              aria-hidden={isFullscreen}
            >
              <div className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-gray-300" />
            </div>
            <div className="relative flex h-12 w-full items-center justify-center mb-2">
              <button
                type="button"
                aria-label="历史对话"
                onPointerDown={(e) => {
                  e.stopPropagation()
                }}
                onPointerUp={(e) => {
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsHistoryOpen(true)
                }}
                className="absolute left-4 p-2 text-gray-500 hover:text-gray-800 transition-colors"
              >
                <History className="h-5 w-5" />
              </button>
              <p className="text-base font-semibold text-gray-800">AI 方案管家</p>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
                <button
                  type="button"
                  aria-label="新对话"
                  title="新对话 / 重置"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleResetChat()
                  }}
                  className="text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="关闭 AI 对话面板"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClose()
                  }}
                  className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "scrollbar-hide flex-1 overflow-y-auto px-4 pb-28 pt-4 transition-opacity duration-150",
              isResetAnimating ? "opacity-0" : "opacity-100",
            )}
          >
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn("mb-3 flex", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "ai" && (
                  <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-gray-200">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-violet-600" aria-hidden>
                      <rect x="5" y="7" width="14" height="10" rx="5" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="10" cy="12" r="1" fill="currentColor" />
                      <circle cx="14" cy="12" r="1" fill="currentColor" />
                      <path d="M12 7V5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                {message.type === "text" && (
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-3 text-[14px] leading-6 shadow-sm",
                      message.role === "ai"
                        ? "rounded-tl-md bg-gray-100 text-gray-700"
                        : "rounded-tr-md bg-violet-500 text-white",
                    )}
                  >
                    {message.content}
                  </div>
                )}
                {message.type === "card" && (() => {
                  const planItems = message.items ?? []
                  const { totalMonthly, totalPrice, isMixed, minInstallments } = getPlanStats(planItems)
                  return (
                    <div className="w-[88%] rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_10px_25px_rgba(17,24,39,0.08)]">
                      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-gray-800">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        <span>{message.planTitle ?? "已为您生成：智能精选分期方案"}</span>
                      </p>
                      <div className="mt-3 rounded-xl bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-3 py-3">
                        <p className="text-xs text-gray-500">{isMixed ? `前 ${minInstallments} 期预估月供` : "预估月供"}</p>
                        <p className="text-[24px] font-bold tracking-tight text-sky-700">
                          ¥{totalMonthly.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/月
                        </p>
                        <p className="text-xs text-gray-500">
                          总价 ¥{totalPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {planItems.map((item, itemIndex) => {
                          const itemDetail = getProductDetail(item)
                          return (
                            <div
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedProduct(item)
                                setIsFullscreen(true)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  setSelectedProduct(item)
                                  setIsFullscreen(true)
                                }
                              }}
                              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-2.5 py-2 transition hover:bg-gray-50"
                            >
                              <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-700">{itemDetail.title}</p>
                                <div className="mt-1 flex items-center text-xs">
                                  <span className="mr-1 rounded border border-red-100 bg-red-50 px-1 py-0.5 text-[10px] text-red-500">
                                    {itemDetail.installmentsTag}期免息
                                  </span>
                                  <span className="text-gray-500">¥{itemDetail.installmentPrice}/期</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReplaceItem(index, itemIndex, planItems)
                                }}
                                className="flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-[10px] text-gray-500"
                              >
                                <RefreshCw className="h-3 w-3 text-gray-500" />
                                <span>换一个</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-xl bg-violet-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-400/25 transition active:scale-[0.99]"
                        onClick={() => {
                          try {
                            localStorage.setItem(BUNDLE_ITEMS_STORAGE_KEY, JSON.stringify(planItems))
                          } catch {
                            /* ignore */
                          }
                          setCheckoutItems(planItems as BundleItem[])
                          setIsCheckoutOpen(true)
                        }}
                      >
                        一键打包分期
                      </button>
                    </div>
                  )
                })()}
              </div>
            ))}

            {isLoading && (
              <div className="mb-4 flex items-start">
                <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-gray-200">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-violet-600" aria-hidden>
                    <rect x="5" y="7" width="14" height="10" rx="5" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="10" cy="12" r="1" fill="currentColor" />
                    <circle cx="14" cy="12" r="1" fill="currentColor" />
                    <path d="M12 7V5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="rounded-2xl rounded-tl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
                  AI 正在全网检索高性价比现货...
                </div>
              </div>
            )}

          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white/95 px-4 pb-4 pt-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] backdrop-blur">
            <div className="mb-2 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInputValue(prompt)}
                  className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition active:scale-[0.98] active:bg-gray-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="输入心愿单和月预算..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage()
                }}
                className="h-11 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-gray-300"
              />
              <button
                type="button"
                aria-label="发送消息"
                onClick={sendMessage}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-500/40 transition active:scale-95"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {selectedProduct && (
            <div className="absolute inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="relative flex items-center justify-between px-3 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
                <button type="button" onClick={() => setSelectedProduct(null)} className="rounded-full p-2 text-gray-700 transition hover:bg-gray-100">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-full bg-white/90 p-2 text-gray-600 shadow-sm ring-1 ring-gray-200">
                    <Star className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={handleClose} className="rounded-full bg-white/90 p-2 text-gray-600 shadow-sm ring-1 ring-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="scrollbar-hide flex-1 overflow-y-auto bg-[#f6f6f6] pb-24">
                <div className="bg-white">
                  <img src={selectedProductDetail?.image ?? selectedProduct.image} alt={selectedProduct.name} className="h-[320px] w-full object-cover" />
                  <div className="px-4 pb-4 pt-3">
                    <div className="flex items-baseline font-bold text-red-500">
                      <span className="mr-0.5 text-lg">¥</span>
                      <span className="text-2xl">{selectedProductDetail?.salePrice ?? 0}</span>
                      <span className="ml-2 text-base font-medium text-gray-400">优惠前 ¥{selectedProductDetail?.originalPrice ?? 0}</span>
                    </div>
                    <h1 className="mt-2 text-base font-semibold leading-snug text-gray-800 md:text-lg">
                      {selectedProductDetail?.title ?? selectedProduct.name}
                    </h1>
                    <div className="mt-3 rounded-md bg-[#fff4f4] px-3 py-2">
                      <p className="text-sm text-gray-700">
                        <span className="mr-2 rounded bg-blue-500 px-1.5 py-0.5 text-xs text-white">{selectedProductDetail?.installmentsTag ?? 0}期</span>
                        <span className="mr-2 rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">免息</span>
                        {selectedProductDetail?.interestSavedText ?? ""} <span className="font-semibold">¥{selectedProductDetail?.installmentPrice ?? 0}/期</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 bg-white">
                  <div className="flex items-center px-4 py-3 bg-white mt-2">
                    <span className="text-gray-500 text-sm w-12 shrink-0">参数</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-800 text-sm">{selectedProductDetail?.parameterPrimary ?? ""}</span>
                      <span className="text-gray-500 text-xs">{selectedProductDetail?.parameterSecondary ?? ""}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-base font-semibold text-gray-800">{selectedProductDetail?.benefitTitle ?? ""}</p>
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm text-gray-800">{selectedProductDetail?.benefitDesc ?? ""}</p>
                        <p className="text-xs text-gray-500">{selectedProductDetail?.benefitSubDesc ?? ""}</p>
                      </div>
                      <button type="button" className="rounded-full bg-[#fff1f3] px-3 py-1 text-sm font-medium text-red-500">
                        {selectedProductDetail?.benefitActionText ?? "查看"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 bg-white px-4 py-4">
                  <p className="text-xl font-semibold text-gray-800">{selectedProductDetail?.storeName ?? ""}</p>
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-gray-100" />
                    <div className="h-4 w-full rounded bg-gray-100" />
                    <div className="h-4 w-5/6 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
                <button type="button" className="h-12 w-full rounded-full bg-[#ff1f4b] text-lg font-semibold text-white">
                  {selectedProductDetail?.ctaText ?? "立即购买"}
                </button>
              </div>
            </div>
          )}

          {replaceToast && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[110] max-w-[min(90%,280px)] -translate-x-1/2 rounded-xl bg-gray-900/90 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
            >
              {replaceToast}
            </div>
          )}

          <div className={cn("absolute inset-0 z-20 transition-opacity duration-300", isHistoryOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}>
            <button
              type="button"
              aria-label="关闭历史抽屉"
              onClick={() => setIsHistoryOpen(false)}
              className="absolute inset-0 bg-black/20"
            />
            <aside
              className={cn(
                "absolute left-0 top-0 h-full w-[75%] max-w-[292px] bg-white/90 backdrop-blur-md shadow-xl transition-transform duration-300",
                isHistoryOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <div className="flex h-full flex-col pt-[max(8px,env(safe-area-inset-top))]">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-base font-semibold text-gray-800">历史方案</p>
                </div>
                <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-3">
                  {!historyStorageReady ? (
                    <p className="px-2 py-8 text-center text-sm text-gray-400">加载中…</p>
                  ) : chatSessions.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-gray-400">暂无历史对话</p>
                  ) : (
                    [...chatSessions]
                      .sort((a, b) => {
                        const aActive = a.id === activeSessionId
                        const bActive = b.id === activeSessionId
                        if (aActive !== bActive) return aActive ? -1 : 1
                        return b.updatedAt - a.updatedAt
                      })
                      .map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "mb-2 flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-2 transition",
                            item.id === activeSessionId
                              ? "border-violet-300 bg-violet-50/80"
                              : "border-gray-200 bg-white",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            {editingSessionId === item.id ? (
                              <input
                                ref={editTitleInputRef}
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    saveRenameFromInput()
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault()
                                    renameCancelledByEscapeRef.current = true
                                    setEditingSessionId(null)
                                  }
                                }}
                                onBlur={() => saveRenameFromInput()}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 outline-none ring-violet-400 focus:ring-2"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleLoadHistory(item)}
                                className="w-full text-left transition hover:opacity-90"
                              >
                                <p className="truncate text-sm font-medium text-gray-800">{item.title}</p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                  {new Date(item.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                                </p>
                              </button>
                            )}
                          </div>
                          <div
                            className="flex shrink-0 items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {deletingSessionId === item.id ? (
                              <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="text-sm font-medium text-red-500 transition hover:text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleConfirmDeleteSession()
                                  }}
                                >
                                  确认删除
                                </button>
                                <button
                                  type="button"
                                  className="text-sm text-gray-400 transition hover:text-gray-600"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletingSessionId(null)
                                  }}
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  aria-label="重命名"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startRenameSession(item)
                                  }}
                                  className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                                >
                                  <PencilLine className="h-4 w-4 shrink-0" strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="删除"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (editingSessionId) {
                                      commitRenameForId(editingSessionId, editTitleRef.current)
                                      setEditingSessionId(null)
                                    }
                                    setDeletingSessionId(item.id)
                                  }}
                                  className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
      )}
      <CheckoutSheet
        open={isCheckoutOpen}
        items={checkoutItems}
        onClose={() => {
          setIsCheckoutOpen(false)
          setCheckoutItems(null)
        }}
      />
    </>
  )
}

// iPhone Banner
function IPhoneBanner() {
  return (
    <div className="cff-iphone-banner relative mx-4 my-4 flex h-60 flex-col items-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a1a2e] via-[#252540] to-[#3d2a4d]">
      {/* 标题：与下方内容同一纵轴居中 */}
      <div className="cff-banner-top flex w-full shrink-0 flex-col items-center px-4 pt-4">
        <div className="cff-banner-title-row flex items-center justify-center gap-2 text-white">
          <svg
            className="h-4 w-4 shrink-0"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <span className="text-[18px] leading-6 font-semibold">iphone 17 Pro Max</span>
        </div>
      </div>

      {/* 中部：手机叠放 + 底部光晕，整体在剩余空间内水平居中 */}
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-end px-2">
        <div className="cff-iphone-phones flex items-end justify-center -space-x-5">
          <div className="cff-mock-phone cff-mock-phone-sm cff-mock-phone--left z-10">
            <div className="cff-mock-phone-bezel">
              <div className="cff-mock-notch-sm" />
            </div>
          </div>
          <div className="cff-mock-phone cff-mock-phone-md cff-mock-phone--center z-20">
            <div className="cff-mock-phone-bezel">
              <div className="cff-mock-notch-md" />
            </div>
          </div>
          <div className="cff-mock-phone cff-mock-phone-sm cff-mock-phone--right z-10">
            <div className="cff-mock-phone-bezel">
              <div className="cff-mock-notch-dark" />
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none mt-1 h-3 w-40 shrink-0 rounded-full bg-gradient-to-r from-transparent via-purple-500/30 to-transparent blur-sm"
          aria-hidden
        />
      </div>

      {/* 按钮：全宽 flex 居中，避免绝对定位偏移 */}
      <div className="cff-iphone-cta flex w-full shrink-0 justify-center px-4 pb-3 pt-1">
        <Button className="h-auto rounded-full bg-white px-4 py-2 text-[13px] font-medium text-foreground shadow-lg hover:bg-white/90">
          12期免息购买
        </Button>
      </div>
    </div>
  )
}

// Quick Actions - Kong Kong Zone
function KongKongZone() {
  const actions = [
    { icon: <div className="bg-foreground text-background text-xs px-1 py-0.5 rounded font-medium">免息</div>, label: "免息优先" },
    { icon: <Percent className="w-5 h-5 text-orange-500" />, label: "国家贴息" },
    { icon: <Gift className="w-5 h-5 text-orange-500" />, label: "分期礼" },
    { icon: <QrCode className="w-5 h-5 text-foreground" />, label: "分期码" },
  ]

  return (
    <div className="cff-kong mx-4 my-4 bg-card rounded-2xl p-3">
      <div className="cff-kong-grid grid grid-cols-4 gap-3">
        {actions.map((action, index) => (
          <div key={index} className="flex flex-col items-center gap-1.5">
            <div className="cff-kong-icon w-11 h-11 flex items-center justify-center">
              {action.icon}
            </div>
            <span className="text-[13px] text-muted-foreground text-center">{action.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Daily Check-in
function DailyCheckIn() {
  const days = [
    { label: "今天", active: true },
    { label: "明天", active: false },
    { label: "后天", active: false },
    { label: "第5天", active: false },
    { label: "第6天", active: false },
  ]

  return (
    <div className="cff-daily mx-4 my-4 bg-card rounded-2xl p-3">
      <div className="cff-daily-top flex items-center justify-between">
        <div>
          <p className="text-[16px] font-semibold text-foreground">
            已连续领<span className="text-orange-500">1</span>天
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            连续领7天 <span className="text-orange-500">奖励翻4倍</span>
          </p>
        </div>
        <div className="flex items-center gap-0.5 text-orange-500">
          <span className="text-sm font-semibold">¥</span>
          <span className="text-[13px] font-medium text-foreground">0.00元</span>
          <Info className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      <div className="cff-daily-days scrollbar-hide flex gap-2 mt-3 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((day, index) => (
          <div
            key={index}
            className={cn(
              "cff-daily-slot rounded-xl flex flex-col items-center",
              day.active ? "cff-daily-slot--active bg-orange-50 border border-orange-200" : "cff-daily-slot--narrow bg-muted",
            )}
          >
            <span className={cn(
              "text-[13px]",
              day.active ? "text-foreground" : "text-muted-foreground"
            )}>
              {day.label}
            </span>
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center my-1.5">
              <span className="text-orange-500 text-xs font-medium">分期</span>
            </div>
            <span className="text-orange-500 font-semibold text-[13px]">+0.1</span>
            {day.active && (
              <Button className="cff-daily-claim-btn mt-1.5 bg-foreground text-background text-[10px] px-1.5 py-0.5 h-auto rounded-full hover:bg-foreground/90">
                立即领取
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Sticky Search & Category Tabs with Intersection Observer
function StickySearchBar() {
  const [isSticky, setIsSticky] = useState(false)
  const [activeTab, setActiveTab] = useState("免息精选")
  const observerRef = useRef<HTMLDivElement>(null)
  const tabs = ["免息精选", "手机", "黄金饰品", "3C数码", "纸品家清", "名酒"]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // 当容器即将离开视口顶部时（即将吸顶），isSticky 为 true
          setIsSticky(!entry.isIntersecting)
        })
      },
      {
        threshold: 0,
        rootMargin: "-56px 0px 0px 0px", // 减去导航栏高度
      }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current)
      }
    }
  }, [])

  return (
    <>
      {/* Invisible reference element for Intersection Observer */}
      <div ref={observerRef} className="h-0" />

      {/* Sticky Search & Category Bar */}
      <div
        className={cn(
          "cff-sticky-bar sticky z-20 transition-all duration-300",
          "top-14", // 精确对齐导航栏下方（56px）
          isSticky
            ? "cff-sticky-active bg-white shadow-md"
            : "bg-gray-50"
        )}
      >
        {/* Search Bar */}
        <div className="cff-search-row px-3 py-2 flex items-center gap-2">
          <div className="cff-search-input-wrap flex-1 flex items-center bg-muted rounded-full px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="万物可分期"
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[14px] px-2 placeholder:text-[14px]"
            />
            <Button variant="ghost" className="text-foreground font-medium text-[14px] px-2 py-0.5 h-auto">
              搜索
            </Button>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
            <ClipboardList className="w-4 h-4" />
            <span className="text-[14px]">订单</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="cff-tabs-row scrollbar-hide px-3 border-t border-gray-100 overflow-x-auto">
          <div className="flex gap-5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "cff-tab-item flex flex-col items-center gap-1 py-2.5 text-[15px] transition-colors",
                  activeTab === tab
                    ? "cff-tab-active text-foreground font-semibold"
                    : "text-muted-foreground"
                )}
              >
                <span className="whitespace-nowrap">{tab}</span>
                <span
                  className={cn(
                    "cff-tab-indicator h-0.5 w-5 shrink-0 rounded-full bg-foreground",
                    activeTab === tab ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// Product Waterfall：展示截图 8 品
function ProductWaterfall() {
  const cards = useMemo(
    () =>
      BATCH_EIGHT_IDS.map((id) => PRODUCT_POOL.find((p) => p.id === id)).filter(
        (p): p is DataProductPoolItem => p != null,
      ),
    [],
  )

  return (
    <div className="cff-waterfall relative z-10 px-3 py-3">
      <div className="cff-waterfall-grid grid grid-cols-2 gap-2">
        {cards.map((item, index) => (
          <WaterfallProductCard key={`waterfall-slot-${index}`} item={item} />
        ))}
      </div>
    </div>
  )
}

// Main Page
export default function FenqiLifePage() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  return (
    <main
      className={cn(
        "cff-app-shell w-full h-full min-h-screen bg-white relative overflow-x-hidden flex flex-col",
        "sm:max-w-[390px] sm:h-[844px] sm:min-h-[844px] sm:my-8 sm:border-[8px] sm:border-gray-800 sm:rounded-[3rem] sm:shadow-2xl sm:overflow-hidden",
      )}
    >
      <div className="cff-scroll scrollbar-hide min-h-0 flex-1 overflow-y-auto bg-gray-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {/* Header - Sticky at top-0 z-30 */}
        <Header />

        {/* Top Content Sections */}
        <CreditCardSection onOpenAiPanel={() => setAiPanelOpen(true)} />
        <IPhoneBanner />
        <KongKongZone />
        <DailyCheckIn />

        {/* Sticky Search Bar with Intersection Observer - top-14 z-20 */}
        <StickySearchBar />

        {/* Product List - z-10 so it goes under sticky bar */}
        <ProductWaterfall />

        {/* Bottom Padding */}
        <div className="h-3" />
      </div>
      <AiFloatingFab onOpen={() => setAiPanelOpen(true)} />
      <AiChatPanel open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
    </main>
  )
}
