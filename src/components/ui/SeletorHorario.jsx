import { motion, AnimatePresence } from 'framer-motion'
import { CalendarX2, Lock } from 'lucide-react'
import { horariosDoDia } from '../../lib/agenda'
import { useAgendamento } from '../../store/useAgendamento'

/**
 * Grade de horários do dia escolhido.
 * Horários já reservados nesta sessão aparecem marcados como "ocupado" e
 * não podem ser selecionados — é a simulação de agenda pedida, sem back-end.
 */
export default function SeletorHorario({ data, valor, erro, onEscolher }) {
  const reservas = useAgendamento((s) => s.reservas)
  const slots = horariosDoDia(data)
  const ocupados = new Set(reservas.filter((r) => r.data === data).map((r) => r.horario))

  if (!data) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/12 bg-ink-900/40 p-5 text-sm text-ink-500">
        <CalendarX2 className="size-5 shrink-0" aria-hidden="true" />
        Escolha uma data acima para ver os horários livres.
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/8 p-5 text-sm text-amber-200">
        <CalendarX2 className="size-5 shrink-0" aria-hidden="true" />
        Não há horários disponíveis nesta data. Escolha outro dia.
      </div>
    )
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Horários disponíveis"
        aria-invalid={!!erro}
        className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5"
      >
        <AnimatePresence initial={false}>
          {slots.map((hora, i) => {
            const ocupado = ocupados.has(hora)
            const ativo = valor === hora
            return (
              <motion.button
                key={hora}
                type="button"
                role="radio"
                aria-checked={ativo}
                disabled={ocupado}
                onClick={() => onEscolher(hora)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.016, 0.3) }}
                title={ocupado ? 'Horário já reservado' : `Agendar às ${hora}`}
                className={`relative flex h-11 items-center justify-center rounded-xl text-sm font-semibold
                            transition-all duration-200
                  ${
                    ocupado
                      ? 'cursor-not-allowed border border-white/5 bg-ink-900/50 text-ink-600 line-through'
                      : ativo
                        ? 'border border-brand-400 bg-linear-to-r from-brand-500 to-royal-600 text-white shadow-[0_8px_28px_-10px_rgba(0,150,255,0.9)]'
                        : 'border border-white/10 bg-ink-900/70 text-ink-200 hover:border-brand-400/60 hover:bg-ink-850 hover:text-white'
                  }`}
              >
                {hora}
                {ocupado && (
                  <Lock className="absolute -right-1 -top-1 size-3.5 rounded-full bg-ink-800 p-0.5 text-ink-500" aria-hidden="true" />
                )}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {ocupados.size > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-500">
          <Lock className="size-3.5" aria-hidden="true" />
          {ocupados.size === 1 ? '1 horário já reservado' : `${ocupados.size} horários já reservados`} neste dia.
        </p>
      )}

      {erro && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {erro}
        </p>
      )}
    </div>
  )
}
