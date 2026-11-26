// Mesas valendo dinheiro (1x1 e 2x2) e mesas de treino contra o computador.
import { Mesa } from './mesa.js'
import { mesas, avisos, gerarId } from './central.js'
import { reservar, devolverReserva, devolverTodas, liquidar } from '../carteira.js'
import { ajustes } from '../ajustes.js'
import { db } from '../db.js'
import { ErroUsuario } from '../erros.js'
import { calcularPremioMesa } from '../../shared/premios.js'
import { VARIANTES, formatarReais } from '../../shared/regras.js'

const NOMES_BOTS = ['Seu Tião', 'Dona Cida', 'Zé do Zap', 'Juca', 'Neusa', 'Bastião', 'Lurdinha', 'Chicão']

function validarVariante(v) {
  if (!VARIANTES[v]) throw new ErroUsuario('Escolha Truco Paulista ou Truco Mineiro.')
  return v
}

function validarJogadores(n) {
  if (n !== 2 && n !== 4) throw new ErroUsuario('A mesa é de 1x1 (2 jogadores) ou duplas (4 jogadores).')
  return n
}

export function validarAposta(aposta) {
  const a = ajustes()
  if (!Number.isInteger(aposta) || aposta < 0) throw new ErroUsuario('Valor da aposta inválido.')
  if (aposta === 0) return 0 // mesa amistosa, sem dinheiro
  if (!a.mesasValendoAbertas) throw new ErroUsuario('As mesas valendo estão temporariamente pausadas.')
  if (aposta < a.apostaMin || aposta > a.apostaMax) {
    throw new ErroUsuario(`O valor por jogador deve ser entre ${formatarReais(a.apostaMin)} e ${formatarReais(a.apostaMax)}.`)
  }
  return aposta
}

/** Mesa (valendo ou amistosa) em que o usuário está sentado agora. */
export function mesaAtivaDo(usuarioId) {
  for (const m of mesas.values()) {
    if (m.tipo === 'dinheiro' && m.ativa && m.assentoDe(usuarioId) >= 0) return m
  }
  return null
}

function sentarPagando(mesa, usuario, assento) {
  if (!Number.isInteger(assento) || assento < 0 || assento >= mesa.jogadores) throw new ErroUsuario('Lugar inválido.')
  if (mesa.assentos[assento]) throw new ErroUsuario('Esse lugar já está ocupado.')
  let reservaId = null
  if (mesa.aposta > 0) {
    reservaId = reservar(usuario.id, mesa.aposta, 'mesa', mesa.id, `Entrada — mesa ${VARIANTES[mesa.variante].curto} ${mesa.jogadores === 4 ? '2x2' : '1x1'}`)
  }
  mesa.assentos[assento] = { usuarioId: usuario.id, apelido: usuario.apelido, avatar: usuario.avatar || null, bot: false, reservaId }
}

// ---------- revanche ----------

const JANELA_REVANCHE_MS = 60_000

/**
 * Pede revanche numa mesa que acabou de terminar. Quando todos pedem, uma nova mesa
 * com os mesmos jogadores, lugares e valor começa na hora (cada um paga a entrada de novo).
 * Retorna o id da nova mesa quando ela é criada.
 */
export function votarRevanche(usuario, mesaId) {
  const mesa = mesas.get(mesaId)
  if (!mesa) throw new ErroUsuario('Mesa não encontrada.', 404)
  if (mesa.tipo !== 'dinheiro') throw new ErroUsuario('Revanche só existe nas mesas.')
  if (mesa.status !== 'encerrada') throw new ErroUsuario('A partida ainda não terminou.')
  if (mesa.assentoDe(usuario.id) < 0) throw new ErroUsuario('Só quem jogou pode pedir revanche.')
  if (mesa.revanche?.novaMesa) return mesa.revanche.novaMesa
  const ate = (mesa.encerradaEm || Date.now()) + JANELA_REVANCHE_MS
  if (Date.now() > ate) throw new ErroUsuario('O tempo para pedir revanche acabou.')
  if (!mesa.revanche) mesa.revanche = { votos: new Set(), ate, novaMesa: null, recusada: null }
  mesa.revanche.recusada = null
  mesa.revanche.votos.add(usuario.id)
  if (mesa.assentos.every((a) => mesa.revanche.votos.has(a.usuarioId))) iniciarRevanche(mesa)
  avisos.mesa(mesa)
  return mesa.revanche.novaMesa
}

