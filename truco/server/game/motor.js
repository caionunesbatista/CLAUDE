// Motor do truco: máquina de estados pura, sem rede nem banco de dados.
// O servidor é a única fonte da verdade; cada jogador só recebe a sua visão.

import { randomInt } from 'node:crypto'
import {
  VALORES, NAIPES, VARIANTES, forcaCarta, manilhaDaVira, placarMaoEspecial, valorMaoEspecial,
} from '../../shared/regras.js'

export class ErroJogo extends Error {
  name = 'ErroJogo'
}

/** Embaralha o baralho de 40 cartas (sem 8, 9 e 10) com Fisher–Yates e gerador criptográfico. */
export function novoBaralho(aleatorio = randomInt) {
  const baralho = []
  for (const r of VALORES) for (const s of NAIPES) baralho.push({ r, s, id: r + s })
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1)
    ;[baralho[i], baralho[j]] = [baralho[j], baralho[i]]
  }
  return baralho
}

/**
 * Decide se a mão terminou a partir dos resultados das vazas.
 * Cada resultado é 0, 1 (dupla vencedora) ou 'empate'.
 * Retorna { fim: false } ou { fim: true, vencedor: 0 | 1 | null }.
 */
export function decidirMao(resultados) {
  const [a, b, c] = resultados
  const E = 'empate'
  if (resultados.length < 2) return { fim: false }
  if (resultados.length === 2) {
    if (a !== E && a === b) return { fim: true, vencedor: a }
    if (a === E && b !== E) return { fim: true, vencedor: b }
    if (a !== E && b === E) return { fim: true, vencedor: a }
    return { fim: false }
  }
  if (c !== E) return { fim: true, vencedor: c }
  if (a === E && b === E) return { fim: true, vencedor: null }
  // Primeira e segunda vazas com vencedores diferentes e terceira empatada: vence quem fez a primeira.
  return { fim: true, vencedor: a }
}

export class Partida {
  /**
   * @param {object} op
   * @param {'paulista'|'mineiro'} op.variante
   * @param {2|4} op.jogadores
   * @param {number} [op.carteador] assento de quem dá as cartas na primeira mão
   * @param {(max:number)=>number} [op.aleatorio] gerador de inteiros em [0, max)
   */
  constructor({ variante = 'paulista', jogadores = 4, carteador, aleatorio = randomInt } = {}) {
    if (!VARIANTES[variante]) throw new ErroJogo('Variante desconhecida.')
    if (jogadores !== 2 && jogadores !== 4) throw new ErroJogo('A partida é de 2 ou 4 jogadores.')
    this.variante = variante
    this.regras = VARIANTES[variante]
    this.n = jogadores
    this.aleatorio = aleatorio
    this.placar = [0, 0]
    this.fase = 'aguardando' // aguardando | onze | jogando | resposta | fimMao | fim
    this.maoNum = 0
    this.carteador = carteador ?? aleatorio(jogadores)
    this.mao = null
    this.vencedor = null
    this.ultimoResultado = null
    this.eventos = []
    this.seqEvento = 0
  }

  time(assento) {
    return assento % 2
  }

  assentosDoTime(time) {
    const lista = []
    for (let s = 0; s < this.n; s++) if (this.time(s) === time) lista.push(s)
    return lista
  }

  proximo(assento) {
    return (assento + 1) % this.n
  }

  evento(tipo, dados = {}) {
    this.seqEvento += 1
    this.eventos.push({ id: this.seqEvento, tipo, ...dados })
    if (this.eventos.length > 30) this.eventos.shift()
  }

  forca(carta) {
    return forcaCarta(carta, this.variante, this.mao?.manilha)
  }

