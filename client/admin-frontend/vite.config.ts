import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/admin/',

  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/styles': path.resolve(__dirname, './src/styles'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3001,
    host: process.env.VITE_HOST || '0.0.0.0', // Docker 中使用 0.0.0.0，本地使用 127.0.0.1
    // 如果 strictPort=true，则端口被占用时会抛出错误而不是尝试下一个可用端口。
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000', // Docker 中使用容器名，本地使用 127.0.0.1
        changeOrigin: true,
        secure: false,
        // 移除 rewrite，保持 /api 路径不变
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        manualChunks: {
          react: ['react', 'react-dom'],
          antd: ['antd'],
          vendor_misc: ['axios']
        }
      },
    },
  },

  // 环境变量前缀
  envPrefix: 'VITE_'
})
