import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Partida, decidirMao, novoBaralho, ErroJogo } from '../server/game/motor.js'
import { decidirBot } from '../server/game/bot.js'
import { forcaCarta, manilhaDaVira, VALORES } from '../shared/regras.js'

const c = (id) => ({ r: id.slice(0, -1), s: id.slice(-1), id })

/** Gerador pseudoaleatório determinístico para testes reproduzíveis. */
function semente(seed) {
  let x = seed >>> 0 || 1
  return (max) => {
    x ^= x << 13
    x >>>= 0
    x ^= x >>> 17
    x ^= x << 5
    x >>>= 0
    return x % max
  }
}

/** Cria uma partida e substitui as cartas da primeira mão. */
function partidaCom({ variante = 'paulista', jogadores = 4, cartas, vira = null, placar = [0, 0], carteador = 3 }) {
  const p = new Partida({ variante, jogadores, carteador, aleatorio: semente(7) })
  p.placar = [...placar]
  p.iniciarMao()
  p.mao.cartas = cartas.map((lista) => lista.map(c))
  if (vira) {
    p.mao.vira = c(vira)
    p.mao.manilha = manilhaDaVira(p.mao.vira.r)
  }
  return p
}

test('baralho tem 40 cartas únicas sem 8, 9 e 10', () => {
  const b = novoBaralho()
  assert.equal(b.length, 40)
  assert.equal(new Set(b.map((x) => x.id)).size, 40)
  assert.ok(b.every((x) => VALORES.includes(x.r)))
})

test('decidirMao cobre todas as combinações de vazas', () => {
  const E = 'empate'
  assert.deepEqual(decidirMao([0]), { fim: false })
  assert.deepEqual(decidirMao([0, 0]), { fim: true, vencedor: 0 })
  assert.deepEqual(decidirMao([1, 1]), { fim: true, vencedor: 1 })
  assert.deepEqual(decidirMao([0, 1]), { fim: false })
  assert.deepEqual(decidirMao([E, 1]), { fim: true, vencedor: 1 })
  assert.deepEqual(decidirMao([0, E]), { fim: true, vencedor: 0 })
  assert.deepEqual(decidirMao([E, E]), { fim: false })
  assert.deepEqual(decidirMao([0, 1, 1]), { fim: true, vencedor: 1 })
  assert.deepEqual(decidirMao([0, 1, 0]), { fim: true, vencedor: 0 })
  assert.deepEqual(decidirMao([1, 0, E]), { fim: true, vencedor: 1 })
  assert.deepEqual(decidirMao([E, E, 0]), { fim: true, vencedor: 0 })
  assert.deepEqual(decidirMao([E, E, E]), { fim: true, vencedor: null })
})

test('manilhas do Paulista seguem a vira e a ordem Paus > Copas > Espadas > Ouros', () => {
  assert.equal(manilhaDaVira('3'), '4')
  assert.equal(manilhaDaVira('7'), 'Q')
  assert.equal(manilhaDaVira('J'), 'K')
  const m = '4'
  const f = (id) => forcaCarta(c(id), 'paulista', m)
  assert.ok(f('4p') > f('4c'))
  assert.ok(f('4c') > f('4e'))
  assert.ok(f('4e') > f('4o'))
  assert.ok(f('4o') > f('3p'))
  assert.equal(f('3p'), f('3o'))
  assert.ok(f('3o') > f('2o'))
  assert.ok(f('Ko') > f('Jo'))
  assert.ok(f('Jo') > f('Qo'))
  assert.ok(f('Qo') > f('7o'))
})

test('manilhas fixas do Mineiro: Zap > Copas > Espadilha > Pica-fumo > 3', () => {
  const f = (id) => forcaCarta(c(id), 'mineiro', null)
  assert.ok(f('4p') > f('7c'))
  assert.ok(f('7c') > f('Ae'))
  assert.ok(f('Ae') > f('7o'))
  assert.ok(f('7o') > f('3p'))
  assert.ok(f('Ao') < f('2o'))
  assert.equal(f('7e'), f('7p'))
  assert.ok(f('4o') < f('5o'))
})

