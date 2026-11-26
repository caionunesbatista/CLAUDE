export { formatarReais } from '../../shared/regras.js'

/** Converte o texto digitado ("12,50", "R$ 1.000") em centavos. Retorna NaN se inválido. */
export function lerReais(texto) {
  const limpo = String(texto ?? '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  if (limpo === '' || limpo === '.') return NaN
  const n = Number(limpo)
  if (!Number.isFinite(n) || n < 0) return NaN
  return Math.round(n * 100)
}

/** Centavos → texto para campo de edição ("12,50"). */
export function reaisParaCampo(centavos) {
  if (!Number.isFinite(centavos)) return ''
  return (centavos / 100).toFixed(2).replace('.', ',')
}

/** Datas do banco vêm em UTC ("2026-01-02 13:45:00"); mostra no horário de Brasília. */
export function formatarData(texto, comHora = true) {
  if (!texto) return ''
  const d = new Date(String(texto).replace(' ', 'T') + (String(texto).endsWith('Z') ? '' : 'Z'))
  if (Number.isNaN(d.getTime())) return texto
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    ...(comHora ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }),
  })
}

export function mascararCpf(valor) {
  const d = String(valor).replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function iniciais(nome) {
  return String(nome || '?').slice(0, 2).toUpperCase()
}

export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = texto
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    return ok
  }
}
