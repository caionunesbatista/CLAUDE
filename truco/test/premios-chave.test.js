import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularPremios, calcularPremioMesa, comissaoSobre } from '../shared/premios.js'
import { validarPercentuais, maxPremiados, DIVISOES_PADRAO } from '../shared/regras.js'
import { gerarChave, ordemCabecas, classificacao } from '../server/salas/chave.js'

test('comissão de 10% sobre o pote', () => {
  assert.equal(comissaoSobre(2000, 10), 200)
  assert.equal(comissaoSobre(333, 10), 33)
  assert.equal(comissaoSobre(1000, 7.5), 75)
  assert.equal(comissaoSobre(1000, 0), 0)
})

test('mesa 1x1 de R$ 10: pote 20, casa 2, vencedor 18', () => {
  const r = calcularPremioMesa({ aposta: 1000, jogadores: 2, taxa: 10 })
  assert.equal(r.pote, 2000)
  assert.equal(r.comissao, 200)
  assert.deepEqual(r.porJogador, [1800])
})

test('mesa 2x2 de R$ 5: cada vencedor recebe 9', () => {
  const r = calcularPremioMesa({ aposta: 500, jogadores: 4, taxa: 10 })
  assert.equal(r.pote, 2000)
  assert.deepEqual(r.porJogador, [900])
  assert.equal(r.porJogador[0] * 2 + r.comissao, r.pote)
})

test('sala de 8 duplas, R$ 10 por jogador, top 3 (60/30/10)', () => {
  const r = calcularPremios({ entrada: 1000, jogadoresPorTime: 2, times: 8, taxa: 10, percentuais: [60, 30, 10] })
  assert.equal(r.pote, 16000)
  assert.equal(r.comissao, 1600)
  assert.deepEqual(r.porPosicao, [8640, 4320, 1440])
  assert.deepEqual(r.porJogador, [4320, 2160, 720])
})

test('nenhum centavo some ou aparece em milhares de combinações', () => {
  for (let entrada = 1; entrada <= 2500; entrada += 37) {
    for (const jogadoresPorTime of [1, 2]) {
      for (const times of [2, 3, 5, 7, 8, 13, 32, 64]) {
        for (const taxa of [0, 5, 7.5, 10, 12.5, 20]) {
          for (let premiados = 1; premiados <= maxPremiados(times); premiados++) {
            const percentuais = DIVISOES_PADRAO[premiados]
            const r = calcularPremios({ entrada, jogadoresPorTime, times, taxa, percentuais })
            const pago = r.porJogador.reduce((a, v) => a + v * jogadoresPorTime, 0)
            assert.equal(pago + r.comissao, r.pote)
            assert.ok(r.comissao >= 0)
            assert.ok(r.porJogador.every((v) => Number.isInteger(v) && v >= 0))
            for (let i = 1; i < r.porJogador.length; i++) assert.ok(r.porJogador[i] <= r.porJogador[i - 1])
          }
        }
      }
    }
  }
})

test('validação dos percentuais de prêmio', () => {
  assert.equal(validarPercentuais([100], 2), null)
  assert.equal(validarPercentuais([70, 30], 3), null)
  assert.match(validarPercentuais([70, 30], 2), /no máximo 1/)
  assert.match(validarPercentuais([60, 30], 5), /100%/)
  assert.match(validarPercentuais([30, 70], 5), /não pode receber mais/)
  assert.match(validarPercentuais([50, 25, 15, 5, 5], 10), /no máximo 4/)
  assert.match(validarPercentuais([99.5, 0.5], 5), /inteiro/)
  assert.match(validarPercentuais([], 5), /pelo menos/)
})

test('ordem dos cabeças de chave', () => {
  assert.deepEqual(ordemCabecas(2), [1, 2])
  assert.deepEqual(ordemCabecas(4), [1, 4, 2, 3])
  assert.deepEqual(ordemCabecas(8), [1, 8, 4, 5, 2, 7, 3, 6])
})

/** Simula a chave inteira: em cada jogo vence o participante de menor índice. */
function simular(chave) {
  const resultados = new Map()
  const resolver = (f) => {
    if (f.tipo === 'time') return f.indice
    const r = resultados.get(f.jogo)
    if (!r) return undefined
    return f.tipo === 'vencedor' ? r.vencedor : r.perdedor
  }
  let jogados = 0
  let progresso = true
  while (progresso) {
    progresso = false
    for (const j of chave.jogos) {
      if (resultados.has(j.id)) continue
      const a = resolver(j.a)
      const b = resolver(j.b)
      if (a === undefined || b === undefined) continue
      assert.notEqual(a, b)
      resultados.set(j.id, { vencedor: Math.min(a, b), perdedor: Math.max(a, b) })
      jogados++
      progresso = true
    }
  }
  assert.equal(jogados, chave.jogos.length, 'todos os jogos precisam ser jogáveis')
  return resultados
}

test('chaves de 2 a 64 participantes: todos jogam, ninguém joga contra si mesmo, n-1 jogos', () => {
  for (let n = 2; n <= 64; n++) {
    for (const comTerceiro of [false, true]) {
      const chave = gerarChave(n, comTerceiro)
      const comDisputa = chave.idTerceiro !== null
      assert.equal(chave.jogos.length, n - 1 + (comDisputa ? 1 : 0))
      assert.equal(comDisputa, comTerceiro && n >= 4)
      const resultados = simular(chave)
      const lista = classificacao(chave, resultados)
      assert.equal(lista[0], 0, 'o mais forte vence')
      assert.equal(new Set(lista).size, lista.length)
      if (comTerceiro && n >= 4) assert.equal(lista.length, 4)
      if (n === 3) assert.equal(lista.length, 3)
      // Cada participante aparece em pelo menos um jogo.
      const aparece = new Set()
      for (const j of chave.jogos) for (const f of [j.a, j.b]) if (f.tipo === 'time') aparece.add(f.indice)
      for (const [, r] of resultados) {
        aparece.add(r.vencedor)
        aparece.add(r.perdedor)
      }
      assert.equal(aparece.size, n)
    }
  }
})

test('chave de 5 duplas: três avançam direto e a final é o último jogo', () => {
  const chave = gerarChave(5, true)
  assert.equal(chave.jogos[0].nome, 'Quartas de final')
  assert.equal(chave.jogos[chave.idFinal].nome, 'Final')
  assert.equal(chave.jogos[chave.idTerceiro].nome, 'Disputa de 3º lugar')
  assert.equal(chave.semifinais.length, 2)
})