test('primeira mão: quem está à direita do carteador começa', () => {
  const p = new Partida({ variante: 'paulista', jogadores: 4, carteador: 2, aleatorio: semente(1) })
  p.iniciarMao()
  assert.equal(p.mao.vez, 3)
  assert.equal(p.mao.cartas.every((m) => m.length === 3), true)
  const todas = p.mao.cartas.flat().map((x) => x.id).concat(p.mao.vira.id)
  assert.equal(new Set(todas).size, 13)
})

test('parceiros empatando no topo: a dupla vence a vaza (não é empate)', () => {
  // carteador 3 → começa o assento 0. Vira 7 → manilha Q.
  const p = partidaCom({ cartas: [['3o', '4o', '5o'], ['2o', '4c', '5c'], ['3c', '4e', '5e'], ['Ko', '4p', '5p']], vira: '7o' })
  p.agir(0, { tipo: 'jogar', carta: '3o' })
  p.agir(1, { tipo: 'jogar', carta: '2o' })
  p.agir(2, { tipo: 'jogar', carta: '3c' })
  p.agir(3, { tipo: 'jogar', carta: 'Ko' })
  assert.equal(p.mao.vazas[0].resultado, 0)
  assert.equal(p.mao.vez, 0, 'quem jogou primeiro a carta vencedora abre a próxima')
})

test('empate entre adversários; no Paulista quem abriu a vaza empatada abre a próxima', () => {
  const p = partidaCom({ cartas: [['5o', '4o', '6o'], ['3o', '4c', '6c'], ['3c', '4e', '6e'], ['Ko', '4p', '6p']], vira: '7o' })
  p.agir(0, { tipo: 'jogar', carta: '5o' })
  p.agir(1, { tipo: 'jogar', carta: '3o' })
  p.agir(2, { tipo: 'jogar', carta: '3c' })
  p.agir(3, { tipo: 'jogar', carta: 'Ko' })
  assert.equal(p.mao.vazas[0].resultado, 'empate')
  assert.equal(p.mao.vez, 0)
  // Quem vencer a segunda vaza leva a mão.
  p.agir(0, { tipo: 'jogar', carta: '4o' })
  p.agir(1, { tipo: 'jogar', carta: '6c' })
  p.agir(2, { tipo: 'jogar', carta: '4e' })
  p.agir(3, { tipo: 'jogar', carta: '4p' })
  assert.equal(p.fase, 'fimMao')
  assert.deepEqual(p.placar, [0, 1])
})

test('empate no Mineiro: quem jogou a primeira carta do empate abre a próxima', () => {
  const p = partidaCom({
    variante: 'mineiro',
    cartas: [['5o', '6o', '6e'], ['3o', '5c', '6c'], ['3c', '5e', 'Kc'], ['Ko', '5p', 'Kp']],
  })
  p.agir(0, { tipo: 'jogar', carta: '5o' })
  p.agir(1, { tipo: 'jogar', carta: '3o' })
  p.agir(2, { tipo: 'jogar', carta: '3c' })
  p.agir(3, { tipo: 'jogar', carta: 'Ko' })
  assert.equal(p.mao.vazas[0].resultado, 'empate')
  assert.equal(p.mao.vez, 1)
})

test('três vazas empatadas: ninguém pontua', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, cartas: [['3o', '2o', 'Ao'], ['3c', '2c', 'Ac']], vira: '7o' })
  for (const [a, b] of [['3o', '3c'], ['2o', '2c'], ['Ao', 'Ac']]) {
    p.agir(p.mao.vez, { tipo: 'jogar', carta: p.mao.vez === 0 ? a : b })
    p.agir(p.mao.vez, { tipo: 'jogar', carta: p.mao.vez === 0 ? a : b })
  }
  assert.equal(p.fase, 'fimMao')
  assert.deepEqual(p.placar, [0, 0])
  assert.equal(p.ultimoResultado.motivo, 'empate')
})

test('truco aceito vale 3; correr do truco entrega 1 no Paulista', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  assert.throws(() => p.agir(1, { tipo: 'aumentar' }), ErroJogo, 'só pede na sua vez')
  p.agir(0, { tipo: 'aumentar' })
  assert.equal(p.fase, 'resposta')
  assert.throws(() => p.agir(0, { tipo: 'aceitar' }), ErroJogo)
  assert.throws(() => p.agir(0, { tipo: 'jogar', carta: '3o' }), ErroJogo)
  p.agir(1, { tipo: 'correr' })
  assert.deepEqual(p.placar, [1, 0])
  assert.equal(p.ultimoResultado.motivo, 'correu')
})

