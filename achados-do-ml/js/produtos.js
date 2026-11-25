/* ==========================================================================
   PRODUTOS — Achados do ML
   --------------------------------------------------------------------------
   Cada produto é um bloco { ... } separado por vírgula. Para adicionar um
   novo, copie um bloco inteiro, cole logo abaixo e troque as informações.

   CAMPOS
     titulo        (obrigatório) Nome do produto.
     categoria     (obrigatório) Um dos ids de js/config.js:
                   celulares, informatica, audio, games, casa,
                   eletroportateis, esporte, moda
     preco         (obrigatório) Preço atual. Use PONTO nos centavos: 1299.90
     precoAntigo   (opcional)    Preço "de", riscado. O site calcula o % OFF.
     parcelas      (opcional)    Nº de parcelas SEM JUROS. Ex.: 10
     freteGratis   (opcional)    true ou false.
     imagem        (opcional)    Link da foto (veja o README) ou o caminho de
                                 um arquivo seu, ex.: 'img/produtos/airfryer.webp'
     link          (obrigatório) O SEU link de afiliado do Mercado Livre.
     maisVendido   (opcional)    true = aparece em "Mais Vendidos".
     ofertaDoDia   (opcional)    true = aparece no atalho "Ofertas do Dia".
     avaliacao     (opcional)    Nota de 0 a 5. Ex.: 4.8
     avaliacoes    (opcional)    Quantidade de avaliações. Ex.: 1520

   A ORDEM AQUI É A ORDEM NO SITE (em "Mais relevantes"): coloque os
   melhores achados primeiro.

   ⚠️ Os produtos abaixo são EXEMPLOS. Enquanto o link tiver "SEU-LINK",
   o card mostra a etiqueta "Exemplo" e não leva a lugar nenhum.
   Troque pelos seus produtos e links de afiliado.
   ========================================================================== */

window.ACHADOS_PRODUTOS = [
  {
    titulo: 'Air Fryer Digital 5L 1500W com Cesto Antiaderente',
    categoria: 'eletroportateis',
    preco: 379.90,
    precoAntigo: 599.90,
    parcelas: 10,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
    maisVendido: true,
    ofertaDoDia: true,
  },
  {
    titulo: 'Smartphone 5G 256GB Tela AMOLED 6,7" Câmera Tripla 50MP',
    categoria: 'celulares',
    preco: 1499.00,
    precoAntigo: 2199.00,
    parcelas: 10,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
    maisVendido: true,
  },
  {
    titulo: 'Fone de Ouvido Bluetooth Over-Ear com Cancelamento de Ruído',
    categoria: 'audio',
    preco: 399.00,
    precoAntigo: 599.00,
    parcelas: 10,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
    maisVendido: true,
    ofertaDoDia: true,
  },
  {
    titulo: 'Tênis Casual Branco Unissex Cano Baixo',
    categoria: 'moda',
    preco: 189.90,
    precoAntigo: 299.90,
    parcelas: 6,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
    maisVendido: true,
  },
  {
    titulo: 'Notebook 15,6" Intel Core i5 16GB RAM SSD 512GB',
    categoria: 'informatica',
    preco: 2899.00,
    precoAntigo: 3799.00,
    parcelas: 12,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Liquidificador 1400W 12 Velocidades Jarra de 3 Litros',
    categoria: 'eletroportateis',
    preco: 219.90,
    precoAntigo: 329.90,
    parcelas: 6,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
    maisVendido: true,
  },
  {
    titulo: 'Controle Sem Fio para Console e PC com Vibração',
    categoria: 'games',
    preco: 159.90,
    precoAntigo: 249.90,
    parcelas: 5,
    freteGratis: false,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
    ofertaDoDia: true,
  },
  {
    titulo: 'Caixa de Som Bluetooth à Prova d\'Água 40W',
    categoria: 'audio',
    preco: 349.00,
    precoAntigo: 499.00,
    parcelas: 10,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Kit Halteres Ajustáveis 20kg com Barra',
    categoria: 'esporte',
    preco: 229.90,
    precoAntigo: 289.90,
    parcelas: 6,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Jogo de Lençol Queen 400 Fios 100% Algodão',
    categoria: 'casa',
    preco: 139.90,
    precoAntigo: 219.90,
    parcelas: 4,
    freteGratis: false,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
    ofertaDoDia: true,
  },
  {
    titulo: 'Smartphone 128GB 8GB RAM Bateria de 5000mAh',
    categoria: 'celulares',
    preco: 899.90,
    precoAntigo: 1299.00,
    parcelas: 10,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Mouse Gamer Sem Fio RGB 16000 DPI',
    categoria: 'informatica',
    preco: 149.90,
    precoAntigo: 249.90,
    parcelas: 5,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Headset Gamer com Microfone e Som Surround 7.1',
    categoria: 'games',
    preco: 189.90,
    imagem: '',
    parcelas: 6,
    freteGratis: true,
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Luminária de Mesa LED Articulada com Entrada USB',
    categoria: 'casa',
    preco: 89.90,
    precoAntigo: 129.90,
    parcelas: 3,
    freteGratis: false,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Tapete de Yoga Antiderrapante 6mm',
    categoria: 'esporte',
    preco: 79.90,
    precoAntigo: 119.90,
    parcelas: 3,
    freteGratis: false,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
  {
    titulo: 'Camiseta Básica 100% Algodão — Kit com 3',
    categoria: 'moda',
    preco: 99.90,
    precoAntigo: 149.90,
    parcelas: 3,
    freteGratis: true,
    imagem: '',
    link: 'https://mercadolivre.com/sec/SEU-LINK',
  },
];
