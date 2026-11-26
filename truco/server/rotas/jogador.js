// Rotas que exigem login: mesas, salas, treino, carteira e perfil.
import { Router } from 'express'
import { rota, ErroUsuario } from '../erros.js'
import { exigirLogin, trocarSenha, usuarioPublico, buscarUsuario, criarSessao, gravarCookieSessao } from '../contas.js'
import { criarMesa, entrarMesa, sairMesa, mesaRapida, criarTreino, trocarLugar } from '../salas/mesas.js'
import { criarTorneio, entrarTorneio, sairTorneio, cancelarTorneio, trocarVagaTorneio } from '../salas/torneios.js'
import { extrato, criarDeposito, cancelarDeposito, solicitarSaque } from '../carteira.js'
import { ajustes } from '../ajustes.js'
import { db } from '../db.js'

export const rotasJogador = Router()
rotasJogador.use(exigirLogin)

const inteiroOuNulo = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v))

// ---------- mesas ----------

rotasJogador.post(
  '/mesas',
  rota((req, res) => {
    const b = req.body || {}
    const mesa = criarMesa(req.usuario, {
      variante: b.variante,
      jogadores: Number(b.jogadores),
      aposta: Number(b.aposta),
      privada: b.privada === true,
    })
    res.status(201).json({ id: mesa.id })
  }),
)

rotasJogador.post(
  '/mesas/rapida',
  rota((req, res) => {
    const b = req.body || {}
    const mesa = mesaRapida(req.usuario, { variante: b.variante, jogadores: Number(b.jogadores), aposta: Number(b.aposta) })
    res.json({ id: mesa.id })
  }),
)

rotasJogador.post(
  '/mesas/:id/entrar',
  rota((req, res) => {
    const mesa = entrarMesa(req.usuario, req.params.id, inteiroOuNulo(req.body?.assento))
    res.json({ id: mesa.id })
  }),
)

rotasJogador.post(
  '/mesas/:id/trocar',
  rota((req, res) => {
    trocarLugar(req.usuario, req.params.id, Number(req.body?.assento))
    res.json({ ok: true })
  }),
)

rotasJogador.post(
  '/mesas/:id/sair',
  rota((req, res) => {
    sairMesa(req.usuario, req.params.id)
    res.json({ ok: true })
  }),
)

rotasJogador.post(
  '/treino',
  rota((req, res) => {
    const mesa = criarTreino(req.usuario, { variante: req.body?.variante, jogadores: Number(req.body?.jogadores) })
    res.status(201).json({ id: mesa.id })
  }),
)

// ---------- salas de duplas ----------

rotasJogador.post(
  '/torneios',
  rota((req, res) => {
    const b = req.body || {}
    const t = criarTorneio(req.usuario, {
      nome: b.nome,
      variante: b.variante,
      formato: b.formato,
      times: Number(b.times),
      entrada: Number(b.entrada),
      percentuais: Array.isArray(b.percentuais) ? b.percentuais.map(Number) : null,
      privada: b.privada === true,
      vouJogar: b.vouJogar !== false,
    })
    res.status(201).json({ id: t.id })
  }),
)

rotasJogador.post(
  '/torneios/:id/entrar',
  rota((req, res) => {
    const t = entrarTorneio(req.usuario, req.params.id, {
      time: inteiroOuNulo(req.body?.time),
      vaga: inteiroOuNulo(req.body?.vaga),
    })
    res.json({ id: t.id })
  }),
)

rotasJogador.post(
  '/torneios/:id/trocar',
  rota((req, res) => {
    trocarVagaTorneio(req.usuario, req.params.id, Number(req.body?.time), Number(req.body?.vaga))
    res.json({ ok: true })
  }),
)

rotasJogador.post(
  '/torneios/:id/sair',
  rota((req, res) => {
    sairTorneio(req.usuario, req.params.id)
    res.json({ ok: true })
  }),
)

