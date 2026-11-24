import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ChevronDown } from 'lucide-react'

const BASE =
  'w-full rounded-2xl border bg-ink-900/70 px-4 text-[0.95rem] text-white placeholder:text-ink-500 ' +
  'transition-colors duration-200 outline-none'

const ALTURA = 'h-13'

function classes(temErro) {
  return [
    BASE,
    ALTURA,
    temErro
      ? 'border-red-500/70 focus:border-red-400'
      : 'border-white/10 hover:border-white/20 focus:border-brand-400 focus:bg-ink-900',
  ].join(' ')
}

function Rotulo({ htmlFor, children, obrigatorio }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-ink-300">
      {children}
      {obrigatorio && <span className="ml-1 text-brand-400" aria-hidden="true">*</span>}
    </label>
  )
}

function Erro({ id, mensagem }) {
  return (
    <AnimatePresence initial={false}>
      {mensagem && (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-1.5 overflow-hidden text-sm text-red-400"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{mensagem}</span>
        </motion.p>
      )}
    </AnimatePresence>
  )
}

/** Campo de texto (ou date/tel/email) com rótulo, validação e dica. */
export function CampoTexto({ rotulo, erro, dica, obrigatorio = true, className = '', ...props }) {
  const id = useId()
  const idErro = `${id}-erro`
  return (
    <div className={className}>
      <Rotulo htmlFor={id} obrigatorio={obrigatorio}>{rotulo}</Rotulo>
      <input
        id={id}
        className={classes(!!erro)}
        aria-invalid={!!erro}
        aria-describedby={erro ? idErro : undefined}
        {...props}
      />
      {!erro && dica && <p className="mt-2 text-xs text-ink-500">{dica}</p>}
      <Erro id={idErro} mensagem={erro} />
    </div>
  )
}

/** Lista suspensa estilizada (usa o <select> nativo — melhor no celular). */
export function CampoSelecao({ rotulo, erro, opcoes, placeholder, obrigatorio = true, className = '', ...props }) {
  const id = useId()
  const idErro = `${id}-erro`
  return (
    <div className={className}>
      <Rotulo htmlFor={id} obrigatorio={obrigatorio}>{rotulo}</Rotulo>
      <div className="relative">
        <select
          id={id}
          className={`${classes(!!erro)} cursor-pointer appearance-none pr-11 ${
            props.value ? 'text-white' : 'text-ink-500'
          }`}
          aria-invalid={!!erro}
          aria-describedby={erro ? idErro : undefined}
          {...props}
        >
          <option value="" disabled>{placeholder}</option>
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor} className="bg-ink-900 text-white">
              {o.texto}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
      </div>
      <Erro id={idErro} mensagem={erro} />
    </div>
  )
}

/** Área de texto para observações (campo opcional). */
export function CampoTextoLongo({ rotulo, dica, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      <Rotulo htmlFor={id} obrigatorio={false}>{rotulo}</Rotulo>
      <textarea
        id={id}
        rows={3}
        className={`${BASE} resize-none border-white/10 py-3 hover:border-white/20 focus:border-brand-400 focus:bg-ink-900`}
        {...props}
      />
      {dica && <p className="mt-2 text-xs text-ink-500">{dica}</p>}
    </div>
  )
}