test('escada completa: truco, seis, nove, doze e quem correu entrega o valor anterior', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  p.agir(0, { tipo: 'aumentar' }) // truco (3)
  p.agir(1, { tipo: 'aumentar' }) // seis: aceita o truco e pede 6
  assert.equal(p.mao.valor, 3)
  assert.throws(() => p.agir(1, { tipo: 'aumentar' }), ErroJogo, 'mesma dupla não aumenta de novo')
  p.agir(0, { tipo: 'aumentar' }) // nove
  assert.equal(p.mao.valor, 6)
  p.agir(1, { tipo: 'correr' })
  assert.deepEqual(p.placar, [6, 0])
})

test('após aceitar, só a outra dupla pode aumentar e apenas na sua vez', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  p.agir(0, { tipo: 'aumentar' })
  p.agir(1, { tipo: 'aceitar' })
  assert.equal(p.mao.valor, 3)
  assert.equal(p.fase, 'jogando')
  assert.equal(p.mao.vez, 0, 'quem pediu ainda precisa jogar')
  assert.throws(() => p.agir(0, { tipo: 'aumentar' }), ErroJogo)
  p.agir(0, { tipo: 'jogar', carta: '3o' })
  p.agir(1, { tipo: 'aumentar' }) // pede seis na sua vez
  assert.equal(p.fase, 'resposta')
  p.agir(0, { tipo: 'aceitar' })
  assert.equal(p.mao.valor, 6)
  p.agir(1, { tipo: 'jogar', carta: '4c' })
  p.agir(0, { tipo: 'jogar', carta: '2o' })
  p.agir(1, { tipo: 'jogar', carta: '5c' })
  assert.deepEqual(p.placar, [6, 0])
})

test('doze é o último degrau', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  p.agir(0, { tipo: 'aumentar' })
  p.agir(1, { tipo: 'aumentar' })
  p.agir(0, { tipo: 'aumentar' })
  p.agir(1, { tipo: 'aumentar' }) // doze
  assert.equal(p.mao.pedido.paraDegrau, 4)
  assert.throws(() => p.agir(0, { tipo: 'aumentar' }), ErroJogo)
  p.agir(0, { tipo: 'aceitar' })
  assert.equal(p.mao.valor, 12)
})

test('carta coberta: proibida na 1ª vaza e nunca vence', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, cartas: [['3o', '4p', 'Ao'], ['4c', '5c', '6c']], vira: '3c' })
  assert.throws(() => p.agir(0, { tipo: 'jogar', carta: '3o', coberta: true }), ErroJogo)
  p.agir(0, { tipo: 'jogar', carta: '3o' })
  p.agir(1, { tipo: 'jogar', carta: '4c' }) // manilha de copas vence
  assert.equal(p.mao.vez, 1)
  p.agir(1, { tipo: 'jogar', carta: '5c' })
  p.agir(0, { tipo: 'jogar', carta: '4p', coberta: true }) // zap coberto não vale nada
  assert.equal(p.fase, 'fimMao')
  assert.deepEqual(p.placar, [0, 1])
  // A carta coberta não aparece para o adversário.
  const visaoAdv = JSON.stringify(p.visao(1))
  assert.ok(!visaoAdv.includes('"4p"'))
})

test('mão de onze: dupla no limite vê as cartas do parceiro e decide; sem truco', () => {
  const p = partidaCom({
    placar: [11, 5],
    cartas: [['3o', '4o', '5o'], ['2o', '4c', '5c'], ['3c', '4e', '5e'], ['Ko', '4p', '5p']],
    vira: '7o',
  })
  assert.equal(p.fase, 'onze')
  const v0 = p.visao(0)
  assert.deepEqual(v0.mao.cartasParceiro.map((x) => x.id), ['3c', '4e', '5e'])
  assert.equal(p.visao(1).mao.cartasParceiro, null)
  assert.throws(() => p.agir(1, { tipo: 'onze', jogar: true }), ErroJogo)
  p.agir(2, { tipo: 'onze', jogar: true })
  assert.equal(p.mao.valor, 3)
  assert.throws(() => p.agir(0, { tipo: 'aumentar' }), ErroJogo)
})

