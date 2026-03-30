import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ticketmaster': {
        target: 'https://app.ticketmaster.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ticketmaster/, ''),
      },
      '/api/bandsintown': {
        target: 'https://rest.bandsintown.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bandsintown/, ''),
      },
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
      },
      '/api/predicthq': {
        target: 'https://api.predicthq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/predicthq/, ''),
      },
      '/api/faces': {
        target: 'https://www.facesbrewing.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/faces/, ''),
      },
      '/api/obriens': {
        target: 'https://obrienspubboston.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/obriens/, ''),
      },
      '/api/themet': {
        target: 'https://themetri.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/themet/, ''),
      },
      '/api/castletheatre': {
        target: 'https://www.castletheatre.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/castletheatre/, ''),
      },
      '/api/canopyclub': {
        target: 'https://www.canopyclub.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/canopyclub/, ''),
      },
      '/api/thepageant': {
        target: 'https://www.thepageant.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/thepageant/, ''),
      },
    },
  },
})
