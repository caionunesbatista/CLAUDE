// Salas de duplas: o criador escolhe quantas duplas, o valor da inscrição e quantas posições ganham prêmio.
// Quando todas as vagas são preenchidas, a sala vira uma chave de eliminação simples.
import crypto from 'node:crypto'
import { Mesa } from './mesa.js'
import { mesas, torneios, avisos, gerarId } from './central.js'
import { gerarChave, classificacao } from './chave.js'
import { validarAposta, registrarPartida } from './mesas.js'
import { reservar, devolverReserva, devolverTodas, liquidar } from '../carteira.js'
import { ajustes } from '../ajustes.js'
import { db } from '../db.js'
import { ErroUsuario } from '../erros.js'
import { calcularPremios } from '../../shared/premios.js'
import { VARIANTES, validarPercentuais } from '../../shared/regras.js'

export class Torneio {
  constructor({ id, nome, criador, variante, formato, times, entrada, taxa, percentuais, privada }) {
    this.id = id
    this.nome = nome
    this.criadorId = criador.id
    this.criadorApelido = criador.apelido
    this.variante = variante
    this.formato = formato // 'duplas' | 'individual'
    this.porTime = formato === 'duplas' ? 2 : 1
    this.times = times
    this.entrada = entrada // por jogador, em centavos
    this.taxa = taxa
    this.percentuais = percentuais
    this.privada = privada
    this.vagas = Array.from({ length: times }, () => Array(this.porTime).fill(null))
    this.status = 'inscricoes' // inscricoes | andamento | encerrado | cancelado
    this.motivoCancelamento = null
    this.chave = null
    this.ordem = null // participante da chave → índice da dupla
    this.jogos = new Map()
    this.colocacao = null
    this.criadoEm = Date.now()
    this.iniciadoEm = null
    this.encerradoEm = null
  }

  get inscritos() {
    return this.vagas.flat().filter(Boolean).length
  }

  get total() {
    return this.times * this.porTime
  }

  get cheio() {
    return this.inscritos === this.total
  }

  get ativo() {
    return this.status === 'inscricoes' || this.status === 'andamento'
  }

  calculo() {
    return calcularPremios({
      entrada: this.entrada,
      jogadoresPorTime: this.porTime,
      times: this.times,
      taxa: this.taxa,
      percentuais: this.percentuais,
    })
  }

  lugarDe(usuarioId) {
    for (let t = 0; t < this.vagas.length; t++) {
      const v = this.vagas[t].findIndex((x) => x && x.usuarioId === usuarioId)
      if (v >= 0) return { time: t, vaga: v }
    }
    return null
  }

  nomesDoTime(t) {
    return this.vagas[t].map((v) => v?.apelido || '—').join(' & ')
  }

  /** Participante (índice na chave) de uma fonte, ou undefined se ainda não definido. */
  resolver(fonte) {
    if (fonte.tipo === 'time') return fonte.indice
    const j = this.jogos.get(fonte.jogo)
    if (!j || j.status !== 'encerrado') return undefined
    return fonte.tipo === 'vencedor' ? j.vencedor : j.perdedor
  }

  /** A dupla ainda tem jogo pela frente (ou está jogando)? */
  timeVivo(t) {
    if (this.status === 'inscricoes') return true
    if (this.status !== 'andamento') return false
    for (const j of this.jogos.values()) {
      if (j.status === 'encerrado' && this.ordem[j.perdedor] === t) {
        const alimentaOutro = [...this.jogos.values()].some(
          (k) => (k.a.tipo === 'perdedor' && k.a.jogo === j.id) || (k.b.tipo === 'perdedor' && k.b.jogo === j.id),
        )
        if (!alimentaOutro) return false
      }
    }
    for (const j of this.jogos.values()) {
      if (j.status === 'encerrado' && this.ordem[j.vencedor] === t && j.id === this.chave.idFinal) return false
    }
    return true
  }

  rotuloFonte(fonte) {
    const p = this.resolver(fonte)
    if (p !== undefined) {
      const t = this.ordem[p]
      return { time: t, nomes: this.nomesDoTime(t) }
    }
    const j = this.jogos.get(fonte.jogo)
    return { pendente: `${fonte.tipo === 'vencedor' ? 'Vencedor' : 'Perdedor'} de ${j.rotulo}` }
  }

