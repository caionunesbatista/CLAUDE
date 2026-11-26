// Uma mesa: lugares, a partida em andamento, o relógio de cada jogada e os bots do treino.
import { Partida, ErroJogo } from '../game/motor.js'
import { decidirBot } from '../game/bot.js'
import { avisos } from './central.js'
import { config } from '../config.js'
import { ajustes } from '../ajustes.js'
import { calcularPremioMesa } from '../../shared/premios.js'
import { FRASES, SINAIS } from '../../shared/regras.js'

export { FRASES, SINAIS }

export class Mesa {
  /**
   * @param {object} op
   * @param {'dinheiro'|'treino'|'torneio'} op.tipo
   */
  constructor({
    id,
    tipo,
    variante,
    jogadores,
    aposta = 0,
    taxa = 0,
    privada = false,
    criadorId = null,
    torneio = null,
    aoTerminar = null,
    aoFalhar = null,
  }) {
    this.id = id
    this.tipo = tipo
    this.variante = variante
    this.jogadores = jogadores
    this.aposta = aposta
    this.taxa = taxa
    this.privada = privada
    this.criadorId = criadorId
    this.torneio = torneio // { id, nome, jogo, nomeJogo }
    this.aoTerminar = aoTerminar
    this.aoFalhar = aoFalhar
    this.assentos = Array(jogadores).fill(null) // { usuarioId, apelido, bot, reservaId }
    this.status = 'aguardando' // aguardando | jogando | encerrada | cancelada
    this.partida = null
    this.prazo = null
    this.timer = null
    this.timerBot = null
    this.frases = []
    this.seqFrase = 0
    this.ultimaFrase = new Map()
    this.resultado = null
    this.criadaEm = Date.now()
    this.encerradaEm = null
  }

  get ocupados() {
    return this.assentos.filter(Boolean).length
  }

  get cheia() {
    return this.ocupados === this.jogadores
  }

  get ativa() {
    return this.status === 'aguardando' || this.status === 'jogando'
  }

  assentoDe(usuarioId) {
    if (usuarioId === null || usuarioId === undefined) return -1
    return this.assentos.findIndex((a) => a && !a.bot && a.usuarioId === usuarioId)
  }

  /** Prêmio de cada vencedor (já descontada a comissão). */
  premioPorVencedor() {
    if (this.aposta <= 0) return 0
    return calcularPremioMesa({ aposta: this.aposta, jogadores: this.jogadores, taxa: this.taxa }).porJogador[0]
  }

  iniciar() {
    if (this.status !== 'aguardando') throw new ErroJogo('A mesa já começou.')
    if (!this.cheia) throw new ErroJogo('A mesa ainda não está completa.')
    this.partida = new Partida({ variante: this.variante, jogadores: this.jogadores })
    this.status = 'jogando'
    this.partida.iniciarMao()
    this.passo()
    avisos.lobby()
  }

  agir(usuarioId, acao) {
    if (this.status !== 'jogando') throw new ErroJogo('A partida não está em andamento.')
    const assento = this.assentoDe(usuarioId)
    if (assento < 0) throw new ErroJogo('Você não está sentado nesta mesa.')
    this.partida.agir(assento, acao)
    this.passo()
  }

  /** Executa algo disparado por relógio, sem nunca derrubar o servidor. */
  seguro(fn) {
    try {
      fn()
    } catch (erro) {
      console.error(`[mesa ${this.id}] erro inesperado`, erro)
      this.limparRelogios()
      if (this.aoFalhar) this.aoFalhar(this, erro)
    }
  }

  limparRelogios() {
    clearTimeout(this.timer)
    clearTimeout(this.timerBot)
    this.timer = null
    this.timerBot = null
  }

  /** Avança a mesa depois de qualquer mudança: agenda o relógio, os bots e avisa os jogadores. */
  passo() {
    this.limparRelogios()
    const p = this.partida
    if (p.fase === 'fim') {
      this.prazo = null
      this.finalizar()
      return
    }
    if (p.fase === 'fimMao') {
      this.prazo = null
      this.timer = setTimeout(
        () =>
          this.seguro(() => {
            if (this.status !== 'jogando') return
            p.iniciarMao()
            this.passo()
          }),
        config.atrasoEntreMaos,
      )
      avisos.mesa(this)
      return
    }

    const quem = p.aguardando()
    const assentos = quem.assento !== undefined ? [quem.assento] : p.assentosDoTime(quem.time)
    const humanos = assentos.filter((s) => !this.assentos[s].bot)
    const tempo = ajustes().tempoJogada
    let total = tempo
    if (humanos.length === 0) total = 30
    else if (!humanos.some((s) => avisos.conectado(this.assentos[s].usuarioId))) total = Math.min(10, tempo)
    this.prazo = { ate: Date.now() + total * 1000, total, assentos }
    this.timer = setTimeout(() => this.seguro(() => this.tempoEsgotado()), total * 1000)

    if (this.tipo === 'treino') this.agendarBot(assentos)
    avisos.mesa(this)
  }

