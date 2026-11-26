// Registro em memória das mesas e salas ativas + ganchos de notificação em tempo real.
import crypto from 'node:crypto'

/** @type {Map<string, import('./mesa.js').Mesa>} */
export const mesas = new Map()
/** @type {Map<string, import('./torneios.js').Torneio>} */
export const torneios = new Map()

/** Substituídos pelo módulo de tempo real (Socket.IO) na inicialização. */
export const avisos = {
  mesa: (_mesa) => {},
  torneio: (_torneio) => {},
  lobby: () => {},
  usuario: (_usuarioId, _evento, _dados) => {},
  conectado: (_usuarioId) => true,
}

const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789'

/** Identificador curto e impossível de adivinhar (usado nos links das mesas e salas). */
export function gerarId(tamanho = 10) {
  let s = ''
  for (let i = 0; i < tamanho; i++) s += ALFABETO[crypto.randomInt(ALFABETO.length)]
  return s
}
