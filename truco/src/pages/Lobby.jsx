import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Zap, Plus, Bot, Users, Eye, Crown, ArrowRight, Lock, Swords, Trophy } from 'lucide-react'
import { useSessao, avisar } from '../store/sessao.js'
import { useLobby } from '../lib/useLobby.js'
import { api } from '../lib/api.js'
import { emitir } from '../lib/socket.js'
import { formatarReais, iniciais } from '../lib/formato.js'
import { calcularPremioMesa } from '../../shared/premios.js'
import { VARIANTES } from '../../shared/regras.js'
import { Modal, Interruptor, Vazio, Carregando, Dinheiro, useTitulo } from '../components/ui.jsx'
import { EscolhaVariante, EscolhaModo, EscolhaValor } from '../components/Escolhas.jsx'
import { site } from '../config/site.js'

function useExigirLogin() {
  const { usuario } = useSessao()
  const navegar = useNavigate()
  return () => {
    if (usuario) return true
    navegar('/entrar?voltar=/jogar')
    return false
  }
}

function PreviaPremio({ aposta, jogadores }) {
  const { config } = useSessao()
  if (!aposta || !Number.isFinite(aposta)) return <p className="text-sm text-suave">Mesa amistosa: ninguém paga nada e não há prêmio.</p>
  const taxa = config?.taxaCasa ?? 10
  const c = calcularPremioMesa({ aposta, jogadores, taxa })
  return (
    <p className="text-sm text-suave">
      Cada um paga <strong className="text-texto">{formatarReais(aposta)}</strong>. {jogadores === 4 ? 'Cada vencedor' : 'O vencedor'} leva{' '}
      <strong className="numero text-dinheiro">{formatarReais(c.porJogador[0])}</strong>
      <span className="text-apagado"> (taxa da casa {taxa}%)</span>
    </p>
  )
}

