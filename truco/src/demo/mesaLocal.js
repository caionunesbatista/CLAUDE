// Mesa de treino que roda inteira no navegador (sem servidor): mesmo motor de regras e mesmos bots do site.
// Produz o estado no mesmo formato que o servidor envia, para a tela da mesa ser exatamente a mesma.
import { Partida } from '../../server/game/motor.js'
import { decidirBot } from '../../server/game/bot.js'
import { FRASES, REACOES } from '../../shared/regras.js'

const NOMES_BOTS = ['Seu Tião', 'Dona Cida', 'Zé do Zap', 'Juca', 'Neusa', 'Bastião', 'Lurdinha', 'Chicão']
const TEMPO_JOGADA = 30
const ATRASO_MAOS = 2600

let seq = 0
export const mesasLocais = new Map()

export class MesaLocal {
  constructor({ variante, jogadores, apelido, avatar }) {
    seq += 1
    this.id = `treino${seq}`
    this.variante = variante
    this.jogadores = jogadores
    const nomes = [...NOMES_BOTS].sort(() => Math.random() - 0.5)
    this.assentos = Array.from({ length: jogadores }, (_, i) =>
      i === 0 ? { apelido: apelido || 'Você', avatar: avatar || 'coroa', bot: false } : { apelido: nomes[i], avatar: null, bot: true },
    )
    this.status = 'jogando'
    this.partida = new Partida({ variante, jogadores })
    this.prazo = null
    this.frases = []
    this.seqFrase = 0
    this.resultado = null
    this.timer = null
    this.timerBot = null
    this.ouvintes = new Set()
    this.ouvintesReacao = new Set()
    mesasLocais.set(this.id, this)
    this.partida.iniciarMao()
    this.passo()
  }

  avisar() {
    const v = this.visao()
    for (const f of this.ouvintes) f(v)
  }

  limparRelogios() {
    clearTimeout(this.timer)
    clearTimeout(this.timerBot)
  }

  seguro(fn) {
    try {
      fn()
    } catch (erro) {
      console.error('[treino]', erro)
      this.limparRelogios()
      this.status = 'cancelada'
      this.resultado = { cancelada: true, motivo: 'Erro inesperado no treino. Comece outro.' }
      this.avisar()
    }
  }

  passo() {
    this.limparRelogios()
    const p = this.partida
    if (p.fase === 'fim') {
      this.prazo = null
      this.status = 'encerrada'
      this.resultado = { vencedorTime: p.vencedor, placar: [...p.placar], premio: 0 }
      this.avisar()
      return
    }
    if (p.fase === 'fimMao') {
      this.prazo = null
      this.reagirFimDeMao()
      this.timer = setTimeout(() => this.seguro(() => (p.iniciarMao(), this.passo())), ATRASO_MAOS)
      this.avisar()
      return
    }
    const { assentos } = p.aguardando()
    this.prazo = { ate: Date.now() + TEMPO_JOGADA * 1000, total: TEMPO_JOGADA, assentos }
    this.timer = setTimeout(() => this.seguro(() => this.tempoEsgotado()), TEMPO_JOGADA * 1000)
    const bots = assentos.filter((s) => this.assentos[s].bot)
    if (bots.length) {
      const atraso = 750 + Math.floor(Math.random() * 800)
      this.timerBot = setTimeout(
        () =>
          this.seguro(() => {
            for (const s of bots) {
              const timeTemHumano = p.assentosDoTime(p.time(s)).some((x) => !this.assentos[x].bot)
              const acao = decidirBot(p, s, { timeTemHumano })
              if (!acao) continue
              p.agir(s, acao)
              if (acao.tipo === 'aumentar' && Math.random() < 0.5) this.falar(s, 0)
              this.passo()
              return
            }
          }),
        atraso,
      )
    }
    this.avisar()
  }

  /** Um bot comemora ou lamenta de vez em quando, para a mesa ter vida. */
  reagirFimDeMao() {
    const r = this.partida.ultimoResultado
    if (!r || r.vencedorTime === null || Math.random() > 0.3) return
    const bots = this.assentos.map((a, i) => (a.bot ? i : -1)).filter((i) => i >= 0)
    const s = bots[Math.floor(Math.random() * bots.length)]
    const ganhou = this.partida.time(s) === r.vencedorTime
    const opcoes = ganhou ? ['🔥', '😎', '😂', '👏'] : ['😱', '😤', '🙏']
    const emoji = opcoes[Math.floor(Math.random() * opcoes.length)]
    for (const f of this.ouvintesReacao) f({ mesaId: this.id, assento: s, emoji, id: `${Date.now()}-${s}` })
  }

  tempoEsgotado() {
    if (this.status !== 'jogando') return
    const p = this.partida
    const fase = p.fase
    do {
      const auto = p.acaoAutomatica()
      if (!auto) break
      if (fase !== 'votoFerro') p.evento('tempoEsgotado', { assento: auto.assento })
      p.agir(auto.assento, auto.acao)
    } while (fase === 'votoFerro' && p.fase === 'votoFerro')
    this.passo()
  }

  /** Ação do jogador humano (sempre no lugar 0). */
  agir(acao) {
    if (this.status !== 'jogando') return { erro: 'A partida não está em andamento.' }
    try {
      this.partida.agir(0, acao)
    } catch (erro) {
      return { erro: erro.message }
    }
    this.passo()
    return { ok: true }
  }

  falar(assento, indice) {
    if (!Number.isInteger(indice) || indice < 0 || indice >= FRASES.length) return
    this.seqFrase += 1
    this.frases.push({ id: this.seqFrase, assento, texto: FRASES[indice], em: Date.now() })
    if (this.frases.length > 8) this.frases.shift()
  }

  reagir(assento, indice) {
    const emoji = REACOES[indice]
    if (!emoji) return
    for (const f of this.ouvintesReacao) f({ mesaId: this.id, assento, emoji, id: `${Date.now()}-${assento}` })
  }

  encerrar() {
    this.limparRelogios()
    this.status = 'cancelada'
    this.resultado = { cancelada: true, motivo: 'Treino encerrado.' }
    mesasLocais.delete(this.id)
  }

  visao() {
    return {
      id: this.id,
      tipo: 'treino',
      variante: this.variante,
      jogadores: this.jogadores,
      aposta: 0,
      taxa: 0,
      premio: 0,
      privada: true,
      status: this.status,
      torneio: null,
      assentos: this.assentos.map((a, i) => ({ assento: i, apelido: a.apelido, avatar: a.avatar, bot: a.bot, conectado: true, time: i % 2, eu: i === 0 })),
      meuAssento: 0,
      jogo: this.partida.visao(0),
      prazo: this.prazo,
      agora: Date.now(),
      frases: [...this.frases],
      resultado: this.resultado,
      revanche: null,
      revancheAte: null,
    }
  }
}
