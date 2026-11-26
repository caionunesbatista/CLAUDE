// Painel do dono do site: comissões, depósitos, saques, jogadores, mesas e configurações.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Swords,
  Settings,
  Check,
  X,
  Copy,
  Search,
  Ban,
  RefreshCw,
  Coins,
  Wallet,
  Lock,
  Wifi,
  Receipt,
} from 'lucide-react'
import { api } from '../lib/api.js'
import { avisar, useSessao } from '../store/sessao.js'
import { formatarReais, formatarData, copiar, mascararCpf, lerReais } from '../lib/formato.js'
import { VARIANTES } from '../../shared/regras.js'
import { Carregando, CampoReais, Modal, Vazio, Interruptor, useTitulo } from '../components/ui.jsx'
import { site } from '../config/site.js'

function useDados(caminho) {
  const [dados, setDados] = useState(null)
  const recarregar = useCallback(() => {
    api
      .get(caminho)
      .then(setDados)
      .catch((e) => avisar.erro(e.message))
  }, [caminho])
  useEffect(() => {
    recarregar()
  }, [recarregar])
  return [dados, recarregar]
}

async function executar(caminho, corpo, mensagem, depois) {
  try {
    await api.post(caminho, corpo)
    if (mensagem) avisar.sucesso(mensagem)
    depois?.()
  } catch (e) {
    avisar.erro(e.message)
  }
}

// ---------- Resumo ----------

const COR_BARRA = '#b8861b' // validada para o fundo escuro (faixa de luminosidade e contraste)

function GraficoComissoes({ porDia }) {
  const [foco, setFoco] = useState(null)
  const dias = useMemo(() => {
    // Últimos 30 dias, preenchendo os dias sem comissão com zero.
    const mapa = new Map(porDia.map((d) => [d.dia, d.valor]))
    const lista = []
    const hoje = new Date(Date.now() - 3 * 3600_000)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje.getTime() - i * 86400_000).toISOString().slice(0, 10)
      lista.push({ dia: d, valor: mapa.get(d) || 0 })
    }
    return lista
  }, [porDia])
  const maximo = Math.max(1, ...dias.map((d) => d.valor))
  const maiorDia = dias.reduce((a, b) => (b.valor > a.valor ? b : a), dias[0])
  const altura = 160
  if (maiorDia.valor === 0) {
    return (
      <div>
        <h3 className="font-bold">Comissão por dia — últimos 30 dias</h3>
        <p className="mt-6 rounded-xl border border-dashed border-linha py-10 text-center text-sm text-suave">Nenhuma comissão nos últimos 30 dias. O gráfico aparece assim que as mesas valendo começarem a fechar.</p>
      </div>
    )
  }
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-bold">Comissão por dia — últimos 30 dias</h3>
        <p className="numero text-sm text-suave">{foco ? `${formatarData(foco.dia + ' 12:00:00', false)}: ${formatarReais(foco.valor)}` : `Maior dia: ${formatarReais(maiorDia.valor)}`}</p>
      </div>
      <div className="relative" style={{ height: altura + 22 }} onMouseLeave={() => setFoco(null)}>
        {/* grade recessiva */}
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-linha" style={{ bottom: 22 + altura * f }}>
            <span className="numero absolute -top-2.5 right-0 bg-painel pl-1 text-[10px] text-apagado">{formatarReais(Math.round(maximo * f))}</span>
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-[22px] flex h-[160px] items-end" style={{ gap: 2 }}>
          {dias.map((d) => {
            const h = d.valor ? Math.max(3, (d.valor / maximo) * altura) : 0
            return (
              <button
                key={d.dia}
                className="group relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setFoco(d)}
                onFocus={() => setFoco(d)}
                aria-label={`${d.dia}: ${formatarReais(d.valor)}`}
              >
                <span
                  className="block w-full transition-opacity"
                  style={{
                    maxWidth: 24,
                    height: h,
                    background: COR_BARRA,
                    borderRadius: '4px 4px 0 0',
                    opacity: foco && foco.dia !== d.dia ? 0.45 : 1,
                  }}
                />
              </button>
            )
          })}
        </div>
        <div className="absolute inset-x-0 bottom-[21px] border-t border-linha-forte" />
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-apagado">
          <span>{formatarData(dias[0].dia + ' 12:00:00', false)}</span>
          <span>hoje</span>
        </div>
      </div>
    </div>
  )
}

