import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import Secao, { TituloSecao } from '../ui/Secao'
import { RevealLista } from '../ui/Reveal'
import { itemLista } from '../../lib/animacoes'
import AntesDepois from '../ui/AntesDepois'
import { galeria } from '../../config/site'

export default function Galeria() {
  const faltamFotos = galeria.some((g) => !g.antes || !g.depois)

  return (
    <Secao id="galeria" className="bg-ink-900/30">
      <TituloSecao
        etiqueta="Resultado real"
        titulo="Antes &"
        destaque="depois"
        texto="Arraste a divisória de cada foto para ver a diferença. Sem filtro, sem retoque — só produto certo, técnica e paciência."
      />

      <RevealLista as="ul" className="mt-14 grid gap-6 sm:grid-cols-2 lg:gap-8" intervalo={0.12}>
        {galeria.map((item) => (
          <motion.li key={item.id} variants={itemLista}>
            <AntesDepois item={item} />
          </motion.li>
        ))}
      </RevealLista>

      {/* Lembrete discreto para o dono do site — some sozinho ao adicionar as fotos */}
      {faltamFotos && (
        <motion.aside
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mt-10 flex max-w-2xl items-start gap-3 rounded-2xl border border-brand-500/25
                     bg-brand-500/8 p-5 text-sm leading-relaxed text-ink-300"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-brand-400" aria-hidden="true" />
          <p>
            <strong className="font-semibold text-white">Para o proprietário:</strong> coloque suas
            fotos em <code className="rounded bg-ink-950/60 px-1.5 py-0.5 text-brand-300">public/images/galeria/</code>{' '}
            e informe o caminho de cada uma em{' '}
            <code className="rounded bg-ink-950/60 px-1.5 py-0.5 text-brand-300">src/config/site.js</code>.
            Este aviso desaparece sozinho quando todos os pares estiverem preenchidos.
          </p>
        </motion.aside>
      )}
    </Secao>
  )
}
