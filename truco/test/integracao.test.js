// Teste de ponta a ponta: servidor real, contas reais, jogadores conectados por WebSocket.
process.env.DB_FILE = ':memory:'
process.env.ATRASO_MAOS = '5'
process.env.ATRASO_BOT_MIN = '1'
process.env.ATRASO_BOT_MAX = '3'
process.env.COOKIE_SECURE = '0'

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { io as conectar } from 'socket.io-client'

const { criarServidor } = await import('../server/app.js')
const { db } = await import('../server/db.js')
const { ajusteManual } = await import('../server/carteira.js')
const { salvarAjustes } = await import('../server/ajustes.js')

let srv
let base

before(async () => {
  srv = criarServidor()
  await new Promise((ok) => srv.servidor.listen(0, ok))
  base = `http://127.0.0.1:${srv.servidor.address().port}`
})

after(() => {
  srv.desligar('fim dos testes')
})

async function api(metodo, caminho, corpo, cookie) {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const dados = await r.json()
  return { status: r.status, dados, cookie: r.headers.get('set-cookie')?.split(';')[0] }
}

/** Gera um CPF válido a partir de um número. */
function cpf(n) {
  const base = String(100000000 + n).slice(-9)
  const dig = (b) => {
    let s = 0
    for (let i = 0; i < b.length; i++) s += Number(b[i]) * (b.length + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  const d1 = dig(base)
  const d2 = dig(base + d1)
  return base + d1 + d2
}

let contador = 0
async function novoJogador(saldoInicial = 10000) {
  contador++
  const apelido = `jogador${contador}`
  const r = await api('POST', '/api/auth/cadastro', {
    nome: `Jogador Teste ${contador}`,
    apelido,
    email: `${apelido}@teste.com`,
    cpf: cpf(contador * 7919),
    nascimento: '1990-05-10',
    senha: 'senha-forte-123',
    aceite: true,
  })
  assert.equal(r.status, 201, JSON.stringify(r.dados))
  if (saldoInicial) ajusteManual(r.dados.usuario.id, saldoInicial, 'saldo de teste', r.dados.usuario.id)
  return { id: r.dados.usuario.id, apelido, cookie: r.cookie }
}

/** Conecta um jogador automático que responde a cada estado da mesa. */
function jogadorAutomatico(jogador, { aumentarAs = 0.15 } = {}) {
  const socket = conectar(base, { transports: ['websocket'], extraHeaders: { cookie: jogador.cookie }, forceNew: true })
  let ocupado = false
  let ultimo = null
  socket.on('mesa:estado', (m) => {
    ultimo = m
    avaliar()
  })
  function avaliar() {
    const m = ultimo
    if (!m || m.status !== 'jogando' || !m.jogo?.mao || ocupado) return
    const a = m.jogo.acoes
    let acao = null
    if (a.decidirOnze) acao = { tipo: 'onze', jogar: Math.random() < 0.5 }
    else if (a.votarFerro) acao = { tipo: 'votoFerro', escuro: Math.random() < 0.5 }
    else if (a.responder) acao = Math.random() < 0.6 ? { tipo: 'aceitar' } : a.aumentar && Math.random() < 0.3 ? { tipo: 'aumentar' } : { tipo: 'correr' }
    else if (a.jogar) {
      if (a.aumentar && Math.random() < aumentarAs) acao = { tipo: 'aumentar' }
      else {
        const cartas = m.jogo.mao.minhasCartas
        acao = cartas[0].oculta ? { tipo: 'jogar', indice: 0 } : { tipo: 'jogar', carta: cartas[0].id }
      }
    }
    if (!acao) return
    ocupado = true
    socket.emit('mesa:acao', { id: m.id, acao }, (resp) => {
      ocupado = false
      // O robô de teste joga muito mais rápido que um humano e às vezes esbarra no limite anti-abuso.
      if (resp?.erro?.startsWith('Calma')) return setTimeout(avaliar, 300)
      // O novo estado pode ter chegado antes desta confirmação.
      if (ultimo !== m) avaliar()
    })
  }
  socket.on('torneio:partida', ({ mesaId }) => socket.emit('mesa:entrar', mesaId))
  return socket
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms))

async function esperarAte(condicao, limiteMs = 60000) {
  const inicio = Date.now()
  while (!condicao()) {
    if (Date.now() - inicio > limiteMs) throw new Error('tempo esgotado esperando condição')
    await esperar(20)
  }
}

const saldo = (id) => db().prepare('SELECT saldo FROM usuarios WHERE id = ?').get(id).saldo
const totalComissoes = () => db().prepare('SELECT COALESCE(SUM(valor), 0) AS v FROM comissoes').get().v
const totalSaldos = () => db().prepare('SELECT COALESCE(SUM(saldo), 0) AS v FROM usuarios').get().v
const totalRetido = () => db().prepare("SELECT COALESCE(SUM(valor), 0) AS v FROM reservas WHERE status = 'retida'").get().v

test('cadastro valida CPF, idade e duplicidade', async () => {
  const ruim = await api('POST', '/api/auth/cadastro', {
    nome: 'Fulano de Tal',
    apelido: 'fulano',
    email: 'f@t.com',
    cpf: '12345678900',
    nascimento: '1990-01-01',
    senha: '12345678',
    aceite: true,
  })
  assert.equal(ruim.status, 400)
  assert.match(ruim.dados.erro, /CPF/)
  const menor = await api('POST', '/api/auth/cadastro', {
    nome: 'Fulano de Tal',
    apelido: 'fulano',
    email: 'f@t.com',
    cpf: cpf(42),
    nascimento: new Date(Date.now() - 17 * 365 * 86400000).toISOString().slice(0, 10),
    senha: '12345678',
    aceite: true,
  })
  assert.match(menor.dados.erro, /18 anos/)
  const j = await novoJogador(0)
  const dup = await api('POST', '/api/auth/cadastro', {
    nome: 'Outro Nome',
    apelido: j.apelido.toUpperCase(),
    email: 'x@y.com',
    cpf: cpf(43),
    nascimento: '1990-01-01',
    senha: '12345678',
    aceite: true,
  })
  assert.match(dup.dados.erro, /apelido/)
  const login = await api('POST', '/api/auth/entrar', { login: j.apelido, senha: 'senha-forte-123' })
  assert.equal(login.status, 200)
  const errado = await api('POST', '/api/auth/entrar', { login: j.apelido, senha: 'errada' })
  assert.equal(errado.status, 401)
})

test('requisição de outro site é bloqueada', async () => {
  const j = await novoJogador(0)
  const r = await fetch(base + '/api/mesas', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: j.cookie, origin: 'https://site-malicioso.com' },
    body: JSON.stringify({ variante: 'paulista', jogadores: 2, aposta: 100 }),
  })
  assert.equal(r.status, 403)
  const semJson = await fetch(base + '/api/mesas', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', cookie: j.cookie },
    body: 'x',
  })
  assert.equal(semJson.status, 415)
})