  visao(usuarioId = null) {
    const lugar = usuarioId ? this.lugarDe(usuarioId) : null
    let minhaPartida = null
    if (lugar && this.status === 'andamento') {
      for (const j of this.jogos.values()) {
        if (j.status !== 'jogando') continue
        if (this.ordem[j.pa] === lugar.time || this.ordem[j.pb] === lugar.time) minhaPartida = j.mesaId
      }
    }
    const calc = this.calculo()
    return {
      id: this.id,
      nome: this.nome,
      criador: { id: this.criadorId, apelido: this.criadorApelido },
      variante: this.variante,
      formato: this.formato,
      porTime: this.porTime,
      times: this.times,
      entrada: this.entrada,
      taxa: this.taxa,
      percentuais: this.percentuais,
      privada: this.privada,
      status: this.status,
      motivoCancelamento: this.motivoCancelamento,
      calculo: calc,
      inscritos: this.inscritos,
      total: this.total,
      souCriador: usuarioId === this.criadorId,
      meuLugar: lugar,
      souVivo: lugar ? this.timeVivo(lugar.time) : false,
      minhaPartida,
      vagas: this.vagas.map((time, i) => ({
        indice: i,
        membros: time.map((v) =>
          v ? { apelido: v.apelido, eu: v.usuarioId === usuarioId, conectado: avisos.conectado(v.usuarioId) } : null,
        ),
      })),
      chave: this.chave
        ? {
            totalRodadas: this.chave.totalRodadas,
            jogos: [...this.jogos.values()].map((j) => ({
              id: j.id,
              nome: j.nome,
              rotulo: j.rotulo,
              rodada: j.rodada,
              terceiro: j.id === this.chave.idTerceiro,
              a: this.rotuloFonte(j.a),
              b: this.rotuloFonte(j.b),
              status: j.status,
              mesaId: j.mesaId,
              vencedorTime: j.vencedor !== null ? this.ordem[j.vencedor] : null,
              placar: j.mesaId && mesas.get(j.mesaId)?.partida ? [...mesas.get(j.mesaId).partida.placar] : j.placar,
            })),
          }
        : null,
      colocacao: this.colocacao,
      criadoEm: this.criadoEm,
    }
  }

  resumo() {
    const calc = this.calculo()
    return {
      id: this.id,
      nome: this.nome,
      variante: this.variante,
      formato: this.formato,
      times: this.times,
      inscritos: this.inscritos,
      total: this.total,
      entrada: this.entrada,
      premioTotal: calc.liquido,
      premiados: this.percentuais.length,
      percentuais: this.percentuais,
      status: this.status,
      criador: this.criadorApelido,
      criadoEm: this.criadoEm,
    }
  }
}

// ---------- regras de participação ----------

/** Sala em que o usuário ainda está na disputa (inscrito ou vivo na chave). */
export function torneioAtivoDo(usuarioId) {
  for (const t of torneios.values()) {
    if (!t.ativo) continue
    const lugar = t.lugarDe(usuarioId)
    if (lugar && t.timeVivo(lugar.time)) return t
  }
  return null
}

function garantirLivre(usuario) {
  if (usuario.bloqueado) throw new ErroUsuario('Conta bloqueada.', 403)
  const t = torneioAtivoDo(usuario.id)
  if (t) throw new ErroUsuario(`Você já está inscrito na sala "${t.nome}". Saia dela ou aguarde o fim para entrar em outra.`, 409)
}

function salvarTorneio(t, resultado = null) {
  db()
    .prepare("UPDATE torneios SET status = ?, resultado = ?, encerrado_em = CASE WHEN ? IN ('encerrado','cancelado') THEN datetime('now') ELSE encerrado_em END WHERE id = ?")
    .run(t.status, resultado ? JSON.stringify(resultado) : null, t.status, t.id)
}

// ---------- criar, entrar, sair ----------

