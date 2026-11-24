import { MapPin, Phone, ArrowUpRight, MessageCircle } from 'lucide-react'
import { Instagram } from '../ui/IconesMarca'
import Secao, { TituloSecao } from '../ui/Secao'
import Reveal from '../ui/Reveal'
import { empresa } from '../../config/site'
import { linkWhatsappSimples } from '../../lib/whatsapp'

/** Bloco de informação com etiqueta sobre um fio. */
function Bloco({ etiqueta, children, className = '' }) {
  return (
    <div className={`border-t border-white/10 pt-6 ${className}`}>
      <h3 className="font-display text-[0.68rem] font-bold uppercase tracking-[0.22em] text-ink-500">
        {etiqueta}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  )
}

/** Link externo com seta, sem moldura de cartão. */
function LinkExterno({ href, children, destaque = false }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-1.5 text-sm font-semibold transition-colors
                  ${destaque ? 'text-[#25D366] hover:text-[#4ae084]' : 'text-brand-400 hover:text-brand-300'}`}
    >
      {children}
      <ArrowUpRight
        className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        aria-hidden="true"
      />
    </a>
  )
}

export default function Contato() {
  const { endereco, instagram, telefone, horarioFuncionamento } = empresa

  return (
    <Secao id="contato" className="border-t border-white/8">
      <TituloSecao
        etiqueta="Contato"
        titulo="Onde nos encontrar"
        texto="O jeito mais rápido de falar com a gente é pelo WhatsApp. Para chegar, use o mapa: o ponto está marcado com precisão."
      />

      <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal>
          <Bloco etiqueta="Endereço">
            <address className="not-italic text-[0.95rem] leading-relaxed text-ink-200">
              {endereco.linha1}
              <br />
              {endereco.linha2}
              <br />
              <span className="text-ink-500">CEP {endereco.cep}</span>
            </address>
            <p className="mt-4">
              <LinkExterno href={endereco.mapsUrl}>
                <MapPin className="size-4" aria-hidden="true" />
                Ver no Google Maps
              </LinkExterno>
            </p>
          </Bloco>
        </Reveal>

        <Reveal delay={0.06}>
          <Bloco etiqueta="WhatsApp">
            <p className="font-display text-xl font-bold tabular-nums tracking-tight text-white">
              {telefone.exibicao}
            </p>
            <p className="mt-1.5 text-sm text-ink-400">Resposta em horário comercial.</p>
            <p className="mt-4">
              <LinkExterno href={linkWhatsappSimples()} destaque>
                <MessageCircle className="size-4" aria-hidden="true" />
                Abrir conversa
              </LinkExterno>
            </p>
          </Bloco>
        </Reveal>

        <Reveal delay={0.12}>
          <Bloco etiqueta="Instagram">
            <p className="font-display text-xl font-bold tracking-tight text-white">
              {instagram.usuario}
            </p>
            <p className="mt-1.5 text-sm text-ink-400">Trabalhos novos toda semana.</p>
            <p className="mt-4">
              <LinkExterno href={instagram.url}>
                <Instagram className="size-4" aria-hidden="true" />
                Abrir perfil
              </LinkExterno>
            </p>
          </Bloco>
        </Reveal>

        <Reveal delay={0.18}>
          <Bloco etiqueta="Horários">
            <dl className="flex flex-col gap-2 text-sm">
              {horarioFuncionamento.map((h) => (
                <div key={h.dias} className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
                  <dt className="text-ink-400">{h.dias}</dt>
                  <dd className="whitespace-nowrap tabular-nums text-ink-200">{h.horas}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-500">
              <Phone className="size-3.5" aria-hidden="true" />
              {telefone.exibicao}
            </p>
          </Bloco>
        </Reveal>
      </div>
    </Secao>
  )
}
