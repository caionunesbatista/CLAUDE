// Comunicação em tempo real com os navegadores (Socket.IO).
// Cada jogador recebe somente a própria visão da mesa — nunca as cartas dos outros.
import { Server } from 'socket.io'
import { mesas, torneios, avisos } from './salas/central.js'
import { SINAIS } from './salas/mesa.js'
import { listaMesasPublicas, mesaAtivaDo } from './salas/mesas.js'
import { listaTorneiosPublicos, torneioAtivoDo } from './salas/torneios.js'
import { lerCookies, usuarioDoToken } from './contas.js'
import { eventosCarteira, saldoDe } from './carteira.js'
import { config } from './config.js'

const presenca = new Map() // usuarioId → nº de conexões abertas

function origemPermitida(req) {
  const origem = req.headers.origin
  if (!origem) return true // apps nativos/testes; navegadores sempre mandam Origin no WebSocket
  if (config.origemPublica && origem === config.origemPublica) return true
  try {
    return new URL(origem).host === req.headers.host
  } catch {
    return false
  }
}

export function resumoLobby() {
  let jogando = 0
  for (const m of mesas.values()) if (m.status === 'jogando') jogando += m.assentos.filter((a) => a && !a.bot).length
  return {
    mesas: listaMesasPublicas(),
    torneios: listaTorneiosPublicos(),
    online: presenca.size,
    jogando,
  }
}

