import { resolve } from 'path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

/** Inline script uses single quotes; escape for safe substitution into `const GA_KEY = '…'`. */
function escapeForSingleQuotedJs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function htmlGoogleAnalyticsKeyPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const raw = env.VITE_GOOGLE_ANALYTICS_KEY || env.GOOGLE_ANALYTICS_KEY || ''
  const escaped = escapeForSingleQuotedJs(raw)

  return {
    name: 'html-google-analytics-key',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html.replace(/%GOOGLE_ANALYTICS_KEY%/g, escaped)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 飞牛统一网关把应用挂在 /app/wealth-tracker 前缀下，且会剥掉该前缀转发给后端。
  // 用绝对前缀保证资源请求路径恒为 /app/wealth-tracker/assets/...，
  // 网关剥前缀后后端收到 /assets/... 能正常服务，避免相对路径解析漂移到 /app/assets/。
  base: '/app/wealth-tracker/',
  plugins: [
    htmlGoogleAnalyticsKeyPlugin(mode),
    svelte(),
    createSvgIconsPlugin({
      // 用于指定 SVG 图标所在的文件夹路径
      iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
      // 生成的 symbol id 的格式
      symbolId: 'icon-[name]',
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://0.0.0.0:8888/',
    },
  },
  build: {
    outDir: '../server/public',
  },
}))
