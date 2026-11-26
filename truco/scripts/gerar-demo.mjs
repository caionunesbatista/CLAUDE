// Gera a mesa de treino offline como UM arquivo HTML (CSS e JS embutidos), pronto para publicar como artefato.
// Uso: npm run demo   →   cria dist-demo/zap-arena-treino.html
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
execSync('npx vite build --config vite.demo.config.js', { cwd: raiz, stdio: 'inherit' })

const pasta = path.join(raiz, 'dist-demo')
const html = fs.readFileSync(path.join(pasta, 'demo.html'), 'utf8')
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1])
const estilos = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1])
const ler = (url) => fs.readFileSync(path.join(pasta, url.replace(/^\//, '')), 'utf8')

const css = estilos.map(ler).join('\n')
const js = scripts.map(ler).join('\n').replace(/<\/script/gi, '<\\/script')
if (/<\/style/i.test(css)) throw new Error('CSS contém </style>')

// O artefato envolve a página num esqueleto próprio: só título, estilos, o contêiner e o script.
const pagina = `<title>Zap Arena Treino</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${css}
/* Página de tela inteira, sempre escura */
:root { color-scheme: dark; background: #060b19; }
html, body { height: 100%; }
body {
  background: #060b19;
  color: #eef2fb;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 0;
  box-sizing: border-box;
}
#root { height: 100%; }
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`
const destino = path.join(pasta, 'zap-arena-treino.html')
fs.writeFileSync(destino, pagina)
console.log(`\nGerado: ${destino} (${(Buffer.byteLength(pagina) / 1024).toFixed(0)} KB)`)
