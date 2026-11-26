// Monta o servidor HTTP: API, tempo real e o site (pasta dist/).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { config } from './config.js'
import { abrirBanco, db } from './db.js'
import { carregarUsuario, limparSessoesVencidas } from './contas.js'
import { tratarErros, ErroUsuario } from './erros.js'
import { devolverReservasAbertas, devolverTodas } from './carteira.js'
import { rotasPublicas } from './rotas/publico.js'
import { rotasJogador } from './rotas/jogador.js'
import { rotasAdmin } from './rotas/admin.js'
import { iniciarTempoReal } from './tempoReal.js'
import { mesas, torneios } from './salas/central.js'
import { faxinaMesas } from './salas/mesas.js'
import { faxinaTorneios, encerrarComDevolucao } from './salas/torneios.js'

function cabecalhosSeguranca(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  )
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000')
  next()
}

/** Bloqueia requisições de outros sites (CSRF): exige JSON e confere a origem. */
function protecaoOrigem(req, _res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  if (!req.is('application/json')) return next(new ErroUsuario('Formato de requisição inválido.', 415))
  const origem = req.headers.origin
  if (origem) {
    let host = null
    try {
      host = new URL(origem).host
    } catch {
      // origem malformada
    }
    if (host !== req.headers.host && origem !== config.origemPublica) {
      return next(new ErroUsuario('Origem não permitida.', 403))
    }
  }
  next()
}

/** Na inicialização: nada pode ficar preso de uma execução anterior. */
function recuperarEstado() {
  const devolvidas = devolverReservasAbertas()
  const r = db().prepare("UPDATE torneios SET status = 'cancelado', encerrado_em = datetime('now') WHERE status IN ('inscricoes', 'andamento')").run()
  if (devolvidas || r.changes) {
    console.log(`[início] ${devolvidas} valor(es) retido(s) devolvido(s); ${r.changes} sala(s) interrompida(s) cancelada(s).`)
  }
}

export function criarServidor() {
  abrirBanco()
  recuperarEstado()

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(cabecalhosSeguranca)
  app.use('/api', express.json({ limit: '32kb' }))
  app.use('/api', protecaoOrigem)
  app.use('/api', carregarUsuario)
  app.use('/api', rotasPublicas)
  app.use('/api/admin', rotasAdmin)
  app.use('/api', rotasJogador)
  app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }))
  app.use('/api', tratarErros)

  // Site (gerado por `npm run build`).
  const pastaSite = path.join(config.raiz, 'dist')
  if (fs.existsSync(path.join(pastaSite, 'index.html'))) {
    app.use(
      '/assets',
      express.static(path.join(pastaSite, 'assets'), { immutable: true, maxAge: '365d', fallthrough: false }),
    )
    app.use(express.static(pastaSite, { index: false, maxAge: '1h' }))
    app.get(/.*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(path.join(pastaSite, 'index.html'))
    })
  } else {
    app.get('/', (_req, res) =>
      res.type('text').send('Servidor no ar. Rode "npm run build" para gerar o site, ou "npm run dev" para desenvolver.'),
    )
  }
  app.use(tratarErros)

  const servidor = http.createServer(app)
  const io = iniciarTempoReal(servidor)

  const faxina = setInterval(() => {
    try {
      faxinaMesas()
      faxinaTorneios()
      limparSessoesVencidas()
    } catch (erro) {
      console.error('[faxina]', erro)
    }
  }, 60_000)
  faxina.unref()

  /** Desligamento controlado: devolve o valor de todas as partidas em andamento. */
  function desligar(motivo = 'Servidor em manutenção') {
    clearInterval(faxina)
    for (const t of torneios.values()) if (t.ativo) encerrarComDevolucao(t, motivo)
    for (const m of mesas.values()) {
      if (!m.ativa) continue
      if (m.tipo === 'dinheiro') devolverTodas('mesa', m.id, `${motivo} — valor devolvido`)
      m.cancelar(motivo)
    }
    io.close()
    servidor.close()
  }

  return { app, servidor, io, desligar }
}
