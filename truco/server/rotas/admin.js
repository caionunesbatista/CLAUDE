// Painel do dono: comissões, depósitos, saques, jogadores e configurações.
import { Router } from 'express'
import { rota, ErroUsuario } from '../erros.js'
import { exigirLogin, exigirAdmin } from '../contas.js'
import { db } from '../db.js'
import { ajustes, salvarAjustes } from '../ajustes.js'
import {
  aprovarDeposito,
  recusarDeposito,
  marcarSaquePago,
  recusarSaque,
  ajusteManual,
  extrato,
} from '../carteira.js'
import { mesas, torneios, avisos } from '../salas/central.js'
import { cancelarMesa } from '../salas/mesas.js'
import { cancelarTorneio } from '../salas/torneios.js'
import { totalOnline } from '../tempoReal.js'

export const rotasAdmin = Router()
rotasAdmin.use(exigirLogin, exigirAdmin)

const soma = (sql, ...p) => db().prepare(sql).get(...p).v || 0

rotasAdmin.get(
  '/resumo',
  rota((_req, res) => {
    const d = db()
    const porDia = d
      .prepare(
        `SELECT date(criado_em, '-3 hours') AS dia, SUM(valor) AS valor FROM comissoes
         WHERE criado_em >= datetime('now', '-30 days') GROUP BY dia ORDER BY dia`,
      )
      .all()
    res.json({
      comissoes: {
        hoje: soma("SELECT SUM(valor) AS v FROM comissoes WHERE date(criado_em, '-3 hours') = date('now', '-3 hours')"),
        semana: soma("SELECT SUM(valor) AS v FROM comissoes WHERE criado_em >= datetime('now', '-7 days')"),
        mes: soma("SELECT SUM(valor) AS v FROM comissoes WHERE criado_em >= datetime('now', '-30 days')"),
        total: soma('SELECT SUM(valor) AS v FROM comissoes'),
      },
      porDia,
      saldoJogadores: soma('SELECT SUM(saldo) AS v FROM usuarios'),
      retido: soma("SELECT SUM(valor) AS v FROM reservas WHERE status = 'retida'"),
      depositosPendentes: soma("SELECT COUNT(*) AS v FROM depositos WHERE status = 'pendente'"),
      saquesPendentes: soma("SELECT COUNT(*) AS v FROM saques WHERE status = 'pendente'"),
      valorSaquesPendentes: soma("SELECT SUM(valor) AS v FROM saques WHERE status = 'pendente'"),
      depositadoTotal: soma("SELECT SUM(valor) AS v FROM depositos WHERE status = 'aprovado'"),
      sacadoTotal: soma("SELECT SUM(valor) AS v FROM saques WHERE status = 'pago'"),
      usuarios: soma('SELECT COUNT(*) AS v FROM usuarios'),
      partidasHoje: soma("SELECT COUNT(*) AS v FROM partidas WHERE date(criado_em, '-3 hours') = date('now', '-3 hours') AND tipo != 'treino'"),
      online: totalOnline(),
      mesasAtivas: [...mesas.values()].filter((m) => m.ativa && m.tipo !== 'treino').length,
      torneiosAtivos: [...torneios.values()].filter((t) => t.ativo).length,
    })
  }),
)

const STATUS_DEPOSITO = ['pendente', 'aprovado', 'recusado', 'cancelado']
const STATUS_SAQUE = ['pendente', 'pago', 'recusado']

rotasAdmin.get(
  '/depositos',
  rota((req, res) => {
    const status = STATUS_DEPOSITO.includes(req.query.status) ? req.query.status : 'pendente'
    res.json(
      db()
        .prepare(
          `SELECT d.id, d.valor, d.codigo, d.status, d.observacao, d.criado_em AS criadoEm, d.decidido_em AS decididoEm,
                  u.id AS usuarioId, u.apelido, u.nome, u.cpf
           FROM depositos d JOIN usuarios u ON u.id = d.usuario_id
           WHERE d.status = ? ORDER BY d.id DESC LIMIT 200`,
        )
        .all(status),
    )
  }),
)

rotasAdmin.post(
  '/depositos/:id/aprovar',
  rota((req, res) => {
    aprovarDeposito(Number(req.params.id), req.usuario.id)
    res.json({ ok: true })
  }),
)

rotasAdmin.post(
  '/depositos/:id/recusar',
  rota((req, res) => {
    recusarDeposito(Number(req.params.id), req.usuario.id, req.body?.observacao || '')
    res.json({ ok: true })
  }),
)

