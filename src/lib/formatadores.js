/** Formatação de moeda, data e hora no padrão brasileiro. */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export const formatarPreco = (valor) =>
  typeof valor === 'number' ? BRL.format(valor) : 'Sob consulta'

/** '2026-03-14' -> 'sábado, 14 de março de 2026' (sem problema de fuso) */
export function formatarDataExtenso(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** '2026-03-14' -> '14/03/2026' */
export function formatarDataCurta(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Date -> '2026-03-14' usando o fuso LOCAL (toISOString usaria UTC). */
export function paraISO(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/** '2026-03-14' -> objeto Date local ao meio-dia (evita viradas de fuso). */
export function deISO(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d, 12, 0, 0)
}

/** Remove tudo que não for dígito — usado no número do WhatsApp. */
export const somenteDigitos = (s) => String(s ?? '').replace(/\D/g, '')
