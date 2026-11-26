// Cálculo de prêmios e comissão da casa. Todos os valores em CENTAVOS (inteiros).
// Garantia: soma de todos os prêmios pagos + comissão === pote, sempre, sem sobrar nem faltar centavo.

/** Comissão da casa sobre o pote. `taxa` em porcentagem (ex.: 10 ou 7.5). */
export function comissaoSobre(pote, taxa) {
  const pontosBase = Math.round(Number(taxa) * 100) // 10% → 1000 pontos-base
  return Math.round((pote * pontosBase) / 10000)
}

/**
 * Calcula a divisão do prêmio.
 * @param {object} op
 * @param {number} op.entrada valor que CADA jogador paga, em centavos
 * @param {number} op.jogadoresPorTime 1 (individual) ou 2 (duplas)
 * @param {number} op.times quantidade de duplas/jogadores inscritos
 * @param {number} op.taxa comissão da casa em %
 * @param {number[]} op.percentuais percentual de cada posição premiada (soma 100)
 * @returns {{ pote:number, comissao:number, liquido:number, porPosicao:number[], porJogador:number[] }}
 *   porPosicao: total pago a cada posição; porJogador: quanto cada integrante da posição recebe.
 */
export function calcularPremios({ entrada, jogadoresPorTime, times, taxa, percentuais }) {
  const pote = entrada * jogadoresPorTime * times
  let comissao = comissaoSobre(pote, taxa)
  const liquido = pote - comissao
  const brutoPosicao = percentuais.map((p) => Math.floor((liquido * p) / 100))
  // Centavos que sobram do arredondamento vão para o 1º lugar.
  brutoPosicao[0] += liquido - brutoPosicao.reduce((a, b) => a + b, 0)
  const porJogador = brutoPosicao.map((v) => Math.floor(v / jogadoresPorTime))
  const porPosicao = porJogador.map((v) => v * jogadoresPorTime)
  // O que não dá para dividir igualmente entre os dois da dupla (no máximo 1 centavo por posição) fica com a casa.
  comissao += liquido - porPosicao.reduce((a, b) => a + b, 0)
  return { pote, comissao, liquido: pote - comissao, porPosicao, porJogador }
}

/** Prêmio de uma mesa simples (1x1 ou 2x2): a dupla vencedora leva o pote menos a comissão. */
export function calcularPremioMesa({ aposta, jogadores, taxa }) {
  return calcularPremios({ entrada: aposta, jogadoresPorTime: jogadores / 2, times: 2, taxa, percentuais: [100] })
}
