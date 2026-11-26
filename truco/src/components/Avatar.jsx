// Avatar do jogador: um símbolo sobre uma cor (escolhido no perfil).
import { Crown, Zap, Flame, Star, Clover, Gem, Anchor, Rocket, Skull, Rabbit, Cat, Dog, Bird, Fish, Ghost, Trophy, Bot } from 'lucide-react'
import { AVATARES } from '../../shared/regras.js'

export const ICONES_AVATAR = {
  coroa: Crown,
  raio: Zap,
  chama: Flame,
  estrela: Star,
  trevo: Clover,
  diamante: Gem,
  ancora: Anchor,
  foguete: Rocket,
  caveira: Skull,
  coelho: Rabbit,
  gato: Cat,
  cachorro: Dog,
  passaro: Bird,
  peixe: Fish,
  fantasma: Ghost,
  trofeu: Trophy,
}

/** Avatar padrão para quem ainda não escolheu: sempre o mesmo para o mesmo apelido. */
function padrao(apelido = '') {
  let h = 0
  for (const c of String(apelido)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATARES[h % AVATARES.length]
}

export function Avatar({ avatar, apelido, tamanho = 40, bot = false, className = '', anel }) {
  const dados = AVATARES.find((a) => a.id === avatar) || padrao(apelido)
  const Icone = bot ? Bot : ICONES_AVATAR[dados.id] || Star
  const cor = bot ? '#53608a' : dados.cor
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: tamanho,
        height: tamanho,
        background: `radial-gradient(circle at 30% 25%, ${cor}, color-mix(in srgb, ${cor} 55%, #060b19))`,
        boxShadow: anel ? `0 0 0 2px #060b19, 0 0 0 4px ${anel}` : 'inset 0 -2px 0 rgb(0 0 0 / 0.25)',
      }}
      aria-hidden="true"
    >
      <Icone size={Math.round(tamanho * 0.5)} color="#fff" strokeWidth={2.2} />
    </span>
  )
}