export function criarTorneio(usuario, op = {}) {
  const nome = String(op.nome || '').trim().replace(/\s+/g, ' ')
  if (nome.length < 3 || nome.length > 40) throw new ErroUsuario('O nome da sala deve ter de 3 a 40 caracteres.')
  if (!VARIANTES[op.variante]) throw new ErroUsuario('Escolha Truco Paulista ou Truco Mineiro.')
  const formato = op.formato === 'individual' ? 'individual' : op.formato === 'duplas' ? 'duplas' : null
  if (!formato) throw new ErroUsuario('Escolha o formato: duplas ou individual.')
  const max = ajustes().maxTimes
  const times = op.times
  if (!Number.isInteger(times) || times < 2 || times > max) {
    throw new ErroUsuario(`A sala precisa ter de 2 a ${max} ${formato === 'duplas' ? 'duplas' : 'jogadores'}.`)
  }
  const entrada = validarAposta(op.entrada)
  const erroPremio = validarPercentuais(op.percentuais, times)
  if (erroPremio) throw new ErroUsuario(erroPremio)
  const vouJogar = op.vouJogar !== false
  if (vouJogar) garantirLivre(usuario)

  const t = new Torneio({
    id: gerarId(),
    nome,
    criador: usuario,
    variante: op.variante,
    formato,
    times,
    entrada,
    taxa: entrada > 0 ? ajustes().taxaCasa : 0,
    percentuais: [...op.percentuais],
    privada: op.privada === true,
  })
  db()
    .prepare('INSERT INTO torneios (id, nome, criador_id, config, status) VALUES (?, ?, ?, ?, ?)')
    .run(
      t.id,
      t.nome,
      usuario.id,
      JSON.stringify({ variante: t.variante, formato, times, entrada, taxa: t.taxa, percentuais: t.percentuais, privada: t.privada }),
      t.status,
    )
  torneios.set(t.id, t)
  if (vouJogar) {
    try {
      inscrever(t, usuario, 0, 0)
    } catch (erro) {
      // Sem saldo para a própria inscrição: a sala não é criada.
      torneios.delete(t.id)
      t.status = 'cancelado'
      salvarTorneio(t)
      throw erro
    }
  }
  avisos.lobby()
  return t
}

function inscrever(t, usuario, time, vaga) {
  if (t.vagas[time][vaga]) throw new ErroUsuario('Essa vaga já está ocupada.')
  let reservaId = null
  if (t.entrada > 0) reservaId = reservar(usuario.id, t.entrada, 'torneio', t.id, `Inscrição — sala "${t.nome}"`)
  t.vagas[time][vaga] = { usuarioId: usuario.id, apelido: usuario.apelido, reservaId }
}

export function entrarTorneio(usuario, id, op = {}) {
  const t = torneios.get(id)
  if (!t) throw new ErroUsuario('Sala não encontrada.', 404)
  if (t.lugarDe(usuario.id)) return t
  if (t.status !== 'inscricoes') throw new ErroUsuario('As inscrições desta sala já encerraram.')
  if (t.cheio) throw new ErroUsuario('A sala está cheia.')
  garantirLivre(usuario)

  let { time, vaga } = op
  if (time === undefined || time === null) {
    // Preferência: completar uma dupla que já tem alguém; senão, a primeira dupla vazia.
    const incompleta = t.vagas.findIndex((v) => v.some(Boolean) && v.some((x) => !x))
    time = incompleta >= 0 ? incompleta : t.vagas.findIndex((v) => v.some((x) => !x))
  }
  if (!Number.isInteger(time) || time < 0 || time >= t.times) throw new ErroUsuario('Dupla inválida.')
  if (vaga === undefined || vaga === null) vaga = t.vagas[time].findIndex((x) => !x)
  if (!Number.isInteger(vaga) || vaga < 0 || vaga >= t.porTime) throw new ErroUsuario('Essa dupla já está completa.')
  inscrever(t, usuario, time, vaga)
  if (t.cheio) iniciarTorneio(t)
  avisos.torneio(t)
  avisos.lobby()
  return t
}

export function trocarVagaTorneio(usuario, id, time, vaga) {
  const t = torneios.get(id)
  if (!t) throw new ErroUsuario('Sala não encontrada.', 404)
  if (t.status !== 'inscricoes') throw new ErroUsuario('As inscrições já encerraram.')
  const atual = t.lugarDe(usuario.id)
  if (!atual) throw new ErroUsuario('Você não está nesta sala.')
  if (!Number.isInteger(time) || time < 0 || time >= t.times || !Number.isInteger(vaga) || vaga < 0 || vaga >= t.porTime) {
    throw new ErroUsuario('Vaga inválida.')
  }
  if (t.vagas[time][vaga]) throw new ErroUsuario('Essa vaga já está ocupada.')
  t.vagas[time][vaga] = t.vagas[atual.time][atual.vaga]
  t.vagas[atual.time][atual.vaga] = null
  avisos.torneio(t)
  return t
}

