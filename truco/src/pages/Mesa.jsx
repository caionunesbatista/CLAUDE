// Mesa de jogo em tela cheia. Toda a regra está no servidor: aqui só mostramos o estado e enviamos as ações.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Share2, MessageCircle, EyeOff, WifiOff, Bot, Trophy, Frown, LogOut, Armchair, Crown } from 'lucide-react'
import { obterSocket, emitir } from '../lib/socket.js'
import { api } from '../lib/api.js'
import { useSessao, avisar } from '../store/sessao.js'
import { formatarReais, copiar, iniciais } from '../lib/formato.js'
import { VARIANTES, FRASES, SINAIS, NOME_VALOR, SIMBOLO_NAIPE, NAIPE_VERMELHO } from '../../shared/regras.js'
import { Carta, LequeVerso } from '../components/Carta.jsx'
import { Modal, Carregando, Vazio, useTitulo } from '../components/ui.jsx'
import { site } from '../config/site.js'

// ---------- dados em tempo real ----------

function useMesa(id) {
  const [mesa, setMesa] = useState(null)
  const [erro, setErro] = useState(null)
  const [sinal, setSinal] = useState(null)
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
    s.on('mesa:estado', aoEstado)
    s.on('mesa:sinal', aoSinal)
    s.on('connect', entrar)
    if (s.connected) entrar()
    return () => {
      s.off('mesa:estado', aoEstado)
      s.off('mesa:sinal', aoSinal)
      s.off('connect', entrar)
      s.emit('mesa:sair', id)
    }
  }, [id])
  return { mesa, erro, sinal, desvio }
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

// ---------- geometria da mesa ----------

/** Posição relativa ao jogador: 0 = embaixo (você), 1 = direita, 2 = em frente, 3 = esquerda. */
function posicaoRelativa(assento, base, n) {
  const rel = (assento - base + n) % n
  if (n === 2) return rel === 0 ? 'baixo' : 'cima'
  return ['baixo', 'direita', 'cima', 'esquerda'][rel]
}

const ORIGEM = {
  baixo: ['0px', '140px'],
  cima: ['0px', '-140px'],
  esquerda: ['-140px', '0px'],
  direita: ['140px', '0px'],
}

// ---------- peças ----------

function Assento({ info, posicao, eAVez, fracao, carteador, qtdCartas, frase, sinal, meuTime, compacto }) {
  if (!info) return null
  const parceiro = info.time === meuTime
  const anel = parceiro ? '#f6c344' : '#5aa9ff'
  const r = 26
  const c = 2 * Math.PI * r
  const lado = compacto ? 46 : 60
  return (
    <div className="relative flex flex-col items-center gap-1">
      {(frase || sinal) && (
        <div
          className={`animar-surgir absolute z-20 max-w-[150px] whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-xl ${
            sinal ? 'bg-info text-[#04172b]' : 'bg-white text-[#14161b]'
          } ${posicao === 'cima' ? 'top-full mt-1' : '-top-9'}`}
        >
          {sinal ? `🤫 ${sinal}` : frase}
        </div>
      )}
      <div className="relative" style={{ width: lado, height: lado }}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r={r} fill="none" stroke="rgb(0 0 0 / 0.35)" strokeWidth="4" />
          {eAVez && <circle cx="30" cy="30" r={r} fill="none" stroke={fracao < 0.25 ? '#ff4d5e' : anel} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - fracao)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />}
        </svg>
        <div
          className={`absolute inset-[6px] grid place-items-center rounded-full text-sm font-black ${eAVez ? 'animar-pulso' : ''}`}
          style={{ background: parceiro ? 'linear-gradient(135deg,#ffd65e,#b98a12)' : 'linear-gradient(135deg,#8cc4ff,#2e6db5)', color: parceiro ? '#1a1406' : '#04172b' }}
        >
          {info.bot ? <Bot size={20} /> : iniciais(info.apelido)}
        </div>
        {carteador && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-black text-[#14161b] shadow" title="Deu as cartas">
            D
          </span>
        )}
        {!info.conectado && (
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-truco text-white shadow" title="Desconectado">
            <WifiOff size={11} />
          </span>
        )}
      </div>
      <span className="max-w-[128px] truncate whitespace-nowrap rounded-md bg-black/40 px-1.5 py-0.5 text-[11px] font-semibold text-white/90">
        {info.apelido}
        {compacto && qtdCartas > 0 && <span className="ml-1 text-white/60">· {qtdCartas}🂠</span>}
      </span>
      {!compacto && qtdCartas > 0 && <LequeVerso quantidade={qtdCartas} tamanho="mini" />}
    </div>
  )
}

