/* ==========================================================================
   CONFIGURAÇÕES DO SITE — Achados do ML
   --------------------------------------------------------------------------
   Este arquivo guarda as informações gerais do site. Os produtos ficam em
   js/produtos.js. Depois de editar, salve e recarregue a página.
   ========================================================================== */

window.ACHADOS_CONFIG = {
  /* Link do botão amarelo "Explorar Ofertas no ML" (no topo do site).
     Cole aqui um link de afiliado seu — por exemplo, da sua vitrine/perfil de
     afiliado ou de uma busca no Mercado Livre gerada pela ferramenta de links.
     Enquanto estiver vazio, o botão apenas rola a página até as ofertas. */
  linkPrincipal: '',

  /* Suas redes. Deixe '' (vazio) para esconder o botão.
     Exemplos:
       instagram: 'https://instagram.com/seuperfil'
       whatsapp:  'https://chat.whatsapp.com/CODIGO-DO-GRUPO'
       telegram:  'https://t.me/seucanal' */
  redes: {
    instagram: '',
    whatsapp: '',
    telegram: '',
  },

  /* Quantas ofertas aparecem antes do botão "Ver mais ofertas". */
  produtosPorPagina: 12,

  /* Categorias (os quadradinhos abaixo do topo e os filtros das ofertas).
     - id:    nome curto, sem acento e sem espaço. É o que você usa no campo
              "categoria" de cada produto em js/produtos.js.
     - nome:  texto que aparece no site.
     - icone: um destes nomes:
              celular, notebook, fone, controle, casa, liquidificador, haltere,
              camiseta, brilho, bebe, pet, ferramenta, carro, livro, relogio,
              presente, geladeira, tv, camera, sofa, bicicleta, saude,
              brinquedo, cozinha, sacola, pacote */
  categorias: [
    { id: 'celulares',       nome: 'Celulares',        icone: 'celular' },
    { id: 'informatica',     nome: 'Informática',      icone: 'notebook' },
    { id: 'audio',           nome: 'Áudio',            icone: 'fone' },
    { id: 'games',           nome: 'Games',            icone: 'controle' },
    { id: 'casa',            nome: 'Casa e Decoração', icone: 'casa' },
    { id: 'eletroportateis', nome: 'Eletroportáteis',  icone: 'liquidificador' },
    { id: 'esporte',         nome: 'Esporte e Lazer',  icone: 'haltere' },
    { id: 'moda',            nome: 'Moda',             icone: 'camiseta' },
  ],

  /* Quadradinhos que aparecem no CELULAR, nesta ordem (4 por linha).
     Use os mesmos ids das categorias acima. 'ofertas-do-dia' é o atalho
     especial que mostra os produtos marcados com ofertaDoDia: true.
     As categorias que não estiverem aqui continuam disponíveis nos filtros
     da seção de ofertas. */
  categoriasNoCelular: [
    'celulares', 'informatica', 'audio', 'eletroportateis',
    'casa', 'esporte', 'moda', 'ofertas-do-dia',
  ],
};
