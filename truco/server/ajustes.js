// Configurações que o dono do site altera pelo painel administrativo (sem precisar reiniciar).
import { db } from './db.js'
import { ErroUsuario } from './erros.js'

export const AJUSTES_PADRAO = {
  taxaCasa: 10, // % de comissão sobre o pote de cada mesa/sala
  apostaMin: 100, // centavos (R$ 1,00)
  apostaMax: 50000, // centavos (R$ 500,00)
  valoresRapidos: [100, 200, 500, 1000, 2000, 5000, 10000],
  depositoMin: 1000,
  depositoMax: 500000,
  saqueMin: 2000,
  pixChave: '',
  pixTipo: 'Aleatória',
  pixNome: '',
  pixBanco: '',
  tempoJogada: 30, // segundos para cada jogada
  maxTimes: 64, // máximo de duplas/jogadores numa sala
  mesasValendoAbertas: true, // desligue para pausar novas mesas valendo dinheiro
  whatsappSuporte: '',
  emailSuporte: '',
}

let cache = null

export function ajustes() {
  if (cache) return cache
  const linhas = db().prepare('SELECT chave, valor FROM ajustes').all()
  const salvo = {}
  for (const l of linhas) {
    if (l.chave in AJUSTES_PADRAO) {
      try {
        salvo[l.chave] = JSON.parse(l.valor)
      } catch {
        // valor corrompido: ignora e usa o padrão
      }
    }
  }
  cache = { ...AJUSTES_PADRAO, ...salvo }
  return cache
}

const inteiro = (v, min, max, nome) => {
  if (!Number.isInteger(v) || v < min || v > max) throw new ErroUsuario(`${nome}: valor inválido.`)
  return v
}
const texto = (v, max, nome) => {
  if (typeof v !== 'string' || v.length > max) throw new ErroUsuario(`${nome}: texto inválido.`)
  return v.trim()
}

const VALIDADORES = {
  taxaCasa: (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 50) throw new ErroUsuario('Comissão deve estar entre 0% e 50%.')
    return Math.round(v * 100) / 100
  },
  apostaMin: (v) => inteiro(v, 0, 10_000_000, 'Aposta mínima'),
  apostaMax: (v) => inteiro(v, 100, 100_000_000, 'Aposta máxima'),
  valoresRapidos: (v) => {
    if (!Array.isArray(v) || v.length < 1 || v.length > 12) throw new ErroUsuario('Informe de 1 a 12 valores rápidos.')
    const lista = [...new Set(v.map((x) => inteiro(x, 1, 100_000_000, 'Valor rápido')))].sort((a, b) => a - b)
    return lista
  },
  depositoMin: (v) => inteiro(v, 100, 100_000_000, 'Depósito mínimo'),
  depositoMax: (v) => inteiro(v, 100, 1_000_000_000, 'Depósito máximo'),
  saqueMin: (v) => inteiro(v, 100, 100_000_000, 'Saque mínimo'),
  pixChave: (v) => texto(v, 140, 'Chave PIX'),
  pixTipo: (v) => texto(v, 40, 'Tipo da chave'),
  pixNome: (v) => texto(v, 120, 'Nome do recebedor'),
  pixBanco: (v) => texto(v, 80, 'Banco'),
  tempoJogada: (v) => inteiro(v, 10, 120, 'Tempo de jogada'),
  maxTimes: (v) => inteiro(v, 2, 128, 'Máximo de participantes'),
  mesasValendoAbertas: (v) => {
    if (typeof v !== 'boolean') throw new ErroUsuario('Valor inválido.')
    return v
  },
  whatsappSuporte: (v) => texto(v, 20, 'WhatsApp').replace(/\D/g, ''),
  emailSuporte: (v) => texto(v, 120, 'E-mail'),
}

export function salvarAjustes(parcial) {
  if (!parcial || typeof parcial !== 'object') throw new ErroUsuario('Nada para salvar.')
  const limpos = {}
  for (const [chave, valor] of Object.entries(parcial)) {
    if (!(chave in VALIDADORES)) continue
    limpos[chave] = VALIDADORES[chave](valor)
  }
  const final = { ...ajustes(), ...limpos }
  if (final.apostaMin > final.apostaMax) throw new ErroUsuario('A aposta mínima não pode ser maior que a máxima.')
  if (final.depositoMin > final.depositoMax) throw new ErroUsuario('O depósito mínimo não pode ser maior que o máximo.')
  const stmt = db().prepare(
    'INSERT INTO ajustes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
  )
  for (const [chave, valor] of Object.entries(limpos)) stmt.run(chave, JSON.stringify(valor))
  cache = null
  return ajustes()
}

/** Configurações que qualquer visitante pode ver. */
export function ajustesPublicos() {
  const a = ajustes()
  return {
    taxaCasa: a.taxaCasa,
    apostaMin: a.apostaMin,
    apostaMax: a.apostaMax,
    valoresRapidos: a.valoresRapidos,
    depositoMin: a.depositoMin,
    depositoMax: a.depositoMax,
    saqueMin: a.saqueMin,
    tempoJogada: a.tempoJogada,
    maxTimes: a.maxTimes,
    mesasValendoAbertas: a.mesasValendoAbertas,
    depositoConfigurado: Boolean(a.pixChave),
    whatsappSuporte: a.whatsappSuporte,
    emailSuporte: a.emailSuporte,
  }
}

export function limparCacheAjustes() {
  cache = null
}
