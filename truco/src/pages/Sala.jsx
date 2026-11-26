import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Share2, Users, User, LogOut, XCircle, Swords, Crown, Trophy, Clock, Eye, CircleDot, Lock, Medal, ArrowRight } from 'lucide-react'
import { useSessao, avisar } from '../store/sessao.js'
import { obterSocket } from '../lib/socket.js'
import { api } from '../lib/api.js'
import { formatarReais, copiar } from '../lib/formato.js'
import { VARIANTES } from '../../shared/regras.js'
import { Carregando, Vazio, Modal, useTitulo } from '../components/ui.jsx'
import { TabelaPremios } from '../components/Premiacao.jsx'
import { site } from '../config/site.js'

function useTorneio(id) {
  const [t, setT] = useState(null)
  const [erro, setErro] = useState(null)
  useEffect(() => {
    const s = obterSocket()
    const entrar = () =>
      s.emit('torneio:entrar', id, (r) => {
        if (r?.erro) setErro(r.erro)
      })
    const aoEstado = (estado) => estado.id === id && setT(estado)
    s.on('torneio:estado', aoEstado)
    s.on('connect', entrar)
    if (s.connected) entrar()
    return () => {
      s.off('torneio:estado', aoEstado)
      s.off('connect', entrar)
      s.emit('torneio:sair', id)
    }
  }, [id])
  return { t, erro }
}

const STATUS = {
  inscricoes: { texto: 'Inscrições abertas', cor: 'bg-dinheiro/15 text-dinheiro' },
  andamento: { texto: 'Em andamento', cor: 'bg-truco/15 text-truco' },
  encerrado: { texto: 'Encerrada', cor: 'bg-painel-3 text-suave' },
  cancelado: { texto: 'Cancelada', cor: 'bg-painel-3 text-suave' },
}

