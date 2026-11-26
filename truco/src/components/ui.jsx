// Peças pequenas reutilizadas em várias páginas.
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { X, LoaderCircle, CircleCheck, CircleAlert, Info } from 'lucide-react'
import { useSessao, useAvisos } from '../store/sessao.js'
import { formatarReais, lerReais, reaisParaCampo } from '../lib/formato.js'

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-suave" role="status">
      <LoaderCircle className="animar-girar" size={22} />
      <span>{texto}</span>
    </div>
  )
}

export function Modal({ aberto, aoFechar, titulo, children, largura = 'max-w-md' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!aberto) return
    const tecla = (e) => e.key === 'Escape' && aoFechar?.()
    document.addEventListener('keydown', tecla)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = anterior
    }
  }, [aberto, aoFechar])
  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && aoFechar?.()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`cartao animar-surgir max-h-[92dvh] w-full ${largura} overflow-y-auto rounded-b-none p-5 outline-none sm:rounded-b-[18px] sm:p-6`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="titulo text-3xl">{titulo}</h2>
          {aoFechar && (
            <button className="btn btn-fantasma btn-pequeno -mr-2 -mt-1 px-2" onClick={aoFechar} aria-label="Fechar">
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Avisos() {
  const lista = useAvisos((s) => s.lista)
  const fechar = useAvisos((s) => s.fechar)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {lista.map((a) => {
        const Icone = a.tipo === 'sucesso' ? CircleCheck : a.tipo === 'erro' ? CircleAlert : Info
        const cor = a.tipo === 'sucesso' ? 'text-dinheiro' : a.tipo === 'erro' ? 'text-truco' : 'text-info'
        return (
          <div key={a.id} className="cartao animar-surgir pointer-events-auto flex w-full max-w-md items-start gap-3 px-4 py-3 shadow-2xl">
            <Icone className={`mt-0.5 shrink-0 ${cor}`} size={20} />
            <p className="flex-1 text-sm leading-snug">{a.texto}</p>
            <button onClick={() => fechar(a.id)} className="text-apagado hover:text-texto" aria-label="Fechar aviso">
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Exige login (e, opcionalmente, ser administrador) para ver a página. */
export function Protegido({ children, admin = false }) {
  const { carregado, usuario } = useSessao()
  const local = useLocation()
  if (!carregado) return <Carregando />
  if (!usuario) return <Navigate to={`/entrar?voltar=${encodeURIComponent(local.pathname + local.search)}`} replace />
  if (admin && !usuario.admin) return <Navigate to="/" replace />
  return children
}

/** Campo de dinheiro em reais; `valor` e `aoMudar` trabalham em centavos. */
export function CampoReais({ valor, aoMudar, id, placeholder = '0,00', ...resto }) {
  const [texto, setTexto] = useState(Number.isFinite(valor) && valor > 0 ? reaisParaCampo(valor) : '')
  useEffect(() => {
    const atual = lerReais(texto)
    if (Number.isFinite(valor) && valor !== atual) setTexto(valor > 0 ? reaisParaCampo(valor) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-suave">R$</span>
      <input
        id={id}
        className="campo numero pl-10"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={texto}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d,.]/g, '')
          setTexto(t)
          aoMudar(lerReais(t))
        }}
        {...resto}
      />
    </div>
  )
}

export function Dinheiro({ valor, className = '' }) {
  return <span className={`numero ${className}`}>{formatarReais(valor || 0)}</span>
}

export function Vazio({ icone: Icone, titulo, texto, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icone && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-painel-3 text-suave">
          <Icone size={26} />
        </div>
      )}
      <p className="titulo text-lg">{titulo}</p>
      {texto && <p className="mt-1.5 max-w-sm text-sm text-suave">{texto}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

export function Alternador({ opcoes, valor, aoMudar, rotulo }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={String(o.valor)} type="button" className="chip" aria-pressed={valor === o.valor} onClick={() => aoMudar(o.valor)}>
          {o.icone}
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Interruptor({ ligado, aoMudar, rotulo, descricao }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => aoMudar(!ligado)} className="flex w-full items-center justify-between gap-4 text-left">
      <span>
        <span className="block font-semibold">{rotulo}</span>
        {descricao && <span className="block text-sm text-suave">{descricao}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${ligado ? 'bg-marca' : 'bg-painel-3'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${ligado ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}

export function useTitulo(titulo) {
  useEffect(() => {
    const anterior = document.title
    document.title = titulo
    return () => {
      document.title = anterior
    }
  }, [titulo])
}
