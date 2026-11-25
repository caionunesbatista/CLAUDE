/* ==========================================================================
   Achados do ML — API do painel do proprietário
   GET  /api/admin?acao=estado   → conta criada? sessão ativa?
   POST /api/admin?acao=criar    → cria a conta (ou nova senha) com o código de ativação
   POST /api/admin?acao=entrar   → login com e-mail e senha
   POST /api/admin?acao=sair     → encerra a sessão
   GET  /api/admin?acao=dados    → dados atuais do site (com versão)
   POST /api/admin?acao=salvar   → publica os dados
   POST /api/admin?acao=imagem   → envia uma imagem (WebP, PNG ou JPG)
   ========================================================================== */
import { randomBytes } from 'node:crypto';
import { put } from '@vercel/blob';
import { dangerouslyDeleteByTag } from '@vercel/functions';
import {
  CAMINHO_DADOS, PASTA_BACKUPS, PASTA_IMAGENS, apagarSessao, bloqueado, criarSessao, dadosAtuais, emailValido, erro, esperar,
  gerarHashSenha, gravarJson, iguais, ipDe, json, lerConta, limparErros, normalizarEmail,
  registrarErro, salvarConta, senhaConfere, senhaForte, sessaoValida
} from './_lib.js';

const LIMITE_DADOS = 900 * 1024;        // ~900 KB de JSON
const LIMITE_IMAGEM = 3 * 1024 * 1024;  // 3 MB por imagem
const TIPOS = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };

async function lerCorpo(request, limite) {
  const texto = await request.text();
  if (texto.length > limite) throw Object.assign(new Error('Conteúdo grande demais.'), { status: 413 });
  try { return JSON.parse(texto || '{}'); } catch (e) { throw Object.assign(new Error('Formato inválido.'), { status: 400 }); }
}

function dadosValidos(d) {
  return d && typeof d === 'object' && !Array.isArray(d) &&
    d.hero && typeof d.hero === 'object' &&
    Array.isArray(d.produtos) && Array.isArray(d.categorias);
}

