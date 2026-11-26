// Regras e nomes compartilhados entre o servidor e o site.
// Tudo que depende da variante (Paulista ou Mineiro) está centralizado aqui.

/** Ordem de força das cartas comuns, da mais fraca para a mais forte. */
export const VALORES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3']

/** Naipes na ordem de força das manilhas: Ouros < Espadas < Copas < Paus. */
export const NAIPES = ['o', 'e', 'c', 'p']

export const NOME_NAIPE = { o: 'Ouros', e: 'Espadas', c: 'Copas', p: 'Paus' }
export const SIMBOLO_NAIPE = { o: '♦', e: '♠', c: '♥', p: '♣' }
export const NAIPE_VERMELHO = { o: true, c: true, e: false, p: false }
export const NOME_VALOR = {
  4: 'Quatro', 5: 'Cinco', 6: 'Seis', 7: 'Sete', Q: 'Dama', J: 'Valete', K: 'Rei', A: 'Ás', 2: 'Dois', 3: 'Três',
}

/** Manilhas fixas do Truco Mineiro, da mais forte para a mais fraca. */
export const MANILHAS_MINEIRO = ['4p', '7c', 'Ae', '7o']

export const NOME_MANILHA = { p: 'Zap', c: 'Copas', e: 'Espadilha', o: 'Pica-fumo' }

export const VARIANTES = {
  paulista: {
    id: 'paulista',
    nome: 'Truco Paulista',
    curto: 'Paulista',
    // Valor da mão em cada degrau: normal → truco → seis → nove → doze.
    escada: [1, 3, 6, 9, 12],
    pedidos: [null, 'Truco', 'Seis', 'Nove', 'Doze'],
    alvo: 12,
    usaVira: true,
    // Após vaza empatada, quem abriu a vaza empatada abre a próxima.
    liderAposEmpate: 'lider',
    nomeMaoEspecial: 'Mão de onze',
  },
  mineiro: {
    id: 'mineiro',
    nome: 'Truco Mineiro',
    curto: 'Mineiro',
    escada: [2, 4, 6, 10, 12],
    pedidos: [null, 'Truco', 'Seis', 'Dez', 'Doze'],
    alvo: 12,
    usaVira: false,
    // Após vaza empatada, quem jogou a primeira carta do empate abre a próxima.
    liderAposEmpate: 'primeiroEmpate',
    nomeMaoEspecial: 'Mão de dez',
  },
}

export const LISTA_VARIANTES = Object.values(VARIANTES)

/** Placar a partir do qual uma dupla entra na mão especial (onze no Paulista, dez no Mineiro). */
export function placarMaoEspecial(variante) {
  const v = VARIANTES[variante]
  return v.alvo - v.escada[0]
}

/** Valor da mão especial quando a dupla decide jogar (3 no Paulista, 4 no Mineiro). */
export function valorMaoEspecial(variante) {
  return VARIANTES[variante].escada[1]
}

/** Valor da manilha a partir da vira (Truco Paulista). */
export function manilhaDaVira(valorVira) {
  const i = VALORES.indexOf(valorVira)
  if (i < 0) throw new Error('Vira inválida')
  return VALORES[(i + 1) % VALORES.length]
}

/**
 * Força de uma carta na mão atual. Quanto maior, mais forte.
 * Cartas comuns valem 0–9; manilhas valem 10–13.
 */
export function forcaCarta(carta, variante, manilha) {
  if (variante === 'mineiro') {
    const i = MANILHAS_MINEIRO.indexOf(carta.r + carta.s)
    if (i >= 0) return 13 - i
    return VALORES.indexOf(carta.r)
  }
  if (carta.r === manilha) return 10 + NAIPES.indexOf(carta.s)
  return VALORES.indexOf(carta.r)
}

export function ehManilha(carta, variante, manilha) {
  return forcaCarta(carta, variante, manilha) >= 10
}

/** Nome popular da carta quando ela é manilha (Zap, Copas, Espadilha, Pica-fumo). */
export function apelidoCarta(carta, variante, manilha) {
  if (!ehManilha(carta, variante, manilha)) return null
  return NOME_MANILHA[carta.s]
}

export function nomeCarta(carta) {
  return `${NOME_VALOR[carta.r]} de ${NOME_NAIPE[carta.s]}`
}

export const MODOS = {
  2: { n: 2, nome: '1 contra 1', curto: '1x1' },
  4: { n: 4, nome: 'Duplas', curto: '2x2' },
}

/** Divisões de prêmio sugeridas para as salas de duplas, por número de premiados. */
export const DIVISOES_PADRAO = {
  1: [100],
  2: [70, 30],
  3: [60, 30, 10],
  4: [50, 25, 15, 10],
}

/** Quantas posições podem ser premiadas numa sala com `times` duplas/jogadores. */
export function maxPremiados(times) {
  return Math.max(1, Math.min(4, times - 1))
}

/** Valida a lista de percentuais de prêmio. Retorna mensagem de erro ou null. */
export function validarPercentuais(percentuais, times) {
  if (!Array.isArray(percentuais) || percentuais.length < 1) return 'Defina pelo menos uma posição premiada.'
  if (percentuais.length > maxPremiados(times)) {
    return `Com ${times} participantes, no máximo ${maxPremiados(times)} posição(ões) podem ser premiadas.`
  }
  for (const p of percentuais) {
    if (!Number.isInteger(p) || p < 1 || p > 100) return 'Cada percentual precisa ser um número inteiro de 1 a 100.'
  }
  const soma = percentuais.reduce((a, b) => a + b, 0)
  if (soma !== 100) return `A soma dos percentuais precisa ser 100% (está em ${soma}%).`
  for (let i = 1; i < percentuais.length; i++) {
    if (percentuais[i] > percentuais[i - 1]) return 'Uma posição não pode receber mais que a posição acima dela.'
  }
  return null
}

export function nomePosicao(pos) {
  return `${pos}º lugar`
}

/** Formata centavos como Real brasileiro. */
export function formatarReais(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Frases rápidas que todos na mesa veem (sem texto livre: nada de ofensas). */
export const FRASES = [
  'Truco, ladrão!',
  'Boa, parceiro!',
  'Desce!',
  'Segura essa!',
  'Tô fraco...',
  'Que sorte!',
  'Bom jogo!',
  'Vamos nessa!',
]

/** Sinais que só o parceiro vê (como os sinais do truco de mesa). */
export const SINAIS = [
  'Tenho Zap',
  'Tenho Copas',
  'Tenho Espadilha',
  'Tenho Pica-fumo',
  'Tenho Três',
  'Tenho Dois',
  'Tô sem nada',
  'Vai que é tua',
]
