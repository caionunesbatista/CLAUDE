import { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, History, Copy, CircleCheck, Clock, XCircle, Info } from 'lucide-react'
import { api } from '../lib/api.js'
import { useSessao, avisar } from '../store/sessao.js'
import { formatarReais, formatarData, copiar } from '../lib/formato.js'
import { CampoReais, Carregando, Dinheiro, Vazio, useTitulo } from '../components/ui.jsx'
import { site } from '../config/site.js'

const STATUS = {
  pendente: { texto: 'Aguardando', icone: Clock, cor: 'text-marca-forte' },
  aprovado: { texto: 'Confirmado', icone: CircleCheck, cor: 'text-dinheiro' },
  pago: { texto: 'Pago', icone: CircleCheck, cor: 'text-dinheiro' },
  recusado: { texto: 'Recusado', icone: XCircle, cor: 'text-truco' },
  cancelado: { texto: 'Cancelado', icone: XCircle, cor: 'text-apagado' },
}

const TIPOS = {
  deposito: 'Depósito',
  saque: 'Saque',
  estorno_saque: 'Saque devolvido',
  entrada: 'Entrada em mesa/sala',
  devolucao: 'Valor devolvido',
  premio: 'Prêmio',
  ajuste: 'Ajuste',
}

function Status({ s }) {
  const st = STATUS[s] || STATUS.pendente
  const I = st.icone
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${st.cor}`}>
      <I size={13} /> {st.texto}
    </span>
  )
}

function Depositar({ dados, recarregar }) {
  const { config } = useSessao()
  const [valor, setValor] = useState(5000)
  const [pedido, setPedido] = useState(null)
  const [enviando, setEnviando] = useState(false)
  if (!config?.depositoConfigurado) {
    return (
      <div className="rounded-2xl bg-fundo/60 p-5 text-sm text-suave">
        Os depósitos ainda não foram habilitados pela administração. Tente novamente mais tarde ou fale com o suporte.
      </div>
    )
  }
  async function gerar() {
    setEnviando(true)
    try {
      const r = await api.post('/carteira/deposito', { valor })
      setPedido(r)
      recarregar()
    } catch (e) {
      avisar.erro(e.message)
    } finally {
      setEnviando(false)
    }
  }
  const copiarCampo = async (texto, rotulo) => (await copiar(texto)) && avisar.sucesso(`${rotulo} copiado!`)
  if (pedido) {
    return (
      <div className="animar-surgir space-y-4">
        <div className="rounded-2xl border border-marca/40 bg-marca/5 p-5">
          <p className="text-sm text-suave">Faça um PIX de</p>
          <p className="numero titulo text-4xl text-marca-forte">{formatarReais(pedido.valor)}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-apagado">Chave PIX ({pedido.pix.tipo})</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-fundo px-3 py-2 font-mono text-sm">{pedido.pix.chave}</code>
                <button className="btn btn-sec btn-pequeno" onClick={() => copiarCampo(pedido.pix.chave, 'Chave PIX')}>
                  <Copy size={15} /> Copiar
                </button>
              </dd>
            </div>
            {pedido.pix.nome && (
              <div>
                <dt className="text-xs text-apagado">Recebedor</dt>
                <dd className="font-semibold">
                  {pedido.pix.nome}
                  {pedido.pix.banco && <span className="font-normal text-suave"> · {pedido.pix.banco}</span>}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-apagado">Código do depósito (coloque na descrição do PIX)</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="rounded-lg bg-fundo px-3 py-2 font-mono text-lg font-bold tracking-widest">{pedido.codigo}</code>
                <button className="btn btn-sec btn-pequeno" onClick={() => copiarCampo(pedido.codigo, 'Código')}>
                  <Copy size={15} /> Copiar
                </button>
              </dd>
            </div>
          </dl>
        </div>
        <p className="flex items-start gap-2 text-sm text-suave">
          <Info size={16} className="mt-0.5 shrink-0 text-info" />
          Envie exatamente esse valor, de uma conta no seu nome. Seu saldo é liberado assim que o pagamento for confirmado — você vê aqui e recebe o valor na hora.
        </p>
        <button className="btn btn-sec w-full" onClick={() => setPedido(null)}>
          Fazer outro depósito
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="rotulo">Quanto você quer depositar?</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {[2000, 5000, 10000, 20000, 50000].map((v) => (
            <button key={v} className="chip numero" aria-pressed={valor === v} onClick={() => setValor(v)}>
              {formatarReais(v)}
            </button>
          ))}
        </div>
        <div className="max-w-xs">
          <CampoReais valor={valor} aoMudar={setValor} aria-label="Valor do depósito" />
        </div>
        <p className="mt-1.5 text-xs text-apagado">
          Mínimo {formatarReais(config.depositoMin)} · máximo {formatarReais(config.depositoMax)}
        </p>
      </div>
      <button className="btn btn-verde btn-grande w-full sm:w-auto" disabled={enviando || !Number.isFinite(valor) || valor < config.depositoMin || valor > config.depositoMax} onClick={gerar}>
        <ArrowDownToLine size={20} /> Gerar PIX
      </button>
      <Lista titulo="Seus depósitos" itens={dados.depositos} recarregar={recarregar} tipo="deposito" />
    </div>
  )
}

function Sacar({ dados, recarregar }) {
  const { config, saldo } = useSessao()
  const [valor, setValor] = useState(NaN)
  const [chave, setChave] = useState(dados.chavePix || '')
  const [enviando, setEnviando] = useState(false)
  async function sacar() {
    setEnviando(true)
    try {
      await api.post('/carteira/saque', { valor, chavePix: chave })
      avisar.sucesso('Saque solicitado! Você recebe o PIX assim que for processado.')
      setValor(NaN)
      recarregar()
    } catch (e) {
      avisar.erro(e.message)
    } finally {
      setEnviando(false)
    }
  }
  const minimo = config?.saqueMin ?? 2000
  const valido = Number.isFinite(valor) && valor >= minimo && valor <= saldo && chave.trim().length >= 5
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="valor-saque">Valor</label>
          <CampoReais id="valor-saque" valor={valor} aoMudar={setValor} />
          <div className="mt-1.5 flex justify-between text-xs text-apagado">
            <span>Mínimo {formatarReais(minimo)}</span>
            <button className="font-semibold text-marca-forte hover:underline" onClick={() => setValor(saldo)}>
              Sacar tudo ({formatarReais(saldo)})
            </button>
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="chave-saque">Sua chave PIX</label>
          <input id="chave-saque" className="campo" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" />
          <p className="mt-1.5 text-xs text-apagado">A conta precisa estar no seu nome (mesmo CPF do cadastro).</p>
        </div>
      </div>
      <button className="btn btn-primario btn-grande w-full sm:w-auto" disabled={enviando || !valido} onClick={sacar}>
        <ArrowUpFromLine size={20} /> Solicitar saque
      </button>
      <Lista titulo="Seus saques" itens={dados.saques} tipo="saque" />
    </div>
  )
}

function Lista({ titulo, itens, recarregar, tipo }) {
  if (!itens?.length) return null
  async function cancelar(id) {
    try {
      await api.post(`/carteira/deposito/${id}/cancelar`)
      recarregar()
    } catch (e) {
      avisar.erro(e.message)
    }
  }
  return (
    <div>
      <p className="mb-2 mt-6 text-sm font-bold">{titulo}</p>
      <ul className="divide-y divide-linha rounded-2xl border border-linha">
        {itens.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="numero font-bold">{formatarReais(i.valor)}</span>
            {i.codigo && <code className="text-xs text-suave">{i.codigo}</code>}
            {i.chavePix && <span className="truncate text-xs text-suave">{i.chavePix}</span>}
            <span className="text-xs text-apagado">{formatarData(i.criadoEm)}</span>
            <span className="ml-auto flex items-center gap-3">
              <Status s={i.status} />
              {tipo === 'deposito' && i.status === 'pendente' && (
                <button className="text-xs text-apagado underline hover:text-texto" onClick={() => cancelar(i.id)}>
                  cancelar
                </button>
              )}
            </span>
            {i.observacao && <p className="w-full text-xs text-truco">{i.observacao}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Extrato({ itens }) {
  if (!itens.length) return <Vazio icone={History} titulo="Nada por aqui ainda" texto="Seus depósitos, entradas em mesas e prêmios aparecem aqui." />
  return (
    <ul className="divide-y divide-linha">
      {itens.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{TIPOS[m.tipo] || m.tipo}</p>
            <p className="truncate text-xs text-suave">{m.descricao}</p>
          </div>
          <div className="text-right">
            <p className={`numero font-bold ${m.valor > 0 ? 'text-dinheiro' : 'text-texto'}`}>
              {m.valor > 0 ? '+' : '−'}
              {formatarReais(Math.abs(m.valor))}
            </p>
            <p className="text-xs text-apagado">{formatarData(m.criadoEm)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Carteira() {
  useTitulo(`Carteira — ${site.nome}`)
  const { saldo } = useSessao()
  const [aba, setAba] = useState('depositar')
  const [dados, setDados] = useState(null)
  const recarregar = useCallback(() => {
    api
      .get('/carteira')
      .then(setDados)
      .catch((e) => avisar.erro(e.message))
  }, [])
  useEffect(() => {
    recarregar()
  }, [recarregar, saldo])
  const abas = [
    ['depositar', 'Depositar', ArrowDownToLine],
    ['sacar', 'Sacar', ArrowUpFromLine],
    ['extrato', 'Extrato', History],
  ]
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="feltro relative overflow-hidden rounded-3xl border border-marca/25 p-6 sm:p-8">
        <p className="text-sm font-semibold text-white/70">Saldo disponível</p>
        <Dinheiro valor={saldo} className="titulo mt-1 block text-5xl text-white" />
        <p className="mt-2 text-xs text-white/60">Valores em mesas e salas em andamento ficam retidos até o fim da partida.</p>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-painel p-1.5">
        {abas.map(([v, r, I]) => (
          <button key={v} className={`btn btn-pequeno ${aba === v ? 'bg-painel-3 text-texto' : 'text-suave'}`} onClick={() => setAba(v)}>
            <I size={16} /> {r}
          </button>
        ))}
      </div>
      <div className="cartao mt-4 p-5 sm:p-6">
        {!dados ? (
          <Carregando />
        ) : aba === 'depositar' ? (
          <Depositar dados={dados} recarregar={recarregar} />
        ) : aba === 'sacar' ? (
          <Sacar dados={dados} recarregar={recarregar} />
        ) : (
          <Extrato itens={dados.extrato} />
        )}
      </div>
    </section>
  )
}
