import Reveal from './Reveal'

/**
 * Cabeçalho de seção.
 *
 * Alinhado à esquerda, com a etiqueta sobre um fio que atravessa a largura e
 * o texto de apoio numa segunda coluna. O azul da marca aparece só na
 * etiqueta: o destaque forte fica reservado para o herói.
 */
export function TituloSecao({ etiqueta, titulo, texto, className = '' }) {
  return (
    <div className={className}>
      <Reveal y={12}>
        <div className="flex items-center gap-5">
          <span className="font-display text-[0.68rem] font-bold uppercase tracking-[0.24em] text-brand-400">
            {etiqueta}
          </span>
          <span className="h-px flex-1 bg-white/12" aria-hidden="true" />
        </div>
      </Reveal>

      <div className="mt-7 grid gap-5 lg:grid-cols-12 lg:gap-12">
        <Reveal delay={0.06} className="lg:col-span-7">
          <h2 className="text-[clamp(1.85rem,5.2vw,3rem)] font-extrabold uppercase leading-[1.03] tracking-[-0.015em]">
            {titulo}
          </h2>
        </Reveal>

        {texto && (
          <Reveal delay={0.12} className="min-w-0 lg:col-span-5 lg:self-end lg:pb-1">
            <p className="max-w-md text-[0.95rem] leading-relaxed text-ink-400">{texto}</p>
          </Reveal>
        )}
      </div>
    </div>
  )
}

/** Container de seção com espaçamento vertical consistente. */
export default function Secao({ id, children, className = '', container = true }) {
  return (
    <section id={id} className={`relative py-20 sm:py-24 lg:py-28 ${className}`}>
      {container ? (
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">{children}</div>
      ) : (
        children
      )}
    </section>
  )
}