function JogoRapido() {
  const navegar = useNavigate()
  const exigir = useExigirLogin()
  const [variante, setVariante] = useState('paulista')
  const [jogadores, setJogadores] = useState(4)
  const [aposta, setAposta] = useState(500)
  const [criar, setCriar] = useState(false)
  const [privada, setPrivada] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const valido = Number.isFinite(aposta) && aposta >= 0

  async function executar(caminho, corpo) {
    if (!exigir() || !valido) return
    setOcupado(true)
    try {
      const { id } = await api.post(caminho, corpo)
      navegar(`/mesa/${id}`)
    } catch (erro) {
      avisar.erro(erro.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="cartao p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Zap className="text-ouro" size={20} />
        <h2 className="titulo text-xl">Jogo rápido</h2>
      </div>
      <p className="mt-1 text-sm text-suave">Escolha e a gente te coloca na primeira mesa com lugar — ou abre uma nova.</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="rotulo">Variante</p>
          <EscolhaVariante valor={variante} aoMudar={setVariante} />
        </div>
        <div>
          <p className="rotulo">Modo</p>
          <EscolhaModo valor={jogadores} aoMudar={setJogadores} />
        </div>
      </div>
      <div className="mt-5">
        <p className="rotulo">Valor por jogador</p>
        <EscolhaValor valor={aposta} aoMudar={setAposta} />
      </div>
      <div className="mt-5 rounded-xl bg-fundo/60 px-4 py-3">
        <PreviaPremio aposta={aposta} jogadores={jogadores} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn btn-ouro btn-grande flex-1 sm:flex-none" disabled={ocupado || !valido} onClick={() => executar('/mesas/rapida', { variante, jogadores, aposta })}>
          <Swords size={20} /> Encontrar mesa
        </button>
        <button className="btn btn-sec btn-grande flex-1 sm:flex-none" disabled={ocupado} onClick={() => exigir() && setCriar(true)}>
          <Plus size={20} /> Criar mesa
        </button>
      </div>
      <Modal aberto={criar} aoFechar={() => setCriar(false)} titulo="Criar mesa">
        <div className="space-y-5">
          <p className="text-sm text-suave">
            {VARIANTES[variante].nome} · {jogadores === 4 ? 'Duplas' : '1x1'} · {aposta ? `${formatarReais(aposta)} por jogador` : 'amistosa'}
          </p>
          <Interruptor ligado={privada} aoMudar={setPrivada} rotulo="Mesa privada" descricao="Não aparece na lista. Só entra quem tiver o link." />
          <PreviaPremio aposta={aposta} jogadores={jogadores} />
          <button className="btn btn-ouro btn-grande w-full" disabled={ocupado || !valido} onClick={() => executar('/mesas', { variante, jogadores, aposta, privada })}>
            Criar e sentar
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Lugares({ nomes }) {
  return (
    <div className="flex -space-x-2">
      {nomes.map((n, i) => (
        <span
          key={i}
          title={n || 'Lugar livre'}
          className={`grid h-8 w-8 place-items-center rounded-full border-2 border-painel text-[10px] font-black ${
            n ? (i % 2 === 0 ? 'bg-ouro text-[#1a1406]' : 'bg-info text-[#04172b]') : 'border-dashed border-linha-forte bg-painel-2 text-apagado'
          }`}
        >
          {n ? iniciais(n) : '+'}
        </span>
      ))}
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
    <li className="cartao flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="selo">{VARIANTES[m.variante].curto}</span>
          <span className="selo">{m.jogadores === 4 ? '2x2' : '1x1'}</span>
          {!aguardando && <span className="selo bg-truco/15 text-truco">Ao vivo</span>}
        </div>
        <p className="numero mt-2 font-bold">
          {m.aposta ? (
            <>
              {formatarReais(m.aposta)} <span className="font-normal text-suave">→ prêmio</span> <span className="text-dinheiro">{formatarReais(m.premio)}</span>
            </>
          ) : (
            'Amistosa'
          )}
        </p>
      </div>
      <Lugares nomes={m.nomes} />
      {aguardando ? (
        <button className="btn btn-ouro btn-pequeno" onClick={entrar} disabled={ocupado}>
          Sentar <ArrowRight size={16} />
        </button>
      ) : (
        <Link to={`/mesa/${m.id}`} className="btn btn-sec btn-pequeno">
          <Eye size={16} /> {m.placar ? `${m.placar[0]} × ${m.placar[1]}` : 'Assistir'}
        </Link>
      )}
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
    <div className="cartao p-5">
      <div className="flex items-center gap-2">
        <Bot className="text-info" size={20} />
        <h2 className="titulo text-lg">Treino grátis</h2>
      </div>
      <p className="mt-1 text-sm text-suave">Jogue contra o computador sem gastar nada.</p>
      <div className="mt-4 space-y-3">
        <EscolhaVariante valor={variante} aoMudar={setVariante} />
        <EscolhaModo valor={jogadores} aoMudar={setJogadores} />
      </div>
      <button className="btn btn-sec mt-4 w-full" onClick={treinar} disabled={ocupado}>
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
    <div className="cartao p-5">
      <div className="flex items-center gap-2">
        <Crown className="text-ouro" size={20} />
        <h2 className="titulo text-lg">Ranking do mês</h2>
      </div>
      {!lista ? (
        <p className="mt-4 text-sm text-suave">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="mt-4 text-sm text-suave">Ninguém pontuou ainda. A primeira vitória te coloca no topo.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {lista.slice(0, 10).map((r, i) => (
            <li key={r.apelido} className="flex items-center gap-3 text-sm">
              <span className={`numero w-6 text-center font-black ${i < 3 ? 'text-ouro' : 'text-apagado'}`}>{i + 1}</span>
              <span className="flex-1 truncate font-semibold">{r.apelido}</span>
              <span className="numero text-suave">{r.vitorias} vit.</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function Lobby() {
  useTitulo(`Mesas — ${site.nome}`)
  const lobby = useLobby()
  const { usuario, saldo } = useSessao()
  const [ativos, setAtivos] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  useEffect(() => {
    if (usuario) emitir('eu:ativos').then(setAtivos)
  }, [usuario, lobby])
  const mesas = useMemo(() => {
    const lista = lobby?.mesas || []
    if (filtro === 'todas') return lista
    if (filtro === 'abertas') return lista.filter((m) => m.status === 'aguardando')
    return lista.filter((m) => m.variante === filtro)
  }, [lobby, filtro])

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo text-3xl">Mesas</h1>
          <p className="text-sm text-suave">
            {lobby ? `${lobby.online} online · ${lobby.jogando} jogando agora` : 'Conectando...'}
          </p>
        </div>
        {usuario && (
          <Link to="/carteira" className="cartao flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-suave">Seu saldo</span>
            <Dinheiro valor={saldo} className="text-lg font-bold text-dinheiro" />
          </Link>
        )}
      </div>

      {ativos?.mesa && (
        <Link to={`/mesa/${ativos.mesa}`} className="cartao animar-surgir mb-5 flex items-center gap-3 border-ouro/50 p-4">
          <Swords className="text-ouro" />
          <span className="flex-1 font-semibold">Você está sentado numa mesa.</span>
          <span className="btn btn-ouro btn-pequeno">Voltar para a mesa</span>
        </Link>
      )}
      {ativos?.torneio && (
        <Link to={`/sala/${ativos.torneio}`} className="cartao animar-surgir mb-5 flex items-center gap-3 border-ouro/50 p-4">
          <Trophy className="text-ouro" />
          <span className="flex-1 font-semibold">Você está inscrito numa sala de duplas.</span>
          <span className="btn btn-sec btn-pequeno">Ver sala</span>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <JogoRapido />
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="titulo text-xl">Mesas no ar</h2>
              <div className="flex gap-1.5">
                {[
                  ['todas', 'Todas'],
                  ['abertas', 'Com lugar'],
                  ['paulista', 'Paulista'],
                  ['mineiro', 'Mineiro'],
                ].map(([v, r]) => (
                  <button key={v} className="chip min-h-8 px-3 text-xs" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {!lobby ? (
              <Carregando />
            ) : mesas.length === 0 ? (
              <div className="cartao">
                <Vazio icone={Users} titulo="Nenhuma mesa aberta agora" texto="Use o jogo rápido acima: se não houver mesa, a gente cria uma e os próximos jogadores caem nela." />
              </div>
            ) : (
              <ul className="space-y-3">
                {mesas.map((m) => (
                  <ItemMesa key={m.id} m={m} />
                ))}
              </ul>
            )}
          </div>
        </div>
        <aside className="space-y-5">
          <Link to="/salas" className="cartao group block overflow-hidden">
            <div className="feltro flex h-24 items-center justify-center">
              <Trophy className="text-ouro drop-shadow" size={40} />
            </div>
            <div className="p-5">
              <p className="titulo text-lg group-hover:text-ouro">Salas de duplas</p>
              <p className="mt-1 text-sm text-suave">
                {lobby ? `${lobby.torneios.length} sala(s) no ar.` : ''} Monte a sua com quantas duplas quiser e defina o prêmio.
              </p>
            </div>
          </Link>
          <Treino />
          <Ranking />
          <p className="flex items-start gap-2 px-1 text-xs text-apagado">
            <Lock size={14} className="mt-0.5 shrink-0" /> O valor da mesa fica retido até o fim da partida. Saiu antes de começar? Ele volta na hora.
          </p>
        </aside>
      </div>
    </section>
  )
}
