import { useState } from 'react'
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useSessao, avisar } from '../store/sessao.js'
import { mascararCpf } from '../lib/formato.js'
import { useTitulo } from '../components/ui.jsx'
import { Carta } from '../components/Carta.jsx'
import { site } from '../config/site.js'

function Moldura({ titulo, subtitulo, children }) {
  return (
    <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <div className="hidden md:block">
        <div className="relative h-72">
          <Carta carta={{ r: '4', s: 'p' }} variante="mineiro" tamanho="grande" className="absolute left-10 top-10 -rotate-12" />
          <Carta carta={{ r: '7', s: 'c' }} variante="mineiro" tamanho="grande" className="absolute left-36 top-2 rotate-2" />
          <Carta carta={{ r: 'A', s: 'e' }} variante="mineiro" tamanho="grande" className="absolute left-60 top-12 rotate-12" />
        </div>
        <p className="titulo text-3xl">{site.slogan}</p>
        <p className="mt-3 max-w-sm text-suave">{site.descricao}</p>
      </div>
      <div className="cartao p-6 sm:p-8">
        <h1 className="titulo text-2xl">{titulo}</h1>
        {subtitulo && <p className="mt-1.5 text-sm text-suave">{subtitulo}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}

function CampoSenha({ id, valor, aoMudar, autoComplete }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="relative">
      <input id={id} className="campo pr-12" type={ver ? 'text' : 'password'} value={valor} onChange={(e) => aoMudar(e.target.value)} autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} />
      <button type="button" className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-suave hover:text-texto" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}>
        {ver ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function Entrar() {
  useTitulo(`Entrar — ${site.nome}`)
  const { usuario, entrar } = useSessao()
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const voltar = params.get('voltar') || '/jogar'
  if (usuario) return <Navigate to={voltar} replace />

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const u = await entrar(login, senha)
      avisar.sucesso(`Bem-vindo de volta, ${u.apelido}!`)
      navegar(voltar.startsWith('/') ? voltar : '/jogar', { replace: true })
    } catch (erro) {
      avisar.erro(erro.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Moldura titulo="Entrar" subtitulo="Use seu apelido ou e-mail.">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="login">Apelido ou e-mail</label>
          <input id="login" className="campo" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" required autoFocus />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <CampoSenha id="senha" valor={senha} aoMudar={setSenha} autoComplete="current-password" />
        </div>
        <button className="btn btn-primario btn-grande w-full" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-suave">
        Ainda não tem conta?{' '}
        <Link className="font-semibold text-marca-forte hover:underline" to={`/cadastro${params.get('voltar') ? `?voltar=${encodeURIComponent(voltar)}` : ''}`}>
          Criar conta grátis
        </Link>
      </p>
    </Moldura>
  )
}

export function Cadastro() {
  useTitulo(`Criar conta — ${site.nome}`)
  const { usuario, cadastrar } = useSessao()
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const [dados, setDados] = useState({ nome: '', apelido: '', email: '', cpf: '', nascimento: '', senha: '' })
  const [aceite, setAceite] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const voltar = params.get('voltar') || '/jogar'
  if (usuario) return <Navigate to={voltar} replace />
  const mudar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: campo === 'cpf' ? mascararCpf(e.target.value) : e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const u = await cadastrar({ ...dados, aceite })
      avisar.sucesso(`Conta criada! Bem-vindo, ${u.apelido}.`)
      navegar(voltar.startsWith('/') ? voltar : '/jogar', { replace: true })
    } catch (erro) {
      avisar.erro(erro.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Moldura titulo="Criar conta" subtitulo="Leva menos de um minuto. Seus dados ficam protegidos.">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="rotulo" htmlFor="nome">Nome completo</label>
          <input id="nome" className="campo" value={dados.nome} onChange={mudar('nome')} autoComplete="name" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="apelido">Apelido na mesa</label>
            <input id="apelido" className="campo" value={dados.apelido} onChange={mudar('apelido')} autoComplete="nickname" maxLength={16} pattern="[A-Za-z0-9_]{3,16}" title="3 a 16 caracteres: letras, números ou _" required />
          </div>
          <div>
            <label className="rotulo" htmlFor="cpf">CPF</label>
            <input id="cpf" className="campo numero" value={dados.cpf} onChange={mudar('cpf')} inputMode="numeric" placeholder="000.000.000-00" required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input id="email" className="campo" type="email" value={dados.email} onChange={mudar('email')} autoComplete="email" required />
          </div>
          <div>
            <label className="rotulo" htmlFor="nascimento">Data de nascimento</label>
            <input id="nascimento" className="campo" type="date" value={dados.nascimento} onChange={mudar('nascimento')} max={new Date().toISOString().slice(0, 10)} required />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="senha-nova">Senha (mínimo 8 caracteres)</label>
          <CampoSenha id="senha-nova" valor={dados.senha} aoMudar={(senha) => setDados((d) => ({ ...d, senha }))} autoComplete="new-password" />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-linha bg-fundo/60 p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-marca)]" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span className="text-suave">
            Tenho 18 anos ou mais e aceito os{' '}
            <Link to="/termos" target="_blank" className="font-semibold text-marca-forte hover:underline">termos de uso</Link> e a política de{' '}
            <Link to="/jogo-responsavel" target="_blank" className="font-semibold text-marca-forte hover:underline">jogo responsável</Link>.
          </span>
        </label>
        <button className="btn btn-primario btn-grande w-full" disabled={enviando || !aceite}>
          {enviando ? 'Criando conta...' : 'Criar minha conta'}
        </button>
        <p className="flex items-center justify-center gap-2 text-xs text-apagado">
          <ShieldCheck size={14} /> O CPF garante que cada pessoa tenha uma só conta e que o saque vá para o titular.
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-suave">
        Já tem conta?{' '}
        <Link className="font-semibold text-marca-forte hover:underline" to="/entrar">
          Entrar
        </Link>
      </p>
    </Moldura>
  )
}
