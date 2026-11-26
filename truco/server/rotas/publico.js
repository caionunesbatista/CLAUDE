import { Router } from 'express'
import { rota, ErroUsuario } from '../erros.js'
import { ajustesPublicos } from '../ajustes.js'
import { db } from '../db.js'
import { mesas, torneios } from '../salas/central.js'
import { resumoLobby } from '../tempoReal.js'
import {
  cadastrar,
  autenticar,
  criarSessao,
  encerrarSessao,
  gravarCookieSessao,
  apagarCookieSessao,
  tokenDaRequisicao,
  usuarioPublico,
} from '../contas.js'
import { mesaAtivaDo } from '../salas/mesas.js'
import { torneioAtivoDo } from '../salas/torneios.js'

export const rotasPublicas = Router()

rotasPublicas.get(
  '/config',
  rota((_req, res) => res.json(ajustesPublicos())),
)

rotasPublicas.get(
  '/lobby',
  rota((_req, res) => res.json(resumoLobby())),
)

rotasPublicas.get(
  '/ranking',
  rota((_req, res) => {
    const lista = db()
      .prepare(
        `SELECT u.apelido, u.avatar, SUM(pj.venceu) AS vitorias, COUNT(*) AS partidas, SUM(pj.premio) AS ganhos
         FROM partida_jogadores pj
         JOIN partidas p ON p.id = pj.partida_id
         JOIN usuarios u ON u.id = pj.usuario_id
         WHERE p.tipo IN ('dinheiro', 'torneio') AND p.criado_em >= datetime('now', '-30 days')
         GROUP BY pj.usuario_id
         HAVING vitorias > 0
         ORDER BY vitorias DESC, ganhos DESC
         LIMIT 20`,
      )
      .all()
    res.json(lista)
  }),
)

rotasPublicas.get(
  '/mesas/:id',
  rota((req, res) => {
    const mesa = mesas.get(req.params.id)
    if (!mesa) throw new ErroUsuario('Mesa não encontrada ou já encerrada.', 404)
    res.json(mesa.visao(req.usuario?.id ?? null))
  }),
)

rotasPublicas.get(
  '/torneios/:id',
  rota((req, res) => {
    const t = torneios.get(req.params.id)
    if (!t) throw new ErroUsuario('Sala não encontrada ou já encerrada.', 404)
    res.json(t.visao(req.usuario?.id ?? null))
  }),
)

// ---------- conta ----------

rotasPublicas.post(
  '/auth/cadastro',
  rota(async (req, res) => {
    const u = await cadastrar(req.body)
    gravarCookieSessao(res, criarSessao(u.id))
    res.status(201).json({ usuario: usuarioPublico(u) })
  }),
)

rotasPublicas.post(
  '/auth/entrar',
  rota(async (req, res) => {
    const { login, senha } = req.body || {}
    if (!login || !senha) throw new ErroUsuario('Informe apelido (ou e-mail) e senha.')
    const u = await autenticar(String(login), String(senha), req.ip)
    gravarCookieSessao(res, criarSessao(u.id))
    res.json({ usuario: usuarioPublico(u) })
  }),
)

rotasPublicas.post(
  '/auth/sair',
  rota((req, res) => {
    encerrarSessao(tokenDaRequisicao(req))
    apagarCookieSessao(res)
    res.json({ ok: true })
  }),
)

rotasPublicas.get(
  '/auth/eu',
  rota((req, res) => {
    if (!req.usuario) return res.json({ usuario: null })
    res.json({
      usuario: usuarioPublico(req.usuario),
      mesaAtiva: mesaAtivaDo(req.usuario.id)?.id || null,
      torneioAtivo: torneioAtivoDo(req.usuario.id)?.id || null,
    })
  }),
)
