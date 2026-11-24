import Reveal from './Reveal'

/** Cabeçalho padrão das seções: etiqueta, título e texto de apoio. */
export function TituloSecao({ etiqueta, titulo, destaque, texto, centro = true, className = '' }) {
  return (
    <div className={`${centro ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}>
      {etiqueta && (
        <Reveal y={14}>
          <span
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10
                       px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brand-300"
          >
            <span className="size-1.5 rounded-full bg-brand-400" aria-hidden="true" />
            {etiqueta}
          </span>
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <h2 className="mt-5 text-3xl font-extrabold uppercase italic leading-[1.05] sm:text-4xl lg:text-5xl">
          {titulo} {destaque && <span className="texto-degrade">{destaque}</span>}
        </h2>
      </Reveal>

      {texto && (
        <Reveal delay={0.16}>
          <p className="mt-5 text-base leading-relaxed text-ink-300 sm:text-lg">{texto}</p>
        </Reveal>
      )}
    </div>
  )
}

/** Container de seção com espaçamento vertical consistente. */
export default function Secao({ id, children, className = '', container = true }) {
  return (
    <section id={id} className={`relative py-20 sm:py-24 lg:py-32 ${className}`}>
      {container ? (
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">{children}</div>
      ) : (
        children
      )}
    </section>
  )
}
