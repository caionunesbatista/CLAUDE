// Mesa de jogo em tela cheia. Toda a regra está no servidor: aqui mostramos o estado e enviamos as ações.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Share2, MessageCircle, EyeOff, Eye, WifiOff, Trophy, Frown, LogOut, Armchair, Crown, Volume2, VolumeX, Smile, Hand, Moon, Sun, RotateCcw } from 'lucide-react'
import { obterSocket, emitir } from '../lib/socket.js'
import { api } from '../lib/api.js'
import { useSessao, avisar } from '../store/sessao.js'
import { formatarReais, copiar } from '../lib/formato.js'
import { sons, vibrar, estaMudo, alternarSom } from '../lib/sons.js'
import { VARIANTES, FRASES, SINAIS, REACOES, NOME_VALOR } from '../../shared/regras.js'
import { Carta, LequeVerso } from '../components/Carta.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { Modal, Carregando, Vazio, useTitulo } from '../components/ui.jsx'
import { site } from '../config/site.js'

const COR_NOS = '#e5243b'
const COR_ELES = '#8db4ff'

// ---------- dados em tempo real ----------

function useMesa(id) {
  const [mesa, setMesa] = useState(null)
  const [erro, setErro] = useState(null)
  const [sinal, setSinal] = useState(null)
  const [reacoes, setReacoes] = useState([])
  const desvio = useRef(0) // diferença entre o relógio do servidor e o do aparelho
  useEffect(() => {
    const s = obterSocket()
    const entrar = () =>
      s.emit('mesa:entrar', id, (r) => {
        if (r?.erro) setErro(r.erro)
      })
    const aoEstado = (m) => {
      if (m.id !== id) return
      desvio.current = m.agora - Date.now()
      setMesa(m)
    }
    const aoSinal = (dados) => dados.mesaId === id && setSinal({ ...dados, ate: Date.now() + 6000 })
    const aoReagir = (dados) => {
      if (dados.mesaId !== id) return
      sons.reacao()
      setReacoes((lista) => [...lista.filter((r) => r.ate > Date.now()).slice(-8), { ...dados, ate: Date.now() + 2300 }])
    }
    s.on('mesa:estado', aoEstado)
    s.on('mesa:sinal', aoSinal)
    s.on('mesa:reacao', aoReagir)
    s.on('connect', entrar)
    if (s.connected) entrar()
    return () => {
      s.off('mesa:estado', aoEstado)
      s.off('mesa:sinal', aoSinal)
      s.off('mesa:reacao', aoReagir)
      s.off('connect', entrar)
      s.emit('mesa:sair', id)
    }
  }, [id])
  return { mesa, erro, sinal, reacoes, desvio }
}

function useRelogio(intervalo = 250) {
  const [agora, setAgora] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervalo)
    return () => clearInterval(t)
  }, [intervalo])
  return agora
}

function useTela() {
  const ler = () => ({ largura: window.innerWidth, altura: window.innerHeight })
  const [tela, setTela] = useState(ler)
  useEffect(() => {
    const f = () => setTela(ler())
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return tela
}

// ---------- geometria ----------

/** Posição relativa a quem olha: você sempre embaixo; o próximo a jogar à sua direita. */
function posicaoRelativa(assento, base, n) {
  const rel = (assento - base + n) % n
  if (n === 2) return rel === 0 ? 'baixo' : 'cima'
  return ['baixo', 'direita', 'cima', 'esquerda'][rel]
}

const ORIGEM = { baixo: ['0px', '160px'], cima: ['0px', '-160px'], esquerda: ['-160px', '0px'], direita: ['160px', '0px'] }
const ROTACAO = { baixo: -3, cima: 4, esquerda: -9, direita: 8 }

// ---------- peças ----------

function Assento({ info, posicao, eAVez, fracao, carteador, qtdCartas, frase, sinal, meuTime, compacto }) {
  const parceiro = info.time === meuTime
  const cor = parceiro ? COR_NOS : COR_ELES
  const lado = compacto ? 48 : 60
  const r = 28
  const c = 2 * Math.PI * r
  return (
    <div className={`relative flex items-center ${posicao === 'cima' ? 'flex-row gap-3' : 'flex-col'}`}>
      <div className="relative flex flex-col items-center">
      {(frase || sinal) && (
        <div
          className={`animar-surgir absolute z-30 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold shadow-xl ${
            sinal ? 'bg-azul text-white' : 'bg-white text-[#0c1429]'
          } ${posicao === 'cima' ? 'top-full mt-2' : '-top-10'}`}
        >
          {sinal ? `Sinal: ${sinal}` : frase}
        </div>
      )}
      <div className="relative" style={{ width: lado + 8, height: lado + 8 }}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(0 0 0 / 0.35)" strokeWidth="3.5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={cor} strokeOpacity={eAVez ? 0.25 : 0.55} strokeWidth="3.5" />
          {eAVez && (
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke={fracao < 0.25 ? '#ff3d52' : cor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - fracao)}
              style={{ transition: 'stroke-dashoffset 0.25s linear' }}
            />
          )}
        </svg>
        <div className="absolute inset-[4px]">
          <Avatar avatar={info.avatar} apelido={info.apelido} bot={info.bot} tamanho={lado} />
        </div>
        {carteador && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white font-display text-[11px] font-extrabold text-[#0c1429] shadow" title="Deu as cartas">
            D
          </span>
        )}
        {!info.conectado && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-marca text-white shadow" title="Desconectado">
            <WifiOff size={11} />
          </span>
        )}
      </div>
      <div className="-mt-1.5 flex max-w-[132px] items-center gap-1 rounded-md border border-white/10 bg-[#060b19]/85 px-2 py-0.5 shadow-lg">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cor }} />
        <span className="truncate font-display text-sm font-bold uppercase tracking-wide text-white">{info.apelido}</span>
        {compacto && qtdCartas > 0 && <span className="numero font-display text-sm font-bold text-white/50">·{qtdCartas}</span>}
      </div>
      </div>
      {/* Cartas na mão: ao lado do avatar para quem está em frente, embaixo para os laterais */}
      {!compacto && qtdCartas > 0 && (
        <div className={posicao === 'cima' ? '' : 'mt-1.5'}>
          <LequeVerso quantidade={qtdCartas} tamanho="mini" />
        </div>
      )}
    </div>
  )
}