export function sairTorneio(usuario, id) {
  const t = torneios.get(id)
  if (!t) throw new ErroUsuario('Sala não encontrada.', 404)
  const lugar = t.lugarDe(usuario.id)
  if (!lugar) throw new ErroUsuario('Você não está nesta sala.')
  if (t.status !== 'inscricoes') throw new ErroUsuario('A sala já começou: não dá para sair agora.')
  const v = t.vagas[lugar.time][lugar.vaga]
  t.vagas[lugar.time][lugar.vaga] = null
  if (v.reservaId) devolverReserva(v.reservaId, `Você saiu da sala "${t.nome}" — inscrição devolvida`)
  avisos.torneio(t)
  avisos.lobby()
}

export function cancelarTorneio(usuario, id, motivo = null) {
  const t = torneios.get(id)
  if (!t) throw new ErroUsuario('Sala não encontrada.', 404)
  if (!usuario.admin && usuario.id !== t.criadorId) throw new ErroUsuario('Só quem criou a sala pode cancelar.', 403)
  if (t.status !== 'inscricoes' && !usuario.admin) throw new ErroUsuario('A sala já começou e não pode mais ser cancelada.')
  encerrarComDevolucao(t, motivo || (usuario.admin ? 'Sala cancelada pela administração' : 'Sala cancelada por quem criou'))
}

/** Cancela a sala, encerra as mesas em andamento dela e devolve todas as inscrições. */
export function encerrarComDevolucao(t, motivo) {
  if (!t.ativo) return
  for (const j of t.jogos.values()) {
    const m = j.mesaId && mesas.get(j.mesaId)
    if (m && m.ativa) m.cancelar(motivo)
  }
  devolverTodas('torneio', t.id, `${motivo} — inscrição devolvida`)
  t.status = 'cancelado'
  t.motivoCancelamento = motivo
  t.encerradoEm = Date.now()
  salvarTorneio(t)
  avisos.torneio(t)
  avisos.lobby()
}

// ---------- andamento da chave ----------

function embaralhar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  }
  return lista
}

export function iniciarTorneio(t) {
  t.ordem = embaralhar(Array.from({ length: t.times }, (_, i) => i))
  t.chave = gerarChave(t.times, t.percentuais.length >= 3)
  const porRodada = new Map()
  for (const j of t.chave.jogos) porRodada.set(j.nome, (porRodada.get(j.nome) || 0) + 1)
  const contador = new Map()
  for (const j of t.chave.jogos) {
    const n = (contador.get(j.nome) || 0) + 1
    contador.set(j.nome, n)
    t.jogos.set(j.id, {
      ...j,
      rotulo: porRodada.get(j.nome) > 1 ? `${j.nome} ${n}` : j.nome,
      status: 'pendente', // pendente | jogando | encerrado
      mesaId: null,
      pa: null,
      pb: null,
      vencedor: null,
      perdedor: null,
      placar: null,
    })
  }
  t.status = 'andamento'
  t.iniciadoEm = Date.now()
  salvarTorneio(t)
  avancar(t)
}

function avancar(t) {
  if (t.status !== 'andamento') return
  for (const j of t.jogos.values()) {
    if (j.status !== 'pendente') continue
    const a = t.resolver(j.a)
    const b = t.resolver(j.b)
    if (a === undefined || b === undefined) continue
    iniciarJogo(t, j, a, b)
  }
}

