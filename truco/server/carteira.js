// Carteira: saldo, extrato, valores retidos (reservas), prêmios, comissão, depósitos e saques.
// Regra de ouro: todo centavo que sai de um saldo entra em outro lugar, dentro da mesma transação.
import crypto from 'node:crypto'
import { EventEmitter } from 'node:events'
import { db, transacao } from './db.js'
import { ajustes } from './ajustes.js'
import { ErroUsuario } from './erros.js'
import { formatarReais } from '../shared/regras.js'

/** Emite 'saldo' (usuarioId) sempre que um saldo muda. */
export const eventosCarteira = new EventEmitter()

export function saldoDe(usuarioId) {
  const u = db().prepare('SELECT saldo FROM usuarios WHERE id = ?').get(usuarioId)
  if (!u) throw new ErroUsuario('Usuário não encontrado.', 404)
  return u.saldo
}

function alterarSaldo(usuarioId, delta, tipo, { refTipo = null, refId = null, descricao = null } = {}) {
  if (!Number.isInteger(delta)) throw new Error('Valor de movimento precisa ser inteiro (centavos).')
  const atual = saldoDe(usuarioId)
  const novo = atual + delta
  if (novo < 0) throw new ErroUsuario(`Saldo insuficiente. Seu saldo é ${formatarReais(atual)}.`)
  db().prepare('UPDATE usuarios SET saldo = ? WHERE id = ?').run(novo, usuarioId)
  db()
    .prepare(
      'INSERT INTO movimentos (usuario_id, tipo, valor, saldo_apos, ref_tipo, ref_id, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(usuarioId, tipo, delta, novo, refTipo, refId, descricao)
  // Avisa depois que a transação terminou; quem ouvir lê o saldo já gravado (nunca um valor desfeito).
  process.nextTick(() => eventosCarteira.emit('saldo', usuarioId))
  return novo
}

// ---------- reservas (dinheiro retido enquanto a partida acontece) ----------

/** Retira `valor` do saldo e deixa retido para a mesa/sala. Retorna o id da reserva. */
export function reservar(usuarioId, valor, refTipo, refId, descricao) {
  if (!Number.isInteger(valor) || valor <= 0) throw new Error('Reserva precisa de valor positivo.')
  return transacao(() => {
    alterarSaldo(usuarioId, -valor, 'entrada', { refTipo, refId, descricao })
    const r = db()
      .prepare('INSERT INTO reservas (usuario_id, valor, ref_tipo, ref_id) VALUES (?, ?, ?, ?)')
      .run(usuarioId, valor, refTipo, refId)
    return Number(r.lastInsertRowid)
  })
}

/** Devolve uma reserva ao jogador (saiu antes de começar, sala cancelada etc.). */
export function devolverReserva(reservaId, descricao = 'Valor devolvido') {
  return transacao(() => {
    const r = db().prepare('SELECT * FROM reservas WHERE id = ?').get(reservaId)
    if (!r || r.status !== 'retida') return false
    db().prepare("UPDATE reservas SET status = 'devolvida' WHERE id = ?").run(reservaId)
    alterarSaldo(r.usuario_id, r.valor, 'devolucao', { refTipo: r.ref_tipo, refId: r.ref_id, descricao })
    return true
  })
}

/** Devolve todas as reservas ainda retidas de uma mesa/sala. */
export function devolverTodas(refTipo, refId, descricao = 'Valor devolvido') {
  return transacao(() => {
    const lista = db()
      .prepare("SELECT id FROM reservas WHERE ref_tipo = ? AND ref_id = ? AND status = 'retida'")
      .all(refTipo, refId)
    for (const r of lista) devolverReserva(r.id, descricao)
    return lista.length
  })
}

/**
 * Encerra uma mesa/sala: paga os prêmios e registra a comissão da casa.
 * Confere que (prêmios + comissão) === total retido. Se não bater, nada é gravado.
 * @param {Array<{usuarioId:number, valor:number, descricao?:string}>} pagamentos
 */
export function liquidar(refTipo, refId, pagamentos, comissao, descricaoComissao, extra = null) {
  return transacao(() => {
    const reservas = db()
      .prepare("SELECT * FROM reservas WHERE ref_tipo = ? AND ref_id = ? AND status = 'retida'")
      .all(refTipo, refId)
    const retido = reservas.reduce((a, r) => a + r.valor, 0)
    const pago = pagamentos.reduce((a, p) => a + p.valor, 0)
    if (pago + comissao !== retido || comissao < 0 || pagamentos.some((p) => !Number.isInteger(p.valor) || p.valor < 0)) {
      throw new Error(`Liquidação não fecha: retido ${retido}, prêmios ${pago}, comissão ${comissao} (${refTipo} ${refId})`)
    }
    db()
      .prepare("UPDATE reservas SET status = 'liquidada' WHERE ref_tipo = ? AND ref_id = ? AND status = 'retida'")
      .run(refTipo, refId)
    for (const p of pagamentos) {
      if (p.valor > 0) alterarSaldo(p.usuarioId, p.valor, 'premio', { refTipo, refId, descricao: p.descricao || 'Prêmio' })
    }
    if (comissao > 0) {
      db()
        .prepare('INSERT INTO comissoes (valor, ref_tipo, ref_id, descricao) VALUES (?, ?, ?, ?)')
        .run(comissao, refTipo, refId, descricaoComissao)
    }
    if (extra) extra()
    return { retido, pago, comissao }
  })
}

/** Na inicialização: tudo que ficou retido (servidor caiu no meio de uma partida) volta para os jogadores. */
export function devolverReservasAbertas(descricao = 'Partida interrompida — valor devolvido') {
  return transacao(() => {
    const lista = db().prepare("SELECT id FROM reservas WHERE status = 'retida'").all()
    for (const r of lista) devolverReserva(r.id, descricao)
    return lista.length
  })
}

export function extrato(usuarioId, limite = 50) {
  return db()
    .prepare(
      'SELECT id, tipo, valor, saldo_apos AS saldoApos, descricao, criado_em AS criadoEm FROM movimentos WHERE usuario_id = ? ORDER BY id DESC LIMIT ?',
    )
    .all(usuarioId, limite)
}

// ---------- depósitos via PIX (confirmados manualmente pelo administrador) ----------

function codigoDeposito() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += alfabeto[crypto.randomInt(alfabeto.length)]
  return s
}

