import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { linkWhatsappSimples } from '../../lib/whatsapp'

/**
 * Botão flutuante de WhatsApp.
 *
 * Aparece depois que o visitante rola um pouco e some enquanto a seção de
 * agendamento está na tela — lá já existe um botão maior, e dois ao mesmo
 * tempo só competiriam entre si.
 */
export default function BotaoWhatsapp() {
  const [rolou, setRolou] = useState(false)
  const [noAgendamento, setNoAgendamento] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 600)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })

    const secao = document.getElementById('agendamento')
    const observador = secao
      ? new IntersectionObserver(([e]) => setNoAgendamento(e.isIntersecting), { threshold: 0.12 })
      : null
    observador?.observe(secao)

    return () => {
      window.removeEventListener('scroll', aoRolar)
      observador?.disconnect()
    }
  }, [])

  const visivel = rolou && !noAgendamento

  return (
    <AnimatePresence>
      {visivel && (
        <motion.a
          href={linkWhatsappSimples()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com a KM Lavacar no WhatsApp"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-80 flex size-14
                     items-center justify-center rounded-full bg-[#25D366]
                     shadow-[0_12px_38px_-10px_rgba(37,211,102,0.9)] sm:size-16"
        >
          {/* Pulso suave ao redor */}
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/35 [animation-duration:2.6s]"
          />
          <MessageCircle className="relative size-7 text-[#04240f] sm:size-8" aria-hidden="true" />
          <span
            className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-xl
                       bg-ink-900 px-3.5 py-2 text-sm font-medium text-white opacity-0 shadow-card
                       transition-opacity duration-200 group-hover:opacity-100 lg:block"
          >
            Fale com a gente
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  )
}