test('sem saldo não entra em mesa valendo; sair antes de começar devolve tudo', async () => {
  const pobre = await novoJogador(0)
  const r = await api('POST', '/api/mesas', { variante: 'paulista', jogadores: 2, aposta: 500 }, pobre.cookie)
  assert.equal(r.status, 400)
  assert.match(r.dados.erro, /Saldo insuficiente/)

  const j = await novoJogador(1000)
  const criada = await api('POST', '/api/mesas', { variante: 'paulista', jogadores: 2, aposta: 500 }, j.cookie)
  assert.equal(criada.status, 201)
  assert.equal(saldo(j.id), 500)
  const outra = await api('POST', '/api/mesas', { variante: 'paulista', jogadores: 2, aposta: 100 }, j.cookie)
  assert.equal(outra.status, 409, 'não pode estar em duas mesas')
  const saiu = await api('POST', `/api/mesas/${criada.dados.id}/sair`, {}, j.cookie)
  assert.equal(saiu.status, 200)
  assert.equal(saldo(j.id), 1000)
})

test('mesa 2x2 valendo R$ 5: partida completa, vencedores recebem R$ 9 cada e a casa R$ 2', async () => {
  const jogadores = []
  for (let i = 0; i < 4; i++) jogadores.push(await novoJogador(5000))
  const sockets = jogadores.map((j) => jogadorAutomatico(j))
  const comissaoAntes = totalComissoes()
  const somaAntes = totalSaldos() + totalComissoes()

  const criada = await api('POST', '/api/mesas', { variante: 'paulista', jogadores: 4, aposta: 500 }, jogadores[0].cookie)
  const id = criada.dados.id
  for (const s of sockets) s.emit('mesa:entrar', id)
  for (let i = 1; i < 4; i++) {
    const r = await api('POST', `/api/mesas/${id}/entrar`, {}, jogadores[i].cookie)
    assert.equal(r.status, 200, JSON.stringify(r.dados))
  }
  const { mesas } = await import('../server/salas/central.js')
  const mesa = mesas.get(id)
  assert.equal(mesa.status, 'jogando')
  await esperarAte(() => mesa.status === 'encerrada')

  const vencedorTime = mesa.resultado.vencedorTime
  const saldos = jogadores.map((j) => saldo(j.id))
  saldos.forEach((s, i) => assert.equal(s, i % 2 === vencedorTime ? 5000 - 500 + 900 : 4500))
  assert.equal(totalComissoes() - comissaoAntes, 200)
  assert.equal(totalSaldos() + totalComissoes(), somaAntes, 'nenhum centavo criado ou perdido')
  assert.equal(totalRetido(), 0)
  for (const s of sockets) s.close()
})

