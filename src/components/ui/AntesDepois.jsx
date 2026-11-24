import { useId, useState } from 'react'
import { ImagePlus, MoveHorizontal } from 'lucide-react'

/**
 * Cartão exibido enquanto as fotos reais não foram adicionadas.
 * Mostra exatamente onde cada arquivo deve ser colocado — nenhuma imagem
 * genérica é apresentada como se fosse um trabalho da loja.
 */
function CartaoReservado({ item }) {
  return (
    <div className="relative flex aspect-4/3 w-full flex-col items-center justify-center gap-4 overflow-hidden bg-linear-150 from-ink-800 via-ink-900 to-ink-950 px-6 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 12px)' }}
        aria-hidden="true"
      />
      <span className="relative flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ink-400">
        <ImagePlus className="size-6" aria-hidden="true" />
      </span>
      <div className="relative">
        <p className="text-sm font-semibold text-ink-300">Espaço reservado para a sua foto</p>
        <p className="mt-1 text-xs text-ink-500">Adicione os dois arquivos abaixo:</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {['antes', 'depois'].map((fase) => (
            <code
              key={fase}
              className="quebra-nenhuma rounded-lg border border-white/8 bg-ink-950/70 px-2.5 py-1.5 text-[0.68rem] text-brand-300/90"
            >
              galeria/{item.id}-{fase}.jpg
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Comparador "antes × depois" com divisória arrastável.
 *
 * A acessibilidade vem de um <input type="range"> transparente sobreposto:
 * funciona com mouse, toque e teclado (setas) sem código extra.
 */
function Comparador({ item }) {
  const [posicao, setPosicao] = useState(50)
  const id = useId()

  return (
    <div className="relative aspect-4/3 w-full select-none overflow-hidden">
      {/* DEPOIS fica ao fundo; aparece à direita da divisória */}
      <img
        src={item.depois}
        alt={`${item.titulo} — depois do serviço`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />

      {/* ANTES recortado conforme a divisória */}
      <div
        className="absolute inset-0 will-change-[clip-path]"
        style={{ clipPath: `inset(0 ${100 - posicao}% 0 0)` }}
      >
        <img
          src={item.antes}
          alt={`${item.titulo} — antes do serviço`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          draggable={false}
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink-950/75 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-200 backdrop-blur-sm">
        Antes
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-brand-500/90 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-950 backdrop-blur-sm">
        Depois
      </span>

      {/* Linha divisória + alça */}
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_18px_rgba(0,169,254,0.9)]"
        style={{ left: `${posicao}%` }}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-ink-950/80 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
          <MoveHorizontal className="size-5 text-white" />
        </div>
      </div>

      {/* Controle real: invisível, recebe mouse, toque e teclado */}
      <label htmlFor={id} className="sr-only">
        Comparar antes e depois — {item.titulo}
      </label>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={posicao}
        onChange={(e) => setPosicao(Number(e.target.value))}
        aria-valuetext={`${Math.round(posicao)}% da foto "antes" visível`}
        className="absolute inset-0 size-full cursor-ew-resize appearance-none bg-transparent
                   [&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:w-12 [&::-moz-range-thumb]:border-0
                   [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-full
                   [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:cursor-ew-resize
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
      />
    </div>
  )
}

export default function AntesDepois({ item }) {
  const temFotos = Boolean(item.antes && item.depois)

  return (
    <figure className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card">
      {temFotos ? <Comparador item={item} /> : <CartaoReservado item={item} />}

      <figcaption className="border-t border-white/5 p-5">
        <h3 className="font-display text-lg font-bold text-white">{item.titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-400">{item.legenda}</p>
      </figcaption>
    </figure>
  )
}