test('mão de onze: correr dá 1 ponto aos adversários', () => {
  const p = partidaCom({ placar: [3, 11], cartas: [['3o', '4o', '5o'], ['2o', '4c', '5c'], ['3c', '4e', '5e'], ['Ko', '4p', '5p']] })
  p.agir(1, { tipo: 'onze', jogar: false })
  assert.deepEqual(p.placar, [4, 11])
})

test('mão de onze: vencer fecha a partida, perder dá 3 aos adversários', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, placar: [11, 0], cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  p.agir(0, { tipo: 'onze', jogar: true })
  p.agir(0, { tipo: 'jogar', carta: '3o' })
  p.agir(1, { tipo: 'jogar', carta: '4c' })
  p.agir(0, { tipo: 'jogar', carta: '2o' })
  p.agir(1, { tipo: 'jogar', carta: '5c' })
  assert.equal(p.fase, 'fim')
  assert.equal(p.vencedor, 0)
  assert.deepEqual(p.placar, [12, 0])

  const q = partidaCom({ jogadores: 2, carteador: 1, placar: [11, 0], cartas: [['4c', '5c', '6c'], ['3o', '2o', 'Ao']], vira: '7o' })
  q.agir(0, { tipo: 'onze', jogar: true })
  q.agir(0, { tipo: 'jogar', carta: '4c' })
  q.agir(1, { tipo: 'jogar', carta: '3o' })
  q.agir(1, { tipo: 'jogar', carta: '2o' })
  q.agir(0, { tipo: 'jogar', carta: '5c' })
  assert.deepEqual(q.placar, [11, 3])
})

test('mão de ferro nas escuras (1x1, os dois votam escuro): cartas ocultas, vale 1 e decide a partida', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, placar: [11, 11], cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  assert.equal(p.mao.especial, 'ferro')
  assert.equal(p.fase, 'votoFerro')
  // Durante a votação ninguém vê as próprias cartas.
  assert.ok(!JSON.stringify(p.visao(0)).includes('"3o"'))
  assert.throws(() => p.agir(0, { tipo: 'jogar', indice: 0 }), ErroJogo)
  p.agir(0, { tipo: 'votoFerro', escuro: true })
  assert.throws(() => p.agir(0, { tipo: 'votoFerro', escuro: false }), ErroJogo, 'não vota duas vezes')
  assert.equal(p.fase, 'votoFerro')
  p.agir(1, { tipo: 'votoFerro', escuro: true })
  assert.equal(p.fase, 'jogando')
  assert.equal(p.mao.escuro, true)
  const v = p.visao(0)
  assert.ok(v.mao.minhasCartas.every((x) => x.oculta))
  assert.ok(!JSON.stringify(v).includes('"3o"'))
  assert.throws(() => p.agir(0, { tipo: 'aumentar' }), ErroJogo)
  p.agir(0, { tipo: 'jogar', indice: 0 })
  p.agir(1, { tipo: 'jogar', indice: 0 })
  p.agir(0, { tipo: 'jogar', indice: 0 })
  p.agir(1, { tipo: 'jogar', indice: 0 })
  assert.equal(p.fase, 'fim')
  assert.deepEqual(p.placar, [12, 11])
})

test('mão de ferro 1x1: basta um voto "normal" para jogar com as cartas à vista', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, placar: [11, 11], cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  p.agir(1, { tipo: 'votoFerro', escuro: false })
  assert.equal(p.fase, 'jogando')
  assert.equal(p.mao.escuro, false)
  const v = p.visao(0)
  assert.deepEqual(v.mao.minhasCartas.map((c) => c.id), ['3o', '2o', 'Ao'])
  assert.throws(() => p.agir(0, { tipo: 'aumentar' }), ErroJogo, 'sem truco no 11 a 11')
  p.agir(0, { tipo: 'jogar', carta: '3o' })
  p.agir(1, { tipo: 'jogar', carta: '4c' })
  p.agir(0, { tipo: 'jogar', carta: '2o' })
  p.agir(1, { tipo: 'jogar', carta: '5c' })
  assert.deepEqual(p.placar, [12, 11])
})