test('mesa 1x1 de Mineiro com mesa rápida juntando os dois jogadores', async () => {
  const a = await novoJogador(3000)
  const b = await novoJogador(3000)
  const sa = jogadorAutomatico(a, { aumentarAs: 0.4 })
  const sb = jogadorAutomatico(b, { aumentarAs: 0.4 })
  const r1 = await api('POST', '/api/mesas/rapida', { variante: 'mineiro', jogadores: 2, aposta: 1000 }, a.cookie)
  const r2 = await api('POST', '/api/mesas/rapida', { variante: 'mineiro', jogadores: 2, aposta: 1000 }, b.cookie)
  assert.equal(r1.dados.id, r2.dados.id, 'a mesa rápida junta os dois na mesma mesa')
  sa.emit('mesa:entrar', r1.dados.id)
  sb.emit('mesa:entrar', r1.dados.id)
  const { mesas } = await import('../server/salas/central.js')
  const mesa = mesas.get(r1.dados.id)
  await esperarAte(() => mesa.status === 'encerrada')
  const ganhador = mesa.resultado.vencedorTime === 0 ? a : b
  const perdedor = ganhador === a ? b : a
  assert.equal(saldo(ganhador.id), 3000 - 1000 + 1800)
  assert.equal(saldo(perdedor.id), 2000)
  sa.close()
  sb.close()
})

test('sala com 5 duplas, R$ 10 por jogador, prêmio para 3 posições (60/30/10)', async () => {
  salvarAjustes({ taxaCasa: 10 })
  const jogadores = []
  for (let i = 0; i < 10; i++) jogadores.push(await novoJogador(2000))
  const sockets = jogadores.map((j) => jogadorAutomatico(j))
  await esperar(200)
  const somaAntes = totalSaldos() + totalComissoes()
  const comissaoAntes = totalComissoes()

  const criada = await api(
    'POST',
    '/api/torneios',
    { nome: 'Sala de teste', variante: 'paulista', formato: 'duplas', times: 5, entrada: 1000, percentuais: [60, 30, 10] },
    jogadores[0].cookie,
  )
  assert.equal(criada.status, 201, JSON.stringify(criada.dados))
  const id = criada.dados.id
  // Percentuais inválidos são recusados.
  const ruim = await api(
    'POST',
    '/api/torneios',
    { nome: 'Ruim', variante: 'paulista', formato: 'duplas', times: 3, entrada: 1000, percentuais: [50, 30, 20] },
    jogadores[1].cookie,
  )
  assert.equal(ruim.status, 400)

  // O parceiro do criador escolhe a vaga ao lado dele.
  const parceiro = await api('POST', `/api/torneios/${id}/entrar`, { time: 0, vaga: 1 }, jogadores[1].cookie)
  assert.equal(parceiro.status, 200)
  for (let i = 2; i < 10; i++) {
    const r = await api('POST', `/api/torneios/${id}/entrar`, {}, jogadores[i].cookie)
    assert.equal(r.status, 200, JSON.stringify(r.dados))
  }
  const { torneios } = await import('../server/salas/central.js')
  const t = torneios.get(id)
  assert.equal(t.status, 'andamento')
  assert.equal(t.vagas[0][0].usuarioId, jogadores[0].id)
  assert.equal(t.vagas[0][1].usuarioId, jogadores[1].id)
  await esperarAte(() => t.status === 'encerrado', 120000)

  // Pote 100,00; casa 10,00; líquido 90,00 → 54/27/9 por dupla → 27/13,50/4,50 por jogador.
  const esperadoPorPosicao = [2700, 1350, 450]
  const pagos = new Map()
  t.colocacao.forEach((c, k) => {
    for (const v of t.vagas[c.time]) pagos.set(v.usuarioId, esperadoPorPosicao[k] ?? 0)
  })
  assert.equal(t.colocacao.length, 4)
  for (const j of jogadores) assert.equal(saldo(j.id), 2000 - 1000 + (pagos.get(j.id) || 0), `saldo de ${j.apelido}`)
  assert.equal(totalComissoes() - comissaoAntes, 1000)
  assert.equal(totalSaldos() + totalComissoes(), somaAntes)
  assert.equal(totalRetido(), 0)
  assert.equal(t.jogos.size, 5, '4 jogos de chave + disputa de 3º')
  for (const s of sockets) s.close()
})

