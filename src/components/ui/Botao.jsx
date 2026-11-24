import { motion, useReducedMotion } from 'framer-motion'

const ESTILOS = {
  primario:
    'bg-linear-to-r from-brand-500 via-royal-500 to-royal-600 text-white shadow-[0_10px_40px_-12px_rgba(0,122,255,0.8)] hover:shadow-[0_14px_50px_-10px_rgba(0,150,255,0.95)]',
  whatsapp: 'bg-[#25D366] text-[#04240f] hover:bg-[#2ee874]',
  contorno:
    'border border-white/15 bg-white/[0.04] text-ink-50 hover:border-brand-400/70 hover:bg-white/[0.08]',
  fantasma: 'text-ink-300 hover:text-white hover:bg-white/5',
}

const TAMANHOS = {
  sm: 'h-10 px-4 text-sm gap-2',
  md: 'h-12 px-6 text-[0.95rem] gap-2.5',
  lg: 'h-14 px-7 text-base gap-3 sm:h-[3.75rem] sm:px-9 sm:text-lg',
}

/**
 * Botão da marca. Vira `<a>` quando recebe `href`, e `<button>` caso contrário.
 * Usa pílula + brilho azul, como no banner original.
 */
export default function Botao({
  children,
  variante = 'primario',
  tamanho = 'md',
  href,
  className = '',
  icone: Icone,
  iconeDireita: IconeDireita,
  larguraTotal = false,
  ...props
}) {
  const semMovimento = useReducedMotion()
  const Tag = href ? motion.a : motion.button

  const classes = [
    'group relative inline-flex items-center justify-center rounded-full font-semibold',
    'transition-[box-shadow,background-color,border-color,color] duration-300',
    'disabled:cursor-not-allowed disabled:opacity-50 select-none',
    ESTILOS[variante] ?? ESTILOS.primario,
    TAMANHOS[tamanho] ?? TAMANHOS.md,
    larguraTotal ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      href={href}
      className={classes}
      whileHover={semMovimento ? undefined : { scale: 1.035 }}
      whileTap={semMovimento ? undefined : { scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      {...props}
    >
      {Icone && <Icone className="size-5 shrink-0" aria-hidden="true" />}
      <span className="whitespace-nowrap">{children}</span>
      {IconeDireita && (
        <IconeDireita
          className="size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        />
      )}
    </Tag>
  )
}