function Vagas({ t, aoAcao, ocupado }) {
  const { usuario } = useSessao()
  const palavra = t.formato === 'duplas' ? 'Dupla' : 'Jogador'
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {t.vagas.map((time) => {
        const minha = t.meuLugar?.time === time.indice
        return (
          <div key={time.indice} className={`rounded-2xl border p-3 ${minha ? 'border-ouro/60 bg-ouro/5' : 'border-linha bg-fundo/50'}`}>
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-apagado">
              {palavra} {time.indice + 1}
            </p>
            <div className="space-y-2">
              {time.membros.map((m, vaga) =>
                m ? (
                  <div key={vaga} className="flex items-center gap-2.5 rounded-xl bg-painel-2 px-3 py-2">
                    <span className={`h-2 w-2 rounded-full ${m.conectado ? 'bg-dinheiro' : 'bg-apagado'}`} title={m.conectado ? 'Online' : 'Offline'} />
                    <span className="flex-1 truncate text-sm font-semibold">{m.apelido}</span>
                    {m.eu && <span className="selo bg-ouro/20 text-ouro">você</span>}
                  </div>
                ) : t.status === 'inscricoes' ? (
                  <button
                    key={vaga}
                    disabled={ocupado}
                    onClick={() => (usuario ? aoAcao(t.meuLugar ? 'trocar' : 'entrar', { time: time.indice, vaga }) : aoAcao('login'))}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-linha-forte px-3 py-2 text-sm font-semibold text-suave transition-colors hover:border-ouro hover:text-ouro"
                  >
                    {t.meuLugar ? 'Mudar para cá' : 'Entrar aqui'}
                  </button>
                ) : (
                  <div key={vaga} className="rounded-xl border border-dashed border-linha px-3 py-2 text-sm text-apagado">
                    Vaga livre
                  </div>
                ),
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Lado({ lado, vencedor, eu }) {
  if (lado.pendente) return <p className="truncate text-sm italic text-apagado">{lado.pendente}</p>
  return (
    <p className={`flex items-center gap-1.5 truncate text-sm ${vencedor ? 'font-bold text-texto' : 'text-suave'} ${eu ? 'text-ouro' : ''}`}>
      {vencedor && <Crown size={13} className="shrink-0 text-ouro" />}
      <span className="truncate">{lado.nomes}</span>
    </p>
  )
}

function Chave({ t }) {
  const rodadas = useMemo(() => {
    const mapa = new Map()
    for (const j of t.chave.jogos) {
      const chave = j.terceiro ? 'terceiro' : j.rodada
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave).push(j)
    }
    return [...mapa.entries()]
  }, [t.chave])
  const meuTime = t.meuLugar?.time
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex min-w-max gap-4">
        {rodadas.map(([chave, jogos]) => (
          <div key={chave} className="flex w-56 shrink-0 flex-col">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-apagado">{jogos[0].terceiro ? 'Disputa de 3º' : jogos[0].nome}</p>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {jogos.map((j) => {
                const ehMeu = meuTime !== undefined && (j.a.time === meuTime || j.b.time === meuTime)
                return (
                  <div key={j.id} className={`rounded-2xl border p-3 ${ehMeu ? 'border-ouro/60' : 'border-linha'} bg-painel-2`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-apagado">{j.rotulo}</span>
                      {j.status === 'jogando' && (
                        <span className="selo bg-truco/15 text-truco">
                          <CircleDot size={10} className="animate-pulse" /> ao vivo
                        </span>
                      )}
                      {j.status === 'pendente' && (
                        <span className="selo">
                          <Clock size={10} /> aguardando
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Lado lado={j.a} vencedor={j.vencedorTime !== null && j.vencedorTime === j.a.time} eu={meuTime !== undefined && j.a.time === meuTime} />
                        {j.placar && <span className="numero text-sm font-bold">{j.placar[0]}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Lado lado={j.b} vencedor={j.vencedorTime !== null && j.vencedorTime === j.b.time} eu={meuTime !== undefined && j.b.time === meuTime} />
                        {j.placar && <span className="numero text-sm font-bold">{j.placar[1]}</span>}
                      </div>
                    </div>
                    {j.status === 'jogando' && j.mesaId && (
                      <Link to={`/mesa/${j.mesaId}`} className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-painel-3 py-1.5 text-xs font-semibold text-suave hover:text-texto">
                        <Eye size={13} /> {ehMeu ? 'Ir para a mesa' : 'Assistir'}
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Podio({ t }) {
  const cores = ['from-ouro/30 border-ouro/60', 'from-[#cfd6e3]/20 border-[#cfd6e3]/40', 'from-[#d49a6a]/20 border-[#d49a6a]/40', 'from-painel-3 border-linha']
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {t.colocacao.map((c, i) => (
        <div key={c.posicao} className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-br to-transparent p-4 ${cores[i] || cores[3]}`}>
          <span className="titulo numero w-10 text-center text-3xl">{c.posicao}º</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{c.nomes}</p>
            {c.premioPorJogador > 0 ? (
              <p className="numero text-sm text-dinheiro">
                +{formatarReais(c.premioPorJogador)} {t.porTime > 1 ? 'para cada' : ''}
              </p>
            ) : (
              <p className="text-sm text-apagado">sem prêmio</p>
            )}
          </div>
          {i === 0 && <Trophy className="text-ouro" size={28} />}
        </div>
      ))}
    </div>
  )
}

export default function Sala() {
  const { id } = useParams()
  const { t, erro } = useTorneio(id)
  const { usuario, saldo } = useSessao()
  const navegar = useNavigate()
  const [ocupado, setOcupado] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const ultimaPartida = useRef(null)
  useTitulo(t ? `${t.nome} — ${site.nome}` : `Sala — ${site.nome}`)

  // Quando a partida do jogador começa, leva direto para a mesa.
  useEffect(() => {
    if (t?.minhaPartida && t.minhaPartida !== ultimaPartida.current) {
      ultimaPartida.current = t.minhaPartida
      avisar.info('Sua partida começou! Levando você para a mesa...')
      const timer = setTimeout(() => navegar(`/mesa/${t.minhaPartida}`), 1200)
      return () => clearTimeout(timer)
    }
  }, [t?.minhaPartida, navegar])

  if (erro) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16">
        <div className="cartao">
          <Vazio icone={Trophy} titulo="Sala não encontrada" texto="Ela pode ter sido encerrada há algum tempo ou o link está incompleto.">
            <Link to="/salas" className="btn btn-ouro">
              Ver salas abertas
            </Link>
          </Vazio>
        </div>
      </section>
    )
  }
  if (!t) return <Carregando texto="Abrindo a sala..." />

  async function acao(tipo, dados = {}) {
    if (tipo === 'login') return navegar(`/entrar?voltar=/sala/${id}`)
    setOcupado(true)
    try {
      if (tipo === 'entrar') {
        await api.post(`/torneios/${id}/entrar`, dados)
        avisar.sucesso(t.entrada ? `Inscrição feita! ${formatarReais(t.entrada)} reservado do seu saldo.` : 'Inscrição feita!')
      } else if (tipo === 'trocar') {
        await api.post(`/torneios/${id}/trocar`, dados)
      } else if (tipo === 'sair') {
        await api.post(`/torneios/${id}/sair`)
        avisar.info('Você saiu da sala. A inscrição voltou para o seu saldo.')
      } else if (tipo === 'cancelar') {
        await api.post(`/torneios/${id}/cancelar`)
        setConfirmarCancelar(false)
        avisar.info('Sala cancelada. Todas as inscrições foram devolvidas.')
      }
    } catch (e) {
      avisar.erro(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function compartilhar() {
    const link = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: t.nome, text: `Bora jogar truco na sala "${t.nome}"?`, url: link })
        return
      } catch {
        // usuário cancelou: copia o link
      }
    }
    if (await copiar(link)) avisar.sucesso('Link copiado! Mande no grupo da turma.')
  }

  const st = STATUS[t.status]
  const palavra = t.formato === 'duplas' ? 'duplas' : 'jogadores'
  const faltam = t.total - t.inscritos

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`selo ${st.cor}`}>{st.texto}</span>
            <span className="selo">{VARIANTES[t.variante].nome}</span>
            <span className="selo">
              {t.formato === 'duplas' ? <Users size={12} /> : <User size={12} />} {t.times} {palavra}
            </span>
            {t.privada && (
              <span className="selo">
                <Lock size={11} /> Privada
              </span>
            )}
          </div>
          <h1 className="titulo mt-3 break-words text-3xl sm:text-4xl">{t.nome}</h1>
          <p className="mt-1 text-sm text-suave">
            Criada por <strong className="text-texto">{t.criador.apelido}</strong> · inscrição {t.entrada ? <strong className="numero text-texto">{formatarReais(t.entrada)} por jogador</strong> : 'grátis'}
          </p>
        </div>
        <button className="btn btn-sec" onClick={compartilhar}>
          <Share2 size={18} /> Convidar
        </button>
      </div>

      {t.status === 'cancelado' && (
        <div className="cartao mt-6 flex items-center gap-3 border-truco/40 p-4">
          <XCircle className="text-truco" />
          <p className="text-sm">
            {t.motivoCancelamento || 'Sala cancelada.'} Todas as inscrições foram devolvidas aos jogadores.
          </p>
        </div>
      )}

      {t.minhaPartida && (
        <Link to={`/mesa/${t.minhaPartida}`} className="cartao animar-surgir mt-6 flex items-center gap-3 border-ouro/60 p-4">
          <Swords className="text-ouro" />
          <span className="flex-1 font-bold">Sua partida está rolando agora!</span>
          <span className="btn btn-ouro btn-pequeno">
            Ir para a mesa <ArrowRight size={16} />
          </span>
        </Link>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {t.status === 'encerrado' && t.colocacao && (
            <div className="cartao p-5 sm:p-6">
              <h2 className="titulo mb-4 flex items-center gap-2 text-xl">
                <Trophy className="text-ouro" size={22} /> Resultado final
              </h2>
              <Podio t={t} />
            </div>
          )}

          {t.chave && (
            <div className="cartao p-5 sm:p-6">
              <h2 className="titulo mb-4 text-xl">Chave</h2>
              <Chave t={t} />
            </div>
          )}

          {t.status === 'inscricoes' && (
            <div className="cartao p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="titulo text-xl">Inscritos</h2>
                  <p className="text-sm text-suave">
                    {faltam > 0 ? `Faltam ${faltam} jogador(es). A chave é sorteada e começa sozinha quando lotar.` : 'Sala completa! Sorteando a chave...'}
                  </p>
                </div>
                <span className="numero titulo text-2xl">
                  {t.inscritos}
                  <span className="text-apagado">/{t.total}</span>
                </span>
              </div>
              <div className="mb-5 h-2 overflow-hidden rounded-full bg-painel-3">
                <div className="h-full rounded-full bg-gradient-to-r from-ouro-escuro to-ouro transition-all" style={{ width: `${(t.inscritos / t.total) * 100}%` }} />
              </div>
              <Vagas t={t} aoAcao={acao} ocupado={ocupado} />
              <div className="mt-5 flex flex-wrap gap-3">
                {!t.meuLugar && (
                  <button className="btn btn-ouro" disabled={ocupado} onClick={() => (usuario ? acao('entrar') : acao('login'))}>
                    Entrar em qualquer vaga {t.entrada ? `· ${formatarReais(t.entrada)}` : ''}
                  </button>
                )}
                {t.meuLugar && (
                  <button className="btn btn-sec" disabled={ocupado} onClick={() => acao('sair')}>
                    <LogOut size={16} /> Sair da sala
                  </button>
                )}
                {t.souCriador && (
                  <button className="btn btn-fantasma text-truco" disabled={ocupado} onClick={() => setConfirmarCancelar(true)}>
                    <XCircle size={16} /> Cancelar sala
                  </button>
                )}
              </div>
              {usuario && !t.meuLugar && t.entrada > saldo && (
                <p className="mt-3 text-sm text-truco">
                  Seu saldo não cobre a inscrição.{' '}
                  <Link to="/carteira" className="font-semibold underline">
                    Depositar
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="order-first space-y-5 lg:order-none">
          <div className="cartao p-5">
            <h2 className="titulo mb-1 flex items-center gap-2 text-lg">
              <Medal className="text-ouro" size={20} /> Premiação
            </h2>
            {t.entrada > 0 ? (
              <>
                <p className="mb-4 text-sm text-suave">
                  Pote de <span className="numero">{formatarReais(t.calculo.pote)}</span> − taxa da casa {t.taxa}% ={' '}
                  <strong className="numero text-dinheiro">{formatarReais(t.calculo.liquido)}</strong>
                </p>
                <TabelaPremios calculo={t.calculo} percentuais={t.percentuais} porTime={t.porTime} compacta />
              </>
            ) : (
              <p className="text-sm text-suave">Sala grátis: sem prêmio em dinheiro.</p>
            )}
          </div>
          <div className="cartao hidden space-y-2 p-5 text-sm text-suave lg:block">
            <p className="font-semibold text-texto">Como funciona</p>
            <p>• Eliminação simples: ganhou, avança; perdeu, está fora.</p>
            <p>• A ordem da chave é sorteada quando a sala lota.</p>
            {t.percentuais.length >= 3 && <p>• Perdedores das semifinais disputam o 3º lugar.</p>}
            <p>• Cada partida vai até 12 pontos. Tempo por jogada vale para todos.</p>
            <p>• Saiu antes de começar? A inscrição volta na hora.</p>
          </div>
        </aside>
      </div>

      <Modal aberto={confirmarCancelar} aoFechar={() => setConfirmarCancelar(false)} titulo="Cancelar a sala?">
        <p className="text-sm text-suave">Todos os inscritos recebem a inscrição de volta e a sala é encerrada. Não dá para desfazer.</p>
        <div className="mt-6 flex gap-3">
          <button className="btn btn-sec flex-1" onClick={() => setConfirmarCancelar(false)}>
            Voltar
          </button>
          <button className="btn btn-truco flex-1" disabled={ocupado} onClick={() => acao('cancelar')}>
            Cancelar sala
          </button>
        </div>
      </Modal>
    </section>
  )
}