function Indicador({ icone: I, rotulo, valor, destaque, extra }) {
  return (
    <div className="cartao p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-suave">
        <I size={15} className={destaque ? 'text-ouro' : 'text-apagado'} /> {rotulo}
      </div>
      <p className={`numero titulo mt-2 text-2xl ${destaque ? 'text-ouro' : ''}`}>{valor}</p>
      {extra && <p className="mt-0.5 text-xs text-apagado">{extra}</p>}
    </div>
  )
}

function Resumo({ irPara }) {
  const [r, recarregar] = useDados('/admin/resumo')
  useEffect(() => {
    const t = setInterval(recarregar, 15000)
    return () => clearInterval(t)
  }, [recarregar])
  if (!r) return <Carregando />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador icone={Coins} rotulo="Comissão hoje" valor={formatarReais(r.comissoes.hoje)} destaque />
        <Indicador icone={Coins} rotulo="Últimos 7 dias" valor={formatarReais(r.comissoes.semana)} />
        <Indicador icone={Coins} rotulo="Últimos 30 dias" valor={formatarReais(r.comissoes.mes)} />
        <Indicador icone={Coins} rotulo="Desde o início" valor={formatarReais(r.comissoes.total)} />
      </div>
      {(r.depositosPendentes > 0 || r.saquesPendentes > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {r.depositosPendentes > 0 && (
            <button className="cartao flex items-center gap-3 border-ouro/50 p-4 text-left" onClick={() => irPara('depositos')}>
              <ArrowDownToLine className="text-ouro" />
              <span className="flex-1 font-semibold">{r.depositosPendentes} depósito(s) aguardando confirmação</span>
            </button>
          )}
          {r.saquesPendentes > 0 && (
            <button className="cartao flex items-center gap-3 border-truco/50 p-4 text-left" onClick={() => irPara('saques')}>
              <ArrowUpFromLine className="text-truco" />
              <span className="flex-1 font-semibold">
                {r.saquesPendentes} saque(s) para pagar · {formatarReais(r.valorSaquesPendentes)}
              </span>
            </button>
          )}
        </div>
      )}
      <div className="cartao p-5">
        <GraficoComissoes porDia={r.porDia} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador icone={Wallet} rotulo="Saldo dos jogadores" valor={formatarReais(r.saldoJogadores)} extra="Dinheiro que você deve aos jogadores" />
        <Indicador icone={Lock} rotulo="Retido em partidas" valor={formatarReais(r.retido)} extra="Em mesas e salas em andamento" />
        <Indicador icone={Wifi} rotulo="Online agora" valor={r.online} extra={`${r.mesasAtivas} mesa(s) · ${r.torneiosAtivos} sala(s)`} />
        <Indicador icone={Users} rotulo="Jogadores cadastrados" valor={r.usuarios} extra={`${r.partidasHoje} partida(s) hoje`} />
      </div>
      <div className="cartao p-5">
        <h3 className="font-bold">Conferência do caixa</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-fundo/60 p-4">
            <p className="text-xs text-suave">Deve estar na sua conta</p>
            <p className="numero titulo mt-1 text-xl">{formatarReais(r.depositadoTotal - r.sacadoTotal)}</p>
            <p className="mt-1 text-xs text-apagado">
              Depósitos confirmados {formatarReais(r.depositadoTotal)} − saques pagos {formatarReais(r.sacadoTotal)}
            </p>
          </div>
          <div className="rounded-xl bg-fundo/60 p-4">
            <p className="text-xs text-suave">Pertence aos jogadores</p>
            <p className="numero titulo mt-1 text-xl">{formatarReais(r.saldoJogadores + r.retido + r.valorSaquesPendentes)}</p>
            <p className="mt-1 text-xs text-apagado">Saldos + valores em partidas + saques a pagar</p>
          </div>
          <div className="rounded-xl bg-fundo/60 p-4">
            <p className="text-xs text-suave">Resultado da casa</p>
            <p className={`numero titulo mt-1 text-xl ${r.depositadoTotal - r.sacadoTotal - (r.saldoJogadores + r.retido + r.valorSaquesPendentes) < 0 ? 'text-truco' : 'text-dinheiro'}`}>
              {formatarReais(r.depositadoTotal - r.sacadoTotal - (r.saldoJogadores + r.retido + r.valorSaquesPendentes))}
            </p>
            <p className="mt-1 text-xs text-apagado">Comissões menos bônus e ajustes manuais</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Depósitos e saques ----------

function Filtro({ valores, valor, aoMudar }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {valores.map(([v, r]) => (
        <button key={v} className="chip min-h-8 px-3 text-xs" aria-pressed={valor === v} onClick={() => aoMudar(v)}>
          {r}
        </button>
      ))}
    </div>
  )
}

