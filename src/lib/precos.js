import { servicos, tiposVeiculo } from '../config/site.js'

export const buscarServico = (id) => servicos.find((s) => s.id === id) ?? null
export const buscarVeiculo = (id) => tiposVeiculo.find((v) => v.id === id) ?? null

/**
 * Preço estimado = preço base do serviço × fator do tipo de veículo,
 * arredondado para o múltiplo de 5 mais próximo (fica redondo na conversa).
 * Retorna `null` quando o serviço é "sob consulta" ou falta algum dado.
 */
export function calcularPreco(servicoId, veiculoId) {
  const servico = buscarServico(servicoId)
  const veiculo = buscarVeiculo(veiculoId)
  if (!servico || servico.preco == null) return null
  const fator = veiculo?.fator ?? 1
  return Math.round((servico.preco * fator) / 5) * 5
}

/** Faixa "a partir de" exibida nos cards de serviço (menor fator disponível). */
export function precoAPartirDe(servico) {
  if (servico.preco == null) return null
  const menorFator = Math.min(...tiposVeiculo.map((v) => v.fator))
  return Math.round((servico.preco * menorFator) / 5) * 5
}
