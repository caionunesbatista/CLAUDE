// Tabela de prêmios por posição (usada no simulador, na criação e na página da sala).
import { Medal } from 'lucide-react'
import { formatarReais } from '../lib/formato.js'

const CORES = ['text-ouro', 'text-[#cfd6e3]', 'text-[#d49a6a]', 'text-suave']

export function TabelaPremios({ calculo, percentuais, porTime, compacta = false }) {
  if (!calculo) return null
  return (
    <ol className={compacta ? 'space-y-1.5' : 'space-y-2'}>
      {percentuais.map((p, i) => (
        <li key={i} className={`flex items-center gap-3 rounded-xl bg-fundo/60 ${compacta ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <Medal size={compacta ? 16 : 20} className={CORES[i] || 'text-suave'} />
          <span className="font-semibold">{i + 1}º lugar</span>
          <span className="text-xs text-apagado">{p}%</span>
          <span className="ml-auto text-right">
            <span className="numero block font-bold text-dinheiro">{formatarReais(calculo.porPosicao[i])}</span>
            {porTime > 1 && <span className="numero block text-xs text-suave">{formatarReais(calculo.porJogador[i])} para cada</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