function MarcadorVazas({ vazas, meuTime }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Resultado das vazas">
      {[0, 1, 2].map((i) => {
        const v = vazas[i]
        let estilo = { border: '2px solid rgb(255 255 255 / 0.25)' }
        let titulo = `${i + 1}ª vaza`
        if (v) {
          if (v.resultado === 'empate') {
            estilo = { background: 'rgb(255 255 255 / 0.55)' }
            titulo += ': empatou'
          } else {
            estilo = { background: v.resultado === meuTime ? COR_NOS : COR_ELES }
            titulo += v.resultado === meuTime ? ': nossa' : ': deles'
          }
        }
        return <span key={i} title={titulo} className="h-3.5 w-3.5 skew-x-[-14deg] rounded-[3px]" style={estilo} />
      })}
    </div>
  )
}

function textoEvento(ev, mesa, meuTime) {
  const nome = (a) => mesa.assentos[a]?.apelido || 'Alguém'
  switch (ev.tipo) {
    case 'pedido':
      return { grande: `${ev.nome}!`, pequeno: `${nome(ev.assento)} pediu · vale ${ev.valor}`, cor: 'bg-marca text-white', tremer: true }
    case 'aceitou':
      return { grande: 'Aceito!', pequeno: `${nome(ev.assento)} aceitou · vale ${ev.valor}`, cor: 'bg-dinheiro text-[#032617]' }
    case 'correu':
      return { grande: 'Correu!', pequeno: `${nome(ev.assento)} correu`, cor: 'bg-painel-3 text-white' }
    case 'onzeJogar':
      return { grande: 'Vamos jogar!', pequeno: `Mão especial valendo ${ev.valor}`, cor: 'bg-azul text-white' }
    case 'onzeCorrer':
      return { grande: 'Correram!', pequeno: 'Recusaram a mão especial', cor: 'bg-painel-3 text-white' }
    case 'ferroDecidido':
      return ev.escuro
        ? { grande: 'Nas escuras!', pequeno: `${ev.sim} votos para jogar às cegas`, cor: 'bg-[#0a0f1f] text-white ring-2 ring-white/20' }
        : { grande: 'Jogo normal', pequeno: 'Cartas à vista na mão de ferro', cor: 'bg-azul text-white' }
    case 'tempoEsgotado':
      return { grande: 'Tempo!', pequeno: `${nome(ev.assento)} não jogou a tempo`, cor: 'bg-painel-3 text-white' }
    case 'fimMao': {
      if (ev.vencedorTime === null) return { faixa: 'Mão empatada — ninguém pontua', cor: 'bg-painel-3 text-white' }
      const nos = ev.vencedorTime === meuTime
      const quem = mesa.jogadores === 2 ? (nos ? 'Você fez' : 'Adversário fez') : nos ? 'Nós fizemos' : 'Eles fizeram'
      const extra = ev.motivo === 'correu' || ev.motivo === 'correuOnze' ? ' · correram' : ''
      return { faixa: `${quem} +${ev.pontos}${extra}`, cor: nos ? 'bg-marca text-white' : 'bg-azul text-white' }
    }
    default:
      return null
  }
}

