import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, X, ExternalLink } from 'lucide-react'
import { useAgendamento } from '../../store/useAgendamento'

const APARENCIA = {
  sucesso: { Icone: CheckCircle2, cor: 'text-emerald-400', borda: 'border-emerald-400/40', brilho: 'shadow-[0_20px_60px_-25px_rgba(16,185,129,0.8)]' },
  aviso: { Icone: AlertTriangle, cor: 'text-amber-400', borda: 'border-amber-400/40', brilho: 'shadow-[0_20px_60px_-25px_rgba(245,158,11,0.8)]' },
  erro: { Icone: XCircle, cor: 'text-red-400', borda: 'border-red-400/40', brilho: 'shadow-[0_20px_60px_-25px_rgba(239,68,68,0.8)]' },
}

/** Aviso flutuante no rodapé da tela. Some sozinho (menos quando tem link). */
export default function Toast() {
  const toast = useAgendamento((s) => s.toast)
  const fechar = useAgendamento((s) => s.fecharToast)

  useEffect(() => {
    if (!toast || toast.link) return
    const t = setTimeout(fechar, 6000)
    return () => clearTimeout(t)
  }, [toast, fechar])

  const aparencia = APARENCIA[toast?.tipo] ?? APARENCIA.sucesso
  const { Icone } = aparencia

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-6 sm:pb-6"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`pointer-events-auto relative w-full max-w-md rounded-2xl border p-4 pr-11
                        backdrop-blur-xl sm:p-5 sm:pr-12 ${aparencia.borda} ${aparencia.brilho}`}
            style={{ backgroundColor: 'rgb(9 16 27 / 0.97)' }}
          >
            <div className="flex gap-3.5">
              <Icone className={`mt-0.5 size-6 shrink-0 ${aparencia.cor}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold text-white">{toast.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-300">{toast.texto}</p>
                {toast.link && (
                  <a
                    href={toast.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-[#04240f] transition-colors hover:bg-[#2ee874]"
                  >
                    Abrir conversa no WhatsApp
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar aviso"
              className="absolute right-3 top-3 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
