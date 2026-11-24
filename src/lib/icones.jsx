import { createElement } from 'react'
import {
  Droplets, Sparkles, SprayCan, Gem, Wrench, ShieldCheck, Clock, HandHeart, Bike,
} from 'lucide-react'

/** Converte o nome escrito em config/site.js no componente de ícone. */
const ICONES = {
  droplets: Droplets,
  sparkles: Sparkles,
  spray: SprayCan,
  gem: Gem,
  wrench: Wrench,
  shieldCheck: ShieldCheck,
  clock: Clock,
  handHeart: HandHeart,
  bike: Bike,
}

/**
 * Desenha o ícone indicado pelo nome. Usamos `createElement` porque o
 * componente vem de uma tabela — a referência é sempre a mesma, então o
 * React não remonta nada entre renderizações.
 */
export default function Icone({ nome, ...props }) {
  return createElement(ICONES[nome] ?? Sparkles, props)
}
