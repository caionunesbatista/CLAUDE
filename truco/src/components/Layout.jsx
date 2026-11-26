import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Wallet, Plus, User, LogOut, Shield, Gamepad2, Trophy, Home, BookOpen, ChevronDown, Swords } from 'lucide-react'
import { Logo } from './Logo.jsx'
import { Avatar } from './Avatar.jsx'
import { Avisos, Dinheiro } from './ui.jsx'
import { useSessao, avisar } from '../store/sessao.js'
import { obterSocket } from '../lib/socket.js'
import { site } from '../config/site.js'

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
  const item = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium hover:bg-painel-3'
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-white/5" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-label="Menu da conta">
        <Avatar avatar={usuario.avatar} apelido={usuario.apelido} tamanho={36} />
        <ChevronDown size={16} className="text-suave" />
      </button>
      {aberto && (
        <div className="cartao animar-surgir absolute right-0 top-12 z-40 w-60 p-2 shadow-2xl shadow-black/60" onClick={() => setAberto(false)}>
          <div className="flex items-center gap-3 border-b border-linha px-3 pb-3 pt-2">
            <Avatar avatar={usuario.avatar} apelido={usuario.apelido} tamanho={34} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold uppercase leading-tight">{usuario.apelido}</p>
              <p className="truncate text-xs text-apagado">{usuario.email}</p>
            </div>
          </div>
          <div className="pt-1.5">
            <Link className={item} to="/perfil">
              <User size={17} /> Meu perfil
            </Link>
            <Link className={item} to="/carteira">
              <Wallet size={17} /> Carteira
            </Link>
            {usuario.admin && (
              <Link className={item} to="/admin">
                <Shield size={17} /> Painel do dono
              </Link>
            )}
            <button
              className={`${item} w-full text-marca-forte`}
              onClick={async () => {
                await sair()
                avisar.info('Você saiu da sua conta.')
                navegar('/')
              }}
            >
              <LogOut size={17} /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Cabecalho() {
  const { usuario, saldo } = useSessao()
  const link = ({ isActive }) =>
    `relative px-1 py-5 font-display text-[1.05rem] font-bold uppercase tracking-wide transition-colors ${
      isActive ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:skew-x-[-18deg] after:bg-marca' : 'text-suave hover:text-white'
    }`
  return (
    <header className="sticky top-0 z-30 border-b border-linha bg-fundo/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Logo />
        <nav className="ml-6 hidden items-center gap-7 md:flex" aria-label="Principal">
          <NavLink to="/jogar" className={link}>
            Jogar
          </NavLink>
          <NavLink to="/salas" className={link}>
            Salas de duplas
          </NavLink>
          <NavLink to="/regras" className={link}>
            Regras
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          {usuario ? (
            <>
              <Link to="/carteira" className="flex items-stretch overflow-hidden rounded-lg border border-linha-forte bg-painel-2 hover:border-[#3d5490]" aria-label="Saldo e carteira">
                <span className="px-3 py-1.5">
                  <span className="block font-display text-[10px] font-bold uppercase leading-none tracking-widest text-apagado">Saldo</span>
                  <Dinheiro valor={saldo} className="block font-display text-lg font-bold leading-tight text-dinheiro" />
                </span>
                <span className="grid place-items-center bg-marca px-2.5 text-white">
                  <Plus size={18} strokeWidth={3} />
                </span>
              </Link>
              <MenuUsuario />
            </>
          ) : (
            <>
              <Link to="/entrar" className="btn btn-fantasma btn-pequeno">
                Entrar
              </Link>
              <Link to="/cadastro" className="btn btn-primario btn-pequeno">
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
  const item = ({ isActive }) =>
    `relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 font-display text-[12px] font-bold uppercase tracking-wide ${
      isActive ? 'text-white before:absolute before:inset-x-5 before:top-0 before:h-[3px] before:bg-marca' : 'text-apagado'
    }`
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-linha bg-painel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Navegação">
      <NavLink to="/" end className={item}>
        <Home size={21} /> Início
      </NavLink>
      <NavLink to="/jogar" className={item}>
        <Gamepad2 size={21} /> Jogar
      </NavLink>
      <NavLink to="/salas" className={item}>
        <Trophy size={21} /> Salas
      </NavLink>
      <NavLink to="/regras" className={item}>
        <BookOpen size={21} /> Regras
      </NavLink>
      <NavLink to={usuario ? '/carteira' : '/entrar'} className={item}>
        <Wallet size={21} /> Carteira
      </NavLink>
    </nav>
  )
}

function Rodape() {
  const { config } = useSessao()
  const titulo = 'mb-3 font-display text-sm font-bold uppercase tracking-widest text-apagado'
  return (
    <footer className="mt-24 border-t border-linha bg-[#050915] pb-28 pt-12 md:pb-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo compacto />
          <p className="mt-4 max-w-sm text-[15px] text-suave">{site.descricao}</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-marca font-display text-base font-extrabold text-marca-forte">18+</span>
            <p className="max-w-[220px] text-sm text-apagado">Proibido para menores de 18 anos. Jogue com responsabilidade.</p>
          </div>
        </div>
        <div>
          <p className={titulo}>Plataforma</p>
          <ul className="space-y-2.5 text-[15px] text-suave">
            <li><Link className="hover:text-white" to="/jogar">Jogar agora</Link></li>
            <li><Link className="hover:text-white" to="/salas">Salas de duplas</Link></li>
            <li><Link className="hover:text-white" to="/regras">Regras do truco</Link></li>
          </ul>
        </div>
        <div>
          <p className={titulo}>Ajuda</p>
          <ul className="space-y-2.5 text-[15px] text-suave">
            <li><Link className="hover:text-white" to="/termos">Termos de uso</Link></li>
            <li><Link className="hover:text-white" to="/jogo-responsavel">Jogo responsável</Link></li>
            {config?.whatsappSuporte && (
              <li>
                <a className="hover:text-white" href={`https://wa.me/${config.whatsappSuporte}`} target="_blank" rel="noreferrer">
                  Suporte no WhatsApp
                </a>
              </li>
            )}
            {config?.emailSuporte && (
              <li>
                <a className="hover:text-white" href={`mailto:${config.emailSuporte}`}>
                  {config.emailSuporte}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl px-4 text-xs text-apagado">
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
      <div className="animar-surgir flex w-full max-w-lg items-center gap-3 rounded-xl border border-marca/60 bg-painel p-3 pl-4 shadow-2xl shadow-black/60">
        <Swords className="shrink-0 text-marca-forte" size={22} />
        <p className="flex-1 text-[15px]">
          <strong>Sua partida começou!</strong> {chamada.jogo} — {chamada.nome}
        </p>
        <button
          className="btn btn-primario btn-pequeno"
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
