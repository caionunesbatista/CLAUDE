import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  Swords,
  Users,
  Trophy,
  ShieldCheck,
  Shuffle,
  Timer,
  Banknote,
  UserPlus,
  Wallet,
  Gamepad2,
  ChevronDown,
  Minus,
  Plus,
  Sparkles,
  Lock,
} from 'lucide-react'
import { Carta } from '../components/Carta.jsx'
import { TabelaPremios } from '../components/Premiacao.jsx'
import { useSessao } from '../store/sessao.js'
import { useLobby } from '../lib/useLobby.js'
import { formatarReais } from '../lib/formato.js'
import { calcularPremios } from '../../shared/premios.js'
import { DIVISOES_PADRAO, maxPremiados, VARIANTES } from '../../shared/regras.js'
import { site } from '../config/site.js'
import { useTitulo } from '../components/ui.jsx'

function MesaIlustrada() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px]">
      <div className="feltro absolute inset-[6%] rounded-[44%] border-[10px] border-[#3a2616] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),inset_0_0_60px_rgb(0_0_0/0.5)]" />
      <div className="absolute inset-[6%] rounded-[44%] ring-1 ring-ouro/30" />
      {/* cartas jogadas */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-44 w-56">
          <Carta carta={{ r: '3', s: 'o' }} tamanho="media" className="absolute left-2 top-10 -rotate-[14deg]" />
          <Carta carta={{ r: '4', s: 'p' }} variante="mineiro" destaque tamanho="media" className="absolute left-[78px] top-3 rotate-[3deg]" />
          <Carta carta={{ r: 'K', s: 'e' }} tamanho="media" className="absolute right-2 top-12 rotate-[16deg]" />
        </div>
      </div>
      {/* balão de truco */}
      <div className="animar-grito absolute right-[4%] top-[6%] rounded-2xl bg-truco px-4 py-2 font-display text-2xl font-black italic text-white shadow-[0_10px_30px_-8px_rgb(255_77_94/0.8)]">
        TRUCO!
      </div>
      {/* placar */}
      <div className="absolute bottom-[3%] left-[2%] rounded-2xl border border-linha bg-painel/95 px-4 py-2.5 shadow-2xl backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-wider text-apagado">Placar</p>
        <p className="numero titulo text-xl">
          <span className="text-ouro">Nós 11</span> <span className="text-apagado">×</span> 9 Eles
        </p>
      </div>
      {/* prêmio */}
      <div className="absolute bottom-[10%] right-0 rounded-2xl border border-ouro/40 bg-painel/95 px-4 py-2.5 shadow-2xl backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-wider text-apagado">Sala · 16 duplas · R$ 10</p>
        <p className="numero titulo text-xl text-dinheiro">{formatarReais(28800)} em prêmios</p>
      </div>
    </div>
  )
}