function Depositos() {
  const [status, setStatus] = useState('pendente')
  const [lista, recarregar] = useDados(`/admin/depositos?status=${status}`)
  return (
    <div>
      <p className="mb-4 text-sm text-suave">
        Confira no extrato do seu banco se o PIX chegou (valor e código na descrição) e só então clique em <strong className="text-texto">Confirmar</strong>. O saldo do jogador é creditado na hora.
      </p>
      <Filtro
        valor={status}
        aoMudar={setStatus}
        valores={[
          ['pendente', 'Pendentes'],
          ['aprovado', 'Confirmados'],
          ['recusado', 'Recusados'],
          ['cancelado', 'Cancelados'],
        ]}
      />
      {!lista ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio icone={ArrowDownToLine} titulo="Nada aqui" />
      ) : (
        <ul className="space-y-2">
          {lista.map((d) => (
            <li key={d.id} className="cartao flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm">
              <span className="numero titulo text-xl">{formatarReais(d.valor)}</span>
              <code className="rounded bg-fundo px-2 py-1 font-mono font-bold tracking-wider">{d.codigo}</code>
              <div className="min-w-0">
                <p className="font-semibold">
                  {d.nome} <span className="font-normal text-suave">({d.apelido})</span>
                </p>
                <p className="text-xs text-apagado">
                  CPF {mascararCpf(d.cpf)} · {formatarData(d.criadoEm)}
                </p>
              </div>
              {d.status === 'pendente' && (
                <div className="ml-auto flex gap-2">
                  <button className="btn btn-sec btn-pequeno" onClick={() => executar(`/admin/depositos/${d.id}/recusar`, { observacao: 'PIX não identificado' }, 'Depósito recusado.', recarregar)}>
                    <X size={15} /> Recusar
                  </button>
                  <button className="btn btn-verde btn-pequeno" onClick={() => executar(`/admin/depositos/${d.id}/aprovar`, {}, `Depósito de ${formatarReais(d.valor)} confirmado.`, recarregar)}>
                    <Check size={15} /> Confirmar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Saques() {
  const [status, setStatus] = useState('pendente')
  const [lista, recarregar] = useDados(`/admin/saques?status=${status}`)
  const [recusar, setRecusar] = useState(null)
  const [motivo, setMotivo] = useState('')
  return (
    <div>
      <p className="mb-4 text-sm text-suave">
        Faça o PIX para a chave do jogador (confira se o titular tem o mesmo nome/CPF) e depois clique em <strong className="text-texto">Marcar como pago</strong>. Se recusar, o valor volta para o saldo dele.
      </p>
      <Filtro
        valor={status}
        aoMudar={setStatus}
        valores={[
          ['pendente', 'A pagar'],
          ['pago', 'Pagos'],
          ['recusado', 'Recusados'],
        ]}
      />
      {!lista ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio icone={ArrowUpFromLine} titulo="Nada aqui" />
      ) : (
        <ul className="space-y-2">
          {lista.map((s) => (
            <li key={s.id} className="cartao flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm">
              <span className="numero titulo text-xl">{formatarReais(s.valor)}</span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {s.nome} <span className="font-normal text-suave">({s.apelido})</span>
                </p>
                <p className="text-xs text-apagado">
                  CPF {mascararCpf(s.cpf)} · {formatarData(s.criadoEm)}
                </p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg bg-fundo px-2.5 py-1.5 font-mono text-xs hover:text-ouro" onClick={async () => (await copiar(s.chavePix)) && avisar.sucesso('Chave copiada')}>
                {s.chavePix} <Copy size={13} />
              </button>
              {s.status === 'pendente' && (
                <div className="ml-auto flex gap-2">
                  <button className="btn btn-sec btn-pequeno" onClick={() => (setRecusar(s), setMotivo(''))}>
                    <X size={15} /> Recusar
                  </button>
                  <button className="btn btn-verde btn-pequeno" onClick={() => executar(`/admin/saques/${s.id}/pagar`, {}, 'Saque marcado como pago.', recarregar)}>
                    <Check size={15} /> Marcar como pago
                  </button>
                </div>
              )}
              {s.observacao && <p className="w-full text-xs text-truco">{s.observacao}</p>}
            </li>
          ))}
        </ul>
      )}
      <Modal aberto={!!recusar} aoFechar={() => setRecusar(null)} titulo="Recusar saque">
        <p className="mb-3 text-sm text-suave">O valor de {recusar && formatarReais(recusar.valor)} volta para o saldo do jogador. Informe o motivo (ele verá):</p>
        <input className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: chave PIX não pertence ao titular" />
        <button
          className="btn btn-truco mt-4 w-full"
          onClick={() =>
            executar(`/admin/saques/${recusar.id}/recusar`, { observacao: motivo }, 'Saque recusado e valor devolvido.', () => {
              setRecusar(null)
              recarregar()
            })
          }
        >
          Recusar e devolver
        </button>
      </Modal>
    </div>
  )
}

// ---------- Jogadores ----------

function Jogadores() {
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  const [lista, recarregar] = useDados(`/admin/usuarios?busca=${encodeURIComponent(termo)}`)
  const [ajuste, setAjuste] = useState(null)
  const [valor, setValor] = useState(NaN)
  const [tipo, setTipo] = useState('credito')
  const [motivo, setMotivo] = useState('')
  const { usuario: eu } = useSessao()
  return (
    <div>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setTermo(busca)
        }}
      >
        <input className="campo" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por apelido, nome, e-mail ou CPF" />
        <button className="btn btn-sec">
          <Search size={16} />
        </button>
      </form>
      {!lista ? (
        <Carregando />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-apagado">
              <tr>
                <th className="py-2 pr-3 font-semibold">Jogador</th>
                <th className="py-2 pr-3 font-semibold">CPF</th>
                <th className="py-2 pr-3 text-right font-semibold">Saldo</th>
                <th className="py-2 pr-3 font-semibold">Desde</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {lista.map((u) => (
                <tr key={u.id} className={u.bloqueado ? 'opacity-50' : ''}>
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold">
                      {u.apelido} {u.admin ? <span className="selo ml-1 bg-ouro/15 text-ouro">admin</span> : null}
                      {u.bloqueado ? <span className="selo ml-1 bg-truco/15 text-truco">bloqueado</span> : null}
                    </p>
                    <p className="text-xs text-apagado">
                      {u.nome} · {u.email}
                    </p>
                  </td>
                  <td className="numero py-2.5 pr-3 text-xs">{mascararCpf(u.cpf)}</td>
                  <td className="numero py-2.5 pr-3 text-right font-bold">{formatarReais(u.saldo)}</td>
                  <td className="py-2.5 pr-3 text-xs text-apagado">{formatarData(u.criadoEm, false)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button className="btn btn-sec btn-pequeno" onClick={() => (setAjuste(u), setValor(NaN), setMotivo(''), setTipo('credito'))}>
                        Ajustar saldo
                      </button>
                      {u.id !== eu.id && (
                        <button
                          className="btn btn-fantasma btn-pequeno"
                          title={u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                          onClick={() => executar(`/admin/usuarios/${u.id}/bloquear`, { bloqueado: !u.bloqueado }, u.bloqueado ? 'Conta desbloqueada.' : 'Conta bloqueada.', recarregar)}
                        >
                          <Ban size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal aberto={!!ajuste} aoFechar={() => setAjuste(null)} titulo={`Ajustar saldo de ${ajuste?.apelido}`}>
        <p className="mb-4 text-sm text-suave">Use só para corrigir erros ou dar bônus. Tudo fica registrado no extrato do jogador.</p>
        <div className="mb-3 flex gap-2">
          <button className="chip" aria-pressed={tipo === 'credito'} onClick={() => setTipo('credito')}>
            Creditar
          </button>
          <button className="chip" aria-pressed={tipo === 'debito'} onClick={() => setTipo('debito')}>
            Debitar
          </button>
        </div>
        <CampoReais valor={valor} aoMudar={setValor} />
        <input className="campo mt-3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (obrigatório)" />
        <button
          className="btn btn-ouro mt-4 w-full"
          disabled={!Number.isFinite(valor) || valor <= 0 || motivo.trim().length < 3}
          onClick={() =>
            executar(`/admin/usuarios/${ajuste.id}/ajuste`, { valor: tipo === 'credito' ? valor : -valor, motivo }, 'Saldo ajustado.', () => {
              setAjuste(null)
              recarregar()
            })
          }
        >
          {tipo === 'credito' ? 'Creditar' : 'Debitar'} {Number.isFinite(valor) ? formatarReais(valor) : ''}
        </button>
      </Modal>
    </div>
  )
}

// ---------- Mesas e salas ativas ----------

function Ativos() {
  const [dados, recarregar] = useDados('/admin/ativos')
  if (!dados) return <Carregando />
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn btn-sec btn-pequeno" onClick={recarregar}>
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>
      <div>
        <h3 className="mb-2 font-bold">Mesas</h3>
        {dados.mesas.length === 0 ? (
          <p className="text-sm text-suave">Nenhuma mesa ativa.</p>
        ) : (
          <ul className="space-y-2">
            {dados.mesas.map((m) => (
              <li key={m.id} className="cartao flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="selo">{VARIANTES[m.variante].curto}</span>
                <span>{m.jogadores === 4 ? '2x2' : '1x1'}</span>
                <span className="numero font-semibold">{m.aposta ? formatarReais(m.aposta) : m.torneio ? `Sala: ${m.torneio.nome}` : 'Amistosa'}</span>
                <span className="text-suave">{m.nomes.filter(Boolean).join(', ')}</span>
                <span className="selo">{m.status}</span>
                <span className="ml-auto flex gap-2">
                  <Link className="btn btn-sec btn-pequeno" to={`/mesa/${m.id}`}>
                    Ver
                  </Link>
                  {!m.torneio && (
                    <button className="btn btn-fantasma btn-pequeno text-truco" onClick={() => confirm('Cancelar a mesa e devolver o valor a todos?') && executar(`/admin/mesas/${m.id}/cancelar`, {}, 'Mesa cancelada e valores devolvidos.', recarregar)}>
                      Cancelar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-2 font-bold">Salas de duplas</h3>
        {dados.torneios.length === 0 ? (
          <p className="text-sm text-suave">Nenhuma sala ativa.</p>
        ) : (
          <ul className="space-y-2">
            {dados.torneios.map((t) => (
              <li key={t.id} className="cartao flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="font-semibold">{t.nome}</span>
                <span className="text-suave">
                  {t.inscritos}/{t.total} · {t.entrada ? formatarReais(t.entrada) : 'grátis'}
                </span>
                <span className="selo">{t.status}</span>
                <span className="ml-auto flex gap-2">
                  <Link className="btn btn-sec btn-pequeno" to={`/sala/${t.id}`}>
                    Ver
                  </Link>
                  <button className="btn btn-fantasma btn-pequeno text-truco" onClick={() => confirm('Cancelar a sala e devolver todas as inscrições?') && executar(`/admin/torneios/${t.id}/cancelar`, {}, 'Sala cancelada e inscrições devolvidas.', recarregar)}>
                    Cancelar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------- Comissões (tabela) ----------

function Comissoes() {
  const [lista] = useDados('/admin/comissoes')
  if (!lista) return <Carregando />
  if (lista.length === 0) return <Vazio icone={Receipt} titulo="Nenhuma comissão ainda" texto="Assim que a primeira mesa valendo terminar, a comissão aparece aqui." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs text-apagado">
          <tr>
            <th className="py-2 pr-3 font-semibold">Quando</th>
            <th className="py-2 pr-3 font-semibold">Origem</th>
            <th className="py-2 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linha">
          {lista.map((c) => (
            <tr key={c.id}>
              <td className="py-2.5 pr-3 text-xs text-apagado">{formatarData(c.criadoEm)}</td>
              <td className="py-2.5 pr-3">{c.descricao}</td>
              <td className="numero py-2.5 text-right font-bold">{formatarReais(c.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Configurações ----------

function Campo({ rotulo, children, dica }) {
  return (
    <div>
      <label className="rotulo">{rotulo}</label>
      {children}
      {dica && <p className="mt-1 text-xs text-apagado">{dica}</p>}
    </div>
  )
}

function Configuracoes() {
  const [salvo, recarregar] = useDados('/admin/ajustes')
  const [f, setF] = useState(null)
  const recarregarConfig = useSessao((s) => s.recarregarConfig)
  useEffect(() => {
    if (salvo) setF({ ...salvo, valoresRapidosTexto: salvo.valoresRapidos.map((v) => (v / 100).toString().replace('.', ',')).join('; ') })
  }, [salvo])
  if (!f) return <Carregando />
  const mudar = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  async function salvar() {
    const valoresRapidos = f.valoresRapidosTexto
      .split(/[;\s]+/)
      .filter(Boolean)
      .map((t) => lerReais(t))
    if (valoresRapidos.some((v) => !Number.isFinite(v) || v <= 0)) return avisar.erro('Valores rápidos inválidos. Separe com ponto e vírgula, ex.: 1; 2; 5; 10')
    try {
      await api.put('/admin/ajustes', {
        taxaCasa: Number(String(f.taxaCasa).replace(',', '.')),
        apostaMin: f.apostaMin,
        apostaMax: f.apostaMax,
        valoresRapidos,
        depositoMin: f.depositoMin,
        depositoMax: f.depositoMax,
        saqueMin: f.saqueMin,
        pixChave: f.pixChave,
        pixTipo: f.pixTipo,
        pixNome: f.pixNome,
        pixBanco: f.pixBanco,
        tempoJogada: Number(f.tempoJogada),
        maxTimes: Number(f.maxTimes),
        mesasValendoAbertas: f.mesasValendoAbertas,
        whatsappSuporte: f.whatsappSuporte,
        emailSuporte: f.emailSuporte,
      })
      avisar.sucesso('Configurações salvas.')
      recarregar()
      recarregarConfig()
    } catch (e) {
      avisar.erro(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="cartao space-y-4 p-5">
        <h3 className="font-bold">Comissão e limites</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Comissão da casa (%)" dica="Sobre o pote de cada mesa/sala. Vale para as novas.">
            <input className="campo numero" inputMode="decimal" value={f.taxaCasa} onChange={(e) => mudar('taxaCasa')(e.target.value)} />
          </Campo>
          <Campo rotulo="Aposta mínima por jogador">
            <CampoReais valor={f.apostaMin} aoMudar={mudar('apostaMin')} />
          </Campo>
          <Campo rotulo="Aposta máxima por jogador">
            <CampoReais valor={f.apostaMax} aoMudar={mudar('apostaMax')} />
          </Campo>
          <Campo rotulo="Valores rápidos (R$)" dica="Separados por ponto e vírgula">
            <input className="campo" value={f.valoresRapidosTexto} onChange={(e) => mudar('valoresRapidosTexto')(e.target.value)} />
          </Campo>
          <Campo rotulo="Tempo por jogada (segundos)">
            <input className="campo numero" inputMode="numeric" value={f.tempoJogada} onChange={(e) => mudar('tempoJogada')(e.target.value.replace(/\D/g, ''))} />
          </Campo>
          <Campo rotulo="Máximo de duplas por sala">
            <input className="campo numero" inputMode="numeric" value={f.maxTimes} onChange={(e) => mudar('maxTimes')(e.target.value.replace(/\D/g, ''))} />
          </Campo>
        </div>
        <Interruptor ligado={f.mesasValendoAbertas} aoMudar={mudar('mesasValendoAbertas')} rotulo="Mesas valendo abertas" descricao="Desligue para pausar novas mesas e salas com dinheiro (as em andamento continuam)." />
      </div>
      <div className="cartao space-y-4 p-5">
        <h3 className="font-bold">PIX para receber depósitos</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Chave PIX">
            <input className="campo" value={f.pixChave} onChange={(e) => mudar('pixChave')(e.target.value)} placeholder="Sem chave = depósitos desligados" />
          </Campo>
          <Campo rotulo="Tipo da chave">
            <input className="campo" value={f.pixTipo} onChange={(e) => mudar('pixTipo')(e.target.value)} placeholder="CNPJ, e-mail, telefone, aleatória" />
          </Campo>
          <Campo rotulo="Nome do recebedor">
            <input className="campo" value={f.pixNome} onChange={(e) => mudar('pixNome')(e.target.value)} />
          </Campo>
          <Campo rotulo="Banco">
            <input className="campo" value={f.pixBanco} onChange={(e) => mudar('pixBanco')(e.target.value)} />
          </Campo>
          <Campo rotulo="Depósito mínimo">
            <CampoReais valor={f.depositoMin} aoMudar={mudar('depositoMin')} />
          </Campo>
          <Campo rotulo="Depósito máximo">
            <CampoReais valor={f.depositoMax} aoMudar={mudar('depositoMax')} />
          </Campo>
          <Campo rotulo="Saque mínimo">
            <CampoReais valor={f.saqueMin} aoMudar={mudar('saqueMin')} />
          </Campo>
        </div>
      </div>
      <div className="cartao space-y-4 p-5">
        <h3 className="font-bold">Suporte</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="WhatsApp (com DDD)">
            <input className="campo" value={f.whatsappSuporte} onChange={(e) => mudar('whatsappSuporte')(e.target.value)} placeholder="5511999999999" />
          </Campo>
          <Campo rotulo="E-mail">
            <input className="campo" value={f.emailSuporte} onChange={(e) => mudar('emailSuporte')(e.target.value)} />
          </Campo>
        </div>
      </div>
      <button className="btn btn-ouro btn-grande" onClick={salvar}>
        Salvar configurações
      </button>
    </div>
  )
}

const ABAS = [
  ['resumo', 'Resumo', LayoutDashboard],
  ['depositos', 'Depósitos', ArrowDownToLine],
  ['saques', 'Saques', ArrowUpFromLine],
  ['comissoes', 'Comissões', Receipt],
  ['jogadores', 'Jogadores', Users],
  ['ativos', 'Mesas e salas', Swords],
  ['config', 'Configurações', Settings],
]

export default function Admin() {
  useTitulo(`Painel — ${site.nome}`)
  const [aba, setAba] = useState('resumo')
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="titulo text-3xl">Painel do dono</h1>
      <div className="-mx-4 mt-5 overflow-x-auto px-4">
        <div className="flex min-w-max gap-1.5">
          {ABAS.map(([v, r, I]) => (
            <button key={v} className="chip" aria-pressed={aba === v} onClick={() => setAba(v)}>
              <I size={15} /> {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        {aba === 'resumo' && <Resumo irPara={setAba} />}
        {aba === 'depositos' && <Depositos />}
        {aba === 'saques' && <Saques />}
        {aba === 'comissoes' && <Comissoes />}
        {aba === 'jogadores' && <Jogadores />}
        {aba === 'ativos' && <Ativos />}
        {aba === 'config' && <Configuracoes />}
      </div>
    </section>
  )
}