test('criador cancela a sala antes de começar e todos recebem de volta', async () => {
  const a = await novoJogador(5000)
  const b = await novoJogador(5000)
  const criada = await api(
    'POST',
    '/api/torneios',
    { nome: 'Vai cancelar', variante: 'mineiro', formato: 'individual', times: 8, entrada: 2000, percentuais: [100] },
    a.cookie,
  )
  await api('POST', `/api/torneios/${criada.dados.id}/entrar`, {}, b.cookie)
  assert.equal(saldo(a.id), 3000)
  assert.equal(saldo(b.id), 3000)
  const naoPode = await api('POST', `/api/torneios/${criada.dados.id}/cancelar`, {}, b.cookie)
  assert.equal(naoPode.status, 403)
  const ok = await api('POST', `/api/torneios/${criada.dados.id}/cancelar`, {}, a.cookie)
  assert.equal(ok.status, 200)
  assert.equal(saldo(a.id), 5000)
  assert.equal(saldo(b.id), 5000)
})

test('treino contra o computador termina sozinho com o jogador no automático', async () => {
  const j = await novoJogador(0)
  const s = jogadorAutomatico(j)
  const r = await api('POST', '/api/treino', { variante: 'paulista', jogadores: 4 }, j.cookie)
  assert.equal(r.status, 201)
  s.emit('mesa:entrar', r.dados.id)
  const { mesas } = await import('../server/salas/central.js')
  const mesa = mesas.get(r.dados.id)
  await esperarAte(() => mesa.status === 'encerrada')
  assert.equal(saldo(j.id), 0)
  s.close()
})

test('a visão enviada pelo socket nunca contém cartas dos adversários', async () => {
  const a = await novoJogador(0)
  const b = await novoJogador(0)
  const criada = await api('POST', '/api/mesas', { variante: 'paulista', jogadores: 2, aposta: 0 }, a.cookie)
  const sa = conectar(base, { transports: ['websocket'], extraHeaders: { cookie: a.cookie }, forceNew: true })
  const recebidos = []
  sa.on('mesa:estado', (m) => recebidos.push(m))
  sa.emit('mesa:entrar', criada.dados.id)
  await api('POST', `/api/mesas/${criada.dados.id}/entrar`, {}, b.cookie)
  await esperarAte(() => recebidos.some((m) => m.status === 'jogando'))
  const { mesas } = await import('../server/salas/central.js')
  const mesa = mesas.get(criada.dados.id)
  const cartasB = mesa.partida.mao.cartas[1].map((c) => c.id)
  const ultimo = JSON.stringify(recebidos.at(-1))
  for (const id of cartasB) assert.ok(!ultimo.includes(`"${id}"`), `vazou ${id}`)
  sa.close()
})

test('painel administrativo: só admin acessa; depósito aprovado credita o saldo', async () => {
  const dono = await novoJogador(0)
  const cliente = await novoJogador(0)
  const negado = await api('GET', '/api/admin/resumo', null, dono.cookie)
  assert.equal(negado.status, 403)
  db().prepare('UPDATE usuarios SET admin = 1 WHERE id = ?').run(dono.id)

  const semPix = await api('POST', '/api/carteira/deposito', { valor: 5000 }, cliente.cookie)
  assert.equal(semPix.status, 400)
  const cfg = await api('PUT', '/api/admin/ajustes', { pixChave: 'chave-teste@pix.com', pixNome: 'Dono do Site' }, dono.cookie)
  assert.equal(cfg.status, 200)

  const dep = await api('POST', '/api/carteira/deposito', { valor: 5000 }, cliente.cookie)
  assert.equal(dep.status, 201)
  assert.equal(dep.dados.pix.chave, 'chave-teste@pix.com')
  assert.equal(saldo(cliente.id), 0, 'só credita depois da confirmação')
  const pend = await api('GET', '/api/admin/depositos?status=pendente', null, dono.cookie)
  assert.ok(pend.dados.some((d) => d.id === dep.dados.id))
  await api('POST', `/api/admin/depositos/${dep.dados.id}/aprovar`, {}, dono.cookie)
  assert.equal(saldo(cliente.id), 5000)
  const dup = await api('POST', `/api/admin/depositos/${dep.dados.id}/aprovar`, {}, dono.cookie)
  assert.equal(dup.status, 400, 'não aprova duas vezes')
  assert.equal(saldo(cliente.id), 5000)

  const saque = await api('POST', '/api/carteira/saque', { valor: 3000, chavePix: '11999990000' }, cliente.cookie)
  assert.equal(saque.status, 201)
  assert.equal(saldo(cliente.id), 2000)
  const demais = await api('POST', '/api/carteira/saque', { valor: 3000, chavePix: '11999990000' }, cliente.cookie)
  assert.equal(demais.status, 400)
  await api('POST', `/api/admin/saques/${saque.dados.id}/recusar`, { observacao: 'chave errada' }, dono.cookie)
  assert.equal(saldo(cliente.id), 5000, 'saque recusado devolve o valor')

  const resumo = await api('GET', '/api/admin/resumo', null, dono.cookie)
  assert.equal(resumo.status, 200)
  assert.ok(resumo.dados.comissoes.total >= 1200)
})