export function iniciarTempoReal(servidorHttp) {
  const io = new Server(servidorHttp, {
    serveClient: false,
    allowRequest: (req, ok) => ok(null, origemPermitida(req)),
    pingInterval: 20000,
    pingTimeout: 20000,
    maxHttpBufferSize: 16 * 1024,
  })

  io.use((socket, next) => {
    const token = lerCookies(socket.handshake.headers.cookie).sessao
    socket.data.usuario = usuarioDoToken(token)
    next()
  })

  // ---------- emissões ----------

  const emitirParaSala = (sala, evento, montar) => {
    const ids = io.sockets.adapter.rooms.get(sala)
    if (!ids) return
    for (const id of ids) {
      const s = io.sockets.sockets.get(id)
      if (s) s.emit(evento, montar(s.data.usuario?.id ?? null))
    }
  }

  avisos.mesa = (mesa) => emitirParaSala(`m:${mesa.id}`, 'mesa:estado', (uid) => mesa.visao(uid))
  avisos.torneio = (t) => emitirParaSala(`t:${t.id}`, 'torneio:estado', (uid) => t.visao(uid))
  avisos.usuario = (usuarioId, evento, dados) => io.to(`u:${usuarioId}`).emit(evento, dados)
  avisos.conectado = (usuarioId) => presenca.has(usuarioId)

  let lobbyAgendado = null
  avisos.lobby = () => {
    if (lobbyAgendado) return
    lobbyAgendado = setTimeout(() => {
      lobbyAgendado = null
      io.to('lobby').emit('lobby:estado', resumoLobby())
    }, 300)
  }

  eventosCarteira.on('saldo', (usuarioId) => {
    try {
      io.to(`u:${usuarioId}`).emit('saldo', saldoDe(usuarioId))
    } catch {
      // usuário removido: nada a fazer
    }
  })

  const avisarMesasDoUsuario = (usuarioId) => {
    for (const m of mesas.values()) if (m.ativa && m.assentoDe(usuarioId) >= 0) avisos.mesa(m)
  }

  // ---------- conexões ----------

  io.on('connection', (socket) => {
    const usuario = socket.data.usuario
    if (usuario) {
      socket.join(`u:${usuario.id}`)
      const antes = presenca.get(usuario.id) || 0
      presenca.set(usuario.id, antes + 1)
      if (antes === 0) avisarMesasDoUsuario(usuario.id)
      socket.emit('saldo', usuario.saldo)
      avisos.lobby()
    }

    // Limite simples de mensagens por conexão (evita abuso).
    let fichas = 20
    const recarga = setInterval(() => (fichas = Math.min(20, fichas + 10)), 1000)
    const permitir = () => fichas-- > 0
    const responder = (ack, dados) => typeof ack === 'function' && ack(dados)
    const exigirUsuario = (ack) => {
      if (!socket.data.usuario) {
        responder(ack, { erro: 'Entre na sua conta para jogar.' })
        return false
      }
      return true
    }

    socket.on('lobby:entrar', () => {
      socket.join('lobby')
      socket.emit('lobby:estado', resumoLobby())
    })
    socket.on('lobby:sair', () => socket.leave('lobby'))

    socket.on('mesa:entrar', (id, ack) => {
      const mesa = typeof id === 'string' && mesas.get(id)
      if (!mesa) return responder(ack, { erro: 'Mesa não encontrada ou já encerrada.' })
      socket.join(`m:${mesa.id}`)
      socket.emit('mesa:estado', mesa.visao(socket.data.usuario?.id ?? null))
      responder(ack, { ok: true })
    })
    socket.on('mesa:sair', (id) => typeof id === 'string' && socket.leave(`m:${id}`))

    socket.on('mesa:acao', (dados, ack) => {
      if (!permitir()) return responder(ack, { erro: 'Calma! Muitas ações seguidas.' })
      if (!exigirUsuario(ack)) return
      const mesa = mesas.get(dados?.id)
      if (!mesa) return responder(ack, { erro: 'Mesa não encontrada.' })
      try {
        mesa.agir(socket.data.usuario.id, dados.acao)
        responder(ack, { ok: true })
      } catch (erro) {
        if (erro?.name !== 'ErroJogo') console.error('[mesa:acao]', erro)
        responder(ack, { erro: erro?.name === 'ErroJogo' ? erro.message : 'Não foi possível fazer essa jogada.' })
      }
    })

    socket.on('mesa:frase', (dados, ack) => {
      if (!permitir() || !exigirUsuario(ack)) return
      const mesa = mesas.get(dados?.id)
      if (!mesa) return
      try {
        mesa.frase(socket.data.usuario.id, dados.indice)
        responder(ack, { ok: true })
      } catch (erro) {
        responder(ack, { erro: erro.message })
      }
    })

    socket.on('mesa:sinal', (dados, ack) => {
      if (!permitir() || !exigirUsuario(ack)) return
      const mesa = mesas.get(dados?.id)
      if (!mesa || mesa.status !== 'jogando') return
      const indice = dados.indice
      if (!Number.isInteger(indice) || indice < 0 || indice >= SINAIS.length) return
      const parceiro = mesa.parceiroDe(socket.data.usuario.id)
      if (!parceiro || parceiro.bot) return responder(ack, { ok: true })
      io.to(`u:${parceiro.usuarioId}`).emit('mesa:sinal', {
        mesaId: mesa.id,
        de: socket.data.usuario.apelido,
        texto: SINAIS[indice],
        em: Date.now(),
      })
      responder(ack, { ok: true })
    })

    socket.on('torneio:entrar', (id, ack) => {
      const t = typeof id === 'string' && torneios.get(id)
      if (!t) return responder(ack, { erro: 'Sala não encontrada.' })
      socket.join(`t:${t.id}`)
      socket.emit('torneio:estado', t.visao(socket.data.usuario?.id ?? null))
      responder(ack, { ok: true })
    })
    socket.on('torneio:sair', (id) => typeof id === 'string' && socket.leave(`t:${id}`))

    socket.on('eu:ativos', (_, ack) => {
      const u = socket.data.usuario
      if (!u) return responder(ack, { mesa: null, torneio: null })
      const m = mesaAtivaDo(u.id)
      const t = torneioAtivoDo(u.id)
      responder(ack, { mesa: m?.id || null, torneio: t?.id || null })
    })

    socket.on('disconnect', () => {
      clearInterval(recarga)
      if (!usuario) return
      const n = (presenca.get(usuario.id) || 1) - 1
      if (n <= 0) {
        presenca.delete(usuario.id)
        avisarMesasDoUsuario(usuario.id)
      } else presenca.set(usuario.id, n)
      avisos.lobby()
    })
  })

  return io
}

export function estaOnline(usuarioId) {
  return presenca.has(usuarioId)
}

export function totalOnline() {
  return presenca.size
}
