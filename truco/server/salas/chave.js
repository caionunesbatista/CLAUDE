// Chave (chaveamento) de eliminação simples para qualquer número de duplas.
// Quando o número não é potência de 2, os primeiros cabeças de chave avançam direto (bye).

/** Ordem padrão dos cabeças de chave para uma chave de tamanho `tamanho` (potência de 2). */
export function ordemCabecas(tamanho) {
  let ordem = [1]
  while (ordem.length < tamanho) {
    const proximo = ordem.length * 2
    ordem = ordem.flatMap((s) => [s, proximo + 1 - s])
  }
  return ordem
}

export function proximaPotenciaDe2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

/** Nome da fase a partir de quantas rodadas faltam para a final. */
export function nomeRodada(rodada, totalRodadas) {
  const faltam = totalRodadas - rodada
  if (faltam === 0) return 'Final'
  if (faltam === 1) return 'Semifinal'
  if (faltam === 2) return 'Quartas de final'
  if (faltam === 3) return 'Oitavas de final'
  return `${rodada}ª rodada`
}

/**
 * Gera a chave.
 * @param {number} times quantidade de participantes (>= 2)
 * @param {boolean} comTerceiro se deve haver disputa de 3º lugar (quando há dois semifinalistas perdedores)
 * @returns {{ jogos: Array, totalRodadas: number, idFinal: number, idTerceiro: number|null, semifinais: number[] }}
 *   Cada jogo: { id, rodada, nome, a, b } onde a/b é uma fonte:
 *   { tipo: 'time', indice } | { tipo: 'vencedor', jogo } | { tipo: 'perdedor', jogo }
 */
export function gerarChave(times, comTerceiro = false) {
  if (!Number.isInteger(times) || times < 2) throw new Error('A chave precisa de pelo menos 2 participantes.')
  const tamanho = proximaPotenciaDe2(times)
  const totalRodadas = Math.log2(tamanho)
  const jogos = []
  let posicoes = ordemCabecas(tamanho).map((c) => (c <= times ? { tipo: 'time', indice: c - 1 } : null))
  let rodada = 1
  while (posicoes.length > 1) {
    const seguinte = []
    for (let i = 0; i < posicoes.length; i += 2) {
      const a = posicoes[i]
      const b = posicoes[i + 1]
      if (a && b) {
        const id = jogos.length
        jogos.push({ id, rodada, nome: nomeRodada(rodada, totalRodadas), a, b })
        seguinte.push({ tipo: 'vencedor', jogo: id })
      } else {
        seguinte.push(a || b) // bye: avança direto
      }
    }
    posicoes = seguinte
    rodada += 1
  }
  const idFinal = jogos.length - 1
  const final = jogos[idFinal]
  const semifinais = [final.a, final.b].filter((f) => f.tipo === 'vencedor').map((f) => f.jogo)
  let idTerceiro = null
  if (comTerceiro && semifinais.length === 2) {
    idTerceiro = jogos.length
    jogos.push({
      id: idTerceiro,
      rodada: final.rodada,
      nome: 'Disputa de 3º lugar',
      a: { tipo: 'perdedor', jogo: semifinais[0] },
      b: { tipo: 'perdedor', jogo: semifinais[1] },
    })
  }
  return { jogos, totalRodadas, idFinal, idTerceiro, semifinais }
}

/**
 * Classificação final a partir dos resultados dos jogos.
 * @param {object} chave resultado de gerarChave
 * @param {Map<number,{vencedor:number, perdedor:number}>} resultados índice do participante vencedor/perdedor por jogo
 * @returns {number[]} índices dos participantes do 1º ao último lugar definido (até 4)
 */
export function classificacao(chave, resultados) {
  const final = resultados.get(chave.idFinal)
  if (!final) throw new Error('A final ainda não terminou.')
  const lista = [final.vencedor, final.perdedor]
  if (chave.idTerceiro !== null) {
    const terceiro = resultados.get(chave.idTerceiro)
    if (!terceiro) throw new Error('A disputa de 3º lugar ainda não terminou.')
    lista.push(terceiro.vencedor, terceiro.perdedor)
  } else if (chave.semifinais.length === 1) {
    lista.push(resultados.get(chave.semifinais[0]).perdedor)
  } else if (chave.semifinais.length === 2) {
    // Sem disputa de 3º: os dois semifinalistas perdedores empatam e não entram na lista de posições únicas.
  }
  return lista
}
