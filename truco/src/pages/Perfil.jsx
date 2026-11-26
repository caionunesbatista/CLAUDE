import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Trophy, Swords, Percent, Banknote, KeyRound, Save, History } from 'lucide-react'
import { api } from '../lib/api.js'
import { useSessao, avisar } from '../store/sessao.js'
import { formatarReais, formatarData } from '../lib/formato.js'
import { VARIANTES, AVATARES } from '../../shared/regras.js'
import { Carregando, Vazio, useTitulo } from '../components/ui.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { site } from '../config/site.js'

const TIPO = { dinheiro: 'Mesa', torneio: 'Sala de duplas', treino: 'Treino' }

export default function Perfil() {
  useTitulo(`Perfil — ${site.nome}`)
  const { usuario, definirUsuario } = useSessao()
  const [dados, setDados] = useState(null)
  const [chave, setChave] = useState('')
  const [senhas, setSenhas] = useState({ atual: '', nova: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api
      .get('/perfil')
      .then((d) => {
        setDados(d)
        setChave(d.usuario.chavePix || '')
      })
      .catch((e) => avisar.erro(e.message))
  }, [])

  async function salvarChave(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const r = await api.put('/perfil', { chavePix: chave })
      definirUsuario(r.usuario)
      avisar.sucesso('Chave PIX salva.')
    } catch (erro) {
      avisar.erro(erro.message)
    } finally {
      setSalvando(false)
    }
  }

  async function trocarSenha(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api.post('/perfil/senha', senhas)
      setSenhas({ atual: '', nova: '' })
      avisar.sucesso('Senha alterada. Outros aparelhos foram desconectados.')
    } catch (erro) {
      avisar.erro(erro.message)
    } finally {
      setSalvando(false)
    }
  }

  async function escolherAvatar(id) {
    try {
      const r = await api.put('/perfil', { avatar: id })
      definirUsuario(r.usuario)
      avisar.sucesso('Avatar atualizado! Ele aparece nas próximas mesas.')
    } catch (erro) {
      avisar.erro(erro.message)
    }
  }

  if (!dados) return <Carregando />
  const t = dados.totais
  const aproveitamento = t.partidas ? Math.round((t.vitorias / t.partidas) * 100) : 0

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Avatar avatar={usuario.avatar} apelido={usuario.apelido} tamanho={72} />
        <div>
          <h1 className="titulo text-5xl">{usuario.apelido}</h1>
          <p className="text-suave">
            {usuario.nome} · desde {formatarData(usuario.criadoEm, false)}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-linha bg-painel p-5">
        <p className="rotulo">Seu avatar na mesa</p>
        <div className="flex flex-wrap gap-2.5">
          {AVATARES.map((a) => {
            const atual = (usuario.avatar || null) === a.id
            return (
              <button
                key={a.id}
                onClick={() => escolherAvatar(a.id)}
                aria-pressed={atual}
                aria-label={`Avatar ${a.id}`}
                className={`rounded-full p-0.5 transition-transform hover:scale-110 ${atual ? 'ring-2 ring-marca ring-offset-2 ring-offset-painel' : ''}`}
              >
                <Avatar avatar={a.id} tamanho={44} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [Swords, 'Partidas', t.partidas],
          [Trophy, 'Vitórias', t.vitorias],
          [Percent, 'Aproveitamento', `${aproveitamento}%`],
          [Banknote, 'Em prêmios', formatarReais(t.premios)],
        ].map(([I, r, v]) => (
          <div key={r} className="cartao p-4">
            <I size={18} className="text-marca-forte" />
            <p className="numero titulo mt-3 text-2xl">{v}</p>
            <p className="text-xs text-suave">{r}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div className="cartao p-5">
          <h2 className="titulo mb-3 text-lg">Últimas partidas</h2>
          {dados.historico.length === 0 ? (
            <Vazio icone={History} titulo="Nenhuma partida ainda" texto="Que tal começar com um treino grátis?">
              <Link to="/jogar" className="btn btn-primario btn-pequeno">
                Ir para as mesas
              </Link>
            </Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {dados.historico.map((h) => {
                const placar = h.placar ? `${h.placar[h.time]} × ${h.placar[1 - h.time]}` : ''
                return (
                  <li key={h.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${h.venceu ? 'bg-marca/15 text-marca-forte' : 'bg-painel-3 text-apagado'}`}>{h.venceu ? 'V' : 'D'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {TIPO[h.tipo]} · {VARIANTES[h.variante]?.curto} {h.jogadores === 4 ? '2x2' : '1x1'}
                      </p>
                      <p className="text-xs text-apagado">{formatarData(h.criadoEm)}</p>
                    </div>
                    <div className="text-right">
                      <p className="numero font-bold">{placar}</p>
                      {h.premio > 0 && <p className="numero text-xs text-dinheiro">+{formatarReais(h.premio)}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="space-y-5">
          <form onSubmit={salvarChave} className="cartao p-5">
            <h2 className="titulo mb-1 text-lg">Chave PIX para saques</h2>
            <p className="mb-3 text-xs text-suave">Precisa estar no seu nome.</p>
            <input className="campo" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" />
            <button className="btn btn-sec mt-3 w-full" disabled={salvando}>
              <Save size={16} /> Salvar chave
            </button>
          </form>
          <form onSubmit={trocarSenha} className="cartao space-y-3 p-5">
            <h2 className="titulo text-lg">Trocar senha</h2>
            <input className="campo" type="password" placeholder="Senha atual" autoComplete="current-password" value={senhas.atual} onChange={(e) => setSenhas((s) => ({ ...s, atual: e.target.value }))} required />
            <input className="campo" type="password" placeholder="Nova senha (mín. 8)" autoComplete="new-password" minLength={8} value={senhas.nova} onChange={(e) => setSenhas((s) => ({ ...s, nova: e.target.value }))} required />
            <button className="btn btn-sec w-full" disabled={salvando}>
              <KeyRound size={16} /> Trocar senha
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
