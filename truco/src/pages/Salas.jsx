import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Trophy, Users, User, Medal } from 'lucide-react'
import { useLobby } from '../lib/useLobby.js'
import { useSessao } from '../store/sessao.js'
import { formatarReais } from '../lib/formato.js'
import { VARIANTES } from '../../shared/regras.js'
import { Carregando, Vazio, useTitulo } from '../components/ui.jsx'
import { site } from '../config/site.js'

function ItemSala({ s }) {
  const andamento = s.status === 'andamento'
  return (
    <Link to={`/sala/${s.id}`} className="cartao group flex flex-col p-5 transition-colors hover:border-ouro/50">
      <div className="flex items-center gap-2">
        <span className="selo">{VARIANTES[s.variante].curto}</span>
        <span className="selo">
          {s.formato === 'duplas' ? <Users size={12} /> : <User size={12} />}
          {s.formato === 'duplas' ? 'Duplas' : 'Individual'}
        </span>
        {andamento && <span className="selo ml-auto bg-truco/15 text-truco">Em andamento</span>}
      </div>
      <p className="titulo mt-3 truncate text-xl group-hover:text-ouro">{s.nome}</p>
      <p className="text-xs text-apagado">criada por {s.criador}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-apagado">Inscrição</p>
          <p className="numero font-bold">{s.entrada ? `${formatarReais(s.entrada)} /jogador` : 'Grátis'}</p>
        </div>
        <div>
          <p className="text-xs text-apagado">Prêmios</p>
          <p className="numero font-bold text-dinheiro">{s.entrada ? formatarReais(s.premioTotal) : '—'}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {s.percentuais.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-fundo/70 px-2 py-1 text-xs">
            <Medal size={12} className={i === 0 ? 'text-ouro' : 'text-suave'} /> {i + 1}º {p}%
          </span>
        ))}
      </div>
      <div className="mt-auto pt-5">
        <div className="mb-1.5 flex justify-between text-xs text-suave">
          <span>
            {s.times} {s.formato === 'duplas' ? 'duplas' : 'jogadores'}
          </span>
          <span className="numero">
            {s.inscritos}/{s.total} inscritos
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-painel-3">
          <div className="h-full rounded-full bg-gradient-to-r from-ouro-escuro to-ouro" style={{ width: `${(s.inscritos / s.total) * 100}%` }} />
        </div>
      </div>
    </Link>
  )
}

export default function Salas() {
  useTitulo(`Salas de duplas — ${site.nome}`)
  const lobby = useLobby()
  const { usuario } = useSessao()
  const [filtro, setFiltro] = useState('inscricoes')
  const lista = useMemo(() => (lobby?.torneios || []).filter((t) => filtro === 'todas' || t.status === filtro), [lobby, filtro])
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="titulo text-3xl">Salas de duplas</h1>
          <p className="mt-1 text-suave">
            Campeonatos montados pelos próprios jogadores: quantas duplas quiserem, inscrição definida por quem cria e prêmio para quantas posições escolherem.
          </p>
        </div>
        <Link to={usuario ? '/salas/nova' : '/entrar?voltar=/salas/nova'} className="btn btn-ouro btn-grande">
          <Plus size={20} /> Criar sala
        </Link>
      </div>
      <div className="mt-6 flex gap-1.5">
        {[
          ['inscricoes', 'Inscrições abertas'],
          ['andamento', 'Em andamento'],
          ['todas', 'Todas'],
        ].map(([v, r]) => (
          <button key={v} className="chip min-h-9 text-sm" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
            {r}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {!lobby ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <div className="cartao">
            <Vazio icone={Trophy} titulo="Nenhuma sala aqui ainda" texto="Crie uma sala, mande o link no grupo da turma e deixe a disputa começar.">
              <Link to={usuario ? '/salas/nova' : '/entrar?voltar=/salas/nova'} className="btn btn-ouro">
                Criar a primeira sala
              </Link>
            </Vazio>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((s) => (
              <ItemSala key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-6 text-xs text-apagado">Salas privadas não aparecem nesta lista: só entra quem recebe o link.</p>
    </section>
  )
}
