import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Secao, { TituloSecao } from '../ui/Secao'
import { RevealLista } from '../ui/Reveal'
import { itemLista } from '../../lib/animacoes'
import { servicos } from '../../config/site'
import { precoAPartirDe } from '../../lib/precos'
import { formatarPreco } from '../../lib/formatadores'
import { useAgendamento } from '../../store/useAgendamento'

/**
 * Uma linha da tabela de preços.
 * Clicar leva ao agendamento já com o serviço escolhido.
 */
function LinhaServico({ servico }) {
  const setCampo = useAgendamento((s) => s.setCampo)
  const aPartirDe = precoAPartirDe(servico)

  const escolher = () => {
    setCampo('servico', servico.id)
    document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.li variants={itemLista} className="border-t border-white/10">
      <button
        type="button"
        onClick={escolher}
        aria-label={`Agendar ${servico.nome}`}
        className="group grid w-full gap-x-10 gap-y-4 py-7 text-left transition-colors duration-200
                   hover:bg-white/[0.025] focus-visible:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_auto] sm:py-8"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              {servico.nome}
            </h3>
            {servico.destaque && (
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-brand-400">
                mais pedida
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-ink-300">{servico.descricao}</p>

          <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-500">
            {servico.inclui.join(' · ')}
          </p>
        </div>

        <div className="flex items-end justify-between gap-6 sm:flex-col sm:items-end sm:justify-start sm:gap-2 sm:text-right">
          <div>
            {aPartirDe != null ? (
              <>
                <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-ink-500">
                  a partir de
                </span>
                <span className="font-display text-2xl font-extrabold tabular-nums text-white sm:text-[1.75rem]">
                  {formatarPreco(aPartirDe)}
                </span>
              </>
            ) : (
              <span className="font-display text-lg font-bold text-brand-300">Sob consulta</span>
            )}
            <span className="mt-1 block text-xs tabular-nums text-ink-500">{servico.duracao}</span>
          </div>

          <span
            className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink-400
                       transition-colors duration-200 group-hover:text-brand-400"
          >
            Agendar
            <ArrowRight
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </div>
      </button>
    </motion.li>
  )
}

export default function Servicos() {
  return (
    <Secao id="servicos">
      <TituloSecao
        etiqueta="Serviços"
        titulo="Tabela de serviços e preços"
        texto="Os valores partem do carro compacto e sobem conforme o porte do veículo. Toque em um serviço para levá-lo preenchido ao agendamento."
      />

      <RevealLista as="ul" className="mt-12 border-b border-white/10" intervalo={0.07}>
        {servicos.map((s) => (
          <LinhaServico key={s.id} servico={s} />
        ))}
      </RevealLista>
    </Secao>
  )
}
