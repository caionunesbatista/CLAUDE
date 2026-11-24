import { motion, useReducedMotion } from 'framer-motion'
import { CalendarCheck, ChevronRight, Sparkles } from 'lucide-react'
import Botao from '../ui/Botao'
import ImagemArte from '../ui/ImagemArte'
import { empresa } from '../../config/site'
import { LOGO, HERO_DETALHES, HERO_VEICULOS } from '../../config/imagens'

/**
 * Fundo do herói.
 *
 * Um brilho azul atrás dos veículos e as duas diagonais da arte original.
 * Nada de véu claro por cima: o preto é o fundo, e o azul entra só como luz.
 */
function FundoHero() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Luz fria atrás dos veículos, como no piso molhado da arte */}
      <div className="absolute -right-24 top-1/3 size-[32rem] rounded-full bg-brand-600/12 blur-[140px]" />
      <div className="absolute -left-32 top-8 size-[26rem] rounded-full bg-royal-700/12 blur-[130px]" />

      {/* Diagonais de luz da identidade */}
      <div className="absolute -left-6 -top-10 h-[130%] w-px rotate-[18deg] bg-linear-to-b from-transparent via-brand-400/45 to-transparent" />
      <div className="absolute left-20 -top-10 h-[130%] w-px rotate-[18deg] bg-linear-to-b from-transparent via-royal-500/25 to-transparent" />
    </div>
  )
}

export default function Hero() {
  const semMovimento = useReducedMotion()

  /* Entrada em cascata: logo, título, texto, botões e selos. */
  const container = {
    oculto: {},
    visivel: { transition: { staggerChildren: semMovimento ? 0 : 0.11, delayChildren: 0.1 } },
  }
  const item = {
    oculto: { opacity: 0, y: semMovimento ? 0 : 26 },
    visivel: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section id="inicio" className="relative isolate overflow-hidden pt-24 sm:pt-28 lg:pt-20">
      <FundoHero />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col lg:block lg:h-[min(88vh,52rem)] lg:min-h-[42rem]">
          {/* ───────────────── TEXTO ───────────────── */}
          <motion.div
            variants={container}
            initial="oculto"
            animate="visivel"
            className="relative z-20 flex flex-col items-center text-center
                       lg:absolute lg:inset-y-0 lg:max-w-100 lg:items-start lg:justify-center lg:text-left xl:max-w-136"
          >
            <motion.img
              variants={item}
              src={LOGO.src}
              alt={`${empresa.nome} — logotipo`}
              width={LOGO.largura}
              height={LOGO.altura}
              fetchPriority="high"
              className="h-20 w-auto drop-shadow-[0_8px_30px_rgba(0,169,254,0.35)] sm:h-24 lg:h-28"
            />

            <motion.h1
              variants={item}
              className="mt-7 text-[clamp(2.1rem,8.2vw,3rem)] font-extrabold uppercase italic leading-[0.98] tracking-tight lg:text-[clamp(2.8rem,4.1vw,4.25rem)]"
            >
              Cuidado completo
              <br />
              para o seu <span className="relative inline-block texto-degrade">
                veículo
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-linear-to-r from-brand-400 to-transparent"
                />
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-md text-base leading-relaxed text-ink-300 sm:text-lg"
            >
              {empresa.descricao}
            </motion.p>

            <motion.div
              variants={item}
              className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
            >
              <Botao
                href="#agendamento"
                tamanho="lg"
                icone={CalendarCheck}
                iconeDireita={ChevronRight}
                className="uppercase italic tracking-wide"
              >
                Agendar serviço
              </Botao>
              <Botao href="#servicos" variante="contorno" tamanho="lg" icone={Sparkles}>
                Ver serviços
              </Botao>
            </motion.div>

          </motion.div>

          {/* ──────────── FAIXA DE DETALHES ──────────── */}
          <motion.div
            initial={{ opacity: 0, x: semMovimento ? 0 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="hero-camada hero-detalhes relative mt-12 lg:absolute lg:mt-0"
          >
            <ImagemArte fonte={HERO_DETALHES} prioridade className="h-auto w-full" />
          </motion.div>

          {/* ─────────────── VEÍCULOS ─────────────── */}
          <motion.div
            initial={{ opacity: 0, y: semMovimento ? 0 : 50, scale: semMovimento ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.05, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="hero-camada hero-veiculos relative -mt-6 lg:absolute lg:mt-0"
          >
            <ImagemArte fonte={HERO_VEICULOS} prioridade className="h-auto w-full" />
          </motion.div>
        </div>
      </div>

      {/* Transição suave para a próxima seção */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-ink-950 to-transparent"
      />
    </section>
  )
}
