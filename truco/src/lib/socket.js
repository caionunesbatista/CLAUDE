// Conexão única de tempo real com o servidor.
import { io } from 'socket.io-client'

let socket = null

export function obterSocket() {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'], withCredentials: true })
  }
  return socket
}

/** Reconecta para o servidor reconhecer quem entrou ou saiu da conta. */
export function reconectarSocket() {
  const s = obterSocket()
  s.disconnect()
  s.connect()
}

/** Envia um evento e aguarda a resposta do servidor (com limite de tempo). */
export function emitir(evento, dados, limiteMs = 8000) {
  const s = obterSocket()
  return new Promise((ok) => {
    const t = setTimeout(() => ok({ erro: 'O servidor demorou para responder. Tente de novo.' }), limiteMs)
    s.emit(evento, dados, (resp) => {
      clearTimeout(t)
      ok(resp || {})
    })
  })
}