function MarcadorVazas({ vazas, meuTime }) {
  return (
    <div className="flex items-center gap-1" aria-label="Resultado das vazas">
      {[0, 1, 2].map((i) => {
        const v = vazas[i]
        let cor = 'border border-white/30 bg-transparent'
        let titulo = `${i + 1}ª vaza`
        if (v) {
          if (v.resultado === 'empate') {
            cor = 'bg-white/50'
            titulo += ': empatou'
          } else if (v.resultado === meuTime) {
            cor = 'bg-ouro'
            titulo += ': nossa'
          } else {
            cor = 'bg-info'
            titulo += ': deles'
          }
        }
        return <span key={i} title={titulo} className={`h-3 w-3 rounded-full ${cor}`} />
      })}
    </div>
  )
}

function textoEvento(ev, mesa, meuTime) {
  const nome = (a) => mesa.assentos[a]?.apelido || 'Alguém'
  switch (ev.tipo) {
    case 'pedido':
      return { grande: `${ev.nome.toUpperCase()}!`, pequeno: `${nome(ev.assento)} pediu · vale ${ev.valor}`, cor: 'bg-truco text-white', assento: ev.assento }
    case 'aceitou':
      return { grande: 'ACEITO!', pequeno: `${nome(ev.assento)} aceitou · vale ${ev.valor}`, cor: 'bg-dinheiro text-[#04281a]', assento: ev.assento }
    case 'correu':
      return { grande: 'CORREU!', pequeno: `${nome(ev.assento)} correu`, cor: 'bg-painel-3 text-texto', assento: ev.assento }
    case 'onzeJogar':
      return { grande: 'VAMOS JOGAR!', pequeno: `Mão especial valendo ${ev.valor}`, cor: 'bg-ouro text-[#1a1406]', assento: ev.assento }
    case 'onzeCorrer':
      return { grande: 'CORRERAM!', pequeno: 'Recusaram a mão especial', cor: 'bg-painel-3 text-texto', assento: ev.assento }
    case 'tempoEsgotado':
      return { grande: 'TEMPO!', pequeno: `${nome(ev.assento)} não jogou a tempo · jogada automática`, cor: 'bg-painel-3 text-texto', assento: ev.assento }
    case 'fimMao': {
      if (ev.vencedorTime === null) return { faixa: 'Mão empatada — ninguém pontua', cor: 'bg-painel-3' }
      const nos = ev.vencedorTime === meuTime
      const quem = mesa.jogadores === 2 ? (nos ? 'Você fez' : 'Adversário fez') : nos ? 'Nós fizemos' : 'Eles fizeram'
      return { faixa: `${quem} +${ev.pontos}${ev.motivo === 'correu' || ev.motivo === 'correuOnze' ? ' (correram)' : ''}`, cor: nos ? 'bg-ouro text-[#1a1406]' : 'bg-info text-[#04172b]' }
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
    if (await copiar(window.location.href)) avisar.sucesso('Link da mesa copiado!')
  }
  const nomeTime = (t) => (mesa.jogadores === 4 ? `Dupla ${t === 0 ? 'A' : 'B'}` : '')
  return (
    <div className="animar-surgir mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-black/45 p-5 text-center backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-wider text-white/60">Aguardando jogadores</p>
      <p className="titulo mt-1 text-2xl text-white">Falta{faltam > 1 ? 'm' : ''} {faltam}</p>
      {mesa.aposta > 0 && (
        <p className="mt-1 text-sm text-white/75">
          {formatarReais(mesa.aposta)} por jogador · {mesa.jogadores === 4 ? 'cada vencedor leva' : 'o vencedor leva'}{' '}
          <strong className="numero text-dinheiro">{formatarReais(mesa.premio)}</strong>
        </p>
      )}
      <div className={`mt-4 grid gap-2 ${mesa.jogadores === 4 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {mesa.assentos.map((a, i) => (
          <div key={i} className="rounded-2xl bg-white/5 p-2.5">
            {mesa.jogadores === 4 && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">{nomeTime(i % 2)}</p>}
            {a ? (
              <p className="truncate font-semibold text-white">
                {a.apelido} {a.eu && <span className="text-ouro">(você)</span>}
              </p>
            ) : (
              <button
                disabled={ocupado}
                className="w-full rounded-xl border border-dashed border-white/30 py-1.5 text-sm font-semibold text-white/80 hover:border-ouro hover:text-ouro"
                onClick={() => (sentado ? aoTrocar(i) : aoSentar(i))}
              >
                {sentado ? 'Mudar para cá' : 'Sentar aqui'}
              </button>
            )}
          </div>
        ))}
      </div>
      {mesa.jogadores === 4 && <p className="mt-2 text-xs text-white/50">Dupla A joga contra a Dupla B. Escolha o lugar ao lado do seu parceiro.</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button className="btn btn-sec btn-pequeno" onClick={convidar}>
          <Share2 size={15} /> Convidar
        </button>
        {sentado && (
          <button className="btn btn-sec btn-pequeno" onClick={aoSair} disabled={ocupado}>
            <LogOut size={15} /> Sair {mesa.aposta > 0 ? '(devolve o valor)' : ''}
          </button>
        )}
        {!usuario && (
          <Link to={`/entrar?voltar=/mesa/${mesa.id}`} className="btn btn-ouro btn-pequeno">
            Entrar para jogar
          </Link>
        )}
      </div>
    </div>
  )
}

function FimDeJogo({ mesa, meuTime, aoJogarDeNovo }) {
  const r = mesa.resultado
  if (r?.cancelada) {
    return (
      <div className="animar-surgir mx-auto max-w-sm rounded-3xl border border-white/10 bg-black/60 p-6 text-center backdrop-blur-md">
        <p className="titulo text-2xl text-white">Mesa encerrada</p>
        <p className="mt-2 text-sm text-white/75">{r.motivo}</p>
        <Link to="/jogar" className="btn btn-ouro mt-5">
          Voltar para as mesas
        </Link>
      </div>
    )
  }
  const jogou = mesa.meuAssento !== null
  const venceu = jogou && r.vencedorTime === meuTime
  const placarNos = r.placar[meuTime]
  const placarEles = r.placar[1 - meuTime]
  return (
    <div className="animar-surgir mx-auto max-w-sm rounded-3xl border border-white/10 bg-black/65 p-6 text-center backdrop-blur-md">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${venceu ? 'bg-ouro text-[#1a1406]' : 'bg-white/10 text-white'}`}>
        {venceu ? <Trophy size={32} /> : jogou ? <Frown size={32} /> : <Crown size={32} />}
      </div>
      <p className="titulo mt-4 text-3xl text-white">{!jogou ? 'Fim de jogo' : venceu ? (mesa.jogadores === 4 ? 'Vocês venceram!' : 'Você venceu!') : 'Não foi dessa vez'}</p>
      <p className="numero mt-2 text-lg text-white/80">
        {placarNos} × {placarEles}
      </p>
      {venceu && r.premio > 0 && <p className="numero titulo mt-3 text-3xl text-dinheiro">+{formatarReais(r.premio)}</p>}
      {venceu && mesa.torneio && <p className="mt-2 text-sm text-white/75">Classificados! Aguarde o próximo jogo na sala.</p>}
      <div className="mt-6 flex flex-col gap-2">
        {mesa.torneio ? (
          <Link to={`/sala/${mesa.torneio.id}`} className="btn btn-ouro">
            Voltar para a sala
          </Link>
        ) : (
          jogou && (
            <button className="btn btn-ouro" onClick={aoJogarDeNovo}>
              {mesa.tipo === 'treino' ? 'Treinar de novo' : 'Jogar de novo'}
            </button>
          )
        )}
        <Link to="/jogar" className="btn btn-sec">
          Ir para as mesas
        </Link>
      </div>
    </div>
  )
}

// ---------- página ----------

export default function Mesa() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { mesa, erro, sinal, desvio } = useMesa(id)
  const agora = useRelogio()
  const { largura, altura } = useTela()
  const [selecionada, setSelecionada] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [painelFala, setPainelFala] = useState(null) // 'frases' | 'sinais' | null
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [chamada, setChamada] = useState(null)
  const ultimoEvento = useRef(null)

  const variante = mesa ? VARIANTES[mesa.variante] : null
  useTitulo(mesa ? `${variante.curto} ${mesa.jogadores === 4 ? '2x2' : '1x1'} — ${site.nome}` : `Mesa — ${site.nome}`)

  const jogo = mesa?.jogo
  const mao = jogo?.mao
  const base = mesa?.meuAssento ?? 0
  const meuTime = base % 2
  const n = mesa?.jogadores ?? 4
  // Celular pequeno (ou deitado): tudo um pouco menor para nada se sobrepor.
  const compacto = altura < 720 || largura < 380
  const tamanhoMesa = compacto ? 'pequena' : largura < 768 ? 'media' : 'grande'
  const tamanhoMao = compacto ? 'media' : 'grande'
  const deslocamento = { pequena: [58, 38], media: [76, 58], grande: [100, 76] }[tamanhoMesa]

  // Mostra os gritos (truco, aceito, correu...) e o resultado de cada mão.
  useEffect(() => {
    if (!jogo?.eventos?.length) return
    const ultimo = jogo.eventos[jogo.eventos.length - 1]
    if (ultimoEvento.current === null) {
      ultimoEvento.current = ultimo.id
      return
    }
    const novos = jogo.eventos.filter((e) => e.id > ultimoEvento.current)
    ultimoEvento.current = ultimo.id
    const relevante = [...novos].reverse().find((e) => textoEvento(e, mesa, meuTime))
    if (relevante) {
      const texto = textoEvento(relevante, mesa, meuTime)
      setChamada({ ...texto, id: relevante.id, ate: Date.now() + (texto.faixa ? 2400 : 1700) })
    }
  }, [jogo?.eventos, mesa, meuTime])

  // Nova mão ou nova vaza: limpa a carta selecionada.
  const chaveMao = `${jogo?.maoNum}-${mao?.vazas?.length}-${mao?.minhasCartas?.length}`
  useEffect(() => setSelecionada(null), [chaveMao])

  const agir = useCallback(
    async (acao) => {
      setEnviando(true)
      const r = await emitir('mesa:acao', { id, acao })
      setEnviando(false)
      if (r.erro) avisar.erro(r.erro)
      else setSelecionada(null)
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

  // Cartas na mesa: a vaza atual ou, se ela ainda está vazia, a última vaza fechada.
  const naMesa = useMemo(() => {
    if (!mao) return { jogadas: [], indice: 0, fechada: null }
    if (mao.vazaAtual.jogadas.length > 0 || mao.vazas.length === 0) {
      return { jogadas: mao.vazaAtual.jogadas, indice: mao.vazas.length, fechada: null }
    }
    const ultima = mao.vazas[mao.vazas.length - 1]
    return { jogadas: ultima.jogadas, indice: mao.vazas.length - 1, fechada: ultima }
  }, [mao])

  if (erro) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="cartao w-full max-w-md">
          <Vazio icone={Armchair} titulo="Mesa não encontrada" texto="Ela pode ter terminado ou o link está incompleto.">
            <Link to="/jogar" className="btn btn-ouro">
              Ir para as mesas
            </Link>
          </Vazio>
        </div>
      </div>
    )
  }
  if (!mesa) return <Carregando texto="Sentando à mesa..." />

  const acoes = jogo?.acoes || {}
  const jogando = mesa.status === 'jogando'
  const ferro = mao?.especial === 'ferro'
  const ehMinhaVez = jogando && acoes.jogar
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

  let aguardandoTexto = null
  if (jogando && jogo) {
    if (jogo.fase === 'resposta' && !acoes.responder) aguardandoTexto = `Aguardando resposta ${mao.pedido.porTime === meuTime ? 'dos adversários' : 'do parceiro'}...`
    else if (jogo.fase === 'onze' && !acoes.decidirOnze) aguardandoTexto = 'Os adversários estão decidindo a mão especial...'
    else if (jogo.fase === 'jogando' && !acoes.jogar) aguardandoTexto = `Vez de ${nomeDe(mao.vez)}`
    else if (jogo.fase === 'fimMao') aguardandoTexto = 'Embaralhando a próxima mão...'
  }

  function jogarSelecionada(coberta = false) {
    if (selecionada === null) return
    if (ferro) agir({ tipo: 'jogar', indice: selecionada })
    else agir({ tipo: 'jogar', carta: selecionada, coberta })
  }

  function aoClicarCarta(carta, indice) {
    if (!ehMinhaVez || enviando) return
    const chave = ferro ? indice : carta.id
    if (selecionada === chave) jogarSelecionada(false)
    else setSelecionada(chave)
  }

  function jogarDeNovo() {
    if (mesa.tipo === 'treino') {
      chamarApi('/treino', { variante: mesa.variante, jogadores: mesa.jogadores }, (r) => navegar(`/mesa/${r.id}`))
    } else {
      chamarApi('/mesas/rapida', { variante: mesa.variante, jogadores: mesa.jogadores, aposta: mesa.aposta }, (r) => navegar(`/mesa/${r.id}`))
    }
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

  const manilhaTexto = !mao ? null : mesa.variante === 'mineiro' ? 'Zap · Copas · Espadilha · Pica-fumo' : `${NOME_VALOR[mao.manilha]} (${mao.manilha})`

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-fundo">
      {/* ───── Barra superior ───── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-linha bg-painel px-2 sm:px-4">
        <button className="btn btn-fantasma btn-pequeno px-2" onClick={sair} aria-label="Sair da mesa">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {mesa.torneio ? mesa.torneio.nomeJogo : variante.nome}
            <span className="font-normal text-suave"> · {n === 4 ? 'Duplas' : '1x1'}</span>
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
        <div className="flex items-center gap-1 rounded-xl border border-linha bg-fundo px-1.5 py-1" aria-label={`Placar: nós ${placarNos}, eles ${placarEles}`}>
          <div className="rounded-lg bg-ouro/15 px-2.5 py-0.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-ouro">{n === 2 && mesa.meuAssento !== null ? 'Você' : 'Nós'}</p>
            <p className="numero titulo text-xl leading-none text-ouro">{placarNos}</p>
          </div>
          <span className="text-apagado">×</span>
          <div className="rounded-lg bg-info/10 px-2.5 py-0.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-info">Eles</p>
            <p className="numero titulo text-xl leading-none text-info">{placarEles}</p>
          </div>
        </div>
      </header>

      {/* ───── Faixa de informações da mão ───── */}
      {mao && (
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-linha/60 bg-painel/60 px-3 text-xs sm:px-4">
          {mao.vira ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-suave">Vira</span>
              <span
                className="numero rounded-md bg-carta px-1.5 py-0.5 font-display text-sm font-black leading-none"
                style={{ color: NAIPE_VERMELHO[mao.vira.s] ? 'var(--color-carta-vermelho)' : 'var(--color-carta-preto)' }}
              >
                {mao.vira.r}
                {SIMBOLO_NAIPE[mao.vira.s]}
              </span>
              <span className="truncate text-suave">
                → Manilha <strong className="text-ouro">{manilhaTexto}</strong>
              </span>
            </div>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-suave" title={manilhaTexto}>
              Manilhas
              {[
                ['4', 'p'],
                ['7', 'c'],
                ['A', 'e'],
                ['7', 'o'],
              ].map(([r, s]) => (
                <span key={r + s} className="rounded bg-carta px-1 py-0.5 font-display text-xs font-black leading-none" style={{ color: NAIPE_VERMELHO[s] ? 'var(--color-carta-vermelho)' : 'var(--color-carta-preto)' }}>
                  {r}
                  {SIMBOLO_NAIPE[s]}
                </span>
              ))}
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <MarcadorVazas vazas={mao.vazas} meuTime={meuTime} />
            <span className={`whitespace-nowrap rounded-lg px-2 py-1 font-black ${mao.valor > (variante.escada[0] ?? 1) ? 'bg-truco text-white' : 'bg-painel-3 text-texto'}`}>Vale {mao.valor}</span>
          </div>
        </div>
      )}

      {/* ───── Feltro ───── */}
      <main className="relative min-h-0 flex-1 p-2 sm:p-4">
        <div className="feltro relative h-full w-full overflow-hidden rounded-[28px] border-[6px] border-[#3a2616] shadow-[inset_0_0_60px_rgb(0_0_0/0.55)] sm:rounded-[48px] sm:border-[10px]">
          {mao?.especial && (
            <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ouro">
              {mao.especial === 'ferro' ? 'Mão de ferro — cartas às cegas' : `${variante.nomeMaoEspecial}`}
            </div>
          )}

          {/* Assentos dos outros jogadores */}
          {['cima', 'esquerda', 'direita'].map((pos) => {
            const assento = assentoPos(pos)
            if (assento < 0) return null
            const info = mesa.assentos[assento]
            const estilo = {
              cima: 'left-1/2 top-3 -translate-x-1/2',
              esquerda: 'left-1.5 top-1/2 -translate-y-1/2 sm:left-4',
              direita: 'right-1.5 top-1/2 -translate-y-1/2 sm:right-4',
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
                  <div className="grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-dashed border-white/25 text-[10px] font-semibold text-white/50">livre</div>
                )}
              </div>
            )
          })}

          {/* Cartas na mesa */}
          {jogando || mesa.status === 'encerrada' ? (
            <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
              {naMesa.jogadas.map((j) => {
                const pos = posicaoRelativa(j.assento, base, n)
                const [dx, dy] = { baixo: [0, deslocamento[1]], cima: [0, -deslocamento[1]], esquerda: [-deslocamento[0], 0], direita: [deslocamento[0], 0] }[pos]
                const venceu = naMesa.fechada && naMesa.fechada.vencedorAssento === j.assento
                const apagada = naMesa.fechada && !venceu
                return (
                  <div
                    key={`${jogo.maoNum}-${naMesa.indice}-${j.assento}`}
                    className="animar-carta absolute"
                    style={{
                      left: dx,
                      top: dy,
                      '--de-x': ORIGEM[pos][0],
                      '--de-y': ORIGEM[pos][1],
                    }}
                  >
                    <div style={{ transform: 'translate(-50%, -50%)' }}>
                      <Carta carta={j.carta} oculta={j.coberta && !j.carta} tamanho={tamanhoMesa} variante={mesa.variante} manilha={mao?.manilha} apagada={apagada || (j.coberta && !!j.carta)} destaque={venceu} />
                      {j.coberta && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/70 px-1.5 text-[9px] font-bold uppercase text-white">coberta</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {/* Grito / resultado da mão */}
          {chamadaAtiva && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              {chamadaAtiva.faixa ? (
                <div className={`animar-grito rounded-2xl px-6 py-3 text-center text-lg font-black shadow-2xl ${chamadaAtiva.cor}`}>{chamadaAtiva.faixa}</div>
              ) : (
                <div className="text-center">
                  <div className={`animar-grito inline-block rounded-2xl px-6 py-2.5 font-display text-4xl font-black italic shadow-2xl sm:text-5xl ${chamadaAtiva.cor}`}>{chamadaAtiva.grande}</div>
                  <p className="mt-2 rounded-lg bg-black/50 px-3 py-1 text-sm text-white">{chamadaAtiva.pequeno}</p>
                </div>
              )}
            </div>
          )}

          {/* Sala de espera / fim */}
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
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-3">
              <FimDeJogo mesa={mesa} meuTime={meuTime} aoJogarDeNovo={jogarDeNovo} />
            </div>
          )}

          {/* Meu avatar (canto inferior) */}
          {mesa.meuAssento !== null && jogando && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2">
              <div className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-ouro-forte to-ouro-escuro text-xs font-black text-[#1a1406] ${ehMinhaVez ? 'ring-2 ring-white' : ''}`}>{iniciais(mesa.assentos[mesa.meuAssento].apelido)}</div>
              {jogo?.carteador === mesa.meuAssento && <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-black text-[#14161b]">D</span>}
            </div>
          )}
          {mesa.meuAssento === null && jogando && (
            <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80">Você está assistindo</div>
          )}
        </div>
      </main>

      {/* ───── Área do jogador ───── */}
      {mesa.meuAssento !== null && jogando && mao && (
        <footer className="shrink-0 border-t border-linha bg-painel px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-xl">
            {/* Barra de tempo */}
            {(acoes.jogar || acoes.responder || acoes.decidirOnze) && prazo && (
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-painel-3">
                <div className={`h-full rounded-full transition-[width] duration-200 ease-linear ${fracao < 0.25 ? 'bg-truco' : 'bg-ouro'}`} style={{ width: `${fracao * 100}%` }} />
              </div>
            )}

            {/* Resposta ao truco */}
            {acoes.responder && mao.pedido && (
              <div className="animar-surgir mb-3 rounded-2xl border border-truco/50 bg-truco/10 p-3">
                <p className="text-center text-sm">
                  <strong>{nomeDe(mao.pedido.porAssento)}</strong> pediu <strong className="text-truco">{mao.pedido.nome.toUpperCase()}</strong> — a mão passa a valer {mao.pedido.valor}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button className="btn btn-sec" disabled={enviando} onClick={() => agir({ tipo: 'correr' })}>
                    Correr
                  </button>
                  <button className="btn btn-verde" disabled={enviando} onClick={() => agir({ tipo: 'aceitar' })}>
                    Aceitar
                  </button>
                  {acoes.aumentar && mao.proximoPedido ? (
                    <button className="btn btn-truco" disabled={enviando} onClick={() => agir({ tipo: 'aumentar' })}>
                      {mao.proximoPedido.nome}!
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
                <p className="mt-2 text-center text-[11px] text-suave">Correr entrega {mao.valor} ponto(s) para eles.</p>
              </div>
            )}

            {/* Decisão da mão de onze / dez */}
            {acoes.decidirOnze && (
              <div className="animar-surgir mb-3 rounded-2xl border border-ouro/50 bg-ouro/10 p-3">
                <p className="text-center text-sm font-semibold">{variante.nomeMaoEspecial}! Jogar valendo {variante.escada[1]} ou correr (dá {variante.escada[0]} para eles)?</p>
                {mao.cartasParceiro && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-xs text-suave">Parceiro:</span>
                    {mao.cartasParceiro.map((c) => (
                      <Carta key={c.id} carta={c} tamanho="pequena" variante={mesa.variante} manilha={mao.manilha} />
                    ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="btn btn-sec" disabled={enviando} onClick={() => agir({ tipo: 'onze', jogar: false })}>
                    Correr
                  </button>
                  <button className="btn btn-ouro" disabled={enviando} onClick={() => agir({ tipo: 'onze', jogar: true })}>
                    Jogar
                  </button>
                </div>
              </div>
            )}

            {/* Minha mão */}
            <div className="flex items-end justify-center gap-2 pt-3 sm:gap-3">
              {mao.minhasCartas.map((c, i) => {
                const chave = ferro ? i : c.id
                const sel = selecionada === chave
                return (
                  <button
                    key={ferro ? `f${i}` : c.id}
                    type="button"
                    disabled={!ehMinhaVez || enviando}
                    onClick={() => aoClicarCarta(c, i)}
                    className={`relative rounded-[12px] transition-transform duration-150 ${sel ? '-translate-y-4' : ehMinhaVez ? 'hover:-translate-y-1.5' : ''} ${!ehMinhaVez ? 'cursor-default' : 'cursor-pointer'}`}
                    aria-pressed={sel}
                    aria-label={ferro ? `Carta ${i + 1} (às cegas)` : undefined}
                  >
                    <Carta carta={c.oculta ? null : c} oculta={c.oculta} tamanho={tamanhoMao} variante={mesa.variante} manilha={mao.manilha} className={sel ? 'ring-4 ring-ouro' : ''} />
                  </button>
                )
              })}
            </div>

            {/* Ações */}
            <div className="mt-3 flex min-h-[48px] items-center justify-center gap-2">
              {ehMinhaVez && selecionada !== null ? (
                <>
                  <button className="btn btn-ouro flex-1 sm:flex-none" disabled={enviando} onClick={() => jogarSelecionada(false)}>
                    Jogar carta
                  </button>
                  {acoes.cobrir && (
                    <button className="btn btn-sec" disabled={enviando} onClick={() => jogarSelecionada(true)} title="A carta vai virada e não vale nada na vaza">
                      <EyeOff size={16} /> Coberta
                    </button>
                  )}
                </>
              ) : ehMinhaVez ? (
                <>
                  <p className="flex-1 text-center text-sm font-semibold text-ouro">Sua vez! Toque numa carta.</p>
                  {acoes.aumentar && mao.proximoPedido && (
                    <button className="btn btn-truco btn-grande animar-pulso px-5 font-display text-lg font-black italic" disabled={enviando} onClick={() => agir({ tipo: 'aumentar' })}>
                      {mao.proximoPedido.nome.toUpperCase()}!
                    </button>
                  )}
                </>
              ) : (
                !acoes.responder && !acoes.decidirOnze && <p className="text-center text-sm text-suave">{aguardandoTexto}</p>
              )}
            </div>

            {/* Conversa */}
            <div className="mt-1 flex justify-center gap-2">
              <button className="btn btn-fantasma btn-pequeno text-xs" onClick={() => setPainelFala(painelFala === 'frases' ? null : 'frases')}>
                <MessageCircle size={15} /> Falar
              </button>
              {n === 4 && (
                <button className="btn btn-fantasma btn-pequeno text-xs" onClick={() => setPainelFala(painelFala === 'sinais' ? null : 'sinais')}>
                  🤫 Sinal pro parceiro
                </button>
              )}
            </div>
            {painelFala && (
              <div className="animar-surgir mt-2 flex flex-wrap justify-center gap-1.5">
                {(painelFala === 'frases' ? FRASES : SINAIS).map((texto, indice) => (
                  <button
                    key={texto}
                    className="chip min-h-8 px-3 text-xs"
                    onClick={() => {
                      emitir(painelFala === 'frases' ? 'mesa:frase' : 'mesa:sinal', { id, indice })
                      if (painelFala === 'sinais') avisar.info(`Sinal enviado: “${texto}” (só seu parceiro vê)`)
                      setPainelFala(null)
                    }}
                  >
                    {texto}
                  </button>
                ))}
              </div>
            )}
          </div>
        </footer>
      )}

      <Modal aberto={confirmarSaida} aoFechar={() => setConfirmarSaida(false)} titulo="Sair da mesa?">
        <p className="text-sm text-suave">
          {mesa.tipo === 'treino'
            ? 'O treino será encerrado.'
            : 'A partida continua sem você: o tempo de cada jogada segue correndo e o sistema joga automaticamente no seu lugar. Você pode voltar a qualquer momento.'}
        </p>
        <div className="mt-6 flex gap-3">
          <button className="btn btn-sec flex-1" onClick={() => setConfirmarSaida(false)}>
            Ficar
          </button>
          <button
            className="btn btn-truco flex-1"
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
