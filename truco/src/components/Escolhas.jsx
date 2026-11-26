// Seletores de variante, modo e valor usados no lobby e na criação de salas.
import { useState } from 'react'
import { Alternador, CampoReais } from './ui.jsx'
import { formatarReais } from '../lib/formato.js'
import { useSessao } from '../store/sessao.js'

export function EscolhaVariante({ valor, aoMudar }) {
  return (
    <Alternador
      rotulo="Variante"
      valor={valor}
      aoMudar={aoMudar}
      opcoes={[
        { valor: 'paulista', rotulo: 'Paulista' },
        { valor: 'mineiro', rotulo: 'Mineiro' },
      ]}
    />
  )
}

export function EscolhaModo({ valor, aoMudar }) {
  return (
    <Alternador
      rotulo="Modo"
      valor={valor}
      aoMudar={aoMudar}
      opcoes={[
        { valor: 2, rotulo: '1x1' },
        { valor: 4, rotulo: 'Duplas 2x2' },
      ]}
    />
  )
}

/** Valores rápidos + "Outro valor" + opção sem dinheiro. `valor` em centavos. */
export function EscolhaValor({ valor, aoMudar, permitirGratis = true, rotuloGratis = 'Amistosa' }) {
  const { config } = useSessao()
  const rapidos = config?.valoresRapidos || [100, 200, 500, 1000, 2000, 5000]
  const [outro, setOutro] = useState(!rapidos.includes(valor) && valor !== 0)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Valor">
        {permitirGratis && (
          <button type="button" className="chip" aria-pressed={!outro && valor === 0} onClick={() => (setOutro(false), aoMudar(0))}>
            {rotuloGratis}
          </button>
        )}
        {rapidos.map((v) => (
          <button key={v} type="button" className="chip numero" aria-pressed={!outro && valor === v} onClick={() => (setOutro(false), aoMudar(v))}>
            {formatarReais(v)}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={outro} onClick={() => setOutro(true)}>
          Outro valor
        </button>
      </div>
      {outro && (
        <div className="max-w-[220px]">
          <CampoReais valor={valor} aoMudar={(v) => aoMudar(Number.isFinite(v) ? v : NaN)} autoFocus aria-label="Valor por jogador" />
          {config && (
            <p className="mt-1.5 text-xs text-apagado">
              De {formatarReais(config.apostaMin)} a {formatarReais(config.apostaMax)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
