import { motion } from 'framer-motion'
import { MapPin, Phone, Mail, Clock, ExternalLink, MessageCircle } from 'lucide-react'
import { Instagram } from '../ui/IconesMarca'
import Secao, { TituloSecao } from '../ui/Secao'
import { RevealLista } from '../ui/Reveal'
import { itemLista } from '../../lib/animacoes'
import Reveal from '../ui/Reveal'
import { empresa } from '../../config/site'
import { linkWhatsappSimples } from '../../lib/whatsapp'

function Cartao({ Icone, titulo, children, href, externo = true, destaque = false }) {
  const Conteudo = (
    <>
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300
                    group-hover:scale-110 ${
                      destaque
                        ? 'bg-linear-to-br from-[#25D366]/25 to-[#128C7E]/20 text-[#25D366]'
                        : 'bg-linear-to-br from-brand-500/22 to-royal-600/18 text-brand-300'
                    }`}
      >
        <Icone className="size-5.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 font-display text-base font-bold text-white">
          {titulo}
          {href && externo && (
            <ExternalLink
              className="size-3.5 text-ink-500 transition-colors group-hover:text-brand-400"
              aria-hidden="true"
            />
          )}
        </h3>
        <div className="mt-1.5 text-sm leading-relaxed text-ink-400">{children}</div>
      </div>
    </>
  )

  const classe =
    'group flex h-full gap-4 rounded-3xl border border-white/8 bg-ink-900/60 p-6 transition-all duration-300 ' +
    'hover:border-brand-500/35 hover:bg-ink-850'

  return (
    <motion.li variants={itemLista} className="h-full">
      {href ? (
        <a
          href={href}
          className={classe}
          {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {Conteudo}
        </a>
      ) : (
        <div className={classe}>{Conteudo}</div>
      )}
    </motion.li>
  )
}

export default function Contato() {
  const { endereco, instagram, telefone, email, horarioFuncionamento } = empresa

  return (
    <Secao id="contato" className="border-t border-white/5 bg-ink-900/30">
      <TituloSecao
        etiqueta="Onde nos encontrar"
        titulo="Venha tomar um"
        destaque="café"
        texto="Enquanto cuidamos do seu veículo, você espera com conforto. Estamos a um toque de distância."
      />

      <RevealLista as="ul" className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao Icone={MapPin} titulo="Endereço" href={endereco.mapsUrl}>
          <p>{endereco.rua}</p>
          {endereco.complemento && <p>{endereco.complemento}</p>}
          <p>{endereco.bairroCidade}</p>
          <p className="text-ink-500">CEP {endereco.cep}</p>
          <p className="mt-2 font-medium text-brand-400">Abrir no Google Maps</p>
        </Cartao>

        <Cartao Icone={MessageCircle} titulo="WhatsApp" href={linkWhatsappSimples()} destaque>
          <p className="text-base font-semibold text-white">{telefone.exibicao}</p>
          <p className="mt-1">Resposta rápida em horário comercial.</p>
          <p className="mt-2 font-medium text-[#25D366]">Abrir conversa</p>
        </Cartao>

        <Cartao Icone={Instagram} titulo="Instagram" href={instagram.url}>
          <p className="text-base font-semibold text-white">{instagram.usuario}</p>
          <p className="mt-1">Resultados novos toda semana por lá.</p>
          <p className="mt-2 font-medium text-brand-400">Seguir o perfil</p>
        </Cartao>

        <Cartao Icone={Clock} titulo="Horários" href={null}>
          <ul className="flex flex-col gap-1.5">
            {horarioFuncionamento.map((h) => (
              <li key={h.dias} className="flex flex-wrap justify-between gap-x-3">
                <span>{h.dias}</span>
                <span className="font-medium text-ink-200">{h.horas}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      </RevealLista>

      {/* Contatos secundários */}
      <Reveal delay={0.1}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-400">
          <a href={`tel:${telefone.link}`} className="flex items-center gap-2 rounded-full px-2 py-2.5 transition-colors hover:text-white">
            <Phone className="size-4 text-brand-400" aria-hidden="true" />
            {telefone.exibicao}
          </a>
          <a href={`mailto:${email}`} className="flex items-center gap-2 rounded-full px-2 py-2.5 transition-colors hover:text-white">
            <Mail className="size-4 text-brand-400" aria-hidden="true" />
            {email}
          </a>
        </div>
      </Reveal>
    </Secao>
  )
}
