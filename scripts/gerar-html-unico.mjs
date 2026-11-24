/**
 * Gera uma versão do site em UM ÚNICO arquivo .html, com CSS, JavaScript,
 * fontes e imagens embutidos (data URI). Serve para pré-visualizar ou
 * enviar o site sem precisar de servidor.
 *
 * Uso:  npm run build:unico
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const DIST = path.join(RAIZ, 'dist')
const PUBLICO = path.join(RAIZ, 'public')
const SAIDA = path.join(RAIZ, 'dist-unico')

const TIPOS = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

/**
 * Lê um arquivo de public/ ou dist/ e devolve o data URI correspondente.
 * Devolve `null` quando o texto encontrado não é um arquivo de verdade —
 * caminhos citados apenas como instrução na tela, por exemplo.
 */
const cache = new Map()
async function dataUri(caminhoWeb) {
  if (cache.has(caminhoWeb)) return cache.get(caminhoWeb)
  const tipo = TIPOS[path.extname(caminhoWeb).toLowerCase()]
  if (!tipo) return cache.set(caminhoWeb, null).get(caminhoWeb)

  const rel = caminhoWeb.replace(/^\//, '')
  const arquivo = [path.join(PUBLICO, rel), path.join(DIST, rel)].find(existsSync)
  if (!arquivo) return cache.set(caminhoWeb, null).get(caminhoWeb)

  const uri = `data:${tipo};base64,${(await readFile(arquivo)).toString('base64')}`
  cache.set(caminhoWeb, uri)
  return uri
}

/** Troca todas as referências a /images/... e /fonts/... por data URIs. */
async function embutirReferencias(texto, rotulo) {
  const achados = [...new Set(texto.match(/\/(?:images|fonts)\/[A-Za-z0-9@._-]+/g) ?? [])]
  let saida = texto
  let bytes = 0
  let n = 0
  const ignorados = []
  for (const ref of achados) {
    const uri = await dataUri(ref)
    if (!uri) { ignorados.push(ref); continue }
    bytes += uri.length
    n += 1
    saida = saida.replaceAll(ref, () => uri)
  }
  console.log(`  ${rotulo}: ${n} arquivo(s) embutido(s) (+${(bytes / 1024).toFixed(0)} KB)` +
    (ignorados.length ? `  [texto, não embutido: ${ignorados.join(', ')}]` : ''))
  return saida
}

async function main() {
  if (!existsSync(DIST)) throw new Error('Rode "npm run build" antes.')

  let html = await readFile(path.join(DIST, 'index.html'), 'utf8')

  // 1. Junta todo o JavaScript num bloco só
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)]
  const assets = path.join(DIST, 'assets')
  const arquivosJs = (await readdir(assets)).filter((f) => f.endsWith('.js'))
  if (scripts.length !== 1 || arquivosJs.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 arquivo JS (encontrei ${arquivosJs.length}). ` +
        'Rode o build com UNICO=1 para desativar a divisão em pedaços.',
    )
  }
  let js = await readFile(path.join(assets, arquivosJs[0]), 'utf8')
  js = await embutirReferencias(js, 'JavaScript')

  // 2. Junta todo o CSS num bloco só
  const estilos = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]
  let css = ''
  for (const [, href] of estilos) {
    css += await readFile(path.join(DIST, href.replace(/^\//, '')), 'utf8')
  }
  css = await embutirReferencias(css, 'CSS (fontes)')

  // 3. Remove o que não faz sentido num arquivo solto
  html = html
    .replace(/\s*<link[^>]*rel="(?:preload|manifest|icon|apple-touch-icon)"[^>]*>/g, '')
    .replace(/\s*<meta[^>]*(?:property="og:image|name="twitter:card)[^>]*>/g, '')
    .replace(/\s*<meta[^>]*property="og:image:(?:width|height)"[^>]*>/g, '')
    .replace(/\s*<link[^>]*rel="stylesheet"[^>]*>/g, '')
    .replace(/\s*<script[^>]*src="[^"]+"[^>]*><\/script>/g, '')

  // 4. Insere os blocos embutidos.
  //    Atenção: a substituição precisa ser por FUNÇÃO. Com texto literal, o
  //    JavaScript interpreta sequências como `$'` e `$&` dentro do conteúdo
  //    (frequentes em código minificado) e duplica pedaços do arquivo.
  /* Um "</script>" ou "</style>" solto dentro do conteúdo encerraria a tag
   * mais cedo e quebraria a página. Neutralizamos antes de embutir.        */
  const seguroJs = js.replaceAll('</script', () => '<\\/script')
  const seguroCss = css.replaceAll('</style', () => '<\\/style')

  html = html
    .replace('</head>', () => `  <style>\n${seguroCss}\n  </style>\n  </head>`)
    .replace('</body>', () => `  <script type="module">\n${seguroJs}\n  <\/script>\n  </body>`)

  html = await embutirReferencias(html, 'HTML')

  await mkdir(SAIDA, { recursive: true })
  const destino = path.join(SAIDA, 'km-lavacar.html')
  await writeFile(destino, html, 'utf8')
  console.log(`\n✓ ${destino}  —  ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`)

  /* 5. Versão para publicar como Artifact: lá o documento (doctype, <html>,
   *    <head>, <body>) já vem pronto, então entregamos só o conteúdo.      */
  const corpo = html.slice(html.indexOf('<div id="root">'), html.indexOf('</body>'))
    .replace(/\s*<script[\s\S]*$/, '')
  const artifact = [
    '<title>KM Lavacar</title>',
    `<style>\n${seguroCss}\n</style>`,
    corpo.trim(),
    `<script type="module">\n${seguroJs}\n<\/script>`,
  ].join('\n')
  const destinoArtifact = path.join(SAIDA, 'artifact.html')
  await writeFile(destinoArtifact, artifact, 'utf8')
  console.log(`✓ ${destinoArtifact}  —  ${(Buffer.byteLength(artifact) / 1024 / 1024).toFixed(2)} MB`)

  for (const [rotulo, texto] of [['arquivo único', html], ['artifact', artifact]]) {
    const sobrou = texto.match(/(?:src=|href=|url\()["']\/(?!\/)[^"')\s]+/g)
    console.log(sobrou ? `⚠️ ${rotulo}: caminhos externos restantes: ${[...new Set(sobrou)]}`
                       : `✓ ${rotulo}: nenhum caminho externo restante`)
  }
}

main().catch((e) => {
  console.error('Falhou:', e.message)
  process.exit(1)
})
