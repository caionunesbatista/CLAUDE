// Jogador automático usado SOMENTE nas mesas de treino (sem dinheiro).
// Nunca é colocado em mesas valendo dinheiro nem em salas de duplas.

import { randomInt } from 'node:crypto'

function chance(pct, aleatorio) {
  return aleatorio(100) < pct
}

/** Escolhe a ação do bot no assento indicado, ou null se ele não deve agir agora. */
export function decidirBot(partida, assento, { aleatorio = randomInt, timeTemHumano = false } = {}) {
  const m = partida.mao
  if (!m) return null
  const acoes = partida.acoesDisponiveis(assento)
  const minhas = m.cartas[assento]
  const forcas = minhas.map((c) => partida.forca(c))
  const manilhas = forcas.filter((f) => f >= 10).length
  const fortes = forcas.filter((f) => f >= 8).length // 2, 3 ou manilha
  const meuTime = partida.time(assento)
  const vazasGanhas = m.resultados.filter((r) => r === meuTime).length
  const vazasPerdidas = m.resultados.filter((r) => r === 1 - meuTime).length

  // Decisões de dupla ficam com o humano quando há um humano na dupla.
  if ((acoes.decidirOnze || acoes.responder) && timeTemHumano) return null

  if (acoes.decidirOnze) {
    let fortesDupla = fortes
    if (partida.n === 4) {
      const parceiro = m.cartas[(assento + 2) % 4]
      fortesDupla += parceiro.filter((c) => partida.forca(c) >= 8).length
    }
    const limiar = partida.n === 4 ? 3 : 2
    return { tipo: 'onze', jogar: fortesDupla >= limiar || manilhas >= 1 }
  }

  if (acoes.responder) {
    const confianca = manilhas * 2 + fortes + vazasGanhas * 2 - vazasPerdidas * 2
    if (acoes.aumentar && confianca >= 6 && chance(45, aleatorio)) return { tipo: 'aumentar' }
    if (confianca >= 3) return { tipo: 'aceitar' }
    if (confianca >= 1 && chance(40, aleatorio)) return { tipo: 'aceitar' }
    return { tipo: 'correr' }
  }

  if (acoes.votarFerro) {
    // Sem ver as cartas, o bot topa o escuro metade das vezes.
    return { tipo: 'votoFerro', escuro: chance(50, aleatorio) }
  }

  if (!acoes.jogar) return null

  if (acoes.aumentar) {
    const confianca = manilhas * 2 + fortes + vazasGanhas * 2 - vazasPerdidas
    if (confianca >= 5 && chance(55, aleatorio)) return { tipo: 'aumentar' }
    if (chance(4, aleatorio)) return { tipo: 'aumentar' } // blefe ocasional
  }

  if (partida.maoAsCegas) return { tipo: 'jogar', indice: 0 }

  const ordenadas = [...minhas].sort((a, b) => partida.forca(a) - partida.forca(b))
  const jogadas = m.vazaAtual.jogadas.filter((j) => !j.coberta)
  const maiorAdversario = Math.max(
    -1,
    ...jogadas.filter((j) => partida.time(j.assento) !== meuTime).map((j) => partida.forca(j.carta)),
  )
  const maiorParceiro = Math.max(
    -1,
    ...jogadas.filter((j) => partida.time(j.assento) === meuTime).map((j) => partida.forca(j.carta)),
  )

  if (jogadas.length === 0) {
    // Abrindo a vaza: na primeira, joga a do meio; depois, a mais forte se já ganhou uma.
    if (m.vazas.length === 0 && ordenadas.length === 3) return { tipo: 'jogar', carta: ordenadas[1].id }
    const carta = vazasGanhas > 0 ? ordenadas[ordenadas.length - 1] : ordenadas[0]
    return { tipo: 'jogar', carta: carta.id }
  }
  if (maiorParceiro > maiorAdversario) {
    // Parceiro já está ganhando: descarta a menor (coberta se puder).
    return { tipo: 'jogar', carta: ordenadas[0].id, coberta: acoes.cobrir && chance(30, aleatorio) }
  }
  const vence = ordenadas.find((c) => partida.forca(c) > maiorAdversario)
  if (vence) return { tipo: 'jogar', carta: vence.id }
  return { tipo: 'jogar', carta: ordenadas[0].id, coberta: acoes.cobrir && chance(50, aleatorio) }
}
