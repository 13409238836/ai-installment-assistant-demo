"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const FAB = 64

type AiFloatingFabProps = {
  onOpen?: () => void
}

export function AiFloatingFab({ onOpen }: AiFloatingFabProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const dragStartRef = useRef({ px: 0, py: 0, ox: 0, oy: 0 })

  useEffect(() => {
    const t = window.setTimeout(() => setBubbleVisible(false), 4000)
    return () => window.clearTimeout(t)
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      draggingRef.current = true
      movedRef.current = false
      setDragging(true)
      dragStartRef.current = {
        px: e.clientX,
        py: e.clientY,
        ox: offset.x,
        oy: offset.y,
      }
    },
    [offset],
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return
    const { px, py, ox, oy } = dragStartRef.current
    const dx = e.clientX - px
    const dy = e.clientY - py
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true
    const parent = wrapperRef.current?.parentElement
    if (!parent) {
      setOffset({ x: ox + dx, y: oy + dy })
      return
    }
    const parentRect = parent.getBoundingClientRect()
    const baseRect = wrapperRef.current?.getBoundingClientRect()
    if (!baseRect) {
      setOffset({ x: ox + dx, y: oy + dy })
      return
    }

    const baseX = baseRect.left - ox
    const baseY = baseRect.top - oy
    const nextX = ox + dx
    const nextY = oy + dy
    const targetX = baseX + nextX
    const targetY = baseY + nextY

    const minX = parentRect.left
    const maxX = parentRect.right - FAB
    const minY = parentRect.top
    const maxY = parentRect.bottom - FAB

    const clampedX = Math.min(Math.max(targetX, minX), maxX)
    const clampedY = Math.min(Math.max(targetY, minY), maxY)
    setOffset({ x: clampedX - baseX, y: clampedY - baseY })
  }, [])

  const endDrag = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    draggingRef.current = false
    setDragging(false)
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="cff-ai-fab-host"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, touchAction: "none" }}
    >
      <div className="cff-ai-fab-hit relative h-full w-full">
        <div
          className={cn(
            "absolute right-full top-1/2 mr-2 max-w-[260px] -translate-y-1/2 whitespace-nowrap rounded-2xl bg-white/75 px-3 py-1.5 text-[12px] font-medium leading-snug text-gray-800 shadow-lg backdrop-blur-md transition-opacity duration-700 ease-out",
            bubbleVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <span className="relative z-10">超预算？找 AI 帮算</span>
          <span
            className="absolute -right-1.5 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white/75 shadow-[2px_-2px_4px_rgba(0,0,0,0.06)]"
            aria-hidden
          />
        </div>

        <button
          type="button"
          aria-label="AI 方案管家"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={() => {
            draggingRef.current = false
            setDragging(false)
          }}
          onClick={() => {
            if (movedRef.current) return
            onOpen?.()
          }}
          className={cn(
            "flex h-16 w-16 touch-none select-none items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-indigo-500 to-purple-600 backdrop-blur-md shadow-lg shadow-indigo-500/40 transition-[transform,opacity] duration-150",
            dragging ? "scale-95 cursor-grabbing opacity-90" : "cursor-grab scale-100 opacity-100",
            !dragging && "animate-fab-float",
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white drop-shadow-sm" aria-hidden>
            <rect x="5" y="7" width="14" height="10" rx="5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="10" cy="12" r="1" fill="currentColor" />
            <circle cx="14" cy="12" r="1" fill="currentColor" />
            <path d="M12 7V5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
