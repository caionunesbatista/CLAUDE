import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X, CalendarCheck } from 'lucide-react'
import Botao from '../ui/Botao'
import { empresa } from '../../config/site'
import { LOGO } from '../../config/imagens'

const LINKS = [
  { href: '#servicos', texto: 'Serviços' },
  { href: '#galeria', texto: 'Antes & Depois' },
  { href: '#agendamento', texto: 'Agendar' },
  { href: '#contato', texto: 'Contato' },
]

export default function Header() {
  const [rolou, setRolou] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const semMovimento = useReducedMotion()

  /* O fundo do cabeçalho aparece assim que a página sai do topo. */
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  /* Com o menu aberto, a página atrás não rola e Esc fecha. */
  useEffect(() => {
    if (!menuAberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const aoTeclar = (e) => e.key === 'Escape' && setMenuAberto(false)
    window.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [menuAberto])

  return (
    <>
      {/* Atalho para quem navega por teclado */}
      <a
        href="#agendamento"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-200 focus:rounded-full
                   focus:bg-brand-500 focus:px-5 focus:py-3 focus:font-semibold focus:text-ink-950"
      >
        Ir direto para o agendamento
      </a>

      <motion.header
        initial={{ y: semMovimento ? 0 : -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-90 transition-all duration-300 ${
          rolou ? 'border-b border-white/8 bg-ink-950/80 backdrop-blur-xl' : 'border-b border-transparent'
        }`}
      >
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-12"
        >
          <a
            href="#inicio"
            className="flex shrink-0 items-center py-2"
            aria-label={`${empresa.nome} — início`}
          >
            <img
              src={LOGO.src}
              alt={empresa.nome}
              width={LOGO.largura}
              height={LOGO.altura}
              className="h-9 w-auto sm:h-10"
            />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="relative rounded-full px-4 py-2 text-sm font-medium text-ink-300 transition-colors
                             hover:bg-white/5 hover:text-white"
                >
                  {l.texto}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <Botao href="#agendamento" tamanho="sm" icone={CalendarCheck}>
              Agendar
            </Botao>
          </div>

          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            aria-controls="menu-celular"
            className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5
                       text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            {menuAberto ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>
      </motion.header>

      {/* ───────────── Menu do celular ───────────── */}
      <AnimatePresence>
        {menuAberto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuAberto(false)}
              className="fixed inset-0 z-85 bg-ink-950/75 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.div
              id="menu-celular"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-3 top-21 z-88 overflow-hidden rounded-2xl border border-white/10
                         bg-ink-900/95 p-3 shadow-card backdrop-blur-xl lg:hidden"
            >
              <ul className="flex flex-col">
                {LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                  >
                    <a
                      href={l.href}
                      onClick={() => setMenuAberto(false)}
                      className="block rounded-2xl px-5 py-4 text-lg font-medium text-ink-200 transition-colors
                                 hover:bg-white/5 hover:text-white"
                    >
                      {l.texto}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <div className="p-2 pt-3">
                <Botao
                  href="#agendamento"
                  onClick={() => setMenuAberto(false)}
                  icone={CalendarCheck}
                  larguraTotal
                  className="uppercase italic"
                >
                  Agendar serviço
                </Botao>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
