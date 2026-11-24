import { motion } from 'framer-motion'
import { RevealLista } from '../ui/Reveal'
import { itemLista } from '../../lib/animacoes'
import { diferenciais } from '../../config/site'
import Icone from '../../lib/icones'

/** Faixa de confiança, logo abaixo do herói. */
export default function Diferenciais() {
  return (
    <section aria-label="Nossos diferenciais" className="relative border-y border-white/5 bg-ink-900/40">
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
        <RevealLista as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {diferenciais.map((d) => (
            <motion.li
              key={d.titulo}
              variants={itemLista}
              className="group flex gap-4 rounded-3xl border border-white/8 bg-ink-900/60 p-5
                         transition-colors duration-300 hover:border-brand-500/35 hover:bg-ink-850"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br
                           from-brand-500/25 to-royal-600/20 text-brand-300 transition-transform duration-300
                           group-hover:scale-110"
              >
                <Icone nome={d.icone} className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-white">{d.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{d.texto}</p>
              </div>
            </motion.li>
          ))}
        </RevealLista>
      </div>
    </section>
  )
}
