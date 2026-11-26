// Versão de treino offline (para testar a mesa sem servidor): você contra o computador, sem dinheiro.
import { StrictMode, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router'
// Só os alfabetos latinos (português), para o arquivo ficar leve.
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/barlow/latin-ext-400.css'
import '@fontsource/barlow/latin-ext-700.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
import '@fontsource/barlow-condensed/latin-800-italic.css'
import '@fontsource/barlow-condensed/latin-ext-800.css'
import '../index.css'
import { ArrowRight, Shuffle, Moon, EyeOff, Smile } from 'lucide-react'
import { MesaTela } from '../pages/Mesa.jsx'
import { MesaLocal, mesasLocais } from './mesaLocal.js'
import { Carta } from '../components/Carta.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { MarcaZap } from '../components/Logo.jsx'
import { Avisos } from '../components/ui.jsx'
import { AVATARES, VARIANTES } from '../../shared/regras.js'
import { site } from '../config/site.js'

function lerPreferencias() {
  try {
    return JSON.parse(localStorage.getItem('treino') || '{}')
  } catch {
    return {}
  }
}

function salvarPreferencias(p) {
  try {
    localStorage.setItem('treino', JSON.stringify(p))
  } catch {
    // armazenamento indisponível: segue sem lembrar
  }
}

function Inicio() {
  const navegar = useNavigate()
  const salvo = lerPreferencias()
  const [variante, setVariante] = useState(salvo.variante || 'paulista')
  const [jogadores, setJogadores] = useState(salvo.jogadores || 4)
  const [apelido, setApelido] = useState(salvo.apelido || '')
  const [avatar, setAvatar] = useState(salvo.avatar || 'coroa')

  function comecar() {
    const nome = apelido.trim().slice(0, 16) || 'Você'
    salvarPreferencias({ variante, jogadores, apelido: nome, avatar })
    const mesa = new MesaLocal({ variante, jogadores, apelido: nome, avatar })
    navegar(`/mesa/${mesa.id}`)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-10 py-8 lg:flex-row lg:items-center">
      <div className="lg:w-[46%]">
        <div className="flex items-center gap-2.5">
          <MarcaZap tamanho={36} />
          <span className="font-display text-2xl font-extrabold uppercase italic leading-none">
            Zap <span className="text-marca">Arena</span>
          </span>
        </div>
        <p className="sobretitulo mt-8">Mesa de treino</p>
        <h1 className="titulo mt-3 text-[3.2rem] leading-[0.9] sm:text-7xl">
          Pede truco
          <br />
          <span className="relative inline-block px-1">
            <span className="absolute inset-0 -skew-x-[14deg] bg-marca" aria-hidden="true" />
            <span className="relative">no computador.</span>
          </span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-suave">
          Esta é a mesa do {site.nome} rodando direto no navegador: você contra o computador, sem dinheiro. No site, as mesas são com gente de verdade e valendo.
        </p>
        <div className="relative mt-8 hidden h-40 lg:block" aria-hidden="true">
          <Carta carta={{ r: '4', s: 'p' }} variante="mineiro" largura={96} className="absolute left-0 top-4 -rotate-12" />
          <Carta carta={{ r: '7', s: 'c' }} variante="mineiro" largura={96} className="absolute left-20 top-0 -rotate-2" />
          <Carta carta={{ r: 'A', s: 'e' }} variante="mineiro" largura={96} className="absolute left-40 top-3 rotate-8" />
          <Carta oculta largura={96} className="absolute left-60 top-8 rotate-[18deg]" />
        </div>
      </div>

      <div className="rounded-2xl border border-linha bg-painel p-5 sm:p-7 lg:flex-1">
        <div className="space-y-6">
          <div>
            <p className="rotulo">Variante</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(VARIANTES).map((v) => (
                <button key={v.id} className="chip min-h-14 flex-col items-start justify-center px-4 py-2 text-left" aria-pressed={variante === v.id} onClick={() => setVariante(v.id)}>
                  <span className="font-display text-lg font-extrabold uppercase leading-none">{v.curto}</span>
                  <span className="text-xs font-medium text-suave">{v.usaVira ? 'Manilha pela vira' : 'Manilhas fixas'}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="rotulo">Modo</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="chip min-h-14 flex-col items-start justify-center px-4 py-2 text-left" aria-pressed={jogadores === 2} onClick={() => setJogadores(2)}>
                <span className="font-display text-lg font-extrabold uppercase leading-none">1 contra 1</span>
                <span className="text-xs font-medium text-suave">Você e um adversário</span>
              </button>
              <button className="chip min-h-14 flex-col items-start justify-center px-4 py-2 text-left" aria-pressed={jogadores === 4} onClick={() => setJogadores(4)}>
                <span className="font-display text-lg font-extrabold uppercase leading-none">Duplas</span>
                <span className="text-xs font-medium text-suave">Com parceiro do computador</span>
              </button>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="rotulo" htmlFor="apelido">Seu apelido</label>
              <input id="apelido" className="campo" maxLength={16} placeholder="Você" value={apelido} onChange={(e) => setApelido(e.target.value)} />
            </div>
            <div>
              <p className="rotulo">Avatar</p>
              <div className="flex max-w-[300px] flex-wrap gap-1">
                {AVATARES.slice(0, 8).map((a) => (
                  <button key={a.id} onClick={() => setAvatar(a.id)} aria-pressed={avatar === a.id} aria-label={`Avatar ${a.id}`} className={`rounded-full p-0.5 ${avatar === a.id ? 'ring-2 ring-marca ring-offset-2 ring-offset-painel' : ''}`}>
                    <Avatar avatar={a.id} tamanho={28} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="btn btn-primario btn-grande w-full" onClick={comecar}>
            Dar as cartas <ArrowRight size={20} />
          </button>
        </div>
        <ul className="mt-6 grid gap-3 border-t border-linha pt-5 text-[15px] text-suave sm:grid-cols-2">
          <li className="flex gap-2.5">
            <Shuffle size={18} className="mt-0.5 shrink-0 text-marca-forte" /> Toque na carta para jogar. Na sua vez aparece o botão de pedir truco.
          </li>
          <li className="flex gap-2.5">
            <EyeOff size={18} className="mt-0.5 shrink-0 text-marca-forte" /> Da 2ª vaza em diante, toque em Esconder e depois na carta para jogá-la virada.
          </li>
          <li className="flex gap-2.5">
            <Moon size={18} className="mt-0.5 shrink-0 text-marca-forte" /> No 11 a 11 a mesa vota: normal ou nas escuras (3 de 4 votos).
          </li>
          <li className="flex gap-2.5">
            <Smile size={18} className="mt-0.5 shrink-0 text-marca-forte" /> Reações e frases ficam no canto da mesa. O som liga e desliga no topo.
          </li>
        </ul>
      </div>
    </div>
  )
}

function MesaTreino() {
  const { id } = useParams()
  const navegar = useNavigate()
  const local = mesasLocais.get(id)
  const [mesa, setMesa] = useState(() => local?.visao() ?? null)
  const [reacoes, setReacoes] = useState([])
  const desvio = useRef(0)

  useEffect(() => {
    const m = mesasLocais.get(id)
    if (!m) return
    const aoEstado = (v) => setMesa(v)
    const aoReagir = (r) => setReacoes((lista) => [...lista.filter((x) => x.ate > Date.now()).slice(-8), { ...r, ate: Date.now() + 2300 }])
    m.ouvintes.add(aoEstado)
    m.ouvintesReacao.add(aoReagir)
    setMesa(m.visao())
    return () => {
      m.ouvintes.delete(aoEstado)
      m.ouvintesReacao.delete(aoReagir)
    }
  }, [id])

  const emitir = useCallback(
    async (evento, dados) => {
      const m = mesasLocais.get(id)
      if (!m) return { erro: 'Treino encerrado.' }
      if (evento === 'mesa:acao') return m.agir(dados.acao)
      if (evento === 'mesa:frase') {
        m.falar(0, dados.indice)
        m.avisar()
      } else if (evento === 'mesa:reacao') m.reagir(0, dados.indice)
      return { ok: true }
    },
    [id],
  )

  const post = useCallback(
    async (caminho, corpo) => {
      if (caminho === '/treino') {
        const anterior = mesasLocais.get(id)
        const nova = new MesaLocal({ variante: corpo.variante, jogadores: corpo.jogadores, apelido: anterior?.assentos[0].apelido, avatar: anterior?.assentos[0].avatar })
        anterior?.encerrar()
        return { id: nova.id }
      }
      if (caminho.endsWith('/sair')) {
        mesasLocais.get(id)?.encerrar()
        return { ok: true }
      }
      throw new Error('Essa função existe só no site com servidor.')
    },
    [id],
  )

  return (
    <MesaTela
      id={id}
      mesa={mesa}
      erro={mesa ? null : 'Treino encerrado.'}
      sinal={null}
      reacoes={reacoes}
      desvio={desvio}
      emitir={emitir}
      post={post}
      navegar={navegar}
      classeAltura="h-full"
    />
  )
}

function App() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/mesa/:id" element={<MesaTreino />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
      <Avisos />
    </MemoryRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
