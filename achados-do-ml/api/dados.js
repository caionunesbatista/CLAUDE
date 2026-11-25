/* ==========================================================================
   Achados do ML — dados do site (servido em /js/dados.js, ver vercel.json)
   Fica guardado na CDN da Vercel por até 1 dia e é renovado na hora em que
   o proprietário publica pelo painel (tag "dados"). Assim o Blob quase não é
   consultado, mesmo com muitas visitas.
   ========================================================================== */
import { dadosAtuais, dadosPadrao } from './_lib.js';

export default {
  async fetch() {
    let dados;
    try {
      dados = (await dadosAtuais()).dados;
    } catch (e) {
      console.error('[dados] usando o padrão:', e);
      dados = await dadosPadrao();
      // Em caso de falha, não segura o padrão por muito tempo na CDN
      return resposta(dados, 'public, max-age=60');
    }
    return resposta(dados, 'public, max-age=86400, stale-while-revalidate=604800');
  }
};

function resposta(dados, cdn) {
  const corpo = '/* Achados do ML */\nwindow.ACHADOS_DADOS = ' + JSON.stringify(dados) + ';\n';
  return new Response(corpo, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vercel-CDN-Cache-Control': cdn,
      'Vercel-Cache-Tag': 'dados',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