function iniciarRevanche(mesa) {
  const r = mesa.revanche
  const falhar = (motivo) => {
    r.recusada = motivo
    r.votos.clear()
  }
  for (const a of mesa.assentos) {
    if (mesaAtivaDo(a.usuarioId)) return falhar(`${a.apelido} já entrou em outra mesa.`)
  }
  if (mesa.aposta > 0 && !ajustes().mesasValendoAbertas) return falhar('As mesas valendo estão pausadas no momento.')
  const nova = new Mesa({
    id: gerarId(),
    tipo: 'dinheiro',
    variante: mesa.variante,
    jogadores: mesa.jogadores,
    aposta: mesa.aposta,
    taxa: mesa.aposta > 0 ? ajustes().taxaCasa : 0,
    privada: true,
    criadorId: mesa.criadorId,
    aoTerminar: liquidarMesa,
    aoFalhar: falhaNaMesa,
  })
  for (let i = 0; i < mesa.assentos.length; i++) {
    const antigo = mesa.assentos[i]
    const u = db().prepare('SELECT id, apelido, avatar, bloqueado FROM usuarios WHERE id = ?').get(antigo.usuarioId)
    try {
      if (!u || u.bloqueado) throw new ErroUsuario('indisponível')
      sentarPagando(nova, u, i)
    } catch {
      // Desfaz quem já pagou. A mensagem não revela o saldo de ninguém.
      for (const a of nova.assentos) if (a?.reservaId) devolverReserva(a.reservaId, 'Revanche não aconteceu — valor devolvido')
      return falhar(`${antigo.apelido} não tem saldo para a revanche.`)
    }
  }
  mesas.set(nova.id, nova)
  r.novaMesa = nova.id
  nova.iniciar()
}

function garantirLivre(usuario) {
  if (usuario.bloqueado) throw new ErroUsuario('Conta bloqueada.', 403)
  const atual = mesaAtivaDo(usuario.id)
  if (atual) throw new ErroUsuario('Você já está em outra mesa. Termine ou saia dela antes de entrar em uma nova.', 409)
}

export function criarMesa(usuario, op = {}) {
  const variante = validarVariante(op.variante)
  const jogadores = validarJogadores(op.jogadores)
  const aposta = validarAposta(op.aposta)
  garantirLivre(usuario)
  const mesa = new Mesa({
    id: gerarId(),
    tipo: 'dinheiro',
    variante,
    jogadores,
    aposta,
    taxa: aposta > 0 ? ajustes().taxaCasa : 0,
    privada: op.privada === true,
    criadorId: usuario.id,
    aoTerminar: liquidarMesa,
    aoFalhar: falhaNaMesa,
  })
  sentarPagando(mesa, usuario, 0)
  mesas.set(mesa.id, mesa)
  avisos.lobby()
  return mesa
}

export function entrarMesa(usuario, mesaId, assento) {
  const mesa = mesas.get(mesaId)
  if (!mesa || mesa.tipo !== 'dinheiro') throw new ErroUsuario('Mesa não encontrada.', 404)
  if (mesa.assentoDe(usuario.id) >= 0) return mesa
  if (mesa.status !== 'aguardando') throw new ErroUsuario('Essa mesa já começou ou foi encerrada.')
  if (mesa.cheia) throw new ErroUsuario('Essa mesa está cheia.')
  garantirLivre(usuario)
  if (assento === undefined || assento === null) assento = mesa.assentos.findIndex((a) => !a)
  sentarPagando(mesa, usuario, assento)
  if (mesa.cheia) mesa.iniciar()
  else avisos.mesa(mesa)
  avisos.lobby()
  return mesa
}

