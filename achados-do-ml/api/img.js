/* ==========================================================================
   Achados do ML — entrega as imagens enviadas pelo painel
   /api/img?p=imagens/nome-abc123.webp
   Cada imagem tem nome único e nunca muda: fica em cache por 1 ano na CDN.
   ========================================================================== */
import { get } from '@vercel/blob';

export default {
  async fetch(request) {
    const p = new URL(request.url).searchParams.get('p') || '';
    if (!/^imagens\/[a-z0-9-]{1,80}\.(webp|png|jpg)$/.test(p)) return new Response('Não encontrado', { status: 404 });
    try {
      const r = await get(p, { access: 'private' });
      if (!r || r.statusCode !== 200) {
        return new Response('Não encontrado', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
      }
      return new Response(r.stream, {
        headers: {
          'Content-Type': r.blob.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Vercel-CDN-Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    } catch (e) {
      console.error('[img]', e);
      return new Response('Erro', { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
  }
};
