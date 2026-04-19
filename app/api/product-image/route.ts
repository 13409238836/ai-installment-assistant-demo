import { promises as fs } from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"

const PLACEHOLDER_PATH = path.join(process.cwd(), "public", "placeholder.svg")

const EXT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
}

async function tryProductFile(id: string): Promise<{ buf: Buffer; type: string } | null> {
  const dir = path.join(process.cwd(), "public", "product-assets")
  for (const ext of [".png", ".webp", ".jpg", ".jpeg"] as const) {
    const full = path.join(dir, `${id}${ext}`)
    try {
      const buf = await fs.readFile(full)
      return { buf, type: EXT_TYPES[ext] }
    } catch {
      /* try next ext */
    }
  }
  return null
}

/**
 * 同源商品图：优先 `public/product-assets/{id}.png|webp|jpg`，缺失则返回 `placeholder.svg`。
 * 避免硬编码本机路径、缺失的 `/products/*` 以及境外图床在部分移动浏览器无法加载。
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }

  try {
    const hit = await tryProductFile(id)
    if (hit) {
      return new NextResponse(hit.buf, {
        status: 200,
        headers: {
          "Content-Type": hit.type,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    }

    const fallback = await fs.readFile(PLACEHOLDER_PATH)
    return new NextResponse(fallback, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return NextResponse.json({ error: "read failed" }, { status: 500 })
  }
}
