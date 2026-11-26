// Cadastro, login e sessões.
import crypto from 'node:crypto'
import { db } from './db.js'
import { config } from './config.js'
import { ErroUsuario } from './erros.js'

const NOME_COOKIE = 'sessao'

// ---------- senhas ----------

// scrypt assíncrono: não trava as mesas em andamento enquanto alguém faz login.
const OPCOES_SCRYPT = { N: 16384, r: 8, p: 1 }

function scrypt(senha, sal, tamanho) {
  return new Promise((ok, falha) => {
    crypto.scrypt(senha, sal, tamanho, OPCOES_SCRYPT, (erro, chave) => (erro ? falha(erro) : ok(chave)))
  })
}

export async function gerarHashSenha(senha) {
  const sal = crypto.randomBytes(16)
  const hash = await scrypt(senha, sal, 64)
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`
}

export async function conferirSenha(senha, armazenado) {
  const [alg, salB64, hashB64] = String(armazenado).split('$')
  if (alg !== 'scrypt' || !salB64 || !hashB64) return false
  const esperado = Buffer.from(hashB64, 'base64')
  const calculado = await scrypt(senha, Buffer.from(salB64, 'base64'), esperado.length)
  return crypto.timingSafeEqual(esperado, calculado)
}

// ---------- validações ----------

export function cpfValido(cpf) {
  const d = String(cpf).replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (base) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10])
}

export function idade(nascimentoISO, hoje = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascimentoISO || '')
  if (!m) return -1
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return -1
  let anos = hoje.getUTCFullYear() - ano
  const antesDoAniversario = hoje.getUTCMonth() + 1 < mes || (hoje.getUTCMonth() + 1 === mes && hoje.getUTCDate() < dia)
  if (antesDoAniversario) anos--
  return anos
}

const RE_APELIDO = /^[A-Za-z0-9_]{3,16}$/
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function cadastrar(dados) {
  const nome = String(dados?.nome || '').trim().replace(/\s+/g, ' ')
  const apelido = String(dados?.apelido || '').trim()
  const email = String(dados?.email || '').trim().toLowerCase()
  const cpf = String(dados?.cpf || '').replace(/\D/g, '')
  const nascimento = String(dados?.nascimento || '')
  const senha = String(dados?.senha || '')

  if (nome.length < 5 || nome.length > 80 || !nome.includes(' ')) throw new ErroUsuario('Informe seu nome completo.')
  if (!RE_APELIDO.test(apelido)) {
    throw new ErroUsuario('O apelido deve ter de 3 a 16 caracteres: letras, números ou _ (sem espaços).')
  }
  if (!RE_EMAIL.test(email) || email.length > 120) throw new ErroUsuario('E-mail inválido.')
  if (!cpfValido(cpf)) throw new ErroUsuario('CPF inválido.')
  const anos = idade(nascimento)
  if (anos < 0 || anos > 120) throw new ErroUsuario('Data de nascimento inválida.')
  if (anos < 18) throw new ErroUsuario('É preciso ter 18 anos ou mais para jogar.')
  if (senha.length < 8 || senha.length > 128) throw new ErroUsuario('A senha precisa ter pelo menos 8 caracteres.')
  if (dados?.aceite !== true) throw new ErroUsuario('É preciso aceitar os termos de uso e confirmar que tem 18 anos ou mais.')

  const hash = await gerarHashSenha(senha)
  // Daqui em diante tudo é síncrono: as conferências e a gravação acontecem sem intervalo.
  const d = db()
  if (d.prepare('SELECT 1 FROM usuarios WHERE apelido = ?').get(apelido)) throw new ErroUsuario('Esse apelido já está em uso.')
  if (d.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email)) throw new ErroUsuario('Já existe uma conta com esse e-mail.')
  if (d.prepare('SELECT 1 FROM usuarios WHERE cpf = ?').get(cpf)) throw new ErroUsuario('Já existe uma conta com esse CPF.')

  const r = d
    .prepare('INSERT INTO usuarios (apelido, nome, email, cpf, nascimento, senha_hash) VALUES (?, ?, ?, ?, ?, ?)')
    .run(apelido, nome, email, cpf, nascimento, hash)
  return buscarUsuario(Number(r.lastInsertRowid))
}

export function buscarUsuario(id) {
  return db().prepare('SELECT * FROM usuarios WHERE id = ?').get(id) || null
}

/** Dados do usuário que podem ir para o navegador dele. */
export function usuarioPublico(u) {
  if (!u) return null
  return {
    id: u.id,
    apelido: u.apelido,
    nome: u.nome,
    email: u.email,
    saldo: u.saldo,
    chavePix: u.chave_pix || '',
    avatar: u.avatar || null,
    admin: Boolean(u.admin),
    criadoEm: u.criado_em,
  }
}

// ---------- limite de tentativas de login ----------

const tentativas = new Map() // chave → { n, desde }
const JANELA_MS = 15 * 60 * 1000
const MAX_TENTATIVAS = 8

function registrarFalha(chave) {
  const agora = Date.now()
  const t = tentativas.get(chave)
  if (!t || agora - t.desde > JANELA_MS) tentativas.set(chave, { n: 1, desde: agora })
  else t.n++
}

function bloqueadoPorTentativas(chave) {
  const t = tentativas.get(chave)
  if (!t) return false
  if (Date.now() - t.desde > JANELA_MS) {
    tentativas.delete(chave)
    return false
  }
  return t.n >= MAX_TENTATIVAS
}

export async function autenticar(login, senha, ip = '') {
  const chave = `${ip}|${String(login).toLowerCase()}`
  if (bloqueadoPorTentativas(chave) || bloqueadoPorTentativas(ip)) {
    throw new ErroUsuario('Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429)
  }
  const u = db().prepare('SELECT * FROM usuarios WHERE apelido = ? OR email = ?').get(String(login).trim(), String(login).trim().toLowerCase())
  if (!u || !(await conferirSenha(String(senha), u.senha_hash))) {
    registrarFalha(chave)
    registrarFalha(ip)
    throw new ErroUsuario('Apelido/e-mail ou senha incorretos.', 401)
  }
  if (u.bloqueado) throw new ErroUsuario('Esta conta está bloqueada. Fale com o suporte.', 403)
  tentativas.delete(chave)
  return u
}

export async function trocarSenha(usuarioId, atual, nova) {
  const u = buscarUsuario(usuarioId)
  if (!u || !(await conferirSenha(String(atual), u.senha_hash))) throw new ErroUsuario('A senha atual está incorreta.')
  if (String(nova).length < 8 || String(nova).length > 128) throw new ErroUsuario('A nova senha precisa ter pelo menos 8 caracteres.')
  const hash = await gerarHashSenha(String(nova))
  db().prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hash, usuarioId)
  db().prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(usuarioId)
}

// ---------- sessões ----------

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex')

export function criarSessao(usuarioId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expira = Date.now() + config.diasSessao * 86400_000
  db().prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)').run(hashToken(token), usuarioId, expira)
  return token
}

export function usuarioDoToken(token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null
  const s = db().prepare('SELECT usuario_id, expira_em FROM sessoes WHERE token_hash = ?').get(hashToken(token))
  if (!s) return null
  if (s.expira_em < Date.now()) {
    db().prepare('DELETE FROM sessoes WHERE token_hash = ?').run(hashToken(token))
    return null
  }
  const u = buscarUsuario(s.usuario_id)
  if (!u || u.bloqueado) return null
  return u
}

export function encerrarSessao(token) {
  if (token) db().prepare('DELETE FROM sessoes WHERE token_hash = ?').run(hashToken(token))
}

export function lerCookies(cabecalho = '') {
  const saida = {}
  for (const parte of String(cabecalho).split(';')) {
    const i = parte.indexOf('=')
    if (i < 0) continue
    const k = parte.slice(0, i).trim()
    const v = parte.slice(i + 1).trim()
    try {
      saida[k] = decodeURIComponent(v)
    } catch {
      saida[k] = v
    }
  }
  return saida
}

export function tokenDaRequisicao(req) {
  return lerCookies(req.headers.cookie)[NOME_COOKIE] || null
}

/** Cookie Secure quando configurado ou, no automático, quando o acesso chegou por HTTPS. */
export function acessoSeguro(req) {
  return config.cookieSeguro ?? Boolean(req.secure)
}

export function gravarCookieSessao(res, token) {
  const partes = [
    `${NOME_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${config.diasSessao * 86400}`,
  ]
  if (acessoSeguro(res.req)) partes.push('Secure')
  res.setHeader('Set-Cookie', partes.join('; '))
}

export function apagarCookieSessao(res) {
  const partes = [`${NOME_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (acessoSeguro(res.req)) partes.push('Secure')
  res.setHeader('Set-Cookie', partes.join('; '))
}

// ---------- middlewares ----------

export function carregarUsuario(req, _res, next) {
  req.usuario = usuarioDoToken(tokenDaRequisicao(req))
  next()
}

export function exigirLogin(req, _res, next) {
  if (!req.usuario) return next(new ErroUsuario('Entre na sua conta para continuar.', 401))
  next()
}

export function exigirAdmin(req, _res, next) {
  if (!req.usuario?.admin) return next(new ErroUsuario('Acesso restrito.', 403))
  next()
}

export function limparSessoesVencidas() {
  db().prepare('DELETE FROM sessoes WHERE expira_em < ?').run(Date.now())
}