  /** Dá as cartas e começa uma nova mão. */
  iniciarMao() {
    if (this.fase === 'fim') throw new ErroJogo('A partida já terminou.')
    if (this.fase !== 'aguardando' && this.fase !== 'fimMao') throw new ErroJogo('A mão atual ainda não terminou.')
    if (this.maoNum > 0) this.carteador = this.proximo(this.carteador)
    this.maoNum += 1

    const baralho = novoBaralho(this.aleatorio)
    const cartas = Array.from({ length: this.n }, () => [])
    const primeiro = this.proximo(this.carteador)
    for (let rodada = 0; rodada < 3; rodada++) {
      for (let k = 0; k < this.n; k++) cartas[(primeiro + k) % this.n].push(baralho.pop())
    }
    let vira = null
    let manilha = null
    if (this.regras.usaVira) {
      vira = baralho.pop()
      manilha = manilhaDaVira(vira.r)
    }

    const limite = placarMaoEspecial(this.variante)
    const noLimite = [this.placar[0] >= limite, this.placar[1] >= limite]
    let especial = null
    let timeEspecial = null
    if (noLimite[0] && noLimite[1]) especial = 'ferro'
    else if (noLimite[0] || noLimite[1]) {
      especial = 'onze'
      timeEspecial = noLimite[0] ? 0 : 1
    }

    this.mao = {
      cartas,
      vira,
      manilha,
      degrau: 0,
      valor: this.regras.escada[0],
      ultimoAumento: null, // dupla que fez o último aumento aceito (não pode aumentar de novo)
      pedido: null, // { porTime, porAssento, paraDegrau }
      vazas: [], // vazas encerradas
      vazaAtual: { lider: primeiro, jogadas: [] },
      vez: primeiro,
      especial,
      timeEspecial,
      resultados: [],
      // Mão de ferro (as duas duplas no limite): a mesa vota se joga normal ou nas escuras.
      votos: especial === 'ferro' ? Array(this.n).fill(null) : null,
      escuro: null,
    }
    this.ultimoResultado = null
    this.fase = especial === 'onze' ? 'onze' : especial === 'ferro' ? 'votoFerro' : 'jogando'
    this.evento('novaMao', { maoNum: this.maoNum, especial, timeEspecial })
  }

  /** Votos necessários para jogar a mão de ferro nas escuras: 3 de 4 nas duplas, os 2 no 1x1. */
  votosParaEscuro() {
    return this.n === 4 ? 3 : 2
  }