function iniciarJogo(t, jogo, pa, pb) {
  const timeA = t.vagas[t.ordem[pa]]
  const timeB = t.vagas[t.ordem[pb]]
  const jogadores = t.porTime * 2
  const mesa = new Mesa({
    id: gerarId(),
    tipo: 'torneio',
    variante: t.variante,
    jogadores,
    privada: true,
    torneio: { id: t.id, nome: t.nome, jogo: jogo.id, nomeJogo: jogo.rotulo },
    aoTerminar: (m, vencedorTime) => jogoTerminou(t, jogo, vencedorTime, m),
    aoFalhar: () => encerrarComDevolucao(t, 'Erro técnico na sala'),
  })
  // Assentos alternados: dupla A nos lugares 0 e 2, dupla B nos lugares 1 e 3.
  const ordemAssentos = jogadores === 4 ? [timeA[0], timeB[0], timeA[1], timeB[1]] : [timeA[0], timeB[0]]
  ordemAssentos.forEach((v, i) => {
    mesa.assentos[i] = { usuarioId: v.usuarioId, apelido: v.apelido, bot: false, reservaId: null }
  })
  jogo.status = 'jogando'
  jogo.mesaId = mesa.id
  jogo.pa = pa
  jogo.pb = pb
  mesas.set(mesa.id, mesa)
  mesa.iniciar()
  for (const v of ordemAssentos) {
    avisos.usuario(v.usuarioId, 'torneio:partida', { torneioId: t.id, nome: t.nome, mesaId: mesa.id, jogo: jogo.rotulo })
  }
}

function jogoTerminou(t, jogo, vencedorTime, mesa) {
  if (t.status !== 'andamento') return
  jogo.status = 'encerrado'
  jogo.vencedor = vencedorTime === 0 ? jogo.pa : jogo.pb
  jogo.perdedor = vencedorTime === 0 ? jogo.pb : jogo.pa
  jogo.placar = [...mesa.partida.placar]
  try {
    registrarPartida(mesa, vencedorTime, { pote: 0, comissao: 0, premio: 0, torneioId: t.id })
  } catch (erro) {
    console.error('[torneio] não foi possível gravar o histórico da partida', erro)
  }
  const todosEncerrados = [...t.jogos.values()].every((j) => j.status === 'encerrado')
  if (todosEncerrados) finalizarTorneio(t)
  else avancar(t)
  avisos.torneio(t)
  avisos.lobby()
}

function finalizarTorneio(t) {
  const resultados = new Map()
  for (const j of t.jogos.values()) resultados.set(j.id, { vencedor: j.vencedor, perdedor: j.perdedor })
  const lista = classificacao(t.chave, resultados).map((p) => t.ordem[p])
  const calc = t.calculo()
  const pagamentos = []
  t.colocacao = lista.map((time, k) => {
    const premio = k < t.percentuais.length ? calc.porJogador[k] : 0
    if (premio > 0) {
      for (const v of t.vagas[time]) {
        pagamentos.push({ usuarioId: v.usuarioId, valor: premio, descricao: `${k + 1}º lugar — sala "${t.nome}"` })
      }
    }
    return { posicao: k + 1, time, nomes: t.nomesDoTime(time), premioPorJogador: premio }
  })
  const comissao = t.entrada > 0 ? calc.comissao : 0
  try {
    liquidar('torneio', t.id, pagamentos, comissao, `Comissão — sala "${t.nome}"`)
  } catch (erro) {
    console.error('[torneio] falha ao pagar prêmios; devolvendo inscrições', erro)
    encerrarComDevolucao(t, 'Erro ao calcular prêmios')
    return
  }
  t.status = 'encerrado'
  t.encerradoEm = Date.now()
  salvarTorneio(t, { colocacao: t.colocacao, comissao, pote: calc.pote })
}

// ---------- listagens e faxina ----------

export function listaTorneiosPublicos() {
  const lista = []
  for (const t of torneios.values()) {
    if (t.privada || !t.ativo) continue
    lista.push(t.resumo())
  }
  return lista.sort((a, b) => (a.status === b.status ? b.criadoEm - a.criadoEm : a.status === 'inscricoes' ? -1 : 1))
}

export function faxinaTorneios(agora = Date.now()) {
  for (const t of [...torneios.values()]) {
    if (!t.ativo && agora - (t.encerradoEm || t.criadoEm) > 6 * 3600_000) {
      torneios.delete(t.id)
      continue
    }
    if (t.status === 'inscricoes' && agora - t.criadoEm > 24 * 3600_000) {
      encerrarComDevolucao(t, 'A sala não completou em 24 horas')
    }
  }
}
