/**
 * Caminhos das imagens do herói, declarados de forma estática.
 *
 * Ficam aqui (e não montados dinamicamente dentro do componente) para que
 * qualquer ferramenta de build consiga enxergar cada arquivo — é o que
 * permite gerar a versão de arquivo único, com tudo embutido.
 */

export const LOGO = {
  src: '/images/logo.png',
  largura: 512,
  altura: 217,
}

export const HERO_DETALHES = {
  wide: { webp: '/images/detalhes-wide.webp', jpg: '/images/detalhes-wide.jpg' },
  tall: { webp: '/images/detalhes-tall.webp', jpg: '/images/detalhes-tall.jpg' },
  largura: 941,
  altura: 395,
  alt: 'Detalhamento automotivo: aplicação de higienizador no interior, pincel nos botões da porta e escova com espuma na roda.',
}

export const HERO_VEICULOS = {
  wide: { webp: '/images/veiculos-wide.webp', jpg: '/images/veiculos-wide.jpg' },
  tall: { webp: '/images/veiculos-tall.webp', jpg: '/images/veiculos-tall.jpg' },
  largura: 941,
  altura: 396,
  alt: 'Volkswagen Polo branco e moto esportiva recém-lavados, refletidos no piso molhado.',
}