  agendarBot(assentos) {
    const p = this.partida
    const bots = assentos.filter((s) => this.assentos[s].bot)
    if (bots.length === 0) return
    const atraso = config.atrasoBotMin + Math.floor(Math.random() * Math.max(1, config.atrasoBotMax - config.atrasoBotMin))
    this.timerBot = setTimeout(
      () =>
        this.seguro(() => {
          if (this.status !== 'jogando') return
          for (const s of bots) {
            const timeTemHumano = p.assentosDoTime(p.time(s)).some((x) => !this.assentos[x].bot)
            const acao = decidirBot(p, s, { timeTemHumano })
            if (acao) {
              p.agir(s, acao)
              this.passo()
              return
            }
          }
        }),
      atraso,
    )
  }

  tempoEsgotado() {
    if (this.status !== 'jogando') return
    const p = this.partida
    const auto = p.acaoAutomatica()
    if (!auto) return
    p.evento('tempoEsgotado', { assento: auto.assento })
    p.agir(auto.assento, auto.acao)
    this.passo()
  }

  finalizar() {
    this.limparRelogios()
    this.status = 'encerrada'
    this.encerradaEm = Date.now()
    const vencedorTime = this.partida.vencedor
    this.resultado = { vencedorTime, placar: [...this.partida.placar], premio: 0 }
    if (this.aoTerminar) {
      try {
        this.aoTerminar(this, vencedorTime)
      } catch (erro) {
        console.error(`[mesa ${this.id}] erro ao encerrar`, erro)
        if (this.aoFalhar) this.aoFalhar(this, erro)
      }
    }
    avisos.mesa(this)
    avisos.lobby()
  }

  cancelar(motivo) {
    this.limparRelogios()
    if (!this.ativa) return
    this.status = 'cancelada'
    this.encerradaEm = Date.now()
    this.prazo = null
    this.resultado = { cancelada: true, motivo }
    avisos.mesa(this)
    avisos.lobby()
  }

  frase(usuarioId, indice) {
    const assento = this.assentoDe(usuarioId)
    if (assento < 0) throw new ErroJogo('Só quem está na mesa pode falar.')
    if (!Number.isInteger(indice) || indice < 0 || indice >= FRASES.length) throw new ErroJogo('Frase inválida.')
    const agora = Date.now()
    if (agora - (this.ultimaFrase.get(usuarioId) || 0) < 1500) return
    this.ultimaFrase.set(usuarioId, agora)
    this.seqFrase += 1
    this.frases.push({ id: this.seqFrase, assento, texto: FRASES[indice], em: agora })
    if (this.frases.length > 8) this.frases.shift()
    avisos.mesa(this)
  }

  /** Parceiro (2x2) de quem enviou um sinal, ou null. */
  parceiroDe(usuarioId) {
    const assento = this.assentoDe(usuarioId)
    if (assento < 0 || this.jogadores !== 4) return null
    return this.assentos[(assento + 2) % 4]
  }

  visao(usuarioId = null) {
    const meu = this.assentoDe(usuarioId)
    return {
      id: this.id,
      tipo: this.tipo,
      variante: this.variante,
      jogadores: this.jogadores,
      aposta: this.aposta,
      taxa: this.taxa,
      premio: this.premioPorVencedor(),
      privada: this.privada,
      status: this.status,
      criadorId: this.criadorId,
      torneio: this.torneio,
      assentos: this.assentos.map((a, i) =>
        a
          ? {
              assento: i,
              apelido: a.apelido,
              bot: Boolean(a.bot),
              conectado: a.bot ? true : avisos.conectado(a.usuarioId),
              time: i % 2,
              eu: !a.bot && a.usuarioId === usuarioId,
            }
          : null,
      ),
      meuAssento: meu >= 0 ? meu : null,
      jogo: this.partida ? this.partida.visao(meu >= 0 ? meu : null) : null,
      prazo: this.prazo,
      agora: Date.now(),
      frases: this.frases,
      resultado: this.resultado,
    }
  }

  resumo() {
    return {
      id: this.id,
      tipo: this.tipo,
      variante: this.variante,
      jogadores: this.jogadores,
      aposta: this.aposta,
      premio: this.premioPorVencedor(),
      ocupados: this.ocupados,
      status: this.status,
      nomes: this.assentos.map((a) => (a ? a.apelido : null)),
      placar: this.partida ? [...this.partida.placar] : null,
      criadaEm: this.criadaEm,
    }
  }
}
