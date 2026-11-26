import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown, Minus, Plus, Zap, Users, User, Trophy, Medal } from 'lucide-react'
import { Carta } from '../components/Carta.jsx'
import { TabelaPremios } from '../components/Premiacao.jsx'
import { useSessao } from '../store/sessao.js'
import { useLobby } from '../lib/useLobby.js'
import { formatarReais } from '../lib/formato.js'
import { calcularPremios } from '../../shared/premios.js'
import { DIVISOES_PADRAO, maxPremiados, VARIANTES } from '../../shared/regras.js'
import { site } from '../config/site.js'
import { useTitulo } from '../components/ui.jsx'

/** Mesa ilustrada do topo: feltro azul, cartas na mesa, mão em leque e placar de TV. */
function CenaMesa() {
  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-[560px] select-none" aria-hidden="true">
      <div className="borda-mesa absolute inset-x-[2%] inset-y-[8%] rounded-[46%]" />
      <div className="feltro absolute inset-x-[5%] inset-y-[11.5%] overflow-hidden rounded-[46%]">
        <div className="costura absolute inset-3 rounded-[46%]" />
        <p className="absolute inset-x-0 top-[16%] text-center font-display text-sm font-bold uppercase italic tracking-[0.5em] text-white/15">{site.nome}</p>
      </div>
      {/* vaza na mesa */}
      <div className="absolute left-1/2 top-[44%] h-0 w-0">
        <Carta carta={{ r: '3', s: 'c' }} tamanho="grande" className="absolute -left-[118px] -top-[64px] -rotate-[14deg]" />
        <Carta carta={{ r: 'K', s: 'e' }} tamanho="grande" className="absolute left-[28px] -top-[70px] rotate-[11deg]" />
        <Carta carta={{ r: '4', s: 'p' }} variante="mineiro" destaque tamanho="grande" className="absolute -left-[44px] -top-[34px] rotate-[2deg]" />
      </div>
      {/* mão em leque */}
      <div className="absolute bottom-[1%] left-1/2 flex -translate-x-1/2">
        {[
          ['7', 'c', -14],
          ['A', 'e', 0],
          ['2', 'o', 14],
        ].map(([r, s, rot], i) => (
          <Carta
            key={r + s}
            carta={{ r, s }}
            variante="mineiro"
            tamanho="media"
            style={{ transform: `rotate(${rot}deg) translateY(${i === 1 ? -8 : 0}px)`, marginLeft: i ? -18 : 0 }}
          />
        ))}
      </div>
      {/* grito */}
      <div className="animar-grito absolute right-[3%] top-[4%] bg-marca px-5 py-1.5 font-display text-4xl font-extrabold italic tracking-wide text-white shadow-[0_12px_30px_-10px_rgb(229_36_59/0.9)]">
        TRUCO!
      </div>
      {/* placar */}
      <div className="absolute left-0 top-[6%] overflow-hidden rounded-lg border border-linha-forte bg-fundo/95 shadow-2xl">
        <div className="flex items-stretch font-display font-extrabold uppercase">
          <span className="bg-marca px-2.5 py-1 text-sm text-white">Nós</span>
          <span className="numero px-2.5 py-1 text-lg leading-6">11</span>
          <span className="numero px-2.5 py-1 text-lg leading-6 text-suave">9</span>
          <span className="bg-azul px-2.5 py-1 text-sm text-white">Eles</span>
        </div>
        <p className="border-t border-linha px-2.5 py-1 text-center font-display text-[11px] font-bold uppercase tracking-widest text-ouro">Mão de onze</p>
      </div>
    </div>
  )
}

const MODOS = [
  { icone: User, titulo: '1 contra 1', texto: 'Mano a mano. Quem chegar a 12 leva o pote.', link: '/jogar?modo=1x1' },
  { icone: Users, titulo: 'Duplas', texto: 'Caia com um parceiro aleatório ou chame um amigo pelo link.', link: '/jogar?modo=duplas' },
  { icone: Zap, titulo: 'Relâmpago', texto: 'Torneio rápido de 4 ou 8 jogadores. Lotou, começou.', link: '/jogar?modo=relampago' },
  { icone: Trophy, titulo: 'Sala de duplas', texto: 'Seu campeonato: quantas duplas quiser e prêmio do seu jeito.', link: '/salas/nova' },
]