/** Troca de lugar antes de começar (para escolher o parceiro numa mesa de duplas). */
export function trocarLugar(usuario, mesaId, novo) {
  const mesa = mesas.get(mesaId)
  if (!mesa) throw new ErroUsuario('Mesa não encontrada.', 404)
  const atual = mesa.assentoDe(usuario.id)
  if (atual < 0) throw new ErroUsuario('Você não está nesta mesa.')
  if (mesa.status !== 'aguardando') throw new ErroUsuario('A partida já começou.')
  if (!Number.isInteger(novo) || novo < 0 || novo >= mesa.jogadores) throw new ErroUsuario('Lugar inválido.')
  if (mesa.assentos[novo]) throw new ErroUsuario('Esse lugar já está ocupado.')
  mesa.assentos[novo] = mesa.assentos[atual]
  mesa.assentos[atual] = null
  avisos.mesa(mesa)
  avisos.lobby()
  return mesa
}

export function sairMesa(usuario, mesaId) {
  const mesa = mesas.get(mesaId)
  if (!mesa) throw new ErroUsuario('Mesa não encontrada.', 404)
  if (mesa.tipo === 'treino') {
    if (mesa.assentoDe(usuario.id) < 0) throw new ErroUsuario('Você não está nesta mesa.')
    mesa.cancelar('Treino encerrado')
    mesas.delete(mesa.id)
    return
  }
  const assento = mesa.assentoDe(usuario.id)
  if (assento < 0) throw new ErroUsuario('Você não está nesta mesa.')
  if (mesa.status !== 'aguardando') {
    throw new ErroUsuario('A partida já começou: não dá para sair agora. Se você fechar a página, o tempo de cada jogada continua correndo.')
  }
  const lugar = mesa.assentos[assento]
  mesa.assentos[assento] = null
  if (lugar.reservaId) devolverReserva(lugar.reservaId, 'Você saiu da mesa antes de começar — valor devolvido')
  if (mesa.ocupados === 0) {
    mesa.cancelar('Todos saíram da mesa')
  } else {
    avisos.mesa(mesa)
  }
  avisos.lobby()
}

/** Entra na mesa aberta mais cheia com a mesma configuração ou cria uma nova. */
export function mesaRapida(usuario, op = {}) {
  const variante = validarVariante(op.variante)
  const jogadores = validarJogadores(op.jogadores)
  const aposta = validarAposta(op.aposta)
  garantirLivre(usuario)
  let melhor = null
  for (const m of mesas.values()) {
    if (m.tipo !== 'dinheiro' || m.status !== 'aguardando' || m.privada || m.cheia) continue
    if (m.variante !== variante || m.jogadores !== jogadores || m.aposta !== aposta) continue
    if (!melhor || m.ocupados > melhor.ocupados || (m.ocupados === melhor.ocupados && m.criadaEm < melhor.criadaEm)) melhor = m
  }
  if (melhor) return entrarMesa(usuario, melhor.id)
  return criarMesa(usuario, { variante, jogadores, aposta })
}

export function criarTreino(usuario, op = {}) {
  const variante = validarVariante(op.variante)
  const jogadores = validarJogadores(op.jogadores)
  // Fecha um treino anterior do mesmo jogador.
  for (const m of mesas.values()) {
    if (m.tipo === 'treino' && m.ativa && m.assentoDe(usuario.id) >= 0) {
      m.cancelar('Novo treino iniciado')
      mesas.delete(m.id)
    }
  }
  const mesa = new Mesa({ id: gerarId(), tipo: 'treino', variante, jogadores, privada: true, criadorId: usuario.id, aoFalhar: falhaNaMesa })
  const nomes = [...NOMES_BOTS].sort(() => Math.random() - 0.5)
  mesa.assentos[0] = { usuarioId: usuario.id, apelido: usuario.apelido, avatar: usuario.avatar || null, bot: false, reservaId: null }
  for (let i = 1; i < jogadores; i++) mesa.assentos[i] = { usuarioId: null, apelido: nomes[i], bot: true, reservaId: null }
  mesas.set(mesa.id, mesa)
  mesa.iniciar()
  return mesa
}

