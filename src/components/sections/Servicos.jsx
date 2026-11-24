import { motion } from 'framer-motion'
import { Check, ArrowRight, Clock3 } from 'lucide-react'
import Secao, { TituloSecao } from '../ui/Secao'
import { RevealLista } from '../ui/Reveal'
import { itemLista } from '../../lib/animacoes'
import { servicos } from '../../config/site'
import { precoAPartirDe } from '../../lib/precos'
import { formatarPreco } from '../../lib/formatadores'
import Icone from '../../lib/icones'
import { useAgendamento } from '../../store/useAgendamento'

function CardServico({ servico }) {
  const setCampo = useAgendamento((s) => s.setCampo)
  const aPartirDe = precoAPartirDe(servico)

  /* Clicar no card já deixa o serviço escolhido no formulário. */
  const escolher = () => {
    setCampo('servico', servico.id)
    document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.li
      variants={itemLista}
      className={`group relative flex flex-col overflow-hidden rounded-4xl border p-6 transition-all duration-300 sm:p-7
        ${
          servico.destaque
            ? 'border-brand-500/45 bg-linear-to-b from-brand-500/12 via-ink-900 to-ink-900 shadow-glow'
            : 'border-white/8 bg-ink-900/60 hover:border-white/18'
        }`}
    >
      {servico.destaque && (
        <span className="absolute right-5 top-5 rounded-full bg-brand-500 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-950">
          Mais pedido
        </span>
      )}

      <span
        className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500/25 to-royal-600/25
                   text-brand-300 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
      >
        <Icone nome={servico.icone} className="size-7" aria-hidden="true" />
      </span>

      <h3 className="mt-5 font-display text-xl font-bold text-white sm:text-2xl">{servico.nome}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-400">{servico.descricao}</p>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/8 pt-5">
        <div>
          {aPartirDe != null ? (
            <>
              <span className="block text-[0.7rem] uppercase tracking-[0.14em] text-ink-500">A partir de</span>
              <span className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                {formatarPreco(aPartirDe)}
              </span>
            </>
          ) : (
            <span className="font-display text-xl font-extrabold text-brand-300">Sob consulta</span>
          )}
        </div>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-500">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {servico.duracao}
        </span>
      </div>

      <ul className="mt-5 flex grow flex-col gap-2.5">
        {servico.inclui.map((linha) => (
          <li key={linha} className="flex items-start gap-2.5 text-sm text-ink-300">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-400" aria-hidden="true" />
            {linha}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={escolher}
        className={`mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold
                    transition-all duration-300
          ${
            servico.destaque
              ? 'bg-linear-to-r from-brand-500 to-royal-600 text-white hover:shadow-[0_12px_40px_-12px_rgba(0,150,255,0.9)]'
              : 'border border-white/12 bg-white/5 text-white hover:border-brand-400/60 hover:bg-white/10'
          }`}
      >
        Agendar este serviço
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
      </button>
    </motion.li>
  )
}

export default function Servicos() {
  return (
    <Secao id="servicos">
      <TituloSecao
        etiqueta="O que fazemos"
        titulo="Serviços sob"
        destaque="medida"
        texto="Do banho rápido do dia a dia ao polimento que devolve o brilho de novo. Escolha abaixo e já leve o serviço preenchido para o agendamento."
      />

      <RevealLista
        as="ul"
        className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7"
      >
        {servicos.map((s) => (
          <CardServico key={s.id} servico={s} />
        ))}
      </RevealLista>

      <p className="mt-10 text-center text-sm text-ink-500">
        Os valores variam conforme o porte do veículo. O preço exato aparece no resumo do agendamento.
      </p>
    </Secao>
  )
}
