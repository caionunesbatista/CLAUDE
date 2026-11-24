import { motion, useReducedMotion } from 'framer-motion'

/**
 * Envolve qualquer conteúdo e faz ele surgir suavemente quando entra na tela.
 * Respeita automaticamente "prefers-reduced-motion".
 *
 * @param {number} delay    atraso em segundos
 * @param {number} y        deslocamento vertical inicial (px)
 * @param {string} as       elemento HTML renderizado (div, li, section...)
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  duration = 0.6,
  className = '',
  as = 'div',
  ...props
}) {
  const semMovimento = useReducedMotion()
  const Componente = motion[as] ?? motion.div

  return (
    <Componente
      className={className}
      initial={semMovimento ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -60px 0px' }}
      transition={{ duration: semMovimento ? 0.2 : duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </Componente>
  )
}

/** Versão para listas: cada filho entra em sequência. */
export function RevealLista({ children, className = '', intervalo = 0.09, as = 'div', ...props }) {
  const semMovimento = useReducedMotion()
  const Componente = motion[as] ?? motion.div

  return (
    <Componente
      className={className}
      initial="oculto"
      whileInView="visivel"
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -60px 0px' }}
      variants={{ visivel: { transition: { staggerChildren: semMovimento ? 0 : intervalo } } }}
      {...props}
    >
      {children}
    </Componente>
  )
}
