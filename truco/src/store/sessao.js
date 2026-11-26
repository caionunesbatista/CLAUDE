// Estado global: quem está logado, saldo e configurações públicas do site.
import { create } from 'zustand'
import { api } from '../lib/api.js'
import { obterSocket, reconectarSocket } from '../lib/socket.js'

export const useSessao = create((set, get) => ({
  carregado: false,
  usuario: null,
  saldo: 0,
  config: null,

  async carregar() {
    const [eu, config] = await Promise.all([
      api.get('/auth/eu').catch(() => ({ usuario: null })),
      api.get('/config').catch(() => null),
    ])
    set({ usuario: eu.usuario, saldo: eu.usuario?.saldo ?? 0, config, carregado: true })
    const s = obterSocket()
    s.off('saldo')
    s.on('saldo', (saldo) => set({ saldo }))
  },

  async recarregarConfig() {
    const config = await api.get('/config').catch(() => get().config)
    set({ config })
  },

  async entrar(login, senha) {
    const { usuario } = await api.post('/auth/entrar', { login, senha })
    set({ usuario, saldo: usuario.saldo })
    reconectarSocket()
    return usuario
  },

  async cadastrar(dados) {
    const { usuario } = await api.post('/auth/cadastro', dados)
    set({ usuario, saldo: usuario.saldo })
    reconectarSocket()
    return usuario
  },

  async sair() {
    await api.post('/auth/sair').catch(() => {})
    set({ usuario: null, saldo: 0 })
    reconectarSocket()
  },

  definirUsuario(usuario) {
    set({ usuario, saldo: usuario?.saldo ?? get().saldo })
  },
}))

// ---------- avisos (toasts) ----------

let seq = 0
export const useAvisos = create((set, get) => ({
  lista: [],
  mostrar(texto, tipo = 'info', duracao = 4200) {
    const id = ++seq
    set({ lista: [...get().lista.slice(-3), { id, texto, tipo }] })
    if (duracao) setTimeout(() => get().fechar(id), duracao)
    return id
  },
  fechar(id) {
    set({ lista: get().lista.filter((a) => a.id !== id) })
  },
}))

export const avisar = {
  info: (t) => useAvisos.getState().mostrar(t, 'info'),
  sucesso: (t) => useAvisos.getState().mostrar(t, 'sucesso'),
  erro: (t) => useAvisos.getState().mostrar(t, 'erro', 6000),
}
