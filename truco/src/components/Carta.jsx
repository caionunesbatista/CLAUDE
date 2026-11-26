// Carta de baralho desenhada em SVG/CSS (arte original do site).
import { SIMBOLO_NAIPE, NAIPE_VERMELHO, apelidoCarta, nomeCarta } from '../../shared/regras.js'

const TAMANHOS = {
  mini: { w: 34, h: 48, canto: 11, centro: 18, figura: 16 },
  pequena: { w: 50, h: 72, canto: 14, centro: 26, figura: 24 },
  media: { w: 66, h: 94, canto: 17, centro: 34, figura: 32 },
  grande: { w: 84, h: 120, canto: 21, centro: 44, figura: 40 },
}

function Simbolo({ naipe, tamanho }) {
  return (
    <span style={{ fontSize: tamanho, lineHeight: 1 }} aria-hidden="true">
      {SIMBOLO_NAIPE[naipe]}
    </span>
  )
}

/**
 * @param {{carta?: {r:string,s:string}, oculta?: boolean, tamanho?: keyof TAMANHOS, variante?: string, manilha?: string,
 *          destaque?: boolean, apagada?: boolean, className?: string, style?: object}} props
 */
export function Carta({ carta, oculta = false, tamanho = 'media', variante, manilha, destaque = false, apagada = false, className = '', style }) {
  const t = TAMANHOS[tamanho] || TAMANHOS.media
  const base = {
    width: t.w,
    height: t.h,
    borderRadius: tamanho === 'mini' ? 6 : 'var(--radius-carta)',
    ...style,
  }
  if (oculta || !carta) {
    return <div className={`verso-carta shrink-0 shadow-lg ${className}`} style={base} aria-label="Carta virada" role="img" />
  }
  const vermelha = NAIPE_VERMELHO[carta.s]
  const cor = vermelha ? 'var(--color-carta-vermelho)' : 'var(--color-carta-preto)'
  const apelido = variante ? apelidoCarta(carta, variante, manilha) : null
  const figura = carta.r === 'J' || carta.r === 'Q' || carta.r === 'K'
  // Quem posiciona a carta com `absolute` não pode ter a posição sobrescrita por `relative`.
  const posicao = /\b(absolute|fixed)\b/.test(className) ? '' : 'relative'
  return (
    <div
      className={`${posicao} shrink-0 select-none overflow-hidden shadow-[0_6px_16px_-6px_rgb(0_0_0/0.7)] ${apagada ? 'opacity-45' : ''} ${className}`}
      style={{
        ...base,
        background: 'linear-gradient(160deg, #fffdf7 0%, var(--color-carta) 55%, #f1e8d3 100%)',
        color: cor,
        animation: apelido && destaque ? 'brilho 1.6s ease-in-out infinite' : undefined,
        border: apelido ? '2px solid var(--color-ouro)' : '1px solid rgb(0 0 0 / 0.12)',
      }}
      role="img"
      aria-label={`${nomeCarta(carta)}${apelido ? ` (manilha: ${apelido})` : ''}`}
      title={`${nomeCarta(carta)}${apelido ? ` — ${apelido}` : ''}`}
    >
      <div
        className="absolute left-1 top-0.5 flex flex-col items-center font-display font-extrabold leading-none"
        style={{ fontSize: t.canto }}
      >
        <span>{carta.r}</span>
        <Simbolo naipe={carta.s} tamanho={t.canto * 0.85} />
      </div>
      <div
        className="absolute right-1 bottom-0.5 flex rotate-180 flex-col items-center font-display font-extrabold leading-none"
        style={{ fontSize: t.canto }}
      >
        <span>{carta.r}</span>
        <Simbolo naipe={carta.s} tamanho={t.canto * 0.85} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        {figura ? (
          <div
            className="flex flex-col items-center justify-center rounded-md"
            style={{
              width: t.w * 0.5,
              height: t.h * 0.56,
              border: `1.5px solid ${cor}`,
              background: vermelha ? 'rgb(212 40 58 / 0.07)' : 'rgb(27 29 34 / 0.06)',
            }}
          >
            <span className="font-display font-black leading-none" style={{ fontSize: t.figura * 0.8 }}>
              {carta.r}
            </span>
            <Simbolo naipe={carta.s} tamanho={t.figura * 0.55} />
          </div>
        ) : (
          <Simbolo naipe={carta.s} tamanho={t.centro} />
        )}
      </div>
      {apelido && tamanho !== 'mini' && (
        <div
          className="absolute inset-x-0 bottom-0 bg-ouro text-center font-bold uppercase text-[#1a1406]"
          style={{ fontSize: Math.max(8, t.canto * 0.5), letterSpacing: '0.04em', lineHeight: 1.5 }}
        >
          {apelido}
        </div>
      )}
    </div>
  )
}

/** Leque de cartas viradas (mão dos adversários). */
export function LequeVerso({ quantidade, tamanho = 'mini' }) {
  if (!quantidade) return <div style={{ height: TAMANHOS[tamanho].h }} />
  return (
    <div className="flex" aria-label={`${quantidade} carta(s) na mão`}>
      {Array.from({ length: quantidade }).map((_, i) => (
        <Carta
          key={i}
          oculta
          tamanho={tamanho}
          style={{
            marginLeft: i === 0 ? 0 : -TAMANHOS[tamanho].w * 0.55,
            transform: `rotate(${(i - (quantidade - 1) / 2) * 8}deg)`,
          }}
        />
      ))}
    </div>
  )
}
