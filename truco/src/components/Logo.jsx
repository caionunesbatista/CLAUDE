import { Link } from 'react-router'
import { site } from '../config/site.js'
import { FormaNaipe } from './Carta.jsx'

export function MarcaZap({ tamanho = 36 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#1b52c0" />
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#brilhoLogo)" />
      <defs>
        <linearGradient id="brilhoLogo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M40 2h12L28 62H16z" fill="#e5243b" />
      <g transform="translate(32 33) scale(0.38) translate(-50 -50)" fill="#fbf7ee">
        <FormaNaipe s="p" />
      </g>
    </svg>
  )
}

export function Logo({ compacto = false }) {
  const [primeira, ...resto] = site.nome.split(' ')
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${site.nome} — página inicial`}>
      <MarcaZap tamanho={compacto ? 32 : 38} />
      <span className={`font-display font-extrabold uppercase italic leading-none tracking-tight ${compacto ? 'text-xl' : 'text-[1.6rem]'}`}>
        {primeira}
        {resto.length > 0 && <span className="text-marca"> {resto.join(' ')}</span>}
      </span>
    </Link>
  )
}
