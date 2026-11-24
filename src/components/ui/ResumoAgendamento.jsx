import { AnimatePresence, motion } from 'framer-motion'
import { User, Car, Sparkles, CalendarDays, Clock, Info } from 'lucide-react'
import { buscarServico, buscarVeiculo, calcularPreco } from '../../lib/precos'
import { formatarPreco, formatarDataExtenso } from '../../lib/formatadores'

const VAZIO = '—'

function Linha({ Icone, rotulo, valor, preenchido }) {
  return (
    <li className="flex items-start gap-3.5 py-3.5">
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-300
          ${preenchido ? 'bg-brand-500/18 text-brand-300' : 'bg-white/5 text-ink-600'}`}
      >
        <Icone className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.7rem] uppercase tracking-[0.14em] text-ink-500">{rotulo}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={valor}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className={`mt-0.5 break-words font-medium ${preenchido ? 'text-white' : 'text-ink-600'}`}
          >
            {valor}
          </motion.p>
        </AnimatePresence>
      </div>
    </li>
  )
}

/**
 * Prévia em tempo real do agendamento: tudo que o cliente preencheu,
 * mais o valor estimado. É o mesmo conteúdo que vai na mensagem do WhatsApp.
 */
export default function ResumoAgendamento({ form, children }) {
  const servico = buscarServico(form.servico)
  const veiculo = buscarVeiculo(form.tipoVeiculo)
  const preco = calcularPreco(form.servico, form.tipoVeiculo)
  const nome = `${form.nome} ${form.sobrenome}`.trim()

  const veiculoTexto = [veiculo?.nome, form.modelo.trim()].filter(Boolean).join(' — ')
  const precoDefinido = preco != null
  const precoSobConsulta = servico && servico.preco == null

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-ink-850 to-ink-900 shadow-card">
      <header className="border-b border-white/8 bg-white/[0.03] px-6 py-5">
        <h3 className="font-display text-lg font-bold uppercase italic tracking-wide text-white">
          Resumo do pedido
        </h3>
        <p className="mt-1 text-xs text-ink-400">Atualiza conforme você preenche.</p>
      </header>

      <ul className="divide-y divide-white/5 px-6">
        <Linha Icone={User} rotulo="Cliente" valor={nome || VAZIO} preenchido={!!nome} />
        <Linha Icone={Car} rotulo="Veículo" valor={veiculoTexto || VAZIO} preenchido={!!veiculoTexto} />
        <Linha Icone={Sparkles} rotulo="Serviço" valor={servico?.nome ?? VAZIO} preenchido={!!servico} />
        <Linha
          Icone={CalendarDays}
          rotulo="Data"
          valor={form.data ? formatarDataExtenso(form.data) : VAZIO}
          preenchido={!!form.data}
        />
        <Linha Icone={Clock} rotulo="Horário" valor={form.horario || VAZIO} preenchido={!!form.horario} />
      </ul>

      {/* Valor estimado */}
      <div className="mx-6 my-5 rounded-2xl border border-brand-500/25 bg-linear-to-br from-brand-500/12 to-royal-600/10 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.16em] text-brand-300/80">Valor estimado</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={String(preco) + String(precoSobConsulta)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="mt-1 font-display text-3xl font-extrabold text-white sm:text-4xl"
              >
                {precoDefinido ? formatarPreco(preco) : precoSobConsulta ? 'Sob consulta' : VAZIO}
              </motion.p>
            </AnimatePresence>
          </div>
          {servico?.duracao && (
            <span className="whitespace-nowrap rounded-full bg-ink-950/50 px-3 py-1.5 text-xs text-ink-300">
              {servico.duracao}
            </span>
          )}
        </div>

        {(precoDefinido || precoSobConsulta) && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-400">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {precoSobConsulta
              ? 'Combinamos o valor pelo WhatsApp, de acordo com o que o seu veículo precisa.'
              : 'Estimativa com base no porte do veículo. O valor final é confirmado na conversa, após vermos o estado do carro.'}
          </p>
        )}
      </div>

      {children && <div className="border-t border-white/8 p-6 pt-5">{children}</div>}
    </div>
  )
}
