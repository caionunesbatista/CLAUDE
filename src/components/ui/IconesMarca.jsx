/**
 * Ícones de marcas que a biblioteca lucide-react deixou de distribuir.
 * Mantêm a mesma API dos demais ícones (className, size, strokeWidth),
 * então podem ser usados exatamente como um ícone do Lucide.
 */

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function Instagram({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={strokeWidth} {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}
