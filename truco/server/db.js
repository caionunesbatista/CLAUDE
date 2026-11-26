// Banco de dados SQLite embutido no Node (node:sqlite) — sem dependências nativas.
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'

let banco = null

const ESQUEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apelido TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  cpf TEXT NOT NULL UNIQUE,
  nascimento TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  chave_pix TEXT,
  saldo INTEGER NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  admin INTEGER NOT NULL DEFAULT 0,
  bloqueado INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  expira_em INTEGER NOT NULL
);

-- Extrato: toda alteração de saldo gera uma linha aqui.
CREATE TABLE IF NOT EXISTS movimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL,
  valor INTEGER NOT NULL,
  saldo_apos INTEGER NOT NULL,
  ref_tipo TEXT,
  ref_id TEXT,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mov_usuario ON movimentos(usuario_id, id);

-- Valores retidos enquanto a mesa/sala não termina.
CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  valor INTEGER NOT NULL CHECK (valor >= 0),
  ref_tipo TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'retida',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reservas_ref ON reservas(ref_tipo, ref_id, status);

-- Receita da casa.
CREATE TABLE IF NOT EXISTS comissoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  valor INTEGER NOT NULL,
  ref_tipo TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS depositos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  valor INTEGER NOT NULL CHECK (valor > 0),
  codigo TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  admin_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  decidido_em TEXT
);

CREATE TABLE IF NOT EXISTS saques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  valor INTEGER NOT NULL CHECK (valor > 0),
  chave_pix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  admin_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  decidido_em TEXT
);

CREATE TABLE IF NOT EXISTS partidas (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  variante TEXT NOT NULL,
  jogadores INTEGER NOT NULL,
  aposta INTEGER NOT NULL,
  pote INTEGER NOT NULL,
  comissao INTEGER NOT NULL,
  vencedor_time INTEGER,
  placar TEXT,
  torneio_id TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partida_jogadores (
  partida_id TEXT NOT NULL REFERENCES partidas(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  time INTEGER NOT NULL,
  venceu INTEGER NOT NULL,
  premio INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (partida_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_pj_usuario ON partida_jogadores(usuario_id);

CREATE TABLE IF NOT EXISTS torneios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  criador_id INTEGER NOT NULL REFERENCES usuarios(id),
  config TEXT NOT NULL,
  status TEXT NOT NULL,
  resultado TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  encerrado_em TEXT
);

CREATE TABLE IF NOT EXISTS ajustes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`

export function abrirBanco() {
  if (banco) return banco
  let arquivo = config.arquivoBanco
  if (!arquivo) {
    fs.mkdirSync(config.pastaDados, { recursive: true })
    arquivo = path.join(config.pastaDados, 'truco.db')
  }
  banco = new DatabaseSync(arquivo)
  if (arquivo !== ':memory:') {
    banco.exec('PRAGMA journal_mode = WAL;')
    banco.exec('PRAGMA synchronous = FULL;')
  }
  banco.exec(ESQUEMA)
  return banco
}

export function db() {
  return banco || abrirBanco()
}

/**
 * Executa `fn` dentro de uma transação. Se algo falhar, nada é gravado.
 * Transações aninhadas reaproveitam a transação externa.
 */
let profundidade = 0
export function transacao(fn) {
  const d = db()
  if (profundidade > 0) return fn()
  d.exec('BEGIN IMMEDIATE')
  profundidade++
  try {
    const r = fn()
    profundidade--
    d.exec('COMMIT')
    return r
  } catch (erro) {
    profundidade--
    d.exec('ROLLBACK')
    throw erro
  }
}

export function fecharBanco() {
  if (banco) {
    banco.close()
    banco = null
  }
}