function Simulador() {
  const { config } = useSessao()
  const taxa = config?.taxaCasa ?? 10
  const [duplas, setDuplas] = useState(8)
  const [entrada, setEntrada] = useState(1000)
  const max = maxPremiados(duplas)
  const [premiados, setPremiados] = useState(3)
  const qtd = Math.min(premiados, max)
  const percentuais = DIVISOES_PADRAO[qtd]
  const calculo = useMemo(() => calcularPremios({ entrada, jogadoresPorTime: 2, times: duplas, taxa, percentuais }), [entrada, duplas, taxa, percentuais])
  return (
    <div className="cartao grid overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-7 p-5 sm:p-8">
        <div>
          <p className="rotulo">Quantas duplas</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-linha-forte bg-fundo">
              <button className="grid h-12 w-12 place-items-center text-suave hover:text-white" onClick={() => setDuplas((d) => Math.max(2, d - 1))} aria-label="Menos duplas">
                <Minus size={18} />
              </button>
              <span className="numero w-14 text-center font-display text-4xl font-extrabold">{duplas}</span>
              <button className="grid h-12 w-12 place-items-center text-suave hover:text-white" onClick={() => setDuplas((d) => Math.min(64, d + 1))} aria-label="Mais duplas">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[4, 8, 16, 32].map((n) => (
                <button key={n} className="chip min-h-9 px-3" aria-pressed={duplas === n} onClick={() => setDuplas(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="rotulo">Inscrição por jogador</p>
          <div className="flex flex-wrap gap-2">
            {[500, 1000, 2000, 5000].map((v) => (
              <button key={v} className="chip numero" aria-pressed={entrada === v} onClick={() => setEntrada(v)}>
                {formatarReais(v)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="rotulo">Quem leva prêmio</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="chip" aria-pressed={qtd === n} disabled={n > max} onClick={() => setPremiados(n)} style={n > max ? { opacity: 0.35 } : undefined}>
                {n === 1 ? 'Só a campeã' : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-linha bg-fundo/50 p-5 sm:p-8 lg:border-l lg:border-t-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="rotulo mb-1">Em prêmios</p>
            <p className="numero font-display text-5xl font-extrabold leading-none text-dinheiro">{formatarReais(calculo.liquido)}</p>
          </div>
          <p className="text-right text-sm text-apagado">
            Pote {formatarReais(calculo.pote)}
            <br />
            Taxa {taxa}%: {formatarReais(calculo.comissao)}
          </p>
        </div>
        <TabelaPremios calculo={calculo} percentuais={percentuais} porTime={2} compacta />
        <p className="mt-4 text-sm text-apagado">Os percentuais são livres: você ajusta cada posição ao criar a sala.</p>
      </div>
    </div>
  )
}

const PERGUNTAS = [
  {
    p: 'Como funciona a sala de duplas?',
    r: 'Quem cria escolhe quantas duplas jogam (de 2 a 64), o valor da inscrição e quantas posições recebem prêmio, com os percentuais que quiser. Quando todas as vagas são preenchidas, a chave é sorteada e as partidas começam sozinhas. Ganhou, avança; perdeu, está fora.',
  },
  {
    p: 'O que é o torneio relâmpago?',
    r: 'Uma sala pronta de 4 ou 8 jogadores. Você escolhe o valor, entra e espera lotar: assim que completa, a chave começa. Com 4 jogadores, o campeão leva o pote todo (menos a taxa); com 8, o 1º leva 70% e o 2º 30%.',
  },
  {
    p: 'Como coloco e retiro dinheiro?',
    r: 'Pela Carteira, sempre por PIX. No depósito você recebe a chave e um código; o saldo é liberado assim que o pagamento é confirmado. O saque vai para uma chave PIX no seu nome.',
  },
  {
    p: 'Quanto a casa cobra?',
    r: 'Uma taxa sobre o pote de cada mesa ou sala, mostrada antes de você entrar. O prêmio exibido já é o valor líquido que o vencedor recebe.',
  },
  {
    p: 'E se a minha internet cair?',
    r: 'A mesa continua. Se você não jogar no tempo, o sistema joga a sua carta mais fraca ou corre do pedido. Volte para a mesa assim que reconectar.',
  },
  {
    p: 'Dá para ver as cartas dos outros?',
    r: 'Não. O servidor embaralha com gerador criptográfico e envia a cada jogador só as próprias cartas. Nem o navegador dos adversários recebe as suas.',
  },
]

function Pergunta({ p, r }) {
  const [aberta, setAberta] = useState(false)
  return (
    <div className="border-b border-linha">
      <button className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-xl font-bold uppercase tracking-wide" onClick={() => setAberta((v) => !v)} aria-expanded={aberta}>
        {p}
        <ChevronDown size={20} className={`shrink-0 text-marca-forte transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>
      {aberta && <p className="animar-surgir max-w-2xl pb-6 text-[17px] leading-relaxed text-suave">{r}</p>}
    </div>
  )
}

export default function Inicio() {
  useTitulo(`${site.nome} — Truco online valendo`)
  const lobby = useLobby()
  const { usuario } = useSessao()
  const abertas = [...(lobby?.torneios?.filter((t) => t.status === 'inscricoes') || [])].sort((a, b) => b.inscritos / b.total - a.inscritos / a.total).slice(0, 6)
  const destinoCriar = usuario ? '/salas/nova' : '/cadastro?voltar=/salas/nova'

  return (
    <>
      {/* ───── Herói ───── */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-6 pt-8 md:grid-cols-[1fr_1.05fr] md:pt-14">
        <div className="animar-surgir">
          <p className="sobretitulo">{lobby?.jogando > 0 ? `● ${lobby.jogando} jogando agora` : 'Truco online valendo'}</p>
          <h1 className="titulo mt-4 text-[3.4rem] leading-[0.88] sm:text-[5.2rem]">
            Pede truco.
            <br />
            <span className="relative inline-block px-1">
              <span className="absolute inset-0 -skew-x-[14deg] bg-marca" aria-hidden="true" />
              <span className="relative">Leva o prêmio.</span>
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-suave">
            Paulista ou Mineiro, 1 contra 1 ou em duplas. E salas onde <strong className="text-white">vocês</strong> decidem quantas duplas jogam e quem leva o dinheiro.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/jogar" className="btn btn-primario btn-grande">
              Jogar agora <ArrowRight size={20} />
            </Link>
            <Link to={destinoCriar} className="btn btn-sec btn-grande">
              Criar sala de duplas
            </Link>
          </div>
          <p className="mt-7 flex flex-wrap gap-x-4 gap-y-1 font-display text-sm font-bold uppercase tracking-widest text-apagado">
            <span>Paulista</span>
            <span className="text-marca">/</span>
            <span>Mineiro</span>
            <span className="text-marca">/</span>
            <span>Saque via PIX</span>
          </p>
        </div>
        <CenaMesa />
      </section>

      {/* ───── Ao vivo ───── */}
      <section className="border-y border-linha bg-painel/60">
        <div className="mx-auto flex max-w-6xl items-stretch gap-4 px-4 py-4">
          <div className="flex shrink-0 flex-col justify-center">
            <span className="inline-flex items-center gap-2 bg-marca px-2.5 py-1 font-display text-sm font-extrabold uppercase tracking-widest text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Ao vivo
            </span>
            <span className="mt-1.5 text-xs text-apagado">
              {lobby ? `${lobby.mesas.length} mesas · ${lobby.torneios.length} salas` : 'conectando...'}
            </span>
          </div>
          <div className="-my-1 flex flex-1 gap-3 overflow-x-auto py-1">
            {abertas.length > 0 ? (
              abertas.map((s) => (
                <Link key={s.id} to={`/sala/${s.id}`} className="group flex min-w-[230px] flex-col rounded-xl border border-linha bg-fundo/70 px-4 py-2.5 hover:border-marca/60">
                  <span className="flex items-center gap-2 text-xs text-apagado">
                    {s.relampago && <Zap size={13} className="text-ouro" />}
                    {VARIANTES[s.variante].curto} · {s.inscritos}/{s.total} inscritos
                  </span>
                  <span className="truncate font-display text-lg font-bold uppercase group-hover:text-white">{s.nome}</span>
                  <span className="numero text-sm font-semibold text-dinheiro">{s.entrada ? `${formatarReais(s.premioTotal)} em prêmios` : 'Grátis'}</span>
                </Link>
              ))
            ) : (
              <div className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-dashed border-linha-forte px-4 py-3">
                <p className="text-[15px] text-suave">Nenhuma sala aberta neste momento. Crie a primeira e chame a turma.</p>
                <Link to={destinoCriar} className="btn btn-primario btn-pequeno shrink-0">
                  Criar sala
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───── Modos ───── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="titulo-secao text-4xl">Escolha como jogar</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODOS.map(({ icone: Icone, titulo, texto, link }) => (
            <Link key={titulo} to={link} className="group relative overflow-hidden rounded-2xl border border-linha bg-painel p-6 transition-colors hover:border-marca/60">
              <span className="absolute -right-6 -top-6 h-24 w-24 rotate-12 rounded-2xl bg-azul/10 transition-colors group-hover:bg-marca/15" />
              <Icone size={30} className="relative text-marca-forte" />
              <p className="titulo relative mt-6 text-3xl">{titulo}</p>
              <p className="relative mt-2 text-[15px] text-suave">{texto}</p>
              <span className="relative mt-5 inline-flex items-center gap-1 font-display text-sm font-bold uppercase tracking-wider text-white/80 group-hover:text-white">
                Jogar <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── Simulador ───── */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p className="sobretitulo">Sala de duplas</p>
            <h2 className="titulo mt-3 text-5xl">Vocês montam o campeonato.</h2>
          </div>
          <p className="text-lg text-suave md:pb-1">Escolha quantas duplas, quanto custa entrar e quem leva prêmio. Veja na hora quanto cada um recebe.</p>
        </div>
        <Simulador />
        <div className="mt-6">
          <Link to={destinoCriar} className="btn btn-primario btn-grande">
            Criar minha sala <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ───── Variantes ───── */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="titulo-secao text-4xl">Dois jeitos de trucar</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-linha bg-painel">
            <div className="feltro flex h-44 items-center justify-center gap-4">
              <div className="text-center">
                <Carta carta={{ r: '7', s: 'o' }} tamanho="media" className="-rotate-6" />
                <p className="mt-2 font-display text-xs font-bold uppercase tracking-widest text-white/70">Vira</p>
              </div>
              <ArrowRight className="text-white/60" />
              <div className="text-center">
                <Carta carta={{ r: 'Q', s: 'p' }} variante="paulista" manilha="Q" tamanho="media" className="rotate-3" />
                <p className="mt-2 font-display text-xs font-bold uppercase tracking-widest text-white/70">Manilha</p>
              </div>
            </div>
            <div className="p-6">
              <p className="titulo text-3xl">Truco Paulista</p>
              <p className="mt-2 text-[16px] text-suave">A manilha muda a cada mão: é a carta seguinte à vira. Mão vale 1; truco 3, depois 6, 9 e 12.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-linha bg-painel">
            <div className="feltro flex h-44 items-center justify-center gap-2">
              {[
                ['4', 'p'],
                ['7', 'c'],
                ['A', 'e'],
                ['7', 'o'],
              ].map(([r, s], i) => (
                <Carta key={r + s} carta={{ r, s }} variante="mineiro" tamanho="media" style={{ transform: `rotate(${(i - 1.5) * 4}deg)` }} />
              ))}
            </div>
            <div className="p-6">
              <p className="titulo text-3xl">Truco Mineiro</p>
              <p className="mt-2 text-[16px] text-suave">Manilhas fixas: Zap, Copas, Espadilha e Pica-fumo. Mão vale 2; truco 4, depois 6, 10 e 12.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Confiança ───── */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 border-y border-linha py-12 md:grid-cols-3">
          {[
            ['01', 'Embaralhado pelo servidor', 'Gerador criptográfico. Ninguém escolhe, ninguém prevê as cartas.'],
            ['02', 'Suas cartas são só suas', 'Cada jogador recebe apenas a própria mão. Não existe como espiar.'],
            ['03', 'Dinheiro protegido', 'O valor da mesa fica guardado até o fim. Se algo cair, ele volta para você.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <p className="font-display text-6xl font-extrabold italic leading-none text-marca">{n}</p>
              <p className="titulo mt-4 text-2xl">{t}</p>
              <p className="mt-2 text-[16px] text-suave">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Perguntas ───── */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="titulo-secao text-4xl">Perguntas frequentes</h2>
        <div className="mt-6">
          {PERGUNTAS.map((q) => (
            <Pergunta key={q.p} {...q} />
          ))}
        </div>
      </section>

      {/* ───── Chamada final ───── */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="feltro relative overflow-hidden rounded-3xl border border-white/10 px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-6 top-6 hidden -rotate-12 sm:block">
            <Carta oculta tamanho="grande" />
          </div>
          <div className="pointer-events-none absolute -right-4 bottom-4 hidden rotate-12 sm:block">
            <Carta carta={{ r: '4', s: 'p' }} variante="mineiro" tamanho="grande" />
          </div>
          <Medal className="mx-auto text-ouro" size={34} />
          <h2 className="titulo mt-4 text-5xl sm:text-6xl">A mesa está montada.</h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-white/80">Falta você pedir truco.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={usuario ? '/jogar' : '/cadastro'} className="btn btn-primario btn-grande">
              {usuario ? 'Ir para as mesas' : 'Criar conta grátis'}
            </Link>
            <Link to="/regras" className="btn btn-sec btn-grande">
              Ver as regras
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
