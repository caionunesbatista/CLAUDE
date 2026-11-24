import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, AlertTriangle, Trash2, CalendarCheck2, RotateCcw } from 'lucide-react'
import Secao, { TituloSecao } from '../ui/Secao'
import Reveal from '../ui/Reveal'
import { CampoTexto, CampoSelecao, CampoTextoLongo } from '../ui/Campo'
import SeletorHorario from '../ui/SeletorHorario'
import ResumoAgendamento from '../ui/ResumoAgendamento'
import { servicos, tiposVeiculo } from '../../config/site'
import { dataMinima, dataMaxima } from '../../lib/agenda'
import { formatarPreco, formatarDataCurta } from '../../lib/formatadores'
import { buscarServico, precoAPartirDe } from '../../lib/precos'
import { whatsappConfigurado, montarLinkWhatsapp } from '../../lib/whatsapp'
import { useAgendamento, CAMPOS_OBRIGATORIOS } from '../../store/useAgendamento'

const OPCOES_VEICULO = tiposVeiculo.map((v) => ({ valor: v.id, texto: v.nome }))
/* O "a partir de" aqui tem que bater com o da tabela de serviços: parte do
 * menor porte com preço de tabela, não do preço base.                      */
const OPCOES_SERVICO = servicos.map((s) => {
  const base = precoAPartirDe(s)
  return {
    valor: s.id,
    texto: base == null ? `${s.nome} — sob consulta` : `${s.nome} — a partir de ${formatarPreco(base)}`,
  }
})

/** Aviso que aparece só enquanto o número do WhatsApp não foi configurado. */
function AvisoConfiguracao() {
  return (
    <Reveal className="mb-10">
      <div className="flex items-start gap-3.5 rounded-2xl border border-amber-400/30 bg-amber-400/8 p-5 sm:p-6">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden="true" />
        <div className="text-sm leading-relaxed text-amber-100/90">
          <p className="font-semibold text-amber-200">Falta configurar o WhatsApp</p>
          <p className="mt-1.5">
            Abra o arquivo{' '}
            <code className="rounded bg-ink-950/50 px-1.5 py-0.5 text-amber-200">src/config/site.js</code>{' '}
            e troque o campo <code className="rounded bg-ink-950/50 px-1.5 py-0.5 text-amber-200">whatsapp</code>{' '}
            pelo número real do proprietário, no formato{' '}
            <code className="rounded bg-ink-950/50 px-1.5 py-0.5 text-amber-200">55 + DDD + número</code>{' '}
            (apenas dígitos). Enquanto isso, o botão abaixo abre uma conversa com um número de exemplo.
          </p>
        </div>
      </div>
    </Reveal>
  )
}

/** Agendamentos feitos nesta sessão — demonstração visual da agenda ocupada. */
function MinhasReservas() {
  const reservas = useAgendamento((s) => s.reservas)
  const remover = useAgendamento((s) => s.removerReserva)
  if (reservas.length === 0) return null

  const ordenadas = [...reservas].sort((a, b) =>
    `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`),
  )

  return (
    <Reveal className="mt-14">
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2.5 font-display text-lg font-bold text-white">
            <CalendarCheck2 className="size-5 text-brand-400" aria-hidden="true" />
            Horários que você reservou
          </h3>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-ink-400">
            Demonstração local — guardado só neste navegador
          </span>
        </div>

        <ul className="mt-5 flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {ordenadas.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-white/8 bg-ink-950/50 px-4 py-3.5"
              >
                <span className="rounded-lg bg-brand-500/15 px-2.5 py-1 font-display text-sm font-bold text-brand-300">
                  {formatarDataCurta(r.data)} · {r.horario}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-300">
                  {r.nome} — {buscarServico(r.servico)?.nome} · {r.modelo}
                </span>
                <span className="text-sm font-semibold text-white">{formatarPreco(r.preco)}</span>
                <button
                  type="button"
                  onClick={() => remover(r.id)}
                  aria-label={`Liberar o horário de ${formatarDataCurta(r.data)} às ${r.horario}`}
                  className="rounded-full p-2 text-ink-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-ink-500">
          Este site não tem banco de dados: a lista existe para você ver como os horários ficam
          bloqueados na tela. A reserva só vale de verdade depois que a mensagem for enviada e
          confirmada pelo WhatsApp.
        </p>
      </div>
    </Reveal>
  )
}

