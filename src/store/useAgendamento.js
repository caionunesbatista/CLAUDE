import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { diaAberto, dataMinima, dataMaxima, horariosDoDia } from '../lib/agenda.js'
import { calcularPreco } from '../lib/precos.js'
import { montarLinkWhatsapp } from '../lib/whatsapp.js'

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

      /**
       * Abre o WhatsApp com a mensagem pronta e marca o horário como reservado
       * na interface. A janela é aberta de forma síncrona, antes de qualquer
       * `await`, para que o navegador não bloqueie o pop-up.
       */
      enviar: () => {
        if (!get().validarTudo()) {
          set({ toast: { tipo: 'erro', titulo: 'Faltam alguns dados', texto: 'Confira os campos destacados em vermelho.' } })
          return { ok: false }
        }

        const form = { ...get().form }
        const link = montarLinkWhatsapp(form)

        /* Atenção: passar 'noopener' aqui faria o window.open devolver null
         * mesmo quando a aba abre — e aí nunca saberíamos se o navegador
         * bloqueou. Abrimos sem a flag e cortamos a referência em seguida,
         * que tem o mesmo efeito de segurança.                              */
        const janela = window.open(link, '_blank')
        if (janela) janela.opener = null

        set((s) => ({
          enviando: false,
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
          toast: janela
            ? { tipo: 'sucesso', titulo: 'WhatsApp aberto!', texto: 'É só tocar em enviar na conversa para confirmar seu horário.' }
            : { tipo: 'aviso', titulo: 'Libere o pop-up', texto: 'Seu navegador bloqueou a nova aba. Use o botão abaixo para abrir a conversa.', link },
        }))

        return { ok: true, link }
      },

      limparFormulario: () => set({ form: { ...FORM_VAZIO }, erros: {}, tocados: {} }),

      removerReserva: (id) => set((s) => ({ reservas: s.reservas.filter((r) => r.id !== id) })),

      mostrarToast: (toast) => set({ toast }),
      fecharToast: () => set({ toast: null }),
    }),
    {
      name: 'km-lavacar:agenda-demo',
      /* Só as reservas são lembradas entre visitas — o formulário sempre começa limpo. */
      partialize: (s) => ({ reservas: s.reservas }),
      version: 1,
    },
  ),
)