function Simulador() {
  const { config } = useSessao()
  const taxa = config?.taxaCasa ?? 10
  const [duplas, setDuplas] = useState(8)
  const [entrada, setEntrada] = useState(1000)
  const max = maxPremiados(duplas)
  const [premiados, setPremiados] = useState(3)
  const qtd = Math.min(premiados, max)
  const percentuais = DIVISOES_PADRAO[qtd]
  const calculo = useMemo(
    () => calcularPremios({ entrada, jogadoresPorTime: 2, times: duplas, taxa, percentuais }),
    [entrada, duplas, taxa, percentuais],
  )
  const valores = [500, 1000, 2000, 5000]
  return (
    <div className="cartao grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <div>
          <p className="rotulo">Quantas duplas?</p>
          <div className="flex items-center gap-3">
            <button className="btn btn-sec h-12 w-12 px-0" onClick={() => setDuplas((d) => Math.max(2, d - 1))} aria-label="Menos duplas">
              <Minus size={18} />
            </button>
            <span className="numero titulo w-16 text-center text-4xl">{duplas}</span>
            <button className="btn btn-sec h-12 w-12 px-0" onClick={() => setDuplas((d) => Math.min(64, d + 1))} aria-label="Mais duplas">
              <Plus size={18} />
            </button>
            <div className="ml-2 flex flex-wrap gap-1.5">
              {[4, 8, 16, 32].map((n) => (
                <button key={n} className="chip min-h-8 px-3 text-xs" aria-pressed={duplas === n} onClick={() => setDuplas(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="rotulo">Inscrição por jogador</p>
          <div className="flex flex-wrap gap-2">
            {valores.map((v) => (
              <button key={v} className="chip" aria-pressed={entrada === v} onClick={() => setEntrada(v)}>
                {formatarReais(v)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="rotulo">Quantas duplas levam prêmio?</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="chip" aria-pressed={qtd === n} disabled={n > max} onClick={() => setPremiados(n)} style={n > max ? { opacity: 0.35 } : undefined}>
                {n === 1 ? 'Só a campeã' : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-linha bg-fundo/50 p-4 sm:p-5">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-apagado">Pote</p>
            <p className="numero font-bold">{formatarReais(calculo.pote)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-apagado">Taxa ({taxa}%)</p>
            <p className="numero font-bold text-suave">{formatarReais(calculo.comissao)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-apagado">Em prêmios</p>
            <p className="numero font-bold text-dinheiro">{formatarReais(calculo.liquido)}</p>
          </div>
        </div>
        <TabelaPremios calculo={calculo} percentuais={percentuais} porTime={2} compacta />
        <p className="mt-3 text-xs text-apagado">Os percentuais podem ser ajustados livremente ao criar a sala.</p>
      </div>
    </div>
  )
}

const PERGUNTAS = [
  {
    p: 'Como funciona a sala de duplas?',
    r: 'Quem cria escolhe quantas duplas vão jogar (de 2 a 64), o valor da inscrição e quantas duplas recebem prêmio (só a campeã, top 2, top 3 ou top 4, com os percentuais que quiser). Quando todas as vagas são preenchidas, a sala sorteia a chave e as partidas começam sozinhas. Ganhou, avança; perdeu, está fora. Se houver prêmio para 3º e 4º, rola a disputa de 3º lugar.',
  },
  {
    p: 'Como coloco e retiro dinheiro?',
    r: 'Pela Carteira. O depósito é por PIX: você informa o valor, faz o PIX com o código indicado e o saldo é liberado assim que o pagamento é confirmado. O saque também é por PIX, para uma chave no seu nome.',
  },
  {
    p: 'Quanto a casa cobra?',
    r: 'Uma taxa sobre o pote de cada mesa ou sala, mostrada antes de você entrar. O prêmio que aparece na mesa já é o valor líquido que o vencedor recebe.',
  },
  {
    p: 'E se a minha internet cair no meio da partida?',
    r: 'A mesa continua. Se você não jogar dentro do tempo, o sistema faz a jogada automática (descarta a menor carta ou corre do pedido). Volte para a mesa assim que reconectar: tudo continua de onde parou.',
  },
  {
    p: 'Dá para ver as cartas dos outros?',
    r: 'Não. Quem embaralha e distribui é o servidor, com gerador criptográfico, e cada jogador recebe só as próprias cartas. Nem o navegador dos adversários tem acesso às suas.',
  },
  {
    p: 'Posso treinar antes de jogar valendo?',
    r: 'Pode. No modo treino você joga contra o computador, de graça, em Paulista ou Mineiro, 1x1 ou em duplas. Também dá para criar mesas amistosas sem valor com os amigos.',
  },
]

function Pergunta({ p, r }) {
  const [aberta, setAberta] = useState(false)
  return (
    <div className="border-b border-linha">
      <button className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold" onClick={() => setAberta((v) => !v)} aria-expanded={aberta}>
        {p}
        <ChevronDown size={18} className={`shrink-0 text-suave transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>
      {aberta && <p className="animar-surgir pb-5 text-sm leading-relaxed text-suave">{r}</p>}
    </div>
  )
}

export default function Inicio() {
  useTitulo(`${site.nome} — Truco online valendo`)
  const lobby = useLobby()
  const { usuario } = useSessao()
  const salas = lobby?.torneios?.filter((t) => t.status === 'inscricoes').slice(0, 3) || []

  return (
    <>
      {/* ───── Herói ───── */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-8 md:grid-cols-[1.05fr_1fr] md:pt-16">
        <div className="animar-surgir">
          <span className="selo bg-dinheiro/10 text-dinheiro">
            <span className="h-2 w-2 animate-pulse rounded-full bg-dinheiro" />
            {lobby?.jogando > 0 ? `${lobby.jogando} jogando agora` : 'Mesas abertas 24 horas'}
          </span>
          <h1 className="titulo mt-5 text-[2.7rem] sm:text-6xl">
            Truco valendo,
            <br />
            <span className="bg-gradient-to-r from-ouro-forte to-ouro bg-clip-text text-transparent">do seu jeito.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-suave">
            Mesas 1x1 e em duplas, Paulista ou Mineiro. E salas onde <strong className="text-texto">vocês</strong> decidem quantas duplas jogam e como o prêmio é dividido.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/jogar" className="btn btn-ouro btn-grande">
              <Swords size={20} /> Jogar agora
            </Link>
            <Link to={usuario ? '/salas/nova' : '/cadastro?voltar=/salas/nova'} className="btn btn-sec btn-grande">
              <Users size={20} /> Criar sala de duplas
            </Link>
          </div>
          <ul className="mt-8 grid max-w-lg grid-cols-3 gap-3 text-sm">
            {[
              ['Paulista e Mineiro', Shuffle],
              ['1x1 e duplas', Users],
              ['Saque via PIX', Banknote],
            ].map(([t, I]) => (
              <li key={t} className="flex items-center gap-2 text-suave">
                <I size={16} className="shrink-0 text-ouro" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <MesaIlustrada />
      </section>

      {/* ───── Salas abertas ───── */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="titulo text-2xl">Salas abertas agora</h2>
            <p className="text-sm text-suave">{lobby ? `${lobby.mesas.length} mesa(s) e ${lobby.torneios.length} sala(s) de duplas no ar` : 'Carregando...'}</p>
          </div>
          <Link to="/salas" className="text-sm font-semibold text-ouro hover:underline">
            Ver todas
          </Link>
        </div>
        {salas.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {salas.map((s) => (
              <Link key={s.id} to={`/sala/${s.id}`} className="cartao group p-4 transition-colors hover:border-ouro/50">
                <div className="flex items-center justify-between">
                  <span className="selo">{VARIANTES[s.variante].curto}</span>
                  <span className="numero text-sm text-suave">
                    {s.inscritos}/{s.total} inscritos
                  </span>
                </div>
                <p className="titulo mt-3 truncate text-lg group-hover:text-ouro">{s.nome}</p>
                <p className="mt-1 text-sm text-suave">
                  {s.times} {s.formato === 'duplas' ? 'duplas' : 'jogadores'} · inscrição {s.entrada ? formatarReais(s.entrada) : 'grátis'}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-painel-3">
                  <div className="h-full rounded-full bg-ouro" style={{ width: `${(s.inscritos / s.total) * 100}%` }} />
                </div>
                <p className="numero mt-3 font-bold text-dinheiro">{formatarReais(s.premioTotal)} em prêmios</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="cartao flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
            <Trophy className="text-ouro" size={28} />
            <p className="flex-1 text-suave">Nenhuma sala de duplas aberta neste momento. Que tal criar a primeira e chamar a turma?</p>
            <Link to={usuario ? '/salas/nova' : '/cadastro?voltar=/salas/nova'} className="btn btn-ouro">
              Criar sala
            </Link>
          </div>
        )}
      </section>

      {/* ───── Simulador da sala de duplas ───── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 max-w-2xl">
          <span className="selo bg-ouro/10 text-ouro">
            <Sparkles size={12} /> Sala de duplas
          </span>
          <h2 className="titulo mt-3 text-3xl sm:text-4xl">Vocês montam o campeonato. A gente cuida do resto.</h2>
          <p className="mt-3 text-suave">
            Escolha quantas duplas, o valor da inscrição e quem leva prêmio. Mexa abaixo e veja na hora quanto cada um recebe.
          </p>
        </div>
        <Simulador />
      </section>

      {/* ───── Como funciona ───── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="titulo text-3xl">Como funciona</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [UserPlus, 'Crie sua conta', 'Cadastro rápido com CPF. Uma conta por pessoa, maiores de 18.'],
            [Wallet, 'Deposite via PIX', 'Coloque o valor que quiser. Saldo liberado após a confirmação do PIX.'],
            [Gamepad2, 'Escolha a mesa', 'Jogo rápido, mesa com os amigos ou sala de duplas com chaveamento.'],
            [Banknote, 'Ganhou, sacou', 'O prêmio cai na hora no seu saldo. Saque por PIX quando quiser.'],
          ].map(([Icone, t, d], i) => (
            <div key={t} className="cartao relative p-5">
              <span className="numero absolute right-4 top-3 font-display text-4xl font-black text-painel-3">{i + 1}</span>
              <Icone className="text-ouro" size={26} />
              <p className="titulo mt-4 text-lg">{t}</p>
              <p className="mt-1.5 text-sm text-suave">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Modos ───── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="titulo text-3xl">Dois jeitos de trucar</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="cartao overflow-hidden">
            <div className="feltro flex h-36 items-center justify-center gap-3">
              <Carta carta={{ r: '7', s: 'o' }} tamanho="pequena" className="-rotate-6" />
              <span className="text-xl text-white/60">→</span>
              <Carta carta={{ r: 'Q', s: 'p' }} variante="paulista" manilha="Q" tamanho="pequena" className="rotate-3" />
            </div>
            <div className="p-5">
              <p className="titulo text-xl">Truco Paulista</p>
              <p className="mt-2 text-sm text-suave">
                Manilha muda a cada mão: é a carta seguinte à <strong className="text-texto">vira</strong>. Mão vale 1, truco 3, depois 6, 9 e 12. Mão de onze e mão de ferro.
              </p>
            </div>
          </div>
          <div className="cartao overflow-hidden">
            <div className="feltro flex h-36 items-center justify-center gap-2">
              {[
                ['4', 'p'],
                ['7', 'c'],
                ['A', 'e'],
                ['7', 'o'],
              ].map(([r, s], i) => (
                <Carta key={r + s} carta={{ r, s }} variante="mineiro" tamanho="pequena" style={{ transform: `rotate(${(i - 1.5) * 4}deg)` }} />
              ))}
            </div>
            <div className="p-5">
              <p className="titulo text-xl">Truco Mineiro</p>
              <p className="mt-2 text-sm text-suave">
                Manilhas fixas: Zap, Copas, Espadilha e Pica-fumo. Mão vale 2, truco 4, depois 6, 10 e 12. Mão de dez.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Segurança ───── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="cartao grid gap-6 p-6 sm:p-8 md:grid-cols-3">
          {[
            [Shuffle, 'Embaralhamento criptográfico', 'O servidor embaralha com gerador criptográfico. Ninguém escolhe as cartas.'],
            [Lock, 'Suas cartas só com você', 'Cada jogador recebe apenas a própria mão. Não existe como espiar.'],
            [ShieldCheck, 'Saldo protegido', 'O valor da mesa fica retido até o fim. Se algo cair, ele volta para você.'],
          ].map(([I, t, d]) => (
            <div key={t}>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-ouro/10 text-ouro">
                <I size={22} />
              </div>
              <p className="titulo mt-4 text-lg">{t}</p>
              <p className="mt-1.5 text-sm text-suave">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Perguntas ───── */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="titulo text-3xl">Perguntas frequentes</h2>
        <div className="mt-6">
          {PERGUNTAS.map((q) => (
            <Pergunta key={q.p} {...q} />
          ))}
        </div>
      </section>

      {/* ───── Chamada final ───── */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="feltro relative overflow-hidden rounded-3xl border border-ouro/30 p-8 text-center sm:p-12">
          <Timer className="mx-auto text-ouro" size={30} />
          <h2 className="titulo mt-4 text-3xl sm:text-4xl">A mesa está montada.</h2>
          <p className="mx-auto mt-3 max-w-md text-white/75">Falta você pedir truco.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to={usuario ? '/jogar' : '/cadastro'} className="btn btn-ouro btn-grande">
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
