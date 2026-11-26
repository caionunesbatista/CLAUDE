import { Link } from 'react-router'
import { site } from '../config/site.js'

export function MarcaZap({ tamanho = 36 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="ouroLogo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#f2b52a" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#ouroLogo)" />
      <g fill="#0b0e13">
        <circle cx="32" cy="22" r="9" />
        <circle cx="22" cy="35" r="9" />
        <circle cx="42" cy="35" r="9" />
        <path d="M29 33h6l3 17H26z" />
      </g>
    </svg>
  )
}

export function Logo({ compacto = false }) {
  const [primeira, ...resto] = site.nome.split(' ')
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label={`${site.nome} — página inicial`}>
      <MarcaZap tamanho={compacto ? 30 : 36} />
      <span className={`titulo ${compacto ? 'text-lg' : 'text-xl'} tracking-tight`}>
        {primeira}
        {resto.length > 0 && <span className="text-ouro"> {resto.join(' ')}</span>}
      </span>
    </Link>
  )
}
