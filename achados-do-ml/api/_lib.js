/* ==========================================================================
   Achados do ML — funções compartilhadas da API (roda na Vercel)
   - Armazenamento: Vercel Blob privado (conta do proprietário, dados do site
     e imagens enviadas pelo painel).
   - Senha: scrypt com sal aleatório. Sessão: cookie HttpOnly assinado (HMAC).
   Variáveis de ambiente: BLOB_READ_WRITE_TOKEN, SESSAO_SEGREDO, CODIGO_ATIVACAO.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { get, put } from '@vercel/blob';

const scrypt = promisify(scryptCb);

export const CAMINHO_CONTA = 'privado/conta.json';
export const CAMINHO_DADOS = 'privado/dados.json';
export const COOKIE = 'achados_sessao';
const DURACAO_SESSAO = 7 * 24 * 60 * 60; // 7 dias, em segundos

/* ------------------------------------------------------------ respostas */
export function json(corpo, status = 200, extras = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extras
    }
  });
}
export const erro = (mensagem, status = 400, extras) => json({ erro: mensagem }, status, extras);

/* ------------------------------------------------------------- blob */
async function lerTexto(caminho) {
  const r = await get(caminho, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return { texto: await new Response(r.stream).text(), etag: r.blob.etag };
}

export async function lerJson(caminho) {
  const r = await lerTexto(caminho);
  return r ? { valor: JSON.parse(r.texto), etag: r.etag } : null;
}

export async function gravarJson(caminho, valor, opcoes = {}) {
  return put(caminho, JSON.stringify(valor), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60,
    ...opcoes
  });
}

/* --------------------------------------------- dados padrão (js/dados.js) */
let padraoCache = null;
export async function dadosPadrao() {
  if (padraoCache) return padraoCache;
  const texto = await readFile(new URL('../js/dados.js', import.meta.url), 'utf8');
  const ini = texto.indexOf('{', texto.indexOf('ACHADOS_DADOS'));
  const fim = texto.lastIndexOf('}');
  padraoCache = JSON.parse(texto.slice(ini, fim + 1));
  return padraoCache;
}

/** Dados publicados (Blob) ou, se ainda não houver, os do js/dados.js */
export async function dadosAtuais() {
  const salvo = await lerJson(CAMINHO_DADOS);
  if (salvo) return { dados: salvo.valor, etag: salvo.etag, origem: 'painel' };
  return { dados: await dadosPadrao(), etag: null, origem: 'padrao' };
}

/* --------------------------------------------------------- conta */
// A conta é lida do Blob no máximo a cada 5 minutos por instância,
// para que tentativas repetidas de login não gastem operações do Blob.
let contaCache = { valor: undefined, ate: 0 };
export async function lerConta(forcar = false) {
  const agora = Date.now();
  if (!forcar && contaCache.valor !== undefined && agora < contaCache.ate) return contaCache.valor;
  const r = await lerJson(CAMINHO_CONTA);
  contaCache = { valor: r ? r.valor : null, ate: agora + (r ? 5 * 60 * 1000 : 30 * 1000) };
  return contaCache.valor;
}
export async function salvarConta(conta) {
  await gravarJson(CAMINHO_CONTA, conta);
  contaCache = { valor: conta, ate: Date.now() + 5 * 60 * 1000 };
}

export async function gerarHashSenha(senha, sal = randomBytes(16).toString('base64')) {
  const hash = await scrypt(senha.normalize('NFKC'), sal, 64, { N: 16384, r: 8, p: 1 });
  return { sal, hash: hash.toString('base64') };
}
export async function senhaConfere(senha, conta) {
  if (!conta || !conta.sal || !conta.hash) return false;
  const { hash } = await gerarHashSenha(senha, conta.sal);
  return iguais(hash, conta.hash);
}

export function iguais(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) { timingSafeEqual(x, x); return false; }
  return timingSafeEqual(x, y);
}

export const normalizarEmail = (e) => String(e || '').trim().toLowerCase();
export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
export function senhaForte(s) {
  s = String(s || '');
  if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (s.length > 128) return 'A senha é longa demais.';
  if (!/[a-zA-Z]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.';
  return '';
}

/* -------------------------------------------------------- sessão */
function segredo() {
  const s = process.env.SESSAO_SEGREDO;
  if (!s || s.length < 32) throw new Error('SESSAO_SEGREDO não configurado');
  return s;
}
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const assinar = (texto) => createHmac('sha256', segredo()).update(texto).digest('base64url');

export function criarSessao(conta) {
  const carga = b64url(JSON.stringify({ e: conta.email, v: conta.versao, x: Math.floor(Date.now() / 1000) + DURACAO_SESSAO }));
  const valor = carga + '.' + assinar(carga);
  return `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACAO_SESSAO}`;
}
export const apagarSessao = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function lerCookie(request) {
  const cab = request.headers.get('cookie') || '';
  const m = cab.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  return m ? m.slice(COOKIE.length + 1) : '';
}

/** Devolve a conta se a sessão do cookie for válida; senão, null */
export async function sessaoValida(request) {
  const valor = lerCookie(request);
  const [carga, assinatura] = valor.split('.');
  if (!carga || !assinatura || !iguais(assinar(carga), assinatura)) return null;
  let dados;
  try { dados = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!dados || dados.x < Math.floor(Date.now() / 1000)) return null;
  const conta = await lerConta();
  if (!conta || conta.email !== dados.e || conta.versao !== dados.v) return null;
  return conta;
}

/* ------------------------------------------- limite de tentativas */
// Por instância: 6 erros em 15 minutos bloqueiam aquele IP por 15 minutos.
const tentativas = new Map();
const JANELA = 15 * 60 * 1000;
export function ipDe(request) {
  return (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconhecido';
}
export function bloqueado(ip) {
  const t = tentativas.get(ip);
  return !!(t && t.n >= 6 && Date.now() - t.desde < JANELA);
}
export function registrarErro(ip) {
  const agora = Date.now();
  const t = tentativas.get(ip);
  if (!t || agora - t.desde > JANELA) tentativas.set(ip, { n: 1, desde: agora });
  else t.n++;
  if (tentativas.size > 5000) tentativas.clear();
}
export const limparErros = (ip) => tentativas.delete(ip);
export const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
