// Tabela de prêmios por posição (usada no simulador, na criação e na página da sala).
import { formatarReais } from '../lib/formato.js'

// Ouro, prata, bronze e o 4º lugar.
const CORES = ['#f2c14e', '#c9d3e6', '#d19a6a', '#6a7aa3']

export function TabelaPremios({ calculo, percentuais, porTime, compacta = false }) {
  if (!calculo) return null
  return (
    <ol className={compacta ? 'space-y-1.5' : 'space-y-2'}>
      {percentuais.map((p, i) => (
        <li key={i} className={`flex items-center gap-3 rounded-lg border border-linha bg-fundo/60 ${compacta ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <span className="grid h-8 w-8 shrink-0 skew-x-[-10deg] place-items-center font-display text-lg font-extrabold text-[#0c1429]" style={{ background: CORES[i] }}>
            <span className="skew-x-[10deg]">{i + 1}º</span>
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-wider text-apagado">{p}%</span>
          <span className="ml-auto text-right">
            <span className="numero block font-display text-xl font-extrabold leading-tight text-dinheiro">{formatarReais(calculo.porPosicao[i])}</span>
            {porTime > 1 && <span className="numero block text-xs text-suave">{formatarReais(calculo.porJogador[i])} para cada</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
