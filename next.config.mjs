import path from "path"
import { fileURLToPath } from "url"

// 固定为「本仓库根目录」。若用户主目录下另有 package-lock.json，Turbopack 会误判工作区根，
// 进而在错误路径解析 tailwindcss，导致编译失败、localhost 连接被拒绝。
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  // 开发模式下压低 Webpack 并行度，减轻低配机「一跑 dev 就整机卡死」的情况（首次编译会更慢一些）。
  webpack: (config, { dev }) => {
    if (dev) {
      config.parallelism = 8
    }
    return config
  },
}

export default nextConfig
