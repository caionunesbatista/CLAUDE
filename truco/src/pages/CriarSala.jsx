import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Minus, Plus, Users, User, Info, Trophy } from 'lucide-react'
import { useSessao, avisar } from '../store/sessao.js'
import { api } from '../lib/api.js'
import { formatarReais } from '../lib/formato.js'
import { calcularPremios } from '../../shared/premios.js'
import { DIVISOES_PADRAO, maxPremiados, validarPercentuais, VARIANTES } from '../../shared/regras.js'
import { Interruptor, Alternador, useTitulo } from '../components/ui.jsx'
import { EscolhaVariante, EscolhaValor } from '../components/Escolhas.jsx'
import { TabelaPremios } from '../components/Premiacao.jsx'
import { site } from '../config/site.js'

function Bloco({ numero, titulo, children, dica }) {
  return (
    <div className="cartao p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-marca/15 text-sm font-black text-marca-forte">{numero}</span>
        <h2 className="titulo text-lg">{titulo}</h2>
      </div>
      {children}
      {dica && (
        <p className="mt-4 flex items-start gap-2 text-xs text-apagado">
          <Info size={14} className="mt-0.5 shrink-0" /> {dica}
        </p>
      )}
    </div>
  )
}

export default function CriarSala() {
  useTitulo(`Criar sala — ${site.nome}`)
  const { config, saldo } = useSessao()
  const navegar = useNavigate()
  const maxTimes = config?.maxTimes ?? 64
  const taxa = config?.taxaCasa ?? 10

  const [nome, setNome] = useState('')
  const [variante, setVariante] = useState('paulista')
  const [formato, setFormato] = useState('duplas')
  const [times, setTimes] = useState(8)
  const [entrada, setEntrada] = useState(1000)
  const [percentuais, setPercentuais] = useState(DIVISOES_PADRAO[3])
  const [privada, setPrivada] = useState(false)
  const [vouJogar, setVouJogar] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const porTime = formato === 'duplas' ? 2 : 1
  const palavra = formato === 'duplas' ? 'duplas' : 'jogadores'
  const max = maxPremiados(times)
  const erroPremio = validarPercentuais(percentuais, times)
  const entradaValida = Number.isFinite(entrada) && entrada >= 0
  const calculo = useMemo(() => {
    if (erroPremio || !entradaValida) return null
    return calcularPremios({ entrada, jogadoresPorTime: porTime, times, taxa, percentuais })
  }, [entrada, porTime, times, taxa, percentuais, erroPremio, entradaValida])

  function mudarTimes(n) {
    const novo = Math.max(2, Math.min(maxTimes, n))
    setTimes(novo)
    // Ajusta o número de premiados se passar do permitido para esse tamanho.
    if (percentuais.length > maxPremiados(novo)) setPercentuais(DIVISOES_PADRAO[maxPremiados(novo)])
  }

  function mudarPercentual(i, texto) {
    const v = texto === '' ? 0 : Math.max(0, Math.min(100, Math.round(Number(texto.replace(/\D/g, '')))))
    setPercentuais((lista) => lista.map((p, k) => (k === i ? v : p)))
  }

  const soma = percentuais.reduce((a, b) => a + b, 0)
  const nomeValido = nome.trim().length >= 3
  const pagaInscricao = vouJogar && entrada > 0
  const semSaldo = pagaInscricao && saldo < entrada
  const podeCriar = nomeValido && !erroPremio && entradaValida && !semSaldo && !enviando

  async function criar() {
    setEnviando(true)
    try {
      const { id } = await api.post('/torneios', { nome: nome.trim(), variante, formato, times, entrada, percentuais, privada, vouJogar })
      avisar.sucesso('Sala criada! Mande o link para a turma.')
      navegar(`/sala/${id}`)
    } catch (erro) {
      avisar.erro(erro.message)
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="titulo text-3xl">Criar sala de duplas</h1>
      <p className="mt-1 max-w-2xl text-suave">Você decide tudo: quantos participam, quanto custa entrar e quem leva prêmio. A chave é sorteada quando a sala lotar.</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Bloco numero={1} titulo="Nome e jogo">
            <label className="rotulo" htmlFor="nome-sala">Nome da sala</label>
            <input id="nome-sala" className="campo" maxLength={40} placeholder="Ex.: Truco da Firma, Copa do Bairro..." value={nome} onChange={(e) => setNome(e.target.value)} />
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="rotulo">Variante</p>
                <EscolhaVariante valor={variante} aoMudar={setVariante} />
              </div>
              <div>
                <p className="rotulo">Formato</p>
                <Alternador
                  rotulo="Formato"
                  valor={formato}
                  aoMudar={setFormato}
                  opcoes={[
                    { valor: 'duplas', rotulo: 'Duplas (2x2)', icone: <Users size={15} /> },
                    { valor: 'individual', rotulo: 'Individual (1x1)', icone: <User size={15} /> },
                  ]}
                />
              </div>
            </div>
          </Bloco>

          <Bloco numero={2} titulo={`Quantas ${palavra}?`} dica={`Se o número não fechar a chave (ex.: 6, 12), as ${palavra} sorteadas como cabeça de chave avançam direto da 1ª rodada.`}>
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-sec h-14 w-14 px-0" onClick={() => mudarTimes(times - 1)} aria-label={`Menos ${palavra}`}>
                <Minus size={20} />
              </button>
              <input
                className="campo numero titulo h-14 w-24 text-center text-3xl"
                inputMode="numeric"
                value={times}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ''))
                  if (Number.isFinite(n)) setTimes(Math.min(maxTimes, n))
                }}
                onBlur={() => mudarTimes(times)}
                aria-label={`Número de ${palavra}`}
              />
              <button className="btn btn-sec h-14 w-14 px-0" onClick={() => mudarTimes(times + 1)} aria-label={`Mais ${palavra}`}>
                <Plus size={20} />
              </button>
              <div className="flex flex-wrap gap-1.5">
                {[2, 4, 8, 16, 32].filter((n) => n <= maxTimes).map((n) => (
                  <button key={n} className="chip" aria-pressed={times === n} onClick={() => mudarTimes(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm text-suave">
              {times * porTime} jogadores no total · até {maxTimes} {palavra}
            </p>
          </Bloco>

          <Bloco numero={3} titulo="Inscrição por jogador" dica={formato === 'duplas' ? 'Cada jogador paga a sua parte. A dupla paga o dobro do valor escolhido.' : undefined}>
            <EscolhaValor valor={entrada} aoMudar={setEntrada} rotuloGratis="Grátis" />
          </Bloco>

          <Bloco numero={4} titulo="Quem leva prêmio?">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  className="chip"
                  aria-pressed={percentuais.length === n}
                  disabled={n > max}
                  style={n > max ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                  onClick={() => setPercentuais(DIVISOES_PADRAO[n])}
                >
                  {n === 1 ? `Só ${formato === 'duplas' ? 'a dupla campeã' : 'o campeão'}` : `Top ${n}`}
                </button>
              ))}
            </div>
            {max < 4 && (
              <p className="mt-2 text-xs text-apagado">
                Com {times} {palavra}, no máximo {max} {max === 1 ? 'posição pode' : 'posições podem'} ser premiada{max === 1 ? '' : 's'}.
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {percentuais.map((p, i) => (
                <label key={i} className="flex items-center gap-3 rounded-xl border border-linha bg-fundo/60 px-4 py-2">
                  <span className="w-20 font-semibold">{i + 1}º lugar</span>
                  <input className="campo numero h-10 min-h-0 w-20 text-center" inputMode="numeric" value={p || ''} onChange={(e) => mudarPercentual(i, e.target.value)} aria-label={`Percentual do ${i + 1}º lugar`} />
                  <span className="text-suave">%</span>
                </label>
              ))}
            </div>
            <p className={`mt-3 text-sm font-semibold ${erroPremio ? 'text-truco' : 'text-dinheiro'}`}>{erroPremio || `Total: ${soma}% ✓`}</p>
            {percentuais.length >= 3 && times >= 4 && <p className="mt-1 text-xs text-apagado">Com prêmio para o 3º lugar, os perdedores das semifinais jogam a disputa de 3º.</p>}
          </Bloco>

          <Bloco numero={5} titulo="Ajustes finais">
            <div className="space-y-5">
              <Interruptor ligado={vouJogar} aoMudar={setVouJogar} rotulo="Vou jogar nesta sala" descricao={entrada > 0 ? `Sua inscrição de ${formatarReais(entrada)} é paga agora e devolvida se a sala for cancelada.` : 'Você entra na primeira vaga.'} />
              <Interruptor ligado={privada} aoMudar={setPrivada} rotulo="Sala privada" descricao="Não aparece na lista pública. Só entra quem tiver o link." />
            </div>
          </Bloco>
        </div>

        {/* Resumo fixo */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="cartao overflow-hidden">
            <div className="feltro px-5 py-5">
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">Resumo da sala</p>
              <p className="titulo mt-1 truncate text-2xl">{nome.trim() || 'Sua sala'}</p>
              <p className="mt-1 text-sm text-white/75">
                {VARIANTES[variante].nome} · {times} {palavra}
              </p>
            </div>
            <div className="space-y-4 p-5">
              {calculo ? (
                <>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-suave">Inscrição</dt>
                      <dd className="numero font-semibold">{entrada ? `${formatarReais(entrada)} por jogador` : 'Grátis'}</dd>
                    </div>
                    {entrada > 0 && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-suave">Pote total</dt>
                          <dd className="numero font-semibold">{formatarReais(calculo.pote)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-suave">Taxa da casa ({taxa}%)</dt>
                          <dd className="numero text-suave">− {formatarReais(calculo.comissao)}</dd>
                        </div>
                        <div className="flex justify-between border-t border-linha pt-2">
                          <dt className="font-semibold">Total em prêmios</dt>
                          <dd className="numero font-bold text-dinheiro">{formatarReais(calculo.liquido)}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  {entrada > 0 ? (
                    <TabelaPremios calculo={calculo} percentuais={percentuais} porTime={porTime} compacta />
                  ) : (
                    <p className="flex items-center gap-2 rounded-xl bg-fundo/60 px-4 py-3 text-sm text-suave">
                      <Trophy size={16} className="text-marca-forte" /> Sala grátis: vale a glória.
                    </p>
                  )}
                </>
              ) : (
                <p className="rounded-xl bg-truco/10 px-4 py-3 text-sm text-truco">{erroPremio || 'Informe um valor de inscrição válido.'}</p>
              )}
              {semSaldo && (
                <p className="rounded-xl bg-truco/10 px-4 py-3 text-sm text-truco">
                  Seu saldo ({formatarReais(saldo)}) não cobre a sua inscrição. Deposite ou desmarque “Vou jogar”.
                </p>
              )}
              <button className="btn btn-primario btn-grande w-full" disabled={!podeCriar} onClick={criar}>
                {enviando ? 'Criando...' : 'Criar sala'}
              </button>
              {!nomeValido && <p className="text-center text-xs text-apagado">Dê um nome para a sala (mínimo 3 letras).</p>}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
