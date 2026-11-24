import { servicos, tiposVeiculo } from '../config/site.js'

export const buscarServico = (id) => servicos.find((s) => s.id === id) ?? null
export const buscarVeiculo = (id) => tiposVeiculo.find((v) => v.id === id) ?? null

/** Veículos com preço de tabela (ônibus e caminhão ficam sob consulta). */
const comTabela = tiposVeiculo.filter((v) => typeof v.fator === 'number')

/**
 * Situação do preço para a combinação escolhida:
 *  - 'incompleto': ainda falta escolher serviço ou veículo
 *  - 'consulta':   o serviço ou o porte do veículo exige orçamento
 *  - 'ok':         há valor estimado em `valor`
 */
export function situacaoPreco(servicoId, veiculoId) {
  const servico = buscarServico(servicoId)
  const veiculo = buscarVeiculo(veiculoId)
  if (!servico || !veiculo) return { estado: 'incompleto' }
  if (servico.preco == null || typeof veiculo.fator !== 'number') return { estado: 'consulta' }
  return { estado: 'ok', valor: Math.round((servico.preco * veiculo.fator) / 5) * 5 }
}

/**
 * Preço estimado, arredondado para o múltiplo de 5 mais próximo.
 * Retorna `null` quando o valor precisa ser combinado na conversa.
 */
export function calcularPreco(servicoId, veiculoId) {
  const s = situacaoPreco(servicoId, veiculoId)
  return s.estado === 'ok' ? s.valor : null
}

/** Faixa "a partir de": o menor porte com preço de tabela. */
export function precoAPartirDe(servico) {
  if (servico.preco == null) return null
  const menorFator = Math.min(...comTabela.map((v) => v.fator))
  return Math.round((servico.preco * menorFator) / 5) * 5
}