test('servidor reiniciado no meio da partida: todo valor retido volta para os jogadores', async () => {
  const { devolverReservasAbertas } = await import('../server/carteira.js')
  const a = await novoJogador(4000)
  const b = await novoJogador(4000)
  const criada = await api('POST', '/api/mesas', { variante: 'paulista', jogadores: 2, aposta: 1500 }, a.cookie)
  await api('POST', `/api/mesas/${criada.dados.id}/entrar`, {}, b.cookie)
  assert.equal(saldo(a.id), 2500)
  assert.equal(saldo(b.id), 2500)
  assert.ok(totalRetido() >= 3000)
  // É o que o servidor executa ao iniciar depois de uma queda.
  devolverReservasAbertas()
  assert.equal(saldo(a.id), 4000)
  assert.equal(saldo(b.id), 4000)
  assert.equal(totalRetido(), 0)
  const { mesas } = await import('../server/salas/central.js')
  mesas.get(criada.dados.id).cancelar('teste')
})

test('torneio relâmpago de 4 jogadores: junta quem chega e paga o campeão', async () => {
  const jogadores = []
  for (let i = 0; i < 4; i++) jogadores.push(await novoJogador(3000))
  const sockets = jogadores.map((j) => jogadorAutomatico(j))
  await esperar(150)
  const comissaoAntes = totalComissoes()
  const ids = []
  for (const j of jogadores) {
    const r = await api('POST', '/api/torneios/relampago', { variante: 'mineiro', formato: 'individual', times: 4, entrada: 500 }, j.cookie)
    assert.equal(r.status, 200, JSON.stringify(r.dados))
    ids.push(r.dados.id)
  }
  assert.equal(new Set(ids).size, 1, 'os quatro caem no mesmo relâmpago')
  const { torneios } = await import('../server/salas/central.js')
  const t = torneios.get(ids[0])
  assert.equal(t.relampago, true)
  assert.equal(t.status, 'andamento')
  // Ninguém cancela um relâmpago (só a administração).
  const cancelar = await api('POST', `/api/torneios/${t.id}/cancelar`, {}, jogadores[0].cookie)
  assert.equal(cancelar.status, 403)
  await esperarAte(() => t.status === 'encerrado', 120000)
  // Pote 20,00 − 10% = 18,00 para o campeão.
  const campeao = t.vagas[t.colocacao[0].time][0].usuarioId
  for (const j of jogadores) assert.equal(saldo(j.id), j.id === campeao ? 3000 - 500 + 1800 : 2500)
  assert.equal(totalComissoes() - comissaoAntes, 200)
  for (const s of sockets) s.close()
})

test('relâmpago de duplas forma duplas com quem chegar; sair deixa a vaga e devolve', async () => {
  const a = await novoJogador(2000)
  const b = await novoJogador(2000)
  const ra = await api('POST', '/api/torneios/relampago', { variante: 'paulista', formato: 'duplas', times: 4, entrada: 300 }, a.cookie)
  const rb = await api('POST', '/api/torneios/relampago', { variante: 'paulista', formato: 'duplas', times: 4, entrada: 300 }, b.cookie)
  assert.equal(ra.dados.id, rb.dados.id)
  const { torneios } = await import('../server/salas/central.js')
  const t = torneios.get(ra.dados.id)
  assert.equal(t.vagas[0][0].usuarioId, a.id)
  assert.equal(t.vagas[0][1].usuarioId, b.id, 'o segundo completa a dupla do primeiro (parceiro aleatório)')
  await api('POST', `/api/torneios/${t.id}/sair`, {}, a.cookie)
  await api('POST', `/api/torneios/${t.id}/sair`, {}, b.cookie)
  assert.equal(saldo(a.id), 2000)
  assert.equal(saldo(b.id), 2000)
  assert.equal(t.status, 'cancelado', 'relâmpago vazio deixa de existir')
})

