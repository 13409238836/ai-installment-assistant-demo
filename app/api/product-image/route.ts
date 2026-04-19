import { promises as fs } from "fs"
import { NextRequest, NextResponse } from "next/server"

const IMAGE_MAP: Record<string, string> = {
  "ipad-air-11-m4-128": "/Users/jennierubyjane/.cursor/projects/Users-jennierubyjane-Downloads-b-Te6pnikkvAj/assets/1846509e12098b68161241272c5fd4a8-b87f21ed-e4c9-464e-9e29-5635258cac00.png",
  "ipad-air-13-m4-128": "/Users/jennierubyjane/.cursor/projects/Users-jennierubyjane-Downloads-b-Te6pnikkvAj/assets/d57a8f4ca820d2bf1d4639f86d74d59a-1c6b7aa0-8e96-4eb4-aec2-46e7186ac468.png",
  "ipad-10-64": "/Users/jennierubyjane/.cursor/projects/Users-jennierubyjane-Downloads-b-Te6pnikkvAj/assets/40f15e7839dcaba23afa79dd7da19677-167eeba5-6ea5-4d1c-ae9a-3ee3e1f5d536.png",
  "edifier-lolli-clip": "/Users/jennierubyjane/.cursor/projects/Users-jennierubyjane-Downloads-b-Te6pnikkvAj/assets/7e4f62d8ebe44091ac1902fea118aaf4-ef8898be-0d0f-43a3-b651-a5752d82536b.png",
  "edifier-w820nb": "/Users/jennierubyjane/.cursor/projects/Users-jennierubyjane-Downloads-b-Te6pnikkvAj/assets/f1ce392ed4b0c22297ae06cfe870991f-6c087515-4cf4-4f7e-9828-a35faf439af1.png",
  "1more-qc30": "/Users/jennierubyjane/.cursor/projects/Users-jennierubyjane-Downloads-b-Te6pnikkvAj/assets/c35f484569e5c9cdd1025d872de92743-358bede8-180c-4746-ad41-7851e2ddcbbd.png",
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id || !IMAGE_MAP[id]) {
    return NextResponse.json({ error: "image id not found" }, { status: 404 })
  }

  try {
    const file = await fs.readFile(IMAGE_MAP[id])
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "image read failed" }, { status: 500 })
  }
}