test('mão de ferro em duplas: escuro só com 3 de 4 votos', () => {
  const cartas = [['3o', '4o', '5o'], ['2o', '4c', '5c'], ['3c', '4e', '5e'], ['Ko', '4p', '5p']]
  // 3 votos escuro → nas escuras (decide no 3º voto, sem esperar o 4º).
  const a = partidaCom({ placar: [11, 11], cartas, vira: '7o' })
  a.agir(0, { tipo: 'votoFerro', escuro: true })
  a.agir(1, { tipo: 'votoFerro', escuro: true })
  assert.equal(a.fase, 'votoFerro')
  a.agir(2, { tipo: 'votoFerro', escuro: true })
  assert.equal(a.fase, 'jogando')
  assert.equal(a.mao.escuro, true)

  // 2 a 2 → normal (decide no 2º voto "normal", pois o escuro não alcança mais 3).
  const b = partidaCom({ placar: [11, 11], cartas, vira: '7o' })
  b.agir(0, { tipo: 'votoFerro', escuro: true })
  b.agir(1, { tipo: 'votoFerro', escuro: false })
  b.agir(2, { tipo: 'votoFerro', escuro: true })
  assert.equal(b.fase, 'votoFerro')
  b.agir(3, { tipo: 'votoFerro', escuro: false })
  assert.equal(b.fase, 'jogando')
  assert.equal(b.mao.escuro, false)

  const c = partidaCom({ placar: [11, 11], cartas, vira: '7o' })
  c.agir(3, { tipo: 'votoFerro', escuro: false })
  assert.equal(c.fase, 'votoFerro')
  c.agir(1, { tipo: 'votoFerro', escuro: false })
  assert.equal(c.fase, 'jogando')
  assert.equal(c.mao.escuro, false)
  assert.deepEqual(c.visao(0).mao.votos, [null, 'normal', null, 'normal'])

  // Tempo esgotado na votação: vota "normal".
  const d = partidaCom({ placar: [11, 11], cartas, vira: '7o' })
  const auto = d.acaoAutomatica()
  assert.deepEqual(auto.acao, { tipo: 'votoFerro', escuro: false })
  assert.deepEqual(d.aguardando().assentos, [0, 1, 2, 3])
})