export function criarDeposito(usuarioId, valor) {
  const a = ajustes()
  if (!a.pixChave) throw new ErroUsuario('Os depósitos ainda não foram configurados. Fale com o suporte.')
  if (!Number.isInteger(valor) || valor < a.depositoMin || valor > a.depositoMax) {
    throw new ErroUsuario(`O depósito deve ser entre ${formatarReais(a.depositoMin)} e ${formatarReais(a.depositoMax)}.`)
  }
  const pendentes = db().prepare("SELECT COUNT(*) AS n FROM depositos WHERE usuario_id = ? AND status = 'pendente'").get(usuarioId).n
  if (pendentes >= 3) throw new ErroUsuario('Você já tem 3 depósitos aguardando confirmação. Aguarde a confirmação deles.')
  let codigo
  do codigo = codigoDeposito()
  while (db().prepare('SELECT 1 FROM depositos WHERE codigo = ?').get(codigo))
  const r = db().prepare('INSERT INTO depositos (usuario_id, valor, codigo) VALUES (?, ?, ?)').run(usuarioId, valor, codigo)
  return {
    id: Number(r.lastInsertRowid),
    valor,
    codigo,
    pix: { chave: a.pixChave, tipo: a.pixTipo, nome: a.pixNome, banco: a.pixBanco },
  }
}

export function aprovarDeposito(depositoId, adminId) {
  return transacao(() => {
    const d = db().prepare('SELECT * FROM depositos WHERE id = ?').get(depositoId)
    if (!d) throw new ErroUsuario('Depósito não encontrado.', 404)
    if (d.status !== 'pendente') throw new ErroUsuario('Este depósito já foi decidido.')
    db()
      .prepare("UPDATE depositos SET status = 'aprovado', admin_id = ?, decidido_em = datetime('now') WHERE id = ?")
      .run(adminId, depositoId)
    alterarSaldo(d.usuario_id, d.valor, 'deposito', {
      refTipo: 'deposito',
      refId: String(d.id),
      descricao: `Depósito PIX ${d.codigo}`,
    })
    return d
  })
}