export default function Agendamento() {
  const form = useAgendamento((s) => s.form)
  const erros = useAgendamento((s) => s.erros)
  const tocados = useAgendamento((s) => s.tocados)
  const setCampo = useAgendamento((s) => s.setCampo)
  const tocar = useAgendamento((s) => s.tocar)
  const confirmar = useAgendamento((s) => s.confirmar)
  const limpar = useAgendamento((s) => s.limparFormulario)
  const ancora = useRef(null)

  /* Só mostramos o erro depois que o cliente interagiu com o campo. */
  const erroDe = (campo) => (tocados[campo] ? erros[campo] : undefined)

  const preenchidos = CAMPOS_OBRIGATORIOS.filter((c) => String(form[c] ?? '').trim() !== '').length
  const total = CAMPOS_OBRIGATORIOS.length
  const progresso = Math.round((preenchidos / total) * 100)
  const completo = preenchidos === total && Object.keys(erros).length === 0

  /* Enter dentro do formulário aciona o mesmo link do botão. */
  const aoEnviar = (e) => {
    e.preventDefault()
    ancora.current?.click()
  }

  const campo = (nome) => ({
    value: form[nome],
    onChange: (e) => setCampo(nome, e.target.value),
    onBlur: () => tocar(nome),
    erro: erroDe(nome),
  })

  return (
    <Secao id="agendamento" className="scroll-mt-24">
      <TituloSecao
        etiqueta="Agendamento"
        titulo="Marque seu horário"
        texto="Preencha os dados e confira o resumo. Ao enviar, a conversa abre no WhatsApp com a mensagem já escrita."
      />

      <div className="mt-14">
        {!whatsappConfigurado() && <AvisoConfiguracao />}

        <form onSubmit={aoEnviar} noValidate className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ───────────────── FORMULÁRIO ───────────────── */}
          <Reveal className="lg:col-span-7">
            <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-6 sm:p-8">
              {/* Progresso */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium uppercase tracking-[0.14em] text-ink-400">
                    Passo {Math.min(preenchidos + (completo ? 0 : 1), total)} de {total}
                  </span>
                  <span className="font-semibold text-brand-300">{progresso}%</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-brand-500 to-royal-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progresso}%` }}
                    transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                  />
                </div>
              </div>

              <fieldset className="border-0 p-0">
                <legend className="mb-5 font-display text-sm font-bold uppercase tracking-[0.16em] text-brand-300">
                  Seus dados
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <CampoTexto
                    rotulo="Nome"
                    placeholder="Ex.: Mariana"
                    autoComplete="given-name"
                    maxLength={40}
                    {...campo('nome')}
                  />
                  <CampoTexto
                    rotulo="Sobrenome"
                    placeholder="Ex.: Oliveira"
                    autoComplete="family-name"
                    maxLength={60}
                    {...campo('sobrenome')}
                  />
                </div>
              </fieldset>

              <hr className="my-8 border-white/8" />

              <fieldset className="border-0 p-0">
                <legend className="mb-5 font-display text-sm font-bold uppercase tracking-[0.16em] text-brand-300">
                  Seu veículo
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <CampoSelecao
                    rotulo="Tipo de veículo"
                    placeholder="Selecione..."
                    opcoes={OPCOES_VEICULO}
                    {...campo('tipoVeiculo')}
                  />
                  <CampoTexto
                    rotulo="Modelo"
                    placeholder="Ex.: Polo, Civic, CB 500"
                    maxLength={40}
                    {...campo('modelo')}
                  />
                </div>
                <CampoSelecao
                  className="mt-5"
                  rotulo="Serviço desejado"
                  placeholder="Selecione..."
                  opcoes={OPCOES_SERVICO}
                  {...campo('servico')}
                />
              </fieldset>

              <hr className="my-8 border-white/8" />

              <fieldset className="border-0 p-0">
                <legend className="mb-5 font-display text-sm font-bold uppercase tracking-[0.16em] text-brand-300">
                  Data e horário
                </legend>
                <CampoTexto
                  type="date"
                  rotulo="Data preferencial"
                  min={dataMinima()}
                  max={dataMaxima()}
                  className="sm:max-w-xs"
                  {...campo('data')}
                />
                <div className="mt-6">
                  <p className="mb-3 text-sm font-medium text-ink-300">
                    Horário <span className="text-brand-400">*</span>
                  </p>
                  <SeletorHorario
                    data={form.data}
                    valor={form.horario}
                    erro={erroDe('horario')}
                    onEscolher={(h) => {
                      setCampo('horario', h)
                      tocar('horario')
                    }}
                  />
                </div>

                <CampoTextoLongo
                  className="mt-7"
                  rotulo="Observações (opcional)"
                  placeholder="Algo que a gente precisa saber? Manchas, pelos de pet, prazo apertado..."
                  maxLength={300}
                  value={form.observacoes}
                  onChange={(e) => setCampo('observacoes', e.target.value)}
                  dica="Esse texto também vai junto na mensagem do WhatsApp."
                />
              </fieldset>
            </div>
          </Reveal>

          {/* ───────────────── RESUMO ───────────────── */}
          <Reveal delay={0.12} className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <ResumoAgendamento form={form}>
                {/* Link de verdade, não window.open: abre em qualquer
                    contexto e ainda permite abrir em nova aba pelo menu. */}
                <motion.a
                  ref={ancora}
                  href={montarLinkWhatsapp(form)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Agendar pelo WhatsApp"
                  onClick={(e) => {
                    if (!confirmar()) e.preventDefault()
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#25D366]
                             font-display text-base font-bold uppercase tracking-wide text-[#04240f]
                             transition-colors duration-200 hover:bg-[#2ee874]"
                >
                  <MessageCircle className="size-5" aria-hidden="true" />
                  Agendar
                </motion.a>

                <p className="mt-3.5 text-center text-xs leading-relaxed text-ink-500">
                  {completo
                    ? 'Tudo pronto! A conversa abre com a mensagem já escrita.'
                    : 'Preencha os campos obrigatórios para liberar o envio.'}
                </p>

                <button
                  type="button"
                  onClick={limpar}
                  className="mx-auto mt-3 flex h-10 items-center gap-2 rounded-full px-4 text-xs text-ink-500
                             transition-colors hover:bg-white/5 hover:text-ink-300"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Limpar formulário
                </button>
              </ResumoAgendamento>
            </div>
          </Reveal>
        </form>

        <MinhasReservas />
      </div>
    </Secao>
  )
}
