/**
 * Imagem com direção de arte: um recorte para telas largas e outro para
 * telas estreitas, sempre servindo WebP com JPEG de reserva.
 *
 * As dimensões reais são informadas para o navegador reservar o espaço
 * (zero deslocamento de layout / CLS).
 */
export default function ImagemArte({
  nomeWide,
  nomeTall,
  larguraTall,
  alturaTall,
  alt,
  className = '',
  prioridade = false,
  pontoDeTroca = '1024px',
}) {
  return (
    <picture>
      <source media={`(min-width: ${pontoDeTroca})`} type="image/webp" srcSet={`/images/${nomeWide}.webp`} />
      <source media={`(min-width: ${pontoDeTroca})`} type="image/jpeg" srcSet={`/images/${nomeWide}.jpg`} />
      <source type="image/webp" srcSet={`/images/${nomeTall}.webp`} />
      <img
        src={`/images/${nomeTall}.jpg`}
        alt={alt}
        width={larguraTall}
        height={alturaTall}
        className={className}
        loading={prioridade ? 'eager' : 'lazy'}
        fetchPriority={prioridade ? 'high' : 'auto'}
        decoding={prioridade ? 'sync' : 'async'}
        draggable={false}
      />
    </picture>
  )
}