const slug = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'imagem';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const acao = url.searchParams.get('acao') || '';
    const metodo = request.method;

    // Toda escrita exige o cabeçalho do painel (proteção extra contra CSRF)
    if (metodo === 'POST' && request.headers.get('x-achados-painel') !== '1') return erro('Requisição recusada.', 403);

    try {
      /* ------------------------------------------------- estado */
      if (acao === 'estado' && metodo === 'GET') {
        const conta = await lerConta();
        const logado = conta ? await sessaoValida(request) : null;
        return json({ configurado: !!conta, logado: !!logado, email: logado ? logado.email : null });
      }

      /* ----------------------------------- criar conta / nova senha */
      if (acao === 'criar' && metodo === 'POST') {
        const ip = ipDe(request);
        if (bloqueado(ip)) return erro('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
        const corpo = await lerCorpo(request, 4096);
        const codigoCerto = process.env.CODIGO_ATIVACAO || '';
        if (!codigoCerto) return erro('O código de ativação não está configurado no servidor.', 500);
        if (!iguais(String(corpo.codigo || '').trim().toUpperCase(), codigoCerto.toUpperCase())) {
          registrarErro(ip);
          await esperar(600);
          return erro('Código de ativação incorreto.', 401);
        }
        const email = normalizarEmail(corpo.email);
        if (!emailValido(email)) return erro('Digite um e-mail válido.');
        const problema = senhaForte(corpo.senha);
        if (problema) return erro(problema);
        const anterior = await lerConta(true);
        const { sal, hash } = await gerarHashSenha(String(corpo.senha));
        const conta = {
          email, sal, hash,
          versao: (anterior && anterior.versao ? anterior.versao : 0) + 1,
          criadaEm: anterior && anterior.criadaEm ? anterior.criadaEm : new Date().toISOString(),
          atualizadaEm: new Date().toISOString()
        };
        await salvarConta(conta);
        limparErros(ip);
        return json({ ok: true, email }, 200, { 'Set-Cookie': criarSessao(conta) });
      }

      /* --------------------------------------------------- entrar */
      if (acao === 'entrar' && metodo === 'POST') {
        const ip = ipDe(request);
        if (bloqueado(ip)) return erro('Muitas tentativas. Espere 15 minutos e tente de novo.', 429);
        const corpo = await lerCorpo(request, 4096);
        const conta = await lerConta();
        if (!conta) return erro('Ainda não existe conta. Crie o acesso do proprietário.', 409);
        const email = normalizarEmail(corpo.email);
        const ok = email === conta.email && await senhaConfere(String(corpo.senha || ''), conta);
        if (!ok) {
          registrarErro(ip);
          await esperar(500 + Math.random() * 400);
          return erro('E-mail ou senha incorretos.', 401);
        }
        limparErros(ip);
        return json({ ok: true, email: conta.email }, 200, { 'Set-Cookie': criarSessao(conta) });
      }

      /* ----------------------------------------------------- sair */
      if (acao === 'sair' && metodo === 'POST') {
        return json({ ok: true }, 200, { 'Set-Cookie': apagarSessao() });
      }

      /* ======== daqui para baixo, só com sessão válida ======== */
      const conta = await sessaoValida(request);
      if (!conta) return erro('Sua sessão expirou. Entre de novo.', 401);

      /* ---------------------------------------------------- dados */
      if (acao === 'dados' && metodo === 'GET') {
        const atual = await dadosAtuais();
        return json({ dados: atual.dados, versao: atual.etag, origem: atual.origem, email: conta.email });
      }

      /* --------------------------------------------------- salvar */
      if (acao === 'salvar' && metodo === 'POST') {
        const corpo = await lerCorpo(request, LIMITE_DADOS + 4096);
        if (!dadosValidos(corpo.dados)) return erro('Os dados enviados estão incompletos.');
        const opcoes = {};
        // Concorrência: só grava se ninguém publicou depois que o painel abriu
        if (!corpo.forcar && corpo.versaoBase) opcoes.ifMatch = corpo.versaoBase;
        let r;
        try {
          r = await gravarJson(CAMINHO_DADOS, corpo.dados, opcoes);
        } catch (e) {
          if (/precondition/i.test(e && (e.name + ' ' + e.message))) {
            return erro('O site foi alterado em outro aparelho depois que você abriu o painel.', 409);
          }
          throw e;
        }
        // Cópia de segurança (uma por publicação, com data no nome)
        const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
        await gravarJson(`${PASTA_BACKUPS}${carimbo}.json`, corpo.dados, { allowOverwrite: false }).catch(() => {});
        // Atualiza o site na hora: apaga o cache dos dados na CDN
        await dangerouslyDeleteByTag('dados').catch(() => {});
        return json({ ok: true, versao: r.etag || null, publicadoEm: new Date().toISOString() });
      }

      /* --------------------------------------------------- imagem */
      if (acao === 'imagem' && metodo === 'POST') {
        const corpo = await lerCorpo(request, Math.ceil(LIMITE_IMAGEM * 1.4) + 4096);
        const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(corpo.dataUrl || ''));
        if (!m) return erro('Envie uma imagem WebP, PNG ou JPG.');
        const bytes = Buffer.from(m[2], 'base64');
        if (!bytes.length || bytes.length > LIMITE_IMAGEM) return erro('Imagem grande demais (máximo 3 MB).', 413);
        const caminho = `${PASTA_IMAGENS}${slug(corpo.nome)}-${randomBytes(5).toString('hex')}.${TIPOS[m[1]]}`;
        await put(caminho, bytes, {
          access: 'private', addRandomSuffix: false, allowOverwrite: false,
          contentType: m[1], cacheControlMaxAge: 31536000
        });
        return json({ ok: true, src: '/api/img?p=' + caminho });
      }

      return erro('Ação desconhecida.', 404);
    } catch (e) {
      console.error('[admin]', acao, e);
      return erro(e.status ? e.message : 'Erro no servidor. Tente de novo em instantes.', e.status || 500);
    }
  }
};
