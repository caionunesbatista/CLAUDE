import { motion } from 'framer-motion'
import { RevealLista } from '../ui/Reveal'
import { itemLista } from '../../lib/animacoes'
import { diferenciais } from '../../config/site'
import Icone from '../../lib/icones'

/**
 * Faixa de fatos logo abaixo do herói.
 * Separada por fios, sem cartões nem molduras: é informação de apoio,
 * não quatro objetos disputando atenção.
 */
export default function Diferenciais() {
  return (
    <section aria-label="Como trabalhamos" className="border-y border-white/8">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
        <RevealLista
          as="ul"
          className="grid divide-y divide-white/8 lg:grid-cols-4 lg:divide-x lg:divide-y-0"
        >
          {diferenciais.map((d) => (
            <motion.li
              key={d.titulo}
              variants={itemLista}
              className="py-7 lg:px-7 lg:first:pl-0 lg:last:pr-0"
            >
              <div className="flex items-center gap-2.5">
                <Icone nome={d.icone} className="size-4 shrink-0 text-brand-400" aria-hidden="true" />
                <h3 className="font-display text-[0.95rem] font-bold tracking-wide text-white">
                  {d.titulo}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{d.texto}</p>
            </motion.li>
          ))}
        </RevealLista>
      </div>
    </section>
  )
}