test('Mineiro: mão vale 2, truco 4 e mão de dez vale 4 (correr dá 2)', () => {
  const p = partidaCom({ variante: 'mineiro', jogadores: 2, carteador: 1, cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']] })
  assert.equal(p.mao.valor, 2)
  p.agir(0, { tipo: 'aumentar' })
  p.agir(1, { tipo: 'correr' })
  assert.deepEqual(p.placar, [2, 0])

  const q = partidaCom({ variante: 'mineiro', jogadores: 2, carteador: 1, placar: [10, 4], cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']] })
  assert.equal(q.fase, 'onze')
  q.agir(0, { tipo: 'onze', jogar: false })
  assert.deepEqual(q.placar, [10, 6])

  const r = partidaCom({ variante: 'mineiro', jogadores: 2, carteador: 1, placar: [4, 10], cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']] })
  r.agir(1, { tipo: 'onze', jogar: true })
  assert.equal(r.mao.valor, 4)
})

test('Mineiro: escada 2 → 4 → 6 → 10 → 12', () => {
  const p = partidaCom({ variante: 'mineiro', jogadores: 2, carteador: 1, cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']] })
  p.agir(0, { tipo: 'aumentar' })
  p.agir(1, { tipo: 'aumentar' })
  p.agir(0, { tipo: 'aumentar' })
  assert.equal(p.visao(1).mao.pedido.nome, 'Dez')
  assert.equal(p.visao(1).mao.pedido.valor, 10)
  p.agir(1, { tipo: 'correr' })
  assert.deepEqual(p.placar, [6, 0])
})

test('placar nunca passa do alvo', () => {
  const p = partidaCom({ jogadores: 2, carteador: 1, placar: [9, 0], cartas: [['3o', '2o', 'Ao'], ['4c', '5c', '6c']], vira: '7o' })
  p.agir(0, { tipo: 'aumentar' })
  p.agir(1, { tipo: 'aumentar' })
  p.agir(0, { tipo: 'aceitar' })
  p.agir(0, { tipo: 'jogar', carta: '3o' })
  p.agir(1, { tipo: 'jogar', carta: '4c' })
  p.agir(0, { tipo: 'jogar', carta: '2o' })
  p.agir(1, { tipo: 'jogar', carta: '5c' })
  assert.deepEqual(p.placar, [12, 0])
  assert.equal(p.vencedor, 0)
  assert.throws(() => p.iniciarMao(), ErroJogo)
})

test('a visão de um jogador nunca mostra as cartas na mão dos outros', () => {
  const p = new Partida({ variante: 'paulista', jogadores: 4, aleatorio: semente(99) })
  p.iniciarMao()
  for (let s = 0; s < 4; s++) {
    const json = JSON.stringify(p.visao(s))
    for (let o = 0; o < 4; o++) {
      if (o === s) continue
      for (const carta of p.mao.cartas[o]) assert.ok(!json.includes(`"${carta.id}"`), `assento ${s} viu ${carta.id}`)
    }
  }
  const espectador = JSON.stringify(p.visao(null))
  for (const carta of p.mao.cartas.flat()) assert.ok(!espectador.includes(`"${carta.id}"`))
})

/** Escolhe uma ação aleatória válida para alguém que precisa agir. */
function acaoAleatoria(p, rnd) {
  const candidatos = p.aguardando().assentos
  const assento = candidatos[rnd(candidatos.length)]
  const a = p.acoesDisponiveis(assento)
  const opcoes = []
  if (a.decidirOnze) opcoes.push({ tipo: 'onze', jogar: true }, { tipo: 'onze', jogar: false })
  if (a.votarFerro) opcoes.push({ tipo: 'votoFerro', escuro: true }, { tipo: 'votoFerro', escuro: false })
  if (a.responder) opcoes.push({ tipo: 'aceitar' }, { tipo: 'correr' })
  if (a.aumentar && rnd(4) === 0) opcoes.push({ tipo: 'aumentar' })
  if (a.jogar) {
    const mao = p.mao.cartas[assento]
    if (p.maoAsCegas) opcoes.push({ tipo: 'jogar', indice: rnd(mao.length) })
    else {
      const carta = mao[rnd(mao.length)]
      opcoes.push({ tipo: 'jogar', carta: carta.id, coberta: a.cobrir && rnd(5) === 0 })
    }
  }
  return { assento, acao: opcoes[rnd(opcoes.length)] }
}

for (const variante of ['paulista', 'mineiro']) {
  for (const jogadores of [2, 4]) {
    test(`simulação: 1500 partidas aleatórias de ${variante} com ${jogadores} jogadores terminam sem erro`, () => {
      const rnd = semente(jogadores * 1000 + variante.length)
      for (let jogo = 0; jogo < 1500; jogo++) {
        const p = new Partida({ variante, jogadores, aleatorio: rnd })
        let passos = 0
        while (p.fase !== 'fim') {
          if (p.fase === 'aguardando' || p.fase === 'fimMao') {
            p.iniciarMao()
            const ids = p.mao.cartas.flat().map((x) => x.id)
            assert.equal(new Set(ids).size, ids.length)
            continue
          }
          // Às vezes deixa o tempo acabar e usa a ação automática.
          const { assento, acao } = rnd(10) === 0 ? p.acaoAutomatica() : acaoAleatoria(p, rnd)
          p.agir(assento, acao)
          assert.ok(p.placar[0] <= 12 && p.placar[1] <= 12)
          if (++passos > 5000) assert.fail('partida não terminou')
        }
        assert.equal(Math.max(...p.placar), 12)
        assert.ok(p.vencedor === 0 || p.vencedor === 1)
        if (variante === 'mineiro') assert.ok(p.placar.every((x) => x % 2 === 0), 'mineiro só soma pontos pares')
      }
    })
  }
}

test('bots jogam partidas completas sem ações inválidas', () => {
  const rnd = semente(4242)
  for (const variante of ['paulista', 'mineiro']) {
    for (const jogadores of [2, 4]) {
      for (let jogo = 0; jogo < 200; jogo++) {
        const p = new Partida({ variante, jogadores, aleatorio: rnd })
        let passos = 0
        while (p.fase !== 'fim') {
          if (p.fase === 'fimMao' || p.fase === 'aguardando') {
            p.iniciarMao()
            continue
          }
          const { assentos } = p.aguardando()
          let agiu = false
          for (const s of assentos) {
            const acao = decidirBot(p, s, { aleatorio: rnd })
            if (acao) {
              p.agir(s, acao)
              agiu = true
              break
            }
          }
          assert.ok(agiu, 'bot deveria agir')
          if (++passos > 5000) assert.fail('partida de bots não terminou')
        }
      }
    }
  }
})
