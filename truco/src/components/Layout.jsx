import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Wallet, Plus, User, LogOut, Shield, Gamepad2, Trophy, Home, BookOpen, ChevronDown, Swords } from 'lucide-react'
import { Logo } from './Logo.jsx'
import { Avisos, Dinheiro } from './ui.jsx'
import { useSessao, avisar } from '../store/sessao.js'
import { obterSocket } from '../lib/socket.js'
import { site } from '../config/site.js'
import { iniciais } from '../lib/formato.js'

function MenuUsuario() {
  const { usuario, sair } = useSessao()
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  const navegar = useNavigate()
  useEffect(() => {
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false)
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])
  const item = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-painel-3'
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2 rounded-full border border-linha bg-painel-2 py-1 pl-1 pr-2.5 hover:border-linha-forte" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-label="Menu da conta">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-ouro to-ouro-escuro text-xs font-black text-[#1a1406]">{iniciais(usuario.apelido)}</span>
        <ChevronDown size={16} className="text-suave" />
      </button>
      {aberto && (
        <div className="cartao animar-surgir absolute right-0 top-12 z-40 w-56 p-2 shadow-2xl" onClick={() => setAberto(false)}>
          <p className="px-3 pb-2 pt-1 text-xs text-apagado">
            Conectado como <strong className="text-texto">{usuario.apelido}</strong>
          </p>
          <Link className={item} to="/perfil">
            <User size={16} /> Meu perfil
          </Link>
          <Link className={item} to="/carteira">
            <Wallet size={16} /> Carteira
          </Link>
          {usuario.admin && (
            <Link className={item} to="/admin">
              <Shield size={16} /> Painel do dono
            </Link>
          )}
          <button
            className={`${item} w-full text-truco`}
            onClick={async () => {
              await sair()
              avisar.info('Você saiu da sua conta.')
              navegar('/')
            }}
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  )
}

function Cabecalho() {
  const { usuario, saldo } = useSessao()
  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'text-ouro' : 'text-suave hover:text-texto'}`
  return (
    <header className="sticky top-0 z-30 border-b border-linha/70 bg-fundo/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Principal">
          <NavLink to="/jogar" className={link} end>
            Jogar
          </NavLink>
          <NavLink to="/salas" className={link}>
            Salas de duplas
          </NavLink>
          <NavLink to="/regras" className={link}>
            Regras
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {usuario ? (
            <>
              <Link to="/carteira" className="flex items-center gap-2 rounded-full border border-linha bg-painel-2 py-1 pl-3 pr-1 hover:border-linha-forte" aria-label="Saldo e carteira">
                <Dinheiro valor={saldo} className="text-sm font-bold text-dinheiro" />
                <span className="grid h-7 w-7 place-items-center rounded-full bg-dinheiro text-[#04281a]">
                  <Plus size={16} strokeWidth={3} />
                </span>
              </Link>
              <MenuUsuario />
            </>
          ) : (
            <>
              <Link to="/entrar" className="btn btn-fantasma btn-pequeno">
                Entrar
              </Link>
              <Link to="/cadastro" className="btn btn-ouro btn-pequeno">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function BarraInferior() {
  const { usuario } = useSessao()
  const item = ({ isActive }) => `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold ${isActive ? 'text-ouro' : 'text-apagado'}`
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-linha bg-painel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Navegação">
      <NavLink to="/" end className={item}>
        <Home size={20} /> Início
      </NavLink>
      <NavLink to="/jogar" className={item}>
        <Gamepad2 size={20} /> Jogar
      </NavLink>
      <NavLink to="/salas" className={item}>
        <Trophy size={20} /> Salas
      </NavLink>
      <NavLink to="/regras" className={item}>
        <BookOpen size={20} /> Regras
      </NavLink>
      <NavLink to={usuario ? '/carteira' : '/entrar'} className={item}>
        <Wallet size={20} /> Carteira
      </NavLink>
    </nav>
  )
}

function Rodape() {
  const { config } = useSessao()
  return (
    <footer className="mt-20 border-t border-linha pb-28 pt-10 md:pb-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo compacto />
          <p className="mt-3 max-w-sm text-sm text-suave">{site.descricao}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-truco text-sm font-black text-truco">18+</span>
            <p className="text-xs text-apagado">Proibido para menores de 18 anos. Jogue com responsabilidade.</p>
          </div>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">Plataforma</p>
          <ul className="space-y-2 text-suave">
            <li><Link className="hover:text-texto" to="/jogar">Mesas</Link></li>
            <li><Link className="hover:text-texto" to="/salas">Salas de duplas</Link></li>
            <li><Link className="hover:text-texto" to="/regras">Regras do truco</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">Ajuda</p>
          <ul className="space-y-2 text-suave">
            <li><Link className="hover:text-texto" to="/termos">Termos de uso</Link></li>
            <li><Link className="hover:text-texto" to="/jogo-responsavel">Jogo responsável</Link></li>
            {config?.whatsappSuporte && (
              <li>
                <a className="hover:text-texto" href={`https://wa.me/${config.whatsappSuporte}`} target="_blank" rel="noreferrer">
                  Suporte no WhatsApp
                </a>
              </li>
            )}
            {config?.emailSuporte && (
              <li>
                <a className="hover:text-texto" href={`mailto:${config.emailSuporte}`}>
                  {config.emailSuporte}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-4 text-xs text-apagado">
        © {new Date().getFullYear()} {site.empresa || site.nome}
        {site.cnpj && ` · CNPJ ${site.cnpj}`}
      </p>
    </footer>
  )
}

/** Aviso fixo quando a partida da sala de duplas começa. */
function ChamadaPartida() {
  const [chamada, setChamada] = useState(null)
  const local = useLocation()
  const navegar = useNavigate()
  useEffect(() => {
    const s = obterSocket()
    const aoChamar = (dados) => setChamada(dados)
    s.on('torneio:partida', aoChamar)
    return () => s.off('torneio:partida', aoChamar)
  }, [])
  if (!chamada || local.pathname === `/mesa/${chamada.mesaId}`) return null
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
      <div className="cartao animar-surgir flex w-full max-w-lg items-center gap-3 border-ouro/60 p-3 pl-4 shadow-2xl">
        <Swords className="shrink-0 text-ouro" size={22} />
        <p className="flex-1 text-sm">
          <strong>Sua partida começou!</strong> {chamada.jogo} — {chamada.nome}
        </p>
        <button
          className="btn btn-ouro btn-pequeno"
          onClick={() => {
            navegar(`/mesa/${chamada.mesaId}`)
            setChamada(null)
          }}
        >
          Ir para a mesa
        </button>
      </div>
    </div>
  )
}

export function Layout() {
  const local = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [local.pathname])
  return (
    <>
      <Cabecalho />
      <main className="min-h-[70dvh]">
        <Outlet />
      </main>
      <Rodape />
      <BarraInferior />
      <ChamadaPartida />
      <Avisos />
    </>
  )
}

/** Layout em tela cheia (mesa de jogo). */
export function LayoutTelaCheia() {
  return (
    <>
      <Outlet />
      <ChamadaPartida />
      <Avisos />
    </>
  )
}
