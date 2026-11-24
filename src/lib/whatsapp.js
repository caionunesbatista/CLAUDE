import { empresa } from '../config/site.js'
import { buscarServico, buscarVeiculo, calcularPreco } from './precos.js'
import { formatarPreco, formatarDataExtenso, somenteDigitos } from './formatadores.js'

/** O proprietário ainda não trocou o número de exemplo no config? */
export const whatsappConfigurado = () => {
  const n = somenteDigitos(empresa.whatsapp)
  return n.length >= 12 && !/^5{2}0+$/.test(n)
}

/**
 * Monta a mensagem que será enviada ao WhatsApp da loja.
 * Texto puro com quebras de linha — o WhatsApp usa *negrito* entre asteriscos.
 */
export function montarMensagem(dados) {
  const servico = buscarServico(dados.servico)
  const veiculo = buscarVeiculo(dados.tipoVeiculo)
  const preco = calcularPreco(dados.servico, dados.tipoVeiculo)
  const nome = `${dados.nome} ${dados.sobrenome}`.trim()

  return [
    `Olá, ${empresa.nome}! Gostaria de agendar um serviço.`,
    '',
    `*Cliente:* ${nome}`,
    `*Veículo:* ${veiculo?.nome ?? '—'} — ${dados.modelo}`,
    `*Serviço:* ${servico?.nome ?? '—'}`,
    `*Data:* ${formatarDataExtenso(dados.data)}`,
    `*Horário:* ${dados.horario}`,
    `*Valor estimado:* ${formatarPreco(preco)}`,
    ...(dados.observacoes?.trim() ? ['', `*Observações:* ${dados.observacoes.trim()}`] : []),
    '',
    'Enviado pelo site. Aguardo a confirmação, obrigado!',
  ].join('\n')
}

/** Link wa.me pronto, com a mensagem codificada para URL. */
export function montarLinkWhatsapp(dados) {
  const numero = somenteDigitos(empresa.whatsapp)
  return `https://wa.me/${numero}?text=${encodeURIComponent(montarMensagem(dados))}`
}

/** Link de WhatsApp genérico (botão flutuante, rodapé). */
export function linkWhatsappSimples(
  texto = `Olá, ${empresa.nome}! Vim pelo site e gostaria de mais informações.`,
) {
  return `https://wa.me/${somenteDigitos(empresa.whatsapp)}?text=${encodeURIComponent(texto)}`
}