test('revanche: os dois pedem, nova mesa começa e cada um paga a entrada de novo', async () => {
  const a = await novoJogador(5000)
  const b = await novoJogador(5000)
  const sa = jogadorAutomatico(a)
  const sb = jogadorAutomatico(b)
  const criada = await api('POST', '/api/mesas', { variante: 'paulista', jogadores: 2, aposta: 1000 }, a.cookie)
  sa.emit('mesa:entrar', criada.dados.id)
  sb.emit('mesa:entrar', criada.dados.id)
  await api('POST', `/api/mesas/${criada.dados.id}/entrar`, {}, b.cookie)
  const { mesas } = await import('../server/salas/central.js')
  const mesa = mesas.get(criada.dados.id)
  await esperarAte(() => mesa.status === 'encerrada')
  const antesA = saldo(a.id)
  const antesB = saldo(b.id)
  const v1 = await api('POST', `/api/mesas/${mesa.id}/revanche`, {}, a.cookie)
  assert.equal(v1.dados.novaMesa, null, 'espera o outro jogador')
  const v2 = await api('POST', `/api/mesas/${mesa.id}/revanche`, {}, b.cookie)
  assert.ok(v2.dados.novaMesa)
  const nova = mesas.get(v2.dados.novaMesa)
  assert.equal(nova.status, 'jogando')
  assert.equal(nova.assentos[0].usuarioId, mesa.assentos[0].usuarioId, 'mesmos lugares')
  assert.equal(saldo(a.id), antesA - 1000)
  assert.equal(saldo(b.id), antesB - 1000)
  sa.emit('mesa:entrar', nova.id)
  sb.emit('mesa:entrar', nova.id)
  await esperarAte(() => nova.status === 'encerrada')
  sa.close()
  sb.close()
})

test('revanche sem saldo de um jogador não acontece e não revela o saldo dele', async () => {
  const a = await novoJogador(1000)
  const b = await novoJogador(5000)
  const sa = jogadorAutomatico(a)
  const sb = jogadorAutomatico(b)
  const criada = await api('POST', '/api/mesas', { variante: 'mineiro', jogadores: 2, aposta: 1000 }, a.cookie)
  sa.emit('mesa:entrar', criada.dados.id)
  sb.emit('mesa:entrar', criada.dados.id)
  await api('POST', `/api/mesas/${criada.dados.id}/entrar`, {}, b.cookie)
  const { mesas } = await import('../server/salas/central.js')
  const mesa = mesas.get(criada.dados.id)
  await esperarAte(() => mesa.status === 'encerrada')
  // Se `a` perdeu, fica com 0 e não paga a revanche; se ganhou, quem fica sem é ninguém — então zera `a` para forçar o caso.
  db().prepare('UPDATE usuarios SET saldo = 0 WHERE id = ?').run(a.id)
  const antesB = saldo(b.id)
  await api('POST', `/api/mesas/${mesa.id}/revanche`, {}, b.cookie)
  const r = await api('POST', `/api/mesas/${mesa.id}/revanche`, {}, a.cookie)
  assert.equal(r.dados.novaMesa, null)
  assert.match(mesa.revanche.recusada, /não tem saldo/)
  assert.ok(!/R\$/.test(mesa.revanche.recusada), 'a mensagem não mostra valores')
  assert.equal(saldo(b.id), antesB, 'quem pagou primeiro recebe de volta')
  assert.equal(totalRetido(), 0)
  sa.close()
  sb.close()
})

test('perfil: troca de avatar só aceita avatares da lista', async () => {
  const j = await novoJogador(0)
  const ok = await api('PUT', '/api/perfil', { avatar: 'coelho' }, j.cookie)
  assert.equal(ok.status, 200)
  assert.equal(ok.dados.usuario.avatar, 'coelho')
  const ruim = await api('PUT', '/api/perfil', { avatar: '<script>' }, j.cookie)
  assert.equal(ruim.status, 400)
})
