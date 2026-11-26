// Baralho desenhado em SVG (arte original): pips nas posições clássicas, figuras com moldura,
// naipes desenhados (não usam caracteres, que viram emoji em alguns celulares) e selo dourado nas manilhas.
import { useId } from 'react'
import { NAIPE_VERMELHO, apelidoCarta, nomeCarta } from '../../shared/regras.js'

export const TAMANHOS = {
  mini: { w: 36, h: 50 },
  pequena: { w: 52, h: 73 },
  media: { w: 68, h: 95 },
  grande: { w: 88, h: 123 },
  enorme: { w: 108, h: 151 },
}

const VERMELHO = '#d21f35'
const PRETO = '#141824'
const OURO = '#e2b53e'
const AZUL_CORTE = '#1f4fbf'

/** Desenho de cada naipe numa caixa 100×100. */
export function FormaNaipe({ s }) {
  switch (s) {
    case 'c': // copas
      return <path d="M50 90C22 68 5 52 5 32 5 17 16 7 30 7c9 0 16 5 20 13 4-8 11-13 20-13 14 0 25 10 25 25 0 20-17 36-45 58Z" />
    case 'o': // ouros
      return <path d="M50 3C62 20 75 36 91 50 75 64 62 80 50 97 38 80 25 64 9 50 25 36 38 20 50 3Z" />
    case 'e': // espadas
      return (
        <path d="M50 5C63 24 94 40 94 63c0 13-10 22-22 22-8 0-15-4-19-11 1 9 5 16 12 22H35c7-6 11-13 12-22-4 7-11 11-19 11-12 0-22-9-22-22C6 40 37 24 50 5Z" />
      )
    default: // paus
      return (
        <g>
          <circle cx="50" cy="28" r="20" />
          <circle cx="27" cy="60" r="20" />
          <circle cx="73" cy="60" r="20" />
          <circle cx="50" cy="52" r="12" />
          <path d="M45 58h10l7 38H38z" />
        </g>
      )
  }
}

