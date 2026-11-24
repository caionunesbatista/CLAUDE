import { MapPin, MessageCircle, ArrowUp } from 'lucide-react'
import { Instagram } from '../ui/IconesMarca'
import { empresa } from '../../config/site'
import { LOGO } from '../../config/imagens'
import { linkWhatsappSimples } from '../../lib/whatsapp'

const ANO = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="relative border-t border-white/8 bg-ink-950">
      {/* Linha de luz no topo, lembrando o traço do logo */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/60 to-transparent"
      />

      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <img
              src={LOGO.src}
              alt={empresa.nome}
              width={LOGO.largura}
              height={LOGO.altura}
              loading="lazy"
              className="h-11 w-auto"
            />
            <p className="max-w-xs text-sm leading-relaxed text-ink-500">{empresa.slogan}.</p>
          </div>

          <nav aria-label="Redes e contato" className="flex items-center gap-3">
            <a
              href={linkWhatsappSimples()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Falar no WhatsApp"
              className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5
                         text-ink-300 transition-all duration-300 hover:scale-110 hover:border-[#25D366]/50 hover:text-[#25D366]"
            >
              <MessageCircle className="size-5" aria-hidden="true" />
            </a>
            <a
              href={empresa.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram ${empresa.instagram.usuario}`}
              className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5
                         text-ink-300 transition-all duration-300 hover:scale-110 hover:border-brand-400/50 hover:text-brand-400"
            >
              <Instagram className="size-5" aria-hidden="true" />
            </a>
            <a
              href={empresa.endereco.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver endereço no Google Maps"
              className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5
                         text-ink-300 transition-all duration-300 hover:scale-110 hover:border-brand-400/50 hover:text-brand-400"
            >
              <MapPin className="size-5" aria-hidden="true" />
            </a>
            <a
              href="#inicio"
              aria-label="Voltar ao topo"
              className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5
                         text-ink-300 transition-all duration-300 hover:scale-110 hover:border-brand-400/50 hover:text-brand-400"
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </a>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/5 pt-7 text-xs text-ink-600 sm:flex-row sm:justify-between">
          <p>
            © {ANO} {empresa.nome}. Todos os direitos reservados.
          </p>
          <p>{empresa.endereco.bairroCidade}</p>
        </div>
      </div>
    </footer>
  )
}
