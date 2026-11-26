import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Zap, Bot, Users, User, Eye, Crown, ArrowRight, Lock, Swords, Trophy, Link2, Shuffle } from 'lucide-react'
import { useSessao, avisar } from '../store/sessao.js'
import { useLobby } from '../lib/useLobby.js'
import { api } from '../lib/api.js'
import { emitir } from '../lib/socket.js'
import { formatarReais } from '../lib/formato.js'
import { calcularPremioMesa, calcularPremios } from '../../shared/premios.js'
import { VARIANTES } from '../../shared/regras.js'
import { Vazio, Carregando, Dinheiro, Alternador, useTitulo } from '../components/ui.jsx'
import { EscolhaVariante, EscolhaModo, EscolhaValor } from '../components/Escolhas.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { site } from '../config/site.js'

const MODOS = [
  { id: '1x1', icone: User, titulo: '1 contra 1', texto: 'Mano a mano' },
  { id: 'duplas', icone: Shuffle, titulo: 'Duplas', texto: 'Parceiro aleatório' },
  { id: 'amigo', icone: Link2, titulo: 'Com amigo', texto: 'Mesa privada por link' },
  { id: 'relampago', icone: Zap, titulo: 'Relâmpago', texto: 'Torneio de 4 ou 8' },
]

function useExigirLogin() {
  const { usuario } = useSessao()
  const navegar = useNavigate()
  return () => {
    if (usuario) return true
    navegar('/entrar?voltar=/jogar')
    return false
  }
}

function Previa({ modo, aposta, formato, tamanho }) {
  const { config } = useSessao()
  const taxa = config?.taxaCasa ?? 10
  if (!Number.isFinite(aposta)) return <p className="text-suave">Informe um valor válido.</p>
  if (!aposta) return <p className="text-suave">Sem valor: ninguém paga e não há prêmio em dinheiro.</p>
  if (modo === 'relampago') {
    const porTime = formato === 'duplas' ? 2 : 1
    const percentuais = tamanho >= 8 ? [70, 30] : [100]
    const c = calcularPremios({ entrada: aposta, jogadoresPorTime: porTime, times: tamanho, taxa, percentuais })
    return (
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="rotulo mb-0.5">{porTime > 1 ? 'Cada campeão leva' : 'O campeão leva'}</p>
          <p className="numero font-display text-4xl font-extrabold leading-none text-dinheiro">{formatarReais(c.porJogador[0])}</p>
        </div>
        {percentuais.length > 1 && (
          <div>
            <p className="rotulo mb-0.5">2º lugar</p>
            <p className="numero font-display text-2xl font-extrabold leading-none text-dinheiro/80">{formatarReais(c.porJogador[1])}</p>
          </div>
        )}
        <p className="text-sm text-apagado">
          Entrada {formatarReais(aposta)} · {tamanho} {porTime > 1 ? 'duplas' : 'jogadores'} · taxa {taxa}%
        </p>
      </div>
    )
  }
  const jogadores = modo === '1x1' ? 2 : 4
  const c = calcularPremioMesa({ aposta, jogadores, taxa })
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
      <div>
        <p className="rotulo mb-0.5">{jogadores === 4 ? 'Cada vencedor leva' : 'O vencedor leva'}</p>
        <p className="numero font-display text-4xl font-extrabold leading-none text-dinheiro">{formatarReais(c.porJogador[0])}</p>
      </div>
      <p className="text-sm text-apagado">
        Entrada {formatarReais(aposta)} por jogador · taxa {taxa}%
      </p>
    </div>
  )
}

