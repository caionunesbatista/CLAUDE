/**
 * Imagem com direção de arte: um recorte para telas largas e outro para
 * telas estreitas, sempre servindo WebP com JPEG de reserva.
 *
 * As dimensões são informadas para o navegador reservar o espaço antes do
 * download — zero deslocamento de layout (CLS).
 *
 * @param {object} fonte  um dos objetos de src/config/imagens.js
 */
export default function ImagemArte({
  fonte,
  className = '',
  prioridade = false,
  pontoDeTroca = '1024px',
}) {
  const { wide, tall, largura, altura, alt } = fonte

  return (
    <picture>
      <source media={`(min-width: ${pontoDeTroca})`} type="image/webp" srcSet={wide.webp} />
      <source media={`(min-width: ${pontoDeTroca})`} type="image/jpeg" srcSet={wide.jpg} />
      <source type="image/webp" srcSet={tall.webp} />
      <img
        src={tall.jpg}
        alt={alt}
        width={largura}
        height={altura}
        className={className}
        loading={prioridade ? 'eager' : 'lazy'}
        fetchPriority={prioridade ? 'high' : 'auto'}
        decoding={prioridade ? 'sync' : 'async'}
        draggable={false}
      />
    </picture>
  )
}