rotasJogador.post(
  '/torneios/:id/cancelar',
  rota((req, res) => {
    cancelarTorneio(req.usuario, req.params.id)
    res.json({ ok: true })
  }),
)

// ---------- carteira ----------

rotasJogador.get(
  '/carteira',
  rota((req, res) => {
    const u = buscarUsuario(req.usuario.id)
    const d = db()
    res.json({
      saldo: u.saldo,
      chavePix: u.chave_pix || '',
      extrato: extrato(u.id, 60),
      depositos: d
        .prepare('SELECT id, valor, codigo, status, observacao, criado_em AS criadoEm FROM depositos WHERE usuario_id = ? ORDER BY id DESC LIMIT 10')
        .all(u.id),
      saques: d
        .prepare('SELECT id, valor, chave_pix AS chavePix, status, observacao, criado_em AS criadoEm FROM saques WHERE usuario_id = ? ORDER BY id DESC LIMIT 10')
        .all(u.id),
      pix: (() => {
        const a = ajustes()
        return a.pixChave ? { chave: a.pixChave, tipo: a.pixTipo, nome: a.pixNome, banco: a.pixBanco } : null
      })(),
    })
  }),
)

rotasJogador.post(
  '/carteira/deposito',
  rota((req, res) => {
    res.status(201).json(criarDeposito(req.usuario.id, Number(req.body?.valor)))
  }),
)

rotasJogador.post(
  '/carteira/deposito/:id/cancelar',
  rota((req, res) => {
    cancelarDeposito(Number(req.params.id), req.usuario.id)
    res.json({ ok: true })
  }),
)

rotasJogador.post(
  '/carteira/saque',
  rota((req, res) => {
    res.status(201).json(solicitarSaque(req.usuario.id, Number(req.body?.valor), req.body?.chavePix))
  }),
)

// ---------- perfil ----------

rotasJogador.get(
  '/perfil',
  rota((req, res) => {
    const d = db()
    const id = req.usuario.id
    const totais = d
      .prepare(
        `SELECT COUNT(*) AS partidas, COALESCE(SUM(pj.venceu), 0) AS vitorias, COALESCE(SUM(pj.premio), 0) AS premios
         FROM partida_jogadores pj JOIN partidas p ON p.id = pj.partida_id WHERE pj.usuario_id = ? AND p.tipo != 'treino'`,
      )
      .get(id)
    const historico = d
      .prepare(
        `SELECT p.id, p.tipo, p.variante, p.jogadores, p.aposta, p.placar, p.torneio_id AS torneioId, pj.time, pj.venceu, pj.premio, p.criado_em AS criadoEm
         FROM partida_jogadores pj JOIN partidas p ON p.id = pj.partida_id
         WHERE pj.usuario_id = ? ORDER BY p.criado_em DESC LIMIT 20`,
      )
      .all(id)
      .map((h) => ({ ...h, placar: h.placar ? JSON.parse(h.placar) : null, venceu: Boolean(h.venceu) }))
    res.json({ usuario: usuarioPublico(buscarUsuario(id)), totais, historico })
  }),
)

rotasJogador.put(
  '/perfil',
  rota((req, res) => {
    const chave = String(req.body?.chavePix ?? '').trim()
    if (chave && (chave.length < 5 || chave.length > 140)) throw new ErroUsuario('Chave PIX inválida.')
    db().prepare('UPDATE usuarios SET chave_pix = ? WHERE id = ?').run(chave || null, req.usuario.id)
    res.json({ usuario: usuarioPublico(buscarUsuario(req.usuario.id)) })
  }),
)

rotasJogador.post(
  '/perfil/senha',
  rota(async (req, res) => {
    await trocarSenha(req.usuario.id, req.body?.atual, req.body?.nova)
    // Todas as sessões antigas foram encerradas; mantém só esta conectada.
    gravarCookieSessao(res, criarSessao(req.usuario.id))
    res.json({ ok: true })
  }),
)
