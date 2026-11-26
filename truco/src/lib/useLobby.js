import { useEffect, useState } from 'react'
import { obterSocket } from './socket.js'

/** Mesas e salas abertas, atualizadas em tempo real. */
export function useLobby() {
  const [lobby, setLobby] = useState(null)
  useEffect(() => {
    const s = obterSocket()
    const entrar = () => s.emit('lobby:entrar')
    s.on('lobby:estado', setLobby)
    s.on('connect', entrar)
    if (s.connected) entrar()
    return () => {
      s.off('lobby:estado', setLobby)
      s.off('connect', entrar)
      s.emit('lobby:sair')
    }
  }, [])
  return lobby
}