export function recusarDeposito(depositoId, adminId, observacao = '') {
  const d = db().prepare('SELECT * FROM depositos WHERE id = ?').get(depositoId)
  if (!d) throw new ErroUsuario('Depósito não encontrado.', 404)
  if (d.status !== 'pendente') throw new ErroUsuario('Este depósito já foi decidido.')
  db()
    .prepare("UPDATE depositos SET status = 'recusado', admin_id = ?, observacao = ?, decidido_em = datetime('now') WHERE id = ?")
    .run(adminId, String(observacao).slice(0, 200), depositoId)
  return d
}

/** O próprio jogador cancela um depósito que ainda não pagou. */
export function cancelarDeposito(depositoId, usuarioId) {
  const d = db().prepare('SELECT * FROM depositos WHERE id = ? AND usuario_id = ?').get(depositoId, usuarioId)
  if (!d) throw new ErroUsuario('Depósito não encontrado.', 404)
  if (d.status !== 'pendente') throw new ErroUsuario('Este depósito já foi decidido.')
  db().prepare("UPDATE depositos SET status = 'cancelado', decidido_em = datetime('now') WHERE id = ?").run(depositoId)
}

// ---------- saques ----------

export function solicitarSaque(usuarioId, valor, chavePix) {
  const a = ajustes()
  const chave = String(chavePix || '').trim()
  if (chave.length < 5 || chave.length > 140) throw new ErroUsuario('Informe uma chave PIX válida.')
  if (!Number.isInteger(valor) || valor < a.saqueMin) throw new ErroUsuario(`O saque mínimo é ${formatarReais(a.saqueMin)}.`)
  return transacao(() => {
    const r = db().prepare('INSERT INTO saques (usuario_id, valor, chave_pix) VALUES (?, ?, ?)').run(usuarioId, valor, chave)
    const id = Number(r.lastInsertRowid)
    alterarSaldo(usuarioId, -valor, 'saque', { refTipo: 'saque', refId: String(id), descricao: 'Saque via PIX (em análise)' })
    db().prepare('UPDATE usuarios SET chave_pix = ? WHERE id = ?').run(chave, usuarioId)
    return { id, valor, chavePix: chave }
  })
}

export function marcarSaquePago(saqueId, adminId) {
  const s = db().prepare('SELECT * FROM saques WHERE id = ?').get(saqueId)
  if (!s) throw new ErroUsuario('Saque não encontrado.', 404)
  if (s.status !== 'pendente') throw new ErroUsuario('Este saque já foi decidido.')
  db().prepare("UPDATE saques SET status = 'pago', admin_id = ?, decidido_em = datetime('now') WHERE id = ?").run(adminId, saqueId)
  return s
}

export function recusarSaque(saqueId, adminId, observacao = '') {
  return transacao(() => {
    const s = db().prepare('SELECT * FROM saques WHERE id = ?').get(saqueId)
    if (!s) throw new ErroUsuario('Saque não encontrado.', 404)
    if (s.status !== 'pendente') throw new ErroUsuario('Este saque já foi decidido.')
    db()
      .prepare("UPDATE saques SET status = 'recusado', admin_id = ?, observacao = ?, decidido_em = datetime('now') WHERE id = ?")
      .run(adminId, String(observacao).slice(0, 200), saqueId)
    alterarSaldo(s.usuario_id, s.valor, 'estorno_saque', {
      refTipo: 'saque',
      refId: String(s.id),
      descricao: observacao ? `Saque recusado: ${String(observacao).slice(0, 80)}` : 'Saque recusado — valor devolvido',
    })
    return s
  })
}

// ---------- ajuste manual pelo administrador ----------

export function ajusteManual(usuarioId, valor, motivo, adminId) {
  if (!Number.isInteger(valor) || valor === 0) throw new ErroUsuario('Informe um valor diferente de zero.')
  const texto = String(motivo || '').trim()
  if (texto.length < 3) throw new ErroUsuario('Informe o motivo do ajuste.')
  return transacao(() =>
    alterarSaldo(usuarioId, valor, 'ajuste', {
      refTipo: 'admin',
      refId: String(adminId),
      descricao: `Ajuste: ${texto.slice(0, 120)}`,
    }),
  )
}