function Naipe({ s, x, y, tam, girar = false, cor }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${girar ? 180 : 0}) scale(${tam / 100}) translate(-50 -50)`} fill={cor}>
      <FormaNaipe s={s} />
    </g>
  )
}

// Posições dos pips (centro em x=100; colunas 74 e 126, longe dos índices dos cantos).
const PIPS = {
  2: [[100, 66], [100, 214, 1]],
  3: [[100, 66], [100, 140], [100, 214, 1]],
  4: [[74, 66], [126, 66], [74, 214, 1], [126, 214, 1]],
  5: [[74, 66], [126, 66], [100, 140], [74, 214, 1], [126, 214, 1]],
  6: [[74, 66], [126, 66], [74, 140], [126, 140], [74, 214, 1], [126, 214, 1]],
  7: [[74, 66], [126, 66], [100, 103], [74, 140], [126, 140], [74, 214, 1], [126, 214, 1]],
}

/** Emblema das figuras: coroa (Rei), diadema (Dama) e chapéu com pena (Valete). */
function Emblema({ r, cor }) {
  if (r === 'K') {
    return (
      <g>
        <path d="M10 54 16 16l17 20L50 8l17 28 17-20 6 38Z" fill={OURO} stroke={PRETO} strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="10" y="54" width="80" height="10" rx="2" fill={cor} stroke={PRETO} strokeWidth="2.5" />
        <circle cx="50" cy="8" r="5" fill={cor} stroke={PRETO} strokeWidth="2" />
        <circle cx="16" cy="16" r="4" fill={AZUL_CORTE} stroke={PRETO} strokeWidth="2" />
        <circle cx="84" cy="16" r="4" fill={AZUL_CORTE} stroke={PRETO} strokeWidth="2" />
      </g>
    )
  }
  if (r === 'Q') {
    return (
      <g>
        <path d="M12 56Q50-4 88 56Z" fill={OURO} stroke={PRETO} strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="12" y="54" width="76" height="10" rx="2" fill={cor} stroke={PRETO} strokeWidth="2.5" />
        {[
          [30, 34],
          [50, 24],
          [70, 34],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="5" fill={AZUL_CORTE} stroke={PRETO} strokeWidth="2" />
        ))}
        <circle cx="50" cy="46" r="4" fill={cor} stroke={PRETO} strokeWidth="1.5" />
      </g>
    )
  }
  return (
    <g>
      <path d="M58 30Q76 0 98 4 82 14 68 36Z" fill={AZUL_CORTE} stroke={PRETO} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 58Q18 30 48 28 78 30 86 58Z" fill={cor} stroke={PRETO} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="8" y="56" width="84" height="9" rx="2" fill={OURO} stroke={PRETO} strokeWidth="2.5" />
    </g>
  )
}

function Frente({ carta, cor, apelido, simples, uid }) {
  const figura = carta.r === 'J' || carta.r === 'Q' || carta.r === 'K'
  const indice = (
    <g>
      <text x="23" y="48" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize={simples ? 62 : 42} fill={cor}>
        {carta.r}
      </text>
      <Naipe s={carta.s} x={23} y={simples ? 86 : 68} tam={simples ? 34 : 24} cor={cor} />
    </g>
  )
  return (
    <>
      <defs>
        <linearGradient id={`f${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf8" />
          <stop offset="0.6" stopColor="#fbf6ea" />
          <stop offset="1" stopColor="#efe6d2" />
        </linearGradient>
        {figura && (
          <pattern id={`h${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#fffaf0" />
            <rect width="2" height="8" fill={cor} opacity="0.08" />
          </pattern>
        )}
        {apelido && (
          <linearGradient id={`o${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#d9a52c" />
          </linearGradient>
        )}
      </defs>
      <rect x="1" y="1" width="198" height="278" rx="15" fill={`url(#f${uid})`} stroke={apelido ? OURO : 'rgb(0 0 0 / 0.18)'} strokeWidth={apelido ? 6 : 2} />
      {indice}
      <g transform="rotate(180 100 140)">{indice}</g>

      {simples ? (
        <Naipe s={carta.s} x={128} y={168} tam={98} cor={cor} />
      ) : carta.r === 'A' ? (
        <>
          <Naipe s={carta.s} x={100} y={140} tam={carta.s === 'e' ? 112 : 92} cor={cor} />
          {carta.s === 'e' && <circle cx="100" cy="140" r="64" fill="none" stroke={cor} strokeWidth="2" opacity="0.25" />}
        </>
      ) : figura ? (
        <g>
          <rect x="40" y="38" width="120" height="204" rx="8" fill={`url(#h${uid})`} stroke={cor} strokeWidth="3" />
          <rect x="45" y="43" width="110" height="194" rx="5" fill="none" stroke={OURO} strokeWidth="1.5" />
          <path d="M45 148 155 132" stroke={OURO} strokeWidth="2" />
          {[0, 180].map((rot) => (
            <g key={rot} transform={`rotate(${rot} 100 140)`}>
              <g transform="translate(62 54) scale(0.76)">
                <Emblema r={carta.r} cor={cor} />
              </g>
              <Naipe s={carta.s} x={100} y={118} tam={26} cor={cor} />
            </g>
          ))}
        </g>
      ) : (
        PIPS[carta.r]?.map(([x, y, g], i) => <Naipe key={i} s={carta.s} x={x} y={y} tam={36} girar={Boolean(g)} cor={cor} />)
      )}

      {apelido && !simples && (
        <g>
          <rect x="48" y="249" width="104" height="22" rx="4" fill={`url(#o${uid})`} stroke="#8a6410" strokeWidth="1.5" />
          <text x="100" y="266" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize="17" letterSpacing="1.5" fill="#3b2a06">
            {apelido.toUpperCase()}
          </text>
        </g>
      )}
    </>
  )
}

function Verso({ uid }) {
  return (
    <>
      <defs>
        <pattern id={`p${uid}`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="#163c9e" />
          <rect x="2" y="2" width="12" height="12" fill="#1d4cc2" />
          <rect x="6" y="6" width="4" height="4" fill="#e5243b" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="198" height="278" rx="15" fill="#0c2468" stroke="rgb(0 0 0 / 0.3)" strokeWidth="2" />
      <rect x="12" y="12" width="176" height="256" rx="9" fill={`url(#p${uid})`} stroke="#f3ead6" strokeWidth="4" />
      <circle cx="100" cy="140" r="36" fill="#e5243b" stroke="#f3ead6" strokeWidth="4" />
      <g transform="translate(100 140) scale(0.42) translate(-50 -50)" fill="#f3ead6">
        <FormaNaipe s="p" />
      </g>
    </>
  )
}

/**
 * Carta de baralho.
 * @param {{carta?: {r:string,s:string}, oculta?: boolean, tamanho?: keyof TAMANHOS, variante?: string, manilha?: string,
 *          destaque?: boolean, apagada?: boolean, className?: string, style?: object, largura?: number}} props
 */
export function Carta({ carta, oculta = false, tamanho = 'media', variante, manilha, destaque = false, apagada = false, className = '', style, largura }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const t = TAMANHOS[tamanho] || TAMANHOS.media
  const w = largura || t.w
  const h = Math.round((w * 280) / 200)
  const virada = oculta || !carta
  const cor = !virada && NAIPE_VERMELHO[carta.s] ? VERMELHO : PRETO
  const apelido = !virada && variante ? apelidoCarta(carta, variante, manilha) : null
  const rotulo = virada ? 'Carta virada' : `${nomeCarta(carta)}${apelido ? ` (manilha: ${apelido})` : ''}`
  return (
    <svg
      viewBox="0 0 200 280"
      width={w}
      height={h}
      role="img"
      aria-label={rotulo}
      className={`block shrink-0 select-none ${destaque && apelido ? 'animar-manilha' : ''} ${apagada ? 'opacity-45' : ''} ${className}`}
      style={{ filter: 'drop-shadow(0 5px 10px rgb(0 0 0 / 0.45))', ...style }}
    >
      <title>{rotulo}</title>
      {virada ? <Verso uid={uid} /> : <Frente carta={carta} cor={cor} apelido={apelido} simples={w < 44} uid={uid} />}
    </svg>
  )
}

/** Leque de cartas viradas (mão dos adversários). */
export function LequeVerso({ quantidade, tamanho = 'mini' }) {
  const t = TAMANHOS[tamanho]
  if (!quantidade) return <div style={{ height: t.h }} />
  return (
    <div className="flex" aria-label={`${quantidade} carta(s) na mão`}>
      {Array.from({ length: quantidade }).map((_, i) => (
        <Carta
          key={i}
          oculta
          tamanho={tamanho}
          style={{
            marginLeft: i === 0 ? 0 : -t.w * 0.6,
            transform: `rotate(${(i - (quantidade - 1) / 2) * 9}deg)`,
            filter: 'drop-shadow(0 3px 5px rgb(0 0 0 / 0.4))',
          }}
        />
      ))}
    </div>
  )
}