rotasAdmin.get(
  '/saques',
  rota((req, res) => {
    const status = STATUS_SAQUE.includes(req.query.status) ? req.query.status : 'pendente'
    res.json(
      db()
        .prepare(
          `SELECT s.id, s.valor, s.chave_pix AS chavePix, s.status, s.observacao, s.criado_em AS criadoEm, s.decidido_em AS decididoEm,
                  u.id AS usuarioId, u.apelido, u.nome, u.cpf
           FROM saques s JOIN usuarios u ON u.id = s.usuario_id
           WHERE s.status = ? ORDER BY s.id DESC LIMIT 200`,
        )
        .all(status),
    )
  }),
)

rotasAdmin.post(
  '/saques/:id/pagar',
  rota((req, res) => {
    marcarSaquePago(Number(req.params.id), req.usuario.id)
    res.json({ ok: true })
  }),
)

rotasAdmin.post(
  '/saques/:id/recusar',
  rota((req, res) => {
    recusarSaque(Number(req.params.id), req.usuario.id, req.body?.observacao || '')
    res.json({ ok: true })
  }),
)

rotasAdmin.get(
  '/usuarios',
  rota((req, res) => {
    const busca = String(req.query.busca || '').trim()
    const like = `%${busca.replace(/[%_]/g, '')}%`
    const digitos = busca.replace(/\D/g, '')
    res.json(
      db()
        .prepare(
          `SELECT id, apelido, nome, email, cpf, saldo, admin, bloqueado, criado_em AS criadoEm FROM usuarios
           WHERE ? = '' OR apelido LIKE ? OR nome LIKE ? OR email LIKE ? OR (? != '' AND cpf LIKE ?)
           ORDER BY id DESC LIMIT 100`,
        )
        .all(busca, like, like, like, digitos, `%${digitos}%`),
    )
  }),
)

rotasAdmin.get(
  '/usuarios/:id',
  rota((req, res) => {
    const id = Number(req.params.id)
    const u = db()
      .prepare('SELECT id, apelido, nome, email, cpf, nascimento, chave_pix AS chavePix, saldo, admin, bloqueado, criado_em AS criadoEm FROM usuarios WHERE id = ?')
      .get(id)
    if (!u) throw new ErroUsuario('Usuário não encontrado.', 404)
    res.json({ usuario: u, extrato: extrato(id, 100) })
  }),
)

rotasAdmin.post(
  '/usuarios/:id/ajuste',
  rota((req, res) => {
    const saldo = ajusteManual(Number(req.params.id), Number(req.body?.valor), req.body?.motivo, req.usuario.id)
    res.json({ saldo })
  }),
)

rotasAdmin.post(
  '/usuarios/:id/bloquear',
  rota((req, res) => {
    const id = Number(req.params.id)
    if (id === req.usuario.id) throw new ErroUsuario('Você não pode bloquear a própria conta.')
    const bloquear = req.body?.bloqueado === true
    db().prepare('UPDATE usuarios SET bloqueado = ? WHERE id = ?').run(bloquear ? 1 : 0, id)
    if (bloquear) db().prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(id)
    res.json({ ok: true })
  }),
)

rotasAdmin.get(
  '/ajustes',
  rota((_req, res) => res.json(ajustes())),
)

rotasAdmin.put(
  '/ajustes',
  rota((req, res) => {
    const novo = salvarAjustes(req.body)
    avisos.lobby()
    res.json(novo)
  }),
)

rotasAdmin.get(
  '/ativos',
  rota((_req, res) => {
    res.json({
      mesas: [...mesas.values()].filter((m) => m.ativa && m.tipo !== 'treino').map((m) => ({ ...m.resumo(), torneio: m.torneio })),
      torneios: [...torneios.values()].filter((t) => t.ativo).map((t) => t.resumo()),
    })
  }),
)

rotasAdmin.post(
  '/mesas/:id/cancelar',
  rota((req, res) => {
    cancelarMesa(req.params.id, 'Mesa cancelada pela administração')
    res.json({ ok: true })
  }),
)

rotasAdmin.post(
  '/torneios/:id/cancelar',
  rota((req, res) => {
    cancelarTorneio(req.usuario, req.params.id, 'Sala cancelada pela administração')
    res.json({ ok: true })
  }),
)

rotasAdmin.get(
  '/comissoes',
  rota((_req, res) => {
    res.json(
      db()
        .prepare('SELECT id, valor, ref_tipo AS refTipo, ref_id AS refId, descricao, criado_em AS criadoEm FROM comissoes ORDER BY id DESC LIMIT 200')
        .all(),
    )
  }),
)