function SalaDeEspera({ mesa, aoSentar, aoTrocar, aoSair, ocupado }) {
  const { usuario } = useSessao()
  const sentado = mesa.meuAssento !== null
  const faltam = mesa.jogadores - mesa.assentos.filter(Boolean).length
  async function convidar() {
    const link = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: site.nome, text: 'Bora jogar truco?', url: link })
        return
      } catch {
        // cancelado: copia
      }
    }
    if (await copiar(link)) avisar.sucesso('Link da mesa copiado!')
  }
  const dupla = (i) => (i % 2 === 0 ? 'A' : 'B')
  return (
    <div className="animar-surgir mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#060b19]/80 p-5 text-center shadow-2xl backdrop-blur-md">
      <p className="sobretitulo">Aguardando jogadores</p>
      <p className="titulo mt-2 text-4xl text-white">{faltam === 1 ? 'Falta 1' : `Faltam ${faltam}`}</p>
      {mesa.aposta > 0 && (
        <p className="mt-2 text-[15px] text-white/75">
          {formatarReais(mesa.aposta)} por jogador · {mesa.jogadores === 4 ? 'cada vencedor leva' : 'o vencedor leva'}{' '}
          <strong className="numero text-dinheiro">{formatarReais(mesa.premio)}</strong>
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {mesa.assentos.map((a, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            {mesa.jogadores === 4 && (
              <p className="mb-2 font-display text-xs font-bold uppercase tracking-widest" style={{ color: i % 2 === 0 ? COR_NOS : COR_ELES }}>
                Dupla {dupla(i)}
              </p>
            )}
            {a ? (
              <div className="flex items-center justify-center gap-2">
                <Avatar avatar={a.avatar} apelido={a.apelido} tamanho={28} />
                <span className="truncate font-semibold text-white">
                  {a.apelido} {a.eu && <span className="text-marca-forte">(você)</span>}
                </span>
              </div>
            ) : (
              <button
                disabled={ocupado}
                className="w-full rounded-lg border border-dashed border-white/30 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-white/80 hover:border-marca hover:text-white"
                onClick={() => (sentado ? aoTrocar(i) : aoSentar(i))}
              >
                {sentado ? 'Mudar para cá' : 'Sentar aqui'}
              </button>
            )}
          </div>
        ))}
      </div>
      {mesa.jogadores === 4 && <p className="mt-3 text-sm text-white/55">Dupla A contra Dupla B. Sente na mesma dupla do seu parceiro.</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="btn btn-primario btn-pequeno" onClick={convidar}>
          <Share2 size={16} /> Convidar
        </button>
        {sentado && (
          <button className="btn btn-sec btn-pequeno" onClick={aoSair} disabled={ocupado}>
            <LogOut size={16} /> Sair {mesa.aposta > 0 ? '(devolve)' : ''}
          </button>
        )}
        {!usuario && (
          <Link to={`/entrar?voltar=/mesa/${mesa.id}`} className="btn btn-primario btn-pequeno">
            Entrar para jogar
          </Link>
        )}
      </div>
    </div>
  )
}

function FimDeJogo({ mesa, meuTime, aoJogarDeNovo, aoRevanche, agora, ocupado }) {
  const r = mesa.resultado
  if (r?.cancelada) {
    return (
      <div className="animar-surgir mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#060b19]/90 p-6 text-center shadow-2xl backdrop-blur-md">
        <p className="titulo text-3xl text-white">Mesa encerrada</p>
        <p className="mt-2 text-white/75">{r.motivo}</p>
        <Link to="/jogar" className="btn btn-primario mt-5">
          Voltar para as mesas
        </Link>
      </div>
    )
  }
  const jogou = mesa.meuAssento !== null
  const venceu = jogou && r.vencedorTime === meuTime
  const rev = mesa.revanche
  const prazoRevanche = rev?.ate ?? mesa.revancheAte
  const restante = prazoRevanche ? Math.max(0, Math.ceil((prazoRevanche - agora) / 1000)) : 0
  const revancheAberta = mesa.tipo === 'dinheiro' && jogou && !rev?.novaMesa && restante > 0
  const pedi = rev?.votos?.includes(mesa.meuAssento)
  return (
    <div className="animar-surgir mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#060b19]/92 text-center shadow-2xl backdrop-blur-md">
      <div className={`px-6 pb-5 pt-6 ${venceu ? 'bg-marca' : 'bg-white/[0.04]'}`}>
        {venceu ? <Trophy className="mx-auto text-white" size={38} /> : jogou ? <Frown className="mx-auto text-white/70" size={38} /> : <Crown className="mx-auto text-white/70" size={38} />}
        <p className="titulo mt-3 text-4xl text-white">{!jogou ? 'Fim de jogo' : venceu ? (mesa.jogadores === 4 ? 'Vocês venceram!' : 'Você venceu!') : 'Não foi dessa vez'}</p>
        <p className="numero mt-1 font-display text-2xl font-extrabold text-white/85">
          {r.placar[meuTime]} × {r.placar[1 - meuTime]}
        </p>
      </div>
      <div className="space-y-2 p-5">
        {venceu && r.premio > 0 && <p className="numero font-display text-4xl font-extrabold text-dinheiro">+{formatarReais(r.premio)}</p>}
        {venceu && mesa.torneio && <p className="text-sm text-white/75">Classificados! Aguarde o próximo jogo na sala.</p>}
        {mesa.torneio ? (
          <Link to={`/sala/${mesa.torneio.id}`} className="btn btn-primario w-full">
            Voltar para a sala
          </Link>
        ) : revancheAberta ? (
          <>
            <button className="btn btn-primario w-full" disabled={pedi || ocupado} onClick={aoRevanche}>
              <RotateCcw size={18} /> {pedi ? 'Revanche pedida' : 'Revanche'}
              <span className="numero opacity-80">
                · {rev?.votos.length || 0}/{mesa.jogadores}
              </span>
            </button>
            <p className="text-xs text-white/55">
              {pedi ? `Esperando os outros · ${restante}s` : rev?.votos.length ? `${rev.votos.length} jogador(es) querem revanche · ${restante}s` : `Mesmos jogadores, mesmo valor · ${restante}s`}
            </p>
            {rev?.recusada && <p className="text-sm text-marca-forte">{rev.recusada}</p>}
          </>
        ) : (
          jogou &&
          mesa.tipo !== 'torneio' && (
            <button className="btn btn-primario w-full" onClick={aoJogarDeNovo} disabled={ocupado}>
              {mesa.tipo === 'treino' ? 'Treinar de novo' : 'Jogar de novo'}
            </button>
          )
        )}
        {revancheAberta && (
          <button className="btn btn-sec w-full" onClick={aoJogarDeNovo} disabled={ocupado}>
            Nova mesa
          </button>
        )}
        <Link to="/jogar" className="btn btn-fantasma w-full">
          Ir para o lobby
        </Link>
      </div>
    </div>
  )
}

/** Painel de votação da mão de ferro (11 a 11 / 10 a 10). */
function VotacaoFerro({ mao, mesa, podeVotar, enviando, aoVotar }) {
  const votos = mao.votos || []
  const sim = votos.filter((v) => v === 'escuro').length
  const meuVoto = mesa.meuAssento !== null ? votos[mesa.meuAssento] : null
  return (
    <div className="animar-surgir mb-3 rounded-xl border border-white/15 bg-[#0a0f1f] p-4">
      <p className="text-center font-display text-2xl font-extrabold uppercase italic leading-none text-white">Mão de ferro!</p>
      <p className="mt-1.5 text-center text-sm text-suave">
        Jogar com as cartas à vista ou nas escuras? Nas escuras precisa de <strong className="text-white">{mao.votosParaEscuro} votos</strong>
        {mesa.jogadores === 4 ? ' dos 4' : ' (os dois)'}.
      </p>
      <div className="mt-3 flex justify-center gap-2" aria-label="Votos">
        {votos.map((v, i) => (
          <span
            key={i}
            title={`${mesa.assentos[i]?.apelido}: ${v === 'escuro' ? 'escuro' : v === 'normal' ? 'normal' : 'ainda não votou'}`}
            className={`grid h-8 w-8 place-items-center rounded-full border-2 ${v === 'escuro' ? 'border-white bg-white text-[#0a0f1f]' : v === 'normal' ? 'border-azul bg-azul text-white' : 'border-white/25 text-white/40'}`}
          >
            {v === 'escuro' ? <Moon size={15} /> : v === 'normal' ? <Sun size={15} /> : '?'}
          </span>
        ))}
      </div>
      {podeVotar ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn btn-azul" disabled={enviando} onClick={() => aoVotar(false)}>
            <Sun size={18} /> Normal
          </button>
          <button className="btn bg-white text-[#0a0f1f] hover:bg-white/90" disabled={enviando} onClick={() => aoVotar(true)}>
            <Moon size={18} /> Nas escuras
          </button>
        </div>
      ) : (
        <p className="mt-3 text-center text-sm text-white/70">
          {meuVoto ? `Você votou ${meuVoto === 'escuro' ? 'nas escuras' : 'normal'}. ` : ''}
          {sim}/{mao.votosParaEscuro} para o escuro · aguardando...
        </p>
      )}
    </div>
  )
}

// ---------- página ----------

export default function Mesa() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { mesa, erro, sinal, reacoes, desvio } = useMesa(id)
  const agora = useRelogio()
  const { largura, altura } = useTela()
  const [enviando, setEnviando] = useState(false)
  const [esconder, setEsconder] = useState(false)
  const [painel, setPainel] = useState(null) // 'reacoes' | 'frases' | 'sinais'
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [chamada, setChamada] = useState(null)
  const [mudo, setMudo] = useState(estaMudo)
  const ultimoEvento = useRef(null)
  const eraMinhaVez = useRef(false)

  const variante = mesa ? VARIANTES[mesa.variante] : null
  useTitulo(mesa ? `${variante.curto} ${mesa.jogadores === 4 ? '2x2' : '1x1'} — ${site.nome}` : `Mesa — ${site.nome}`)

  const jogo = mesa?.jogo
  const mao = jogo?.mao
  const acoes = jogo?.acoes || {}
  const base = mesa?.meuAssento ?? 0
  const meuTime = base % 2
  const n = mesa?.jogadores ?? 4
  const jogando = mesa?.status === 'jogando'
  const ehMinhaVez = Boolean(jogando && acoes.jogar)
  const asCegas = Boolean(mao?.minhasCartas?.[0]?.oculta)

  const compacto = altura < 720 || largura < 380
  // Tamanhos pela tela: nada pode encostar nos jogadores sentados.
  const tamanhoMesa = compacto ? 'pequena' : largura < 768 || altura < 900 ? 'media' : 'grande'
  const larguraMao = compacto ? 70 : altura < 900 ? 92 : 108
  const deslocamento = { pequena: [60, 40], media: [80, 54], grande: [104, 76] }[tamanhoMesa]

  // Gritos, sons e resultado de cada mão.
  useEffect(() => {
    if (!jogo?.eventos?.length) return
    const ultimo = jogo.eventos[jogo.eventos.length - 1]
    if (ultimoEvento.current === null) {
      ultimoEvento.current = ultimo.id
      return
    }
    const novos = jogo.eventos.filter((e) => e.id > ultimoEvento.current)
    ultimoEvento.current = ultimo.id
    for (const e of novos) {
      if (e.tipo === 'jogada') sons.carta()
      else if (e.tipo === 'pedido') sons.truco()
      else if (e.tipo === 'aceitou') sons.aceitou()
      else if (e.tipo === 'correu' || e.tipo === 'onzeCorrer') sons.correu()
      else if (e.tipo === 'novaMao') sons.distribuir()
      else if (e.tipo === 'fimMao' && e.vencedorTime === meuTime) sons.ponto()
      else if (e.tipo === 'fimPartida' && mesa.meuAssento !== null) (e.vencedor === meuTime ? sons.vitoria : sons.derrota)()
    }
    const relevante = [...novos].reverse().find((e) => textoEvento(e, mesa, meuTime))
    if (relevante) {
      const texto = textoEvento(relevante, mesa, meuTime)
      setChamada({ ...texto, id: relevante.id, ate: Date.now() + (texto.faixa ? 2400 : 1800) })
    }
  }, [jogo?.eventos, mesa, meuTime])

  // Aviso de "sua vez" com som e vibração.
  useEffect(() => {
    const vez = ehMinhaVez || Boolean(acoes.responder || acoes.decidirOnze || acoes.votarFerro)
    if (vez && !eraMinhaVez.current) {
      sons.vez()
      vibrar(70)
    }
    eraMinhaVez.current = vez
  }, [ehMinhaVez, acoes.responder, acoes.decidirOnze, acoes.votarFerro])

  // "Esconder" só vale para a próxima carta; desarma quando a vez passa.
  useEffect(() => {
    if (!acoes.cobrir) setEsconder(false)
  }, [acoes.cobrir])

  // Revanche aceita por todos: vai direto para a nova mesa.
  useEffect(() => {
    if (mesa?.revanche?.novaMesa && mesa.meuAssento !== null) navegar(`/mesa/${mesa.revanche.novaMesa}`)
  }, [mesa?.revanche?.novaMesa, mesa?.meuAssento, navegar])

  const agir = useCallback(
    async (acao) => {
      setEnviando(true)
      const r = await emitir('mesa:acao', { id, acao })
      setEnviando(false)
      if (r.erro) avisar.erro(r.erro)
      return !r.erro
    },
    [id],
  )

  async function chamarApi(caminho, corpo, sucesso) {
    setOcupado(true)
    try {
      const r = await api.post(caminho, corpo)
      if (sucesso) sucesso(r)
    } catch (e) {
      avisar.erro(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const prazo = mesa?.prazo
  const restanteMs = prazo ? Math.max(0, prazo.ate - (agora + desvio.current)) : 0
  const fracao = prazo ? Math.min(1, restanteMs / (prazo.total * 1000)) : 0

  // Na mesa: a vaza atual ou, se ainda vazia, a última vaza fechada (até alguém abrir a próxima).
  const naMesa = useMemo(() => {
    if (!mao) return { jogadas: [], indice: 0, fechada: null }
    if (mao.vazaAtual.jogadas.length > 0 || mao.vazas.length === 0) return { jogadas: mao.vazaAtual.jogadas, indice: mao.vazas.length, fechada: null }
    const ultima = mao.vazas[mao.vazas.length - 1]
    return { jogadas: ultima.jogadas, indice: mao.vazas.length - 1, fechada: ultima }
  }, [mao])

  if (erro) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="cartao w-full max-w-md">
          <Vazio icone={Armchair} titulo="Mesa não encontrada" texto="Ela pode ter terminado ou o link está incompleto.">
            <Link to="/jogar" className="btn btn-primario">
              Ir para as mesas
            </Link>
          </Vazio>
        </div>
      </div>
    )
  }
  if (!mesa) return <Carregando texto="Sentando à mesa..." />

  const nomeDe = (a) => mesa.assentos[a]?.apelido || '—'
  const placarNos = jogo ? jogo.placar[meuTime] : 0
  const placarEles = jogo ? jogo.placar[1 - meuTime] : 0
  const assentoPos = (pos) => mesa.assentos.findIndex((_, i) => posicaoRelativa(i, base, n) === pos)
  const fraseRecente = (assento) => {
    const f = [...mesa.frases].reverse().find((x) => x.assento === assento)
    return f && agora + desvio.current - f.em < 4000 ? f.texto : null
  }
  const parceiroAssento = n === 4 && mesa.meuAssento !== null ? (mesa.meuAssento + 2) % 4 : null
  const sinalAtivo = sinal && sinal.ate > agora ? sinal.texto : null
  const chamadaAtiva = chamada && chamada.ate > agora ? chamada : null
  const reacoesAtivas = reacoes.filter((r) => r.ate > agora)

  let status = null
  if (jogando && jogo) {
    if (jogo.fase === 'resposta' && !acoes.responder) status = `Aguardando resposta ${mao.pedido.porTime === meuTime ? 'dos adversários' : 'do parceiro'}`
    else if (jogo.fase === 'onze' && !acoes.decidirOnze) status = mao.timeEspecial === meuTime ? 'Seu parceiro está decidindo...' : 'Os adversários estão decidindo a mão especial'
    else if (jogo.fase === 'votoFerro' && !acoes.votarFerro) status = 'Votação da mão de ferro...'
    else if (jogo.fase === 'jogando' && !acoes.jogar) status = `Vez de ${nomeDe(mao.vez)}`
    else if (jogo.fase === 'fimMao') status = 'Embaralhando...'
  }

  function jogarCarta(carta, indice) {
    if (!ehMinhaVez || enviando) return
    if (asCegas) {
      agir({ tipo: 'jogar', indice })
      return
    }
    const coberta = esconder && acoes.cobrir
    agir({ tipo: 'jogar', carta: carta.id, coberta }).then((ok) => ok && setEsconder(false))
  }

  function jogarDeNovo() {
    if (mesa.tipo === 'treino') chamarApi('/treino', { variante: mesa.variante, jogadores: mesa.jogadores }, (r) => navegar(`/mesa/${r.id}`))
    else chamarApi('/mesas/rapida', { variante: mesa.variante, jogadores: mesa.jogadores, aposta: mesa.aposta }, (r) => navegar(`/mesa/${r.id}`))
  }

  function sair() {
    if (mesa.status === 'aguardando' && mesa.meuAssento !== null) {
      chamarApi(`/mesas/${id}/sair`, {}, () => {
        if (mesa.aposta > 0) avisar.info('Você saiu. O valor voltou para o seu saldo.')
        navegar('/jogar')
      })
      return
    }
    if (jogando && mesa.meuAssento !== null) return setConfirmarSaida(true)
    navegar(mesa.torneio ? `/sala/${mesa.torneio.id}` : '/jogar')
  }

  const posicaoReacao = (assento) => {
    const pos = posicaoRelativa(assento, base, n)
    return { baixo: { left: '50%', bottom: '14%' }, cima: { left: '50%', top: '22%' }, esquerda: { left: '14%', top: '50%' }, direita: { left: '86%', top: '50%' } }[pos]
  }

  const valorBase = variante.escada[0]

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_50%_30%,#0d1a3a,#05080f)]">
      {/* ───── Barra superior ───── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 bg-[#060b19]/80 px-2 sm:px-4">
        <button className="grid h-10 w-10 place-items-center rounded-lg text-suave hover:bg-white/5 hover:text-white" onClick={sair} aria-label="Sair da mesa">
          <ArrowLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold uppercase leading-tight">
            {mesa.torneio ? mesa.torneio.nomeJogo : <><span className="sm:hidden">{variante.curto}</span><span className="hidden sm:inline">{variante.nome}</span></>}
            <span className="font-bold text-apagado"> · {n === 4 ? '2x2' : '1x1'}</span>
          </p>
          <p className="truncate text-xs text-suave">
            {mesa.torneio
              ? mesa.torneio.nome
              : mesa.tipo === 'treino'
                ? 'Treino contra o computador'
                : mesa.aposta > 0
                  ? `${formatarReais(mesa.aposta)} por jogador · prêmio ${formatarReais(mesa.premio)}`
                  : 'Mesa amistosa'}
          </p>
        </div>
        <button
          className="grid h-10 w-10 place-items-center rounded-lg text-suave hover:bg-white/5 hover:text-white"
          onClick={() => setMudo(alternarSom())}
          aria-label={mudo ? 'Ligar som' : 'Desligar som'}
          title={mudo ? 'Ligar som' : 'Desligar som'}
        >
          {mudo ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-white/10 font-display font-extrabold uppercase" aria-label={`Placar: nós ${placarNos}, eles ${placarEles}`}>
          <span className="flex items-center bg-marca px-2 text-xs tracking-wider text-white">{n === 2 && mesa.meuAssento !== null ? 'Você' : 'Nós'}</span>
          <span className="numero flex w-9 items-center justify-center bg-[#0a1226] text-2xl leading-none text-white">{placarNos}</span>
          <span className="numero flex w-9 items-center justify-center bg-[#0a1226] text-2xl leading-none text-white/80">{placarEles}</span>
          <span className="flex items-center bg-azul px-2 text-xs tracking-wider text-white">Eles</span>
        </div>
      </header>

      {/* ───── Faixa da mão ───── */}
      {mao && (
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-white/5 bg-[#060b19]/50 px-3 text-sm sm:px-4">
          {mao.vira ? (
            <div className="flex min-w-0 items-center gap-2">
              <Carta carta={mao.vira} largura={24} />
              <span className="truncate text-suave">
                Manilha <strong className="font-display text-base font-extrabold uppercase text-ouro">{NOME_VALOR[mao.manilha]}</strong>
              </span>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="mr-1 text-suave">Manilhas</span>
              {[
                ['4', 'p'],
                ['7', 'c'],
                ['A', 'e'],
                ['7', 'o'],
              ].map(([r, s]) => (
                <Carta key={r + s} carta={{ r, s }} largura={22} />
              ))}
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <MarcadorVazas vazas={mao.vazas} meuTime={meuTime} />
            <span className={`skew-x-[-10deg] px-2.5 py-0.5 font-display text-lg font-extrabold uppercase leading-tight ${mao.valor > valorBase ? 'bg-marca text-white' : 'bg-white/10 text-white'}`}>
              <span className="inline-block skew-x-[10deg]">Vale {mao.valor}</span>
            </span>
          </div>
        </div>
      )}

      {/* ───── Mesa ───── */}
      <main className="relative min-h-0 flex-1 p-2 sm:p-4">
        <div className="borda-mesa relative mx-auto h-full w-full max-w-5xl rounded-[34px] p-[7px] sm:rounded-[56px] sm:p-[12px]">
          <div className="feltro relative h-full w-full overflow-hidden rounded-[28px] sm:rounded-[46px]">
            <div className="costura pointer-events-none absolute inset-2 rounded-[24px] sm:inset-3 sm:rounded-[40px]" />
            <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-3xl font-extrabold uppercase italic tracking-[0.35em] text-white/[0.06] sm:text-5xl">{site.nome}</p>

            {mao?.especial && (
              <div className="absolute bottom-3 left-3 z-10 whitespace-nowrap rounded-md sm:bottom-5 sm:left-5 bg-[#060b19]/70 px-3 py-1 font-display text-sm font-bold uppercase tracking-widest text-ouro">
                {mao.especial === 'ferro' ? (mao.escuro ? 'Mão de ferro · nas escuras' : mao.escuro === false ? 'Mão de ferro · normal' : 'Mão de ferro · votação') : variante.nomeMaoEspecial}
              </div>
            )}

            {/* Outros jogadores */}
            {['cima', 'esquerda', 'direita'].map((pos) => {
              const assento = assentoPos(pos)
              if (assento < 0) return null
              const info = mesa.assentos[assento]
              // No celular os laterais sobem um pouco para não encostar nas cartas da vaza.
              const estilo = {
                cima: 'left-1/2 top-2 -translate-x-1/2 sm:top-3',
                esquerda: 'left-2 top-[11%] sm:left-6 sm:top-1/2 sm:-translate-y-1/2',
                direita: 'right-2 top-[11%] sm:right-6 sm:top-1/2 sm:-translate-y-1/2',
              }[pos]
              return (
                <div key={pos} className={`absolute z-10 ${estilo}`}>
                  {info ? (
                    <Assento
                      info={info}
                      posicao={pos}
                      eAVez={jogando && prazo?.assentos?.includes(assento)}
                      fracao={fracao}
                      carteador={jogo?.carteador === assento && !!mao}
                      qtdCartas={mao?.qtdCartas?.[assento] ?? 0}
                      frase={fraseRecente(assento)}
                      sinal={assento === parceiroAssento ? sinalAtivo : null}
                      meuTime={meuTime}
                      compacto={compacto}
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-white/25 font-display text-xs font-bold uppercase text-white/50">livre</div>
                  )}
                </div>
              )
            })}

            {/* Cartas na mesa */}
            {(jogando || mesa.status === 'encerrada') && (
              <div className="absolute left-1/2 top-1/2 h-0 w-0">
                {naMesa.jogadas.map((j) => {
                  const pos = posicaoRelativa(j.assento, base, n)
                  const [dx, dy] = { baixo: [0, deslocamento[1]], cima: [0, -deslocamento[1]], esquerda: [-deslocamento[0], 0], direita: [deslocamento[0], 0] }[pos]
                  const venceu = naMesa.fechada && naMesa.fechada.vencedorAssento === j.assento
                  const apagada = naMesa.fechada && !venceu
                  return (
                    <div
                      key={`${jogo.maoNum}-${naMesa.indice}-${j.assento}`}
                      className="animar-carta absolute"
                      style={{ left: dx, top: dy, '--de-x': ORIGEM[pos][0], '--de-y': ORIGEM[pos][1], '--rot': `${ROTACAO[pos]}deg`, '--rot-de': `${ROTACAO[pos] * 3}deg` }}
                    >
                      <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                        <Carta carta={j.carta} oculta={j.coberta && !j.carta} tamanho={tamanhoMesa} variante={mesa.variante} manilha={mao?.manilha} apagada={apagada || (j.coberta && !!j.carta)} destaque={venceu} />
                        {j.coberta && (
                          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded bg-[#060b19] px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white">Escondida</span>
                        )}
                        {venceu && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded bg-ouro px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-[#2b1f04]">Ganhou</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Reações */}
            {reacoesAtivas.map((r) => (
              <span key={r.id} className="pointer-events-none absolute z-30 text-4xl" style={{ ...posicaoReacao(r.assento), animation: 'subir-reacao 2.2s ease-out forwards' }}>
                {r.emoji}
              </span>
            ))}

            {/* Gritos e resultado da mão */}
            {chamadaAtiva && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
                {chamadaAtiva.faixa ? (
                  <div key={chamadaAtiva.id} className={`animar-grito px-6 py-2.5 text-center font-display text-2xl font-extrabold uppercase italic tracking-wide shadow-2xl ${chamadaAtiva.cor}`}>
                    {chamadaAtiva.faixa}
                  </div>
                ) : (
                  <div key={chamadaAtiva.id} className={`text-center ${chamadaAtiva.tremer ? 'animar-tremer' : ''}`}>
                    <div className={`animar-grito inline-block px-7 py-2 font-display text-5xl font-extrabold uppercase italic tracking-wide shadow-2xl sm:text-7xl ${chamadaAtiva.cor}`}>{chamadaAtiva.grande}</div>
                    <p className="mt-3 inline-block rounded-md bg-[#060b19]/80 px-3 py-1 text-sm font-semibold text-white">{chamadaAtiva.pequeno}</p>
                  </div>
                )}
              </div>
            )}

            {/* Espera / fim */}
            {mesa.status === 'aguardando' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto p-3">
                <SalaDeEspera
                  mesa={mesa}
                  ocupado={ocupado}
                  aoSentar={(assento) => chamarApi(`/mesas/${id}/entrar`, { assento })}
                  aoTrocar={(assento) => chamarApi(`/mesas/${id}/trocar`, { assento })}
                  aoSair={sair}
                />
              </div>
            )}
            {(mesa.status === 'encerrada' || mesa.status === 'cancelada') && (
              <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#060b19]/40 p-3">
                <FimDeJogo mesa={mesa} meuTime={meuTime} agora={agora + desvio.current} ocupado={ocupado} aoJogarDeNovo={jogarDeNovo} aoRevanche={() => chamarApi(`/mesas/${id}/revanche`, {})} />
              </div>
            )}

            {mesa.meuAssento === null && jogando && (
              <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md bg-[#060b19]/70 px-3 py-1 font-display text-sm font-bold uppercase tracking-wider text-white/80">Você está assistindo</div>
            )}

            {/* Conversa: reações, frases e sinais (canto da mesa) */}
            {mesa.meuAssento !== null && jogando && (
              <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5 sm:bottom-4 sm:right-4">
                {painel && (
                  <div className="animar-surgir mb-1 flex max-w-[260px] flex-wrap justify-end gap-1.5 rounded-xl border border-white/10 bg-[#060b19]/90 p-2 shadow-2xl backdrop-blur">
                    {painel === 'sinais' && <p className="w-full px-1 text-right text-xs text-suave">Só o seu parceiro vê.</p>}
                    {(painel === 'reacoes' ? REACOES : painel === 'frases' ? FRASES : SINAIS).map((texto, indice) => (
                      <button
                        key={texto}
                        className={`rounded-lg bg-white/5 hover:bg-white/15 ${painel === 'reacoes' ? 'h-10 w-10 text-2xl' : 'px-2.5 py-1.5 text-left text-sm font-semibold'}`}
                        onClick={() => {
                          emitir(painel === 'reacoes' ? 'mesa:reacao' : painel === 'frases' ? 'mesa:frase' : 'mesa:sinal', { id, indice })
                          if (painel === 'sinais') avisar.info(`Sinal enviado: “${texto}”`)
                          setPainel(null)
                        }}
                      >
                        {texto}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 rounded-xl bg-[#060b19]/60 p-1 backdrop-blur">
                  {[
                    ['reacoes', Smile, 'Reações'],
                    ['frases', MessageCircle, 'Frases'],
                    ...(n === 4 ? [['sinais', Hand, 'Sinal para o parceiro']] : []),
                  ].map(([tipo, Icone, rotulo]) => (
                    <button
                      key={tipo}
                      className={`grid h-9 w-9 place-items-center rounded-lg ${painel === tipo ? 'bg-white text-[#060b19]' : 'text-white/80 hover:bg-white/10'}`}
                      onClick={() => setPainel(painel === tipo ? null : tipo)}
                      aria-label={rotulo}
                      title={rotulo}
                    >
                      <Icone size={18} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ───── Área do jogador ───── */}
      {mesa.meuAssento !== null && jogando && mao && (
        <footer className="shrink-0 border-t border-white/5 bg-[#060b19]/90 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mx-auto max-w-xl">
            {/* Tempo */}
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
              {(acoes.jogar || acoes.responder || acoes.decidirOnze || acoes.votarFerro) && prazo && (
                <div className={`h-full rounded-full transition-[width] duration-200 ease-linear ${fracao < 0.25 ? 'bg-marca-forte' : 'bg-white'}`} style={{ width: `${fracao * 100}%` }} />
              )}
            </div>

            {acoes.responder && mao.pedido && (
              <div className="animar-surgir mb-3 rounded-xl border border-marca/60 bg-marca/10 p-3">
                <p className="text-center text-[15px]">
                  <strong>{nomeDe(mao.pedido.porAssento)}</strong> pediu <strong className="font-display text-lg font-extrabold uppercase italic text-marca-forte">{mao.pedido.nome}!</strong> · a mão passa a valer {mao.pedido.valor}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button className="btn btn-sec" disabled={enviando} onClick={() => agir({ tipo: 'correr' })}>
                    Correr
                  </button>
                  <button className="btn btn-verde" disabled={enviando} onClick={() => agir({ tipo: 'aceitar' })}>
                    Aceitar
                  </button>
                  {acoes.aumentar && mao.proximoPedido ? (
                    <button className="btn btn-primario italic" disabled={enviando} onClick={() => agir({ tipo: 'aumentar' })}>
                      {mao.proximoPedido.nome}!
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-suave">Correr entrega {mao.valor} ponto(s) para eles.</p>
              </div>
            )}

            {acoes.decidirOnze && (
              <div className="animar-surgir mb-3 rounded-xl border border-azul/60 bg-azul/10 p-3">
                <p className="text-center font-display text-xl font-extrabold uppercase italic">{variante.nomeMaoEspecial}!</p>
                <p className="text-center text-sm text-suave">
                  Jogar valendo {variante.escada[1]} ou correr (dá {variante.escada[0]} para eles)?
                </p>
                {mao.cartasParceiro && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-widest text-suave">Parceiro</span>
                    {mao.cartasParceiro.map((c) => (
                      <Carta key={c.id} carta={c} tamanho="pequena" variante={mesa.variante} manilha={mao.manilha} />
                    ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn btn-sec" disabled={enviando} onClick={() => agir({ tipo: 'onze', jogar: false })}>
                    Correr
                  </button>
                  <button className="btn btn-primario" disabled={enviando} onClick={() => agir({ tipo: 'onze', jogar: true })}>
                    Jogar
                  </button>
                </div>
              </div>
            )}

            {jogo.fase === 'votoFerro' && <VotacaoFerro mao={mao} mesa={mesa} podeVotar={acoes.votarFerro} enviando={enviando} aoVotar={(escuro) => agir({ tipo: 'votoFerro', escuro })} />}

            {/* Status */}
            <p className={`mb-1 text-center font-display text-base font-bold uppercase tracking-wider ${ehMinhaVez ? 'text-white' : 'text-suave'}`}>
              {ehMinhaVez ? (asCegas ? 'Sua vez · escolha uma carta às cegas' : esconder ? 'Toque na carta para jogar escondida' : 'Sua vez · toque na carta') : status}
            </p>

            {/* Minha mão: toque para jogar */}
            <div className="flex items-end justify-center pt-2" style={{ minHeight: Math.round((larguraMao * 280) / 200) + 12 }}>
              {mao.minhasCartas.map((c, i, lista) => {
                const meio = (lista.length - 1) / 2
                const rot = (i - meio) * 5
                const desce = Math.abs(i - meio) * 6
                const chave = asCegas ? `f${i}` : c.id
                return (
                  <button
                    key={chave}
                    type="button"
                    disabled={!ehMinhaVez || enviando}
                    onClick={() => jogarCarta(c, i)}
                    className={`relative -mx-1 rounded-[10px] transition-[translate] duration-150 ${ehMinhaVez ? 'cursor-pointer hover:-translate-y-3 active:-translate-y-4' : 'cursor-default'}`}
                    style={{ transform: `translateY(${desce}px) rotate(${rot}deg)` }}
                    aria-label={asCegas ? `Jogar a carta ${i + 1} às cegas` : `Jogar ${c.r} ${esconder ? '(escondida)' : ''}`}
                  >
                    <span className="animar-dar block" style={{ animationDelay: `${i * 70}ms` }}>
                      <Carta carta={c.oculta ? null : c} oculta={c.oculta} largura={larguraMao} variante={mesa.variante} manilha={mao.manilha} destaque />
                    </span>
                    {esconder && ehMinhaVez && !asCegas && (
                      <span className="absolute inset-0 grid place-items-center rounded-[10px] bg-[#060b19]/55">
                        <span className="flex flex-col items-center gap-1 font-display text-xs font-bold uppercase tracking-wider text-white">
                          <EyeOff size={22} /> Escondida
                        </span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Ações: Esconder e o pedido (TRUCO!, SEIS!...) */}
            {((acoes.cobrir && !asCegas) || (acoes.aumentar && mao.proximoPedido && jogo.fase === 'jogando')) && (
              <div className="mt-3 flex items-center justify-center gap-2">
                {acoes.cobrir && !asCegas && (
                  <button
                    className={`btn ${esconder ? 'bg-white text-[#060b19]' : 'btn-sec'}`}
                    aria-pressed={esconder}
                    onClick={() => setEsconder((v) => !v)}
                    title="Ative e toque na carta: ela cai virada e não vale na vaza"
                  >
                    {esconder ? <Eye size={18} /> : <EyeOff size={18} />} {esconder ? 'Não esconder' : 'Esconder'}
                  </button>
                )}
                {acoes.aumentar && mao.proximoPedido && jogo.fase === 'jogando' && (
                  <button className="btn btn-primario animar-vez min-h-[52px] min-w-[140px] px-6 text-2xl italic" disabled={enviando} onClick={() => agir({ tipo: 'aumentar' })}>
                    {mao.proximoPedido.nome}!
                  </button>
                )}
              </div>
            )}
          </div>
        </footer>
      )}

      <Modal aberto={confirmarSaida} aoFechar={() => setConfirmarSaida(false)} titulo="Sair da mesa?">
        <p className="text-suave">
          {mesa.tipo === 'treino'
            ? 'O treino será encerrado.'
            : 'A partida continua sem você: o tempo de cada jogada segue correndo e o sistema joga automaticamente no seu lugar. Você pode voltar a qualquer momento.'}
        </p>
        <div className="mt-6 flex gap-3">
          <button className="btn btn-sec flex-1" onClick={() => setConfirmarSaida(false)}>
            Ficar
          </button>
          <button
            className="btn btn-primario flex-1"
            onClick={() => {
              if (mesa.tipo === 'treino') api.post(`/mesas/${id}/sair`).catch(() => {})
              navegar(mesa.torneio ? `/sala/${mesa.torneio.id}` : '/jogar')
            }}
          >
            Sair
          </button>
        </div>
      </Modal>
    </div>
  )
}