  /**
   * Quem precisa agir agora. Sempre traz `assentos` (lista de quem pode agir);
   * também `assento` (vez de jogar) ou `time` (decisão da dupla).
   */
  aguardando() {
    const m = this.mao
    switch (this.fase) {
      case 'jogando':
        return { assento: m.vez, assentos: [m.vez] }
      case 'resposta':
        return { time: 1 - m.pedido.porTime, assentos: this.assentosDoTime(1 - m.pedido.porTime) }
      case 'onze':
        return { time: m.timeEspecial, assentos: this.assentosDoTime(m.timeEspecial) }
      case 'votoFerro':
        return { assentos: m.votos.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0) }
      default:
        return null
    }
  }

  podeAumentar(assento) {
    const m = this.mao
    if (this.fase === 'jogando') {
      return (
        m.vez === assento &&
        m.especial === null &&
        m.ultimoAumento !== this.time(assento) &&
        m.degrau < this.regras.escada.length - 1
      )
    }
    if (this.fase === 'resposta') {
      return this.time(assento) !== m.pedido.porTime && m.pedido.paraDegrau < this.regras.escada.length - 1
    }
    return false
  }

  /** Mão de ferro decidida por votação para ser jogada às cegas. */
  get maoAsCegas() {
    return this.mao?.especial === 'ferro' && this.mao.escuro === true
  }

  podeCobrir(assento) {
    return this.fase === 'jogando' && this.mao.vez === assento && !this.maoAsCegas && this.mao.vazas.length >= 1
  }

  /** Executa a ação de um jogador. Lança ErroJogo se a ação não for permitida. */
  agir(assento, acao) {
    if (!Number.isInteger(assento) || assento < 0 || assento >= this.n) throw new ErroJogo('Assento inválido.')
    if (!acao || typeof acao.tipo !== 'string') throw new ErroJogo('Ação inválida.')
    switch (acao.tipo) {
      case 'jogar':
        return this.jogarCarta(assento, acao)
      case 'aumentar':
        return this.aumentar(assento)
      case 'aceitar':
        return this.responder(assento, true)
      case 'correr':
        return this.responder(assento, false)
      case 'onze':
        return this.decidirOnze(assento, acao.jogar === true)
      case 'votoFerro':
        return this.votarFerro(assento, acao.escuro === true)
      default:
        throw new ErroJogo('Ação desconhecida.')
    }
  }

  votarFerro(assento, escuro) {
    const m = this.mao
    if (this.fase !== 'votoFerro') throw new ErroJogo('Não há votação agora.')
    if (m.votos[assento] !== null) throw new ErroJogo('Você já votou.')
    m.votos[assento] = escuro ? 'escuro' : 'normal'
    this.evento('votoFerro', { assento, escuro })
    const necessarios = this.votosParaEscuro()
    const sim = m.votos.filter((v) => v === 'escuro').length
    const nao = m.votos.filter((v) => v === 'normal').length
    // Decide assim que o resultado não pode mais mudar.
    if (sim >= necessarios) m.escuro = true
    else if (nao > this.n - necessarios) m.escuro = false
    if (m.escuro !== null) {
      this.fase = 'jogando'
      this.evento('ferroDecidido', { escuro: m.escuro, sim, nao })
    }
  }

  decidirOnze(assento, jogar) {
    const m = this.mao
    if (this.fase !== 'onze') throw new ErroJogo('Não há decisão de mão especial agora.')
    if (this.time(assento) !== m.timeEspecial) throw new ErroJogo('Só a dupla que está no limite decide.')
    if (jogar) {
      m.valor = valorMaoEspecial(this.variante)
      this.fase = 'jogando'
      this.evento('onzeJogar', { assento, time: m.timeEspecial, valor: m.valor })
    } else {
      this.evento('onzeCorrer', { assento, time: m.timeEspecial })
      this.encerrarMao(1 - m.timeEspecial, this.regras.escada[0], 'correuOnze')
    }
  }

  aumentar(assento) {
    const m = this.mao
    if (this.fase !== 'jogando' && this.fase !== 'resposta') throw new ErroJogo('Não é possível pedir agora.')
    if (m.especial) throw new ErroJogo('Nesta mão não se pode pedir truco.')
    if (!this.podeAumentar(assento)) throw new ErroJogo('Você não pode aumentar agora.')

    if (this.fase === 'resposta') {
      // Contra-aumento: aceita o pedido atual e já pede o próximo degrau.
      m.degrau = m.pedido.paraDegrau
      m.valor = this.regras.escada[m.degrau]
      m.ultimoAumento = m.pedido.porTime
    }
    const paraDegrau = m.degrau + 1
    m.pedido = { porTime: this.time(assento), porAssento: assento, paraDegrau }
    this.fase = 'resposta'
    this.evento('pedido', {
      assento,
      time: this.time(assento),
      nome: this.regras.pedidos[paraDegrau],
      valor: this.regras.escada[paraDegrau],
    })
  }

  responder(assento, aceitou) {
    const m = this.mao
    if (this.fase !== 'resposta') throw new ErroJogo('Não há pedido para responder.')
    if (this.time(assento) === m.pedido.porTime) throw new ErroJogo('Quem responde é a dupla adversária.')
    const pedido = m.pedido
    if (aceitou) {
      m.degrau = pedido.paraDegrau
      m.valor = this.regras.escada[m.degrau]
      m.ultimoAumento = pedido.porTime
      m.pedido = null
      this.fase = 'jogando'
      this.evento('aceitou', { assento, time: this.time(assento), valor: m.valor })
    } else {
      this.evento('correu', { assento, time: this.time(assento), valor: m.valor })
      m.pedido = null
      // Quem correu entrega o valor que a mão valia antes do último pedido.
      this.encerrarMao(pedido.porTime, m.valor, 'correu')
    }
  }

  jogarCarta(assento, acao) {
    const m = this.mao
    if (this.fase !== 'jogando') {
      throw new ErroJogo(this.fase === 'resposta' ? 'Aguarde a resposta do pedido.' : 'Não é hora de jogar.')
    }
    if (m.vez !== assento) throw new ErroJogo('Não é a sua vez.')
    const mao = m.cartas[assento]
    let indice
    let coberta = false
    if (this.maoAsCegas) {
      // Mão de ferro nas escuras: ninguém vê as próprias cartas; escolhe-se a posição.
      indice = Number.isInteger(acao.indice) ? acao.indice : -1
    } else {
      indice = mao.findIndex((c) => c.id === acao.carta)
      coberta = acao.coberta === true
      if (coberta && !this.podeCobrir(assento)) throw new ErroJogo('Só é possível jogar coberta a partir da 2ª vaza.')
    }
    if (indice < 0 || indice >= mao.length) throw new ErroJogo('Carta inválida.')
    const [carta] = mao.splice(indice, 1)
    m.vazaAtual.jogadas.push({ assento, carta, coberta })
    this.evento('jogada', { assento, carta: coberta ? null : carta, coberta })

    if (m.vazaAtual.jogadas.length < this.n) {
      m.vez = this.proximo(assento)
      return
    }
    this.fecharVaza()
  }

  fecharVaza() {
    const m = this.mao
    const vaza = m.vazaAtual
    const visiveis = vaza.jogadas.filter((j) => !j.coberta)
    let resultado = 'empate'
    let proximoLider = vaza.lider
    let vencedorAssento = null
    if (visiveis.length > 0) {
      const maior = Math.max(...visiveis.map((j) => this.forca(j.carta)))
      const topo = visiveis.filter((j) => this.forca(j.carta) === maior)
      const times = new Set(topo.map((j) => this.time(j.assento)))
      if (times.size === 1) {
        resultado = this.time(topo[0].assento)
        vencedorAssento = topo[0].assento
        proximoLider = topo[0].assento
      } else if (this.regras.liderAposEmpate === 'primeiroEmpate') {
        proximoLider = topo[0].assento
      }
    }
    m.vazas.push({ lider: vaza.lider, jogadas: vaza.jogadas, resultado, vencedorAssento })
    m.resultados.push(resultado)
    this.evento('vaza', { numero: m.vazas.length, resultado, vencedorAssento })

    // A vaza fechada fica em `vazas`; a mesa começa a próxima vazia.
    m.vazaAtual = { lider: proximoLider, jogadas: [] }
    const decisao = decidirMao(m.resultados)
    if (decisao.fim) {
      this.encerrarMao(decisao.vencedor, m.valor, decisao.vencedor === null ? 'empate' : 'vazas')
      return
    }
    m.vez = proximoLider
  }

  encerrarMao(vencedorTime, pontos, motivo) {
    if (vencedorTime !== null) {
      this.placar[vencedorTime] = Math.min(this.regras.alvo, this.placar[vencedorTime] + pontos)
    }
    this.ultimoResultado = {
      maoNum: this.maoNum,
      vencedorTime,
      pontos: vencedorTime === null ? 0 : pontos,
      motivo,
    }
    this.evento('fimMao', { ...this.ultimoResultado, placar: [...this.placar] })
    if (vencedorTime !== null && this.placar[vencedorTime] >= this.regras.alvo) {
      this.fase = 'fim'
      this.vencedor = vencedorTime
      this.evento('fimPartida', { vencedor: vencedorTime, placar: [...this.placar] })
    } else {
      this.fase = 'fimMao'
    }
  }

  /**
   * Encerra a partida dando a vitória a uma dupla (usado em W.O./abandono).
   */
  declararVencedor(time, motivo = 'wo') {
    this.placar[time] = this.regras.alvo
    this.fase = 'fim'
    this.vencedor = time
    this.ultimoResultado = { maoNum: this.maoNum, vencedorTime: time, pontos: 0, motivo }
    this.evento('fimPartida', { vencedor: time, placar: [...this.placar], motivo })
  }

  /** Ação padrão quando o tempo de quem deve agir acaba. */
  acaoAutomatica() {
    const m = this.mao
    switch (this.fase) {
      case 'onze':
        return { assento: this.assentosDoTime(m.timeEspecial)[0], acao: { tipo: 'onze', jogar: false } }
      case 'resposta':
        return { assento: this.assentosDoTime(1 - m.pedido.porTime)[0], acao: { tipo: 'correr' } }
      case 'votoFerro':
        // Quem não votou a tempo vota por jogar normal.
        return { assento: m.votos.indexOf(null), acao: { tipo: 'votoFerro', escuro: false } }
      case 'jogando': {
        const assento = m.vez
        if (this.maoAsCegas) return { assento, acao: { tipo: 'jogar', indice: 0 } }
        const mao = m.cartas[assento]
        let menor = mao[0]
        for (const c of mao) if (this.forca(c) < this.forca(menor)) menor = c
        return { assento, acao: { tipo: 'jogar', carta: menor.id } }
      }
      default:
        return null
    }
  }

  /** O que o jogador do assento pode fazer agora. */
  acoesDisponiveis(assento) {
    const m = this.mao
    const nada = { jogar: false, cobrir: false, aumentar: false, responder: false, decidirOnze: false, votarFerro: false }
    if (!m || assento === null || assento === undefined) return nada
    const meuTime = this.time(assento)
    return {
      jogar: this.fase === 'jogando' && m.vez === assento,
      cobrir: this.podeCobrir(assento),
      aumentar: this.podeAumentar(assento),
      responder: this.fase === 'resposta' && meuTime !== m.pedido.porTime,
      decidirOnze: this.fase === 'onze' && meuTime === m.timeEspecial,
      votarFerro: this.fase === 'votoFerro' && m.votos[assento] === null,
    }
  }

  /** Estado visível para um assento (ou para um espectador, com assento null). */
  visao(assento = null) {
    const m = this.mao
    const ehJogador = assento !== null && assento !== undefined
    const base = {
      variante: this.variante,
      jogadores: this.n,
      placar: [...this.placar],
      alvo: this.regras.alvo,
      maoNum: this.maoNum,
      carteador: this.carteador,
      fase: this.fase,
      vencedor: this.vencedor,
      ultimoResultado: this.ultimoResultado,
      eventos: this.eventos.slice(-12),
    }
    if (!m) return { ...base, mao: null }

    const esconder = (j) => {
      if (!j.coberta) return { assento: j.assento, carta: j.carta, coberta: false }
      return { assento: j.assento, carta: ehJogador && j.assento === assento ? j.carta : null, coberta: true }
    }
    let minhasCartas = null
    let cartasParceiro = null
    if (ehJogador) {
      // Na mão de ferro as cartas ficam viradas durante a votação e, se a mesa escolher, a mão inteira.
      const asCegas = m.especial === 'ferro' && (this.fase === 'votoFerro' || m.escuro === true) && this.fase !== 'fim'
      if (asCegas) {
        minhasCartas = m.cartas[assento].map((_, i) => ({ oculta: true, indice: i }))
      } else {
        minhasCartas = m.cartas[assento].map((c) => ({ ...c }))
      }
      // Na mão de onze/dez a dupla no limite vê as cartas do parceiro.
      if (m.especial === 'onze' && this.n === 4 && this.time(assento) === m.timeEspecial) {
        const parceiro = (assento + 2) % 4
        cartasParceiro = m.cartas[parceiro].map((c) => ({ ...c }))
      }
    }
    const proximoDegrau = this.fase === 'resposta' ? m.pedido.paraDegrau + 1 : m.degrau + 1
    return {
      ...base,
      mao: {
        vira: m.vira,
        manilha: m.manilha,
        valor: m.valor,
        degrau: m.degrau,
        especial: m.especial,
        timeEspecial: m.timeEspecial,
        vez: m.vez,
        pedido: m.pedido
          ? {
              porTime: m.pedido.porTime,
              porAssento: m.pedido.porAssento,
              nome: this.regras.pedidos[m.pedido.paraDegrau],
              valor: this.regras.escada[m.pedido.paraDegrau],
            }
          : null,
        proximoPedido:
          proximoDegrau < this.regras.escada.length
            ? { nome: this.regras.pedidos[proximoDegrau], valor: this.regras.escada[proximoDegrau] }
            : null,
        ultimoAumento: m.ultimoAumento,
        votos: m.votos ? [...m.votos] : null,
        escuro: m.escuro,
        votosParaEscuro: this.votosParaEscuro(),
        vazas: m.vazas.map((v) => ({
          lider: v.lider,
          resultado: v.resultado,
          vencedorAssento: v.vencedorAssento,
          jogadas: v.jogadas.map(esconder),
        })),
        vazaAtual: { lider: m.vazaAtual.lider, jogadas: m.vazaAtual.jogadas.map(esconder) },
        qtdCartas: m.cartas.map((c) => c.length),
        minhasCartas,
        cartasParceiro,
      },
      acoes: this.acoesDisponiveis(ehJogador ? assento : null),
    }
  }
}