/** Grava a partida no histórico. */
export function registrarPartida(mesa, vencedorTime, { pote, comissao, premio, torneioId = null }) {
  const d = db()
  d.prepare(
    'INSERT INTO partidas (id, tipo, variante, jogadores, aposta, pote, comissao, vencedor_time, placar, torneio_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    mesa.id,
    mesa.tipo,
    mesa.variante,
    mesa.jogadores,
    mesa.aposta,
    pote,
    comissao,
    vencedorTime,
    JSON.stringify(mesa.partida?.placar || null),
    torneioId,
  )
  const ins = d.prepare('INSERT INTO partida_jogadores (partida_id, usuario_id, time, venceu, premio) VALUES (?, ?, ?, ?, ?)')
  mesa.assentos.forEach((a, i) => {
    if (!a || a.bot) return
    const venceu = i % 2 === vencedorTime
    ins.run(mesa.id, a.usuarioId, i % 2, venceu ? 1 : 0, venceu ? premio : 0)
  })
}

/** Paga os vencedores e registra a comissão quando a partida termina. */
function liquidarMesa(mesa, vencedorTime) {
  const calc = calcularPremioMesa({ aposta: mesa.aposta, jogadores: mesa.jogadores, taxa: mesa.taxa })
  const premio = mesa.aposta > 0 ? calc.porJogador[0] : 0
  const comissao = mesa.aposta > 0 ? calc.comissao : 0
  const pote = mesa.aposta > 0 ? calc.pote : 0
  const pagamentos = []
  mesa.assentos.forEach((a, i) => {
    if (i % 2 === vencedorTime && premio > 0) {
      pagamentos.push({ usuarioId: a.usuarioId, valor: premio, descricao: `Vitória — mesa ${mesa.id}` })
    }
  })
  liquidar('mesa', mesa.id, pagamentos, comissao, `Comissão — mesa ${mesa.id}`, () =>
    registrarPartida(mesa, vencedorTime, { pote, comissao, premio }),
  )
  mesa.resultado = { ...mesa.resultado, premio, comissao, pote }
}

/** Qualquer erro inesperado: cancela a mesa e devolve o dinheiro de todos. */
function falhaNaMesa(mesa) {
  if (mesa.tipo === 'dinheiro') devolverTodas('mesa', mesa.id, 'Mesa cancelada por erro técnico — valor devolvido')
  mesa.status = 'jogando' // garante que cancelar() execute
  mesa.cancelar('Erro técnico: a mesa foi cancelada e os valores devolvidos.')
}

/** Cancela uma mesa (painel do administrador ou desligamento do servidor) devolvendo os valores. */
export function cancelarMesa(mesaId, motivo) {
  const mesa = mesas.get(mesaId)
  if (!mesa) throw new ErroUsuario('Mesa não encontrada.', 404)
  if (!mesa.ativa) throw new ErroUsuario('Essa mesa já terminou.')
  if (mesa.tipo === 'torneio') throw new ErroUsuario('Mesas de sala de duplas são canceladas pela própria sala.')
  if (mesa.tipo === 'dinheiro') devolverTodas('mesa', mesa.id, `${motivo} — valor devolvido`)
  mesa.cancelar(motivo)
}

/** Faxina periódica: remove mesas encerradas e cancela mesas paradas há muito tempo. */
export function faxinaMesas(agora = Date.now()) {
  for (const m of [...mesas.values()]) {
    if (!m.ativa && agora - (m.encerradaEm || m.criadaEm) > 15 * 60_000) {
      mesas.delete(m.id)
      continue
    }
    if (m.tipo === 'dinheiro' && m.status === 'aguardando' && agora - m.criadaEm > 60 * 60_000) {
      devolverTodas('mesa', m.id, 'Mesa não completou em 1 hora — valor devolvido')
      m.cancelar('A mesa não completou em 1 hora e foi cancelada. Os valores foram devolvidos.')
    }
  }
}

export function listaMesasPublicas() {
  const lista = []
  for (const m of mesas.values()) {
    if (m.tipo !== 'dinheiro' || m.privada) continue
    if (m.status !== 'aguardando' && m.status !== 'jogando') continue
    lista.push(m.resumo())
  }
  return lista.sort((a, b) => (a.status === b.status ? b.criadaEm - a.criadaEm : a.status === 'aguardando' ? -1 : 1))
}