function Painel() {
  const navegar = useNavigate()
  const exigir = useExigirLogin()
  const [params, setParams] = useSearchParams()
  const modoInicial = MODOS.some((m) => m.id === params.get('modo')) ? params.get('modo') : '1x1'
  const [modo, setModo] = useState(modoInicial)
  const [variante, setVariante] = useState('paulista')
  const [aposta, setAposta] = useState(500)
  const [formato, setFormato] = useState('individual')
  const [tamanho, setTamanho] = useState(4)
  const [ocupado, setOcupado] = useState(false)
  const valido = Number.isFinite(aposta) && aposta >= 0

  function escolherModo(m) {
    setModo(m)
    setParams(m === '1x1' ? {} : { modo: m }, { replace: true })
  }

  async function jogar() {
    if (!exigir() || !valido) return
    setOcupado(true)
    try {
      if (modo === 'relampago') {
        const { id } = await api.post('/torneios/relampago', { variante, formato, times: tamanho, entrada: aposta })
        navegar(`/sala/${id}`)
      } else if (modo === 'amigo') {
        const { id } = await api.post('/mesas', { variante, jogadores: 4, aposta, privada: true })
        avisar.info('Mesa criada! Toque em "Convidar" e mande o link para o seu parceiro.')
        navegar(`/mesa/${id}`)
      } else {
        const { id } = await api.post('/mesas/rapida', { variante, jogadores: modo === '1x1' ? 2 : 4, aposta })
        navegar(`/mesa/${id}`)
      }
    } catch (erro) {
      avisar.erro(erro.message)
      setOcupado(false)
    }
  }

  const textoBotao = { '1x1': 'Encontrar adversário', duplas: 'Encontrar mesa de duplas', amigo: 'Criar mesa e convidar', relampago: 'Entrar no relâmpago' }[modo]

  return (
    <div className="overflow-hidden rounded-2xl border border-linha bg-painel">
      <div className="grid grid-cols-2 border-b border-linha sm:grid-cols-4" role="tablist" aria-label="Modo de jogo">
        {MODOS.map(({ id, icone: Icone, titulo, texto }) => {
          const ativo = modo === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={ativo}
              onClick={() => escolherModo(id)}
              className={`relative flex flex-col items-start gap-1 border-linha p-4 text-left transition-colors [&:not(:last-child)]:border-r ${
                ativo ? 'bg-painel-2' : 'hover:bg-painel-2/50'
              }`}
            >
              {ativo && <span className="absolute inset-x-0 top-0 h-[3px] bg-marca" />}
              <Icone size={22} className={ativo ? 'text-marca-forte' : 'text-apagado'} />
              <span className={`font-display text-xl font-extrabold uppercase leading-none ${ativo ? 'text-white' : 'text-suave'}`}>{titulo}</span>
              <span className="text-[13px] text-apagado">{texto}</span>
            </button>
          )
        })}
      </div>
      <div className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="rotulo">Variante</p>
            <EscolhaVariante valor={variante} aoMudar={setVariante} />
          </div>
          {modo === 'relampago' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="rotulo">Formato</p>
                <Alternador
                  rotulo="Formato"
                  valor={formato}
                  aoMudar={setFormato}
                  opcoes={[
                    { valor: 'individual', rotulo: '1x1' },
                    { valor: 'duplas', rotulo: '2x2' },
                  ]}
                />
              </div>
              <div>
                <p className="rotulo">Tamanho</p>
                <Alternador
                  rotulo="Tamanho"
                  valor={tamanho}
                  aoMudar={setTamanho}
                  opcoes={[
                    { valor: 4, rotulo: '4' },
                    { valor: 8, rotulo: '8' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
        <div>
          <p className="rotulo">{modo === 'relampago' ? 'Inscrição por jogador' : 'Valor por jogador'}</p>
          <EscolhaValor valor={aposta} aoMudar={setAposta} rotuloGratis={modo === 'relampago' ? 'Grátis' : 'Amistosa'} />
        </div>
        <div className="flex flex-col gap-5 rounded-xl border border-linha bg-fundo/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Previa modo={modo} aposta={aposta} formato={formato} tamanho={tamanho} />
          <button className="btn btn-primario btn-grande shrink-0" disabled={ocupado || !valido} onClick={jogar}>
            {textoBotao} <ArrowRight size={20} />
          </button>
        </div>
        {modo === 'duplas' && <p className="text-sm text-apagado">Você cai na primeira mesa de duplas com lugar. O parceiro é quem sentar ao seu lado.</p>}
        {modo === 'relampago' && (
          <p className="text-sm text-apagado">
            Entra no relâmpago que estiver mais perto de lotar (ou abre um). {formato === 'duplas' ? 'A dupla é formada com quem chegar. ' : ''}Lotou, a chave é sorteada e começa na hora.
          </p>
        )}
      </div>
    </div>
  )
}

function Lugares({ nomes, avatares }) {
  return (
    <div className="flex -space-x-2">
      {nomes.map((n, i) =>
        n ? (
          <span key={i} title={n} className="rounded-full ring-2 ring-painel">
            <Avatar avatar={avatares?.[i]} apelido={n} tamanho={30} />
          </span>
        ) : (
          <span key={i} title="Lugar livre" className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-dashed border-linha-forte bg-painel-2 text-xs text-apagado ring-2 ring-painel">
            +
          </span>
        ),
      )}
    </div>
  )
}

function ItemMesa({ m }) {
  const navegar = useNavigate()
  const exigir = useExigirLogin()
  const [ocupado, setOcupado] = useState(false)
  async function entrar() {
    if (!exigir()) return
    setOcupado(true)
    try {
      await api.post(`/mesas/${m.id}/entrar`)
      navegar(`/mesa/${m.id}`)
    } catch (erro) {
      avisar.erro(erro.message)
      setOcupado(false)
    }
  }
  const aguardando = m.status === 'aguardando'
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-linha bg-painel px-4 py-3">
      <div className="w-16">
        <p className="font-display text-xl font-extrabold uppercase leading-none">{m.jogadores === 4 ? '2x2' : '1x1'}</p>
        <p className="text-xs text-apagado">{VARIANTES[m.variante].curto}</p>
      </div>
      <div className="min-w-0 flex-1">
        {m.aposta ? (
          <p className="numero font-display text-xl font-bold leading-tight">
            {formatarReais(m.aposta)} <span className="text-apagado">→</span> <span className="text-dinheiro">{formatarReais(m.premio)}</span>
          </p>
        ) : (
          <p className="font-display text-xl font-bold uppercase leading-tight text-suave">Amistosa</p>
        )}
        {!aguardando && <span className="font-display text-xs font-bold uppercase tracking-widest text-marca-forte">● Ao vivo</span>}
      </div>
      <Lugares nomes={m.nomes} avatares={m.avatares} />
      {aguardando ? (
        <button className="btn btn-primario btn-pequeno" onClick={entrar} disabled={ocupado}>
          Sentar
        </button>
      ) : (
        <Link to={`/mesa/${m.id}`} className="btn btn-sec btn-pequeno">
          <Eye size={16} /> {m.placar ? `${m.placar[0]} × ${m.placar[1]}` : 'Assistir'}
        </Link>
      )}
    </li>
  )
}

function ItemRelampago({ t }) {
  const navegar = useNavigate()
  const exigir = useExigirLogin()
  const [ocupado, setOcupado] = useState(false)
  async function entrar() {
    if (!exigir()) return
    setOcupado(true)
    try {
      await api.post(`/torneios/${t.id}/entrar`)
      navegar(`/sala/${t.id}`)
    } catch (erro) {
      avisar.erro(erro.message)
      setOcupado(false)
    }
  }
  const faltam = t.total - t.inscritos
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-linha bg-painel px-4 py-3">
      <Zap size={22} className="text-ouro" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold uppercase leading-tight">
          {t.times} {t.formato === 'duplas' ? 'duplas' : 'jogadores'} · {VARIANTES[t.variante].curto}
        </p>
        <p className="numero text-sm text-suave">
          {t.entrada ? `${formatarReais(t.entrada)} → ` : 'Grátis'}
          {t.entrada > 0 && <span className="font-semibold text-dinheiro">{formatarReais(t.premioTotal)} em prêmios</span>}
        </p>
      </div>
      <div className="w-32">
        <p className="mb-1 text-right font-display text-sm font-bold uppercase text-marca-forte">{faltam === 1 ? 'Falta 1!' : `Faltam ${faltam}`}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-painel-3">
          <div className="h-full bg-marca" style={{ width: `${(t.inscritos / t.total) * 100}%` }} />
        </div>
      </div>
      <button className="btn btn-primario btn-pequeno" onClick={entrar} disabled={ocupado}>
        Entrar
      </button>
    </li>
  )
}

function Treino() {
  const navegar = useNavigate()
  const exigir = useExigirLogin()
  const [variante, setVariante] = useState('paulista')
  const [jogadores, setJogadores] = useState(4)
  const [ocupado, setOcupado] = useState(false)
  async function treinar() {
    if (!exigir()) return
    setOcupado(true)
    try {
      const { id } = await api.post('/treino', { variante, jogadores })
      navegar(`/mesa/${id}`)
    } catch (erro) {
      avisar.erro(erro.message)
      setOcupado(false)
    }
  }
  return (
    <div className="rounded-2xl border border-linha bg-painel p-5">
      <div className="flex items-center gap-2">
        <Bot className="text-azul-claro" size={22} />
        <h2 className="titulo text-2xl">Treino grátis</h2>
      </div>
      <p className="mt-1 text-[15px] text-suave">Contra o computador, sem gastar nada.</p>
      <div className="mt-4 space-y-3">
        <EscolhaVariante valor={variante} aoMudar={setVariante} />
        <EscolhaModo valor={jogadores} aoMudar={setJogadores} />
      </div>
      <button className="btn btn-azul mt-4 w-full" onClick={treinar} disabled={ocupado}>
        Treinar agora
      </button>
    </div>
  )
}

function Ranking() {
  const [lista, setLista] = useState(null)
  useEffect(() => {
    api.get('/ranking').then(setLista).catch(() => setLista([]))
  }, [])
  return (
    <div className="rounded-2xl border border-linha bg-painel p-5">
      <div className="flex items-center gap-2">
        <Crown className="text-ouro" size={22} />
        <h2 className="titulo text-2xl">Ranking do mês</h2>
      </div>
      {!lista ? (
        <p className="mt-4 text-sm text-suave">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="mt-3 text-[15px] text-suave">Ninguém pontuou ainda. A primeira vitória te coloca no topo.</p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {lista.slice(0, 10).map((r, i) => (
            <li key={r.apelido} className="flex items-center gap-3">
              <span className={`numero w-6 text-center font-display text-lg font-extrabold ${i === 0 ? 'text-ouro' : i < 3 ? 'text-white' : 'text-apagado'}`}>{i + 1}</span>
              <Avatar apelido={r.apelido} avatar={r.avatar} tamanho={28} />
              <span className="flex-1 truncate font-semibold">{r.apelido}</span>
              <span className="numero text-sm text-suave">{r.vitorias} vit.</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function Lobby() {
  useTitulo(`Jogar — ${site.nome}`)
  const lobby = useLobby()
  const { usuario, saldo } = useSessao()
  const [ativos, setAtivos] = useState(null)
  const [lista, setLista] = useState('mesas')
  useEffect(() => {
    if (usuario) emitir('eu:ativos').then(setAtivos)
  }, [usuario, lobby])
  const mesas = lobby?.mesas || []
  const relampagos = useMemo(() => (lobby?.torneios || []).filter((t) => t.relampago && t.status === 'inscricoes'), [lobby])

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo text-5xl">Jogar</h1>
          <p className="mt-1 text-suave">{lobby ? `${lobby.online} online · ${lobby.jogando} jogando agora` : 'Conectando...'}</p>
        </div>
        {usuario && (
          <Link to="/carteira" className="hidden rounded-xl border border-linha bg-painel px-4 py-2 text-right hover:border-linha-forte sm:block">
            <span className="rotulo mb-0">Seu saldo</span>
            <Dinheiro valor={saldo} className="font-display text-2xl font-extrabold text-dinheiro" />
          </Link>
        )}
      </div>

      {ativos?.mesa && (
        <Link to={`/mesa/${ativos.mesa}`} className="animar-surgir mb-4 flex items-center gap-3 rounded-xl border border-marca/60 bg-marca/10 p-4">
          <Swords className="text-marca-forte" />
          <span className="flex-1 font-semibold">Você está sentado numa mesa.</span>
          <span className="btn btn-primario btn-pequeno">Voltar para a mesa</span>
        </Link>
      )}
      {ativos?.torneio && (
        <Link to={`/sala/${ativos.torneio}`} className="animar-surgir mb-4 flex items-center gap-3 rounded-xl border border-linha-forte bg-painel p-4">
          <Trophy className="text-ouro" />
          <span className="flex-1 font-semibold">Você está inscrito numa sala.</span>
          <span className="btn btn-sec btn-pequeno">Ver sala</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Painel />
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5" role="tablist">
                <button role="tab" aria-selected={lista === 'mesas'} className="chip" aria-pressed={lista === 'mesas'} onClick={() => setLista('mesas')}>
                  Mesas abertas <span className="numero text-apagado">{mesas.length}</span>
                </button>
                <button role="tab" aria-selected={lista === 'relampagos'} className="chip" aria-pressed={lista === 'relampagos'} onClick={() => setLista('relampagos')}>
                  Relâmpagos <span className="numero text-apagado">{relampagos.length}</span>
                </button>
              </div>
              <Link to="/salas" className="font-display text-sm font-bold uppercase tracking-wider text-suave hover:text-white">
                Salas de duplas →
              </Link>
            </div>
            {!lobby ? (
              <Carregando />
            ) : lista === 'mesas' ? (
              mesas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-linha-forte">
                  <Vazio icone={Users} titulo="Nenhuma mesa aberta" texto="Escolha um modo acima: se não houver mesa, a gente abre uma e os próximos caem nela." />
                </div>
              ) : (
                <ul className="space-y-2">
                  {mesas.map((m) => (
                    <ItemMesa key={m.id} m={m} />
                  ))}
                </ul>
              )
            ) : relampagos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-linha-forte">
                <Vazio icone={Zap} titulo="Nenhum relâmpago esperando gente" texto="Escolha o modo Relâmpago acima para abrir um. Os próximos jogadores caem nele." />
              </div>
            ) : (
              <ul className="space-y-2">
                {relampagos.map((t) => (
                  <ItemRelampago key={t.id} t={t} />
                ))}
              </ul>
            )}
          </div>
        </div>
        <aside className="space-y-5">
          <Treino />
          <Ranking />
          <p className="flex items-start gap-2 px-1 text-sm text-apagado">
            <Lock size={15} className="mt-0.5 shrink-0" /> O valor da mesa fica guardado até o fim da partida. Saiu antes de começar? Volta na hora.
          </p>
        </aside>
      </div>
    </section>
  )
}
