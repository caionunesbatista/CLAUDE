import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { diaAberto, dataMinima, dataMaxima, horariosDoDia } from '../lib/agenda.js'
import { calcularPreco } from '../lib/precos.js'
import { montarLinkWhatsapp } from '../lib/whatsapp.js'

/**
 * Armazenamento tolerante a falhas. Em aba anônima, com dados do site
 * bloqueados ou dentro de um frame restrito, o acesso ao localStorage pode
 * lançar erro — aqui ele apenas não guarda nada, e o site segue funcionando.
 */
const armazenamentoSeguro = {
  getItem: (chave) => {
    try { return localStorage.getItem(chave) } catch { return null }
  },
  setItem: (chave, valor) => {
    try { localStorage.setItem(chave, valor) } catch { /* ignora */ }
  },
  removeItem: (chave) => {
    try { localStorage.removeItem(chave) } catch { /* ignora */ }
  },
}

const FORM_VAZIO = {
  nome: '',
  sobrenome: '',
  tipoVeiculo: '',
  modelo: '',
  servico: '',
  data: '',
  horario: '',
  observacoes: '',
}

/* Mensagens de erro por campo. Cada função devolve `null` quando está tudo ok. */
const REGRAS = {
  nome: (v) => (v.trim().length < 2 ? 'Informe seu nome.' : null),
  sobrenome: (v) => (v.trim().length < 2 ? 'Informe seu sobrenome.' : null),
  tipoVeiculo: (v) => (!v ? 'Escolha o tipo do veículo.' : null),
  modelo: (v) => (v.trim().length < 2 ? 'Informe o modelo (ex.: Polo, Civic, CB 500).' : null),
  servico: (v) => (!v ? 'Escolha o serviço desejado.' : null),
  data: (v) => {
    if (!v) return 'Escolha uma data.'
    if (v < dataMinima()) return 'Essa data já passou.'
    if (v > dataMaxima()) return 'Data muito distante. Fale com a gente pelo WhatsApp.'
    if (!diaAberto(v)) return 'Não abrimos nesse dia. Escolha outra data.'
    if (horariosDoDia(v).length === 0) return 'Não há mais horários nesse dia.'
    return null
  },
  horario: (v) => (!v ? 'Escolha um horário.' : null),
}

export const CAMPOS_OBRIGATORIOS = Object.keys(REGRAS)

export const useAgendamento = create(
  persist(
    (set, get) => ({
      form: { ...FORM_VAZIO },
      erros: {},
      tocados: {},
      enviando: false,
      /* Agendamentos feitos nesta sessão. Simulam uma agenda real para que o
       * visitante veja horários já reservados — não há banco de dados. */
      reservas: [],
      toast: null,

      setCampo: (campo, valor) =>
        set((s) => {
          const form = { ...s.form, [campo]: valor }
          /* Trocar a data invalida o horário escolhido antes. */
          if (campo === 'data') form.horario = ''
          const erros = { ...s.erros }
          if (REGRAS[campo]) {
            const erro = REGRAS[campo](valor)
            if (erro) erros[campo] = erro
            else delete erros[campo]
          }
          if (campo === 'data') delete erros.horario
          return { form, erros }
        }),

      tocar: (campo) =>
        set((s) => {
          const valor = s.form[campo]
          const erro = REGRAS[campo] ? REGRAS[campo](valor) : null
          const erros = { ...s.erros }
          if (erro) erros[campo] = erro
          else delete erros[campo]
          return { tocados: { ...s.tocados, [campo]: true }, erros }
        }),

      /** Valida tudo e marca todos os campos como tocados. Devolve true se ok. */
      validarTudo: () => {
        const { form } = get()
        const erros = {}
        for (const campo of CAMPOS_OBRIGATORIOS) {
          const erro = REGRAS[campo](form[campo])
          if (erro) erros[campo] = erro
        }
        if (!erros.horario && get().estaReservado(form.data, form.horario)) {
          erros.horario = 'Esse horário acabou de ser reservado. Escolha outro.'
        }
        const tocados = Object.fromEntries(CAMPOS_OBRIGATORIOS.map((c) => [c, true]))
        set({ erros, tocados })
        return Object.keys(erros).length === 0
      },

      estaReservado: (data, horario) =>
        get().reservas.some((r) => r.data === data && r.horario === horario),

      horariosReservadosEm: (data) =>
        get().reservas.filter((r) => r.data === data).map((r) => r.horario),

      /** Link do WhatsApp para o estado atual do formulário. */
      linkAtual: () => montarLinkWhatsapp(get().form),

      /**
       * Valida e, se estiver tudo certo, registra o horário e mostra a
       * confirmação. Devolve `true` quando a navegação pode seguir.
       *
       * Quem abre o WhatsApp é um <a href target="_blank"> de verdade, e não
       * window.open: links funcionam em qualquer contexto, inclusive quando a
       * página está dentro de um frame que bloqueia pop-ups abertos por script.
       */
      confirmar: () => {
        if (!get().validarTudo()) {
          set({
            toast: {
              tipo: 'erro',
              titulo: 'Faltam alguns dados',
              texto: 'Confira os campos destacados em vermelho.',
            },
          })
          return false
        }

        const form = { ...get().form }
        set((s) => ({
          reservas: [
            ...s.reservas,
            {
              id: `${form.data}-${form.horario}-${Date.now()}`,
              data: form.data,
              horario: form.horario,
              nome: `${form.nome} ${form.sobrenome}`.trim(),
              servico: form.servico,
              tipoVeiculo: form.tipoVeiculo,
              modelo: form.modelo,
              preco: calcularPreco(form.servico, form.tipoVeiculo),
              criadoEm: new Date().toISOString(),
            },
          ],
          toast: {
            tipo: 'sucesso',
            titulo: 'Pedido montado!',
            texto: 'A conversa do WhatsApp abre em outra aba com a mensagem pronta — é só tocar em enviar. Se não abrir, use o botão abaixo.',
            link: montarLinkWhatsapp(form),
          },
        }))
        return true
      },

      limparFormulario: () => set({ form: { ...FORM_VAZIO }, erros: {}, tocados: {} }),

      removerReserva: (id) => set((s) => ({ reservas: s.reservas.filter((r) => r.id !== id) })),

      mostrarToast: (toast) => set({ toast }),
      fecharToast: () => set({ toast: null }),
    }),
    {
      name: 'km-lavacar:agenda-demo',
      storage: createJSONStorage(() => armazenamentoSeguro),
      /* Só as reservas são lembradas entre visitas — o formulário sempre começa limpo. */
      partialize: (s) => ({ reservas: s.reservas }),
      version: 1,
    },
  ),
)
