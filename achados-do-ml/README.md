# Achados do ML — vitrine de ofertas com links de afiliado

Site de uma página com as melhores ofertas do Mercado Livre. O cliente filtra
por categoria, busca pelo nome, ordena por preço ou desconto e clica em
**Ver no Mercado Livre**: o botão abre o anúncio com o **seu link de afiliado**.

- **Sem instalação e sem build**: é HTML, CSS e JavaScript puro. Basta enviar a
  pasta para qualquer hospedagem.
- **Herói igual ao layout**: uma versão para computador e outra para celular,
  com o texto em HTML de verdade (nítido em qualquer tela) e a arte dos
  produtos em WebP com fundo transparente, em 3 tamanhos para cada tela.
- **Testado de 320 px a 2560 px**, sem rolagem lateral e sem erros no console.

---

## 1. Ver o site no seu computador

Abra o arquivo `index.html` no navegador (duplo clique). Tudo funciona assim.

> As fontes do título só carregam quando o site está publicado ou rodando em
> um servidor (o Chrome bloqueia fontes em arquivos abertos direto do disco).
> Para ver exatamente como vai ficar no ar, rode na pasta do site:
>
> ```bash
> python3 -m http.server 8000
> ```
>
> e abra <http://localhost:8000>.

---

## 2. Adicionar os seus produtos

Os produtos ficam em **`js/produtos.js`**. Os que estão lá agora são
**exemplos**: enquanto o link tiver `SEU-LINK`, o card mostra a etiqueta
"Exemplo" e, se alguém clicar, aparece um aviso em vez de abrir uma página
quebrada.

### Jeito mais fácil: página de ajuda

1. Abra **`adicionar-produto.html`** no navegador.
2. Preencha link, nome, categoria e preço (o resto é opcional).
3. Clique em **Copiar código** e cole em `js/produtos.js`, logo abaixo da
   linha `window.ACHADOS_PRODUTOS = [`.

A página avisa se faltar algo (preço inválido, link que não é do Mercado
Livre, preço antigo menor que o atual...).

### Na mão

Copie um bloco inteiro de `js/produtos.js`, cole logo abaixo e troque os dados:

```js
{
  titulo: 'Air Fryer Digital 5L 1500W com Cesto Antiaderente',
  categoria: 'eletroportateis',
  preco: 379.90,          // use PONTO nos centavos
  precoAntigo: 599.90,    // opcional: o site calcula o "37% OFF"
  parcelas: 10,           // opcional: "em 10x R$ 37,99 sem juros"
  freteGratis: true,
  imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_...webp',
  link: 'https://mercadolivre.com/sec/SEU-CODIGO',
  maisVendido: true,      // opcional: entra em "Mais vendidos"
  ofertaDoDia: true,      // opcional: entra no atalho "Ofertas do Dia"
  avaliacao: 4.8,         // opcional
  avaliacoes: 1520,       // opcional
},
```

**A ordem no arquivo é a ordem no site**: coloque os melhores achados primeiro.

### De onde tirar cada informação

| Campo | Onde pegar |
|---|---|
| `link` | No Mercado Livre logado como afiliado, abra o anúncio e use a barra de afiliados (**Compartilhar → Copiar link**). |
| `imagem` | No anúncio, clique com o botão direito na foto principal → **Copiar endereço da imagem**. Ou salve a foto em `img/produtos/` e use `'img/produtos/nome-da-foto.webp'`. |
| `preco` / `precoAntigo` | O preço atual e o preço riscado do anúncio. |
| `categoria` | Um dos ids de `js/config.js`: `celulares`, `informatica`, `audio`, `games`, `casa`, `eletroportateis`, `esporte`, `moda`. |

Se uma foto não carregar, o card mostra uma ilustração da categoria no lugar —
o site nunca fica com imagem quebrada. Se faltar `titulo` ou `preco`, o
produto é ignorado e um aviso aparece no console do navegador (F12).

> Os preços do Mercado Livre mudam com frequência. Vale revisar os produtos
> de tempos em tempos; o rodapé já avisa que o preço final é o do anúncio.

---

## 3. Configurações — `js/config.js`

| O quê | Campo |
|---|---|
| Link do botão amarelo **Explorar Ofertas no ML** | `linkPrincipal` (vazio = rola até as ofertas) |
| Instagram, grupo de WhatsApp, canal do Telegram | `redes` (vazio = botão escondido) |
| Quantas ofertas antes do "Ver mais" | `produtosPorPagina` |
| Categorias (nome, ícone e id) | `categorias` |
| Quais atalhos aparecem no celular e em que ordem | `categoriasNoCelular` |

No computador aparecem os 9 atalhos em uma linha (como no layout). No celular
aparecem 8, em 2 linhas de 4 (como no layout do celular, sem "Games") — e
**todas** as categorias continuam disponíveis nos filtros da seção de ofertas.

---

## 4. Publicar

É um site estático: envie **o conteúdo da pasta `achados-do-ml/`** para a
hospedagem.

- **Netlify (mais simples):** acesse <https://app.netlify.com/drop> e arraste a
  pasta `achados-do-ml`. Em segundos o site está no ar.
- **Vercel / Cloudflare Pages:** importe o repositório e defina a pasta raiz
  (*Root Directory*) como `achados-do-ml`. Não há comando de build.
- **GitHub Pages / Hostinger / qualquer hospedagem:** envie os arquivos da
  pasta.

Depois de publicar, troque no `index.html` o endereço da imagem de
compartilhamento para o endereço completo do seu site (o WhatsApp e o Facebook
exigem isso):

```html
<meta property="og:image" content="https://SEU-DOMINIO/img/og-image.jpg">
```

> A página `adicionar-produto.html` vai junto quando você publica. Ela não
> aparece no Google (`noindex`) e não altera nada no site — só gera o código.
> Se preferir, apague-a da hospedagem.

---

## Estrutura

```
achados-do-ml/
  index.html              o site
  adicionar-produto.html  ajuda para gerar o código de um produto
  css/estilo.css          visual (mobile primeiro)
  js/config.js            ⭐ configurações
  js/produtos.js          ⭐ seus produtos
  js/app.js               filtros, busca, menu, carrossel (não precisa mexer)
  img/hero/               arte do herói (computador e celular, WebP + PNG)
  img/produtos/           ← fotos suas, se quiser hospedar as imagens
  img/                    favicon, ícones e imagem de compartilhamento
  fontes/                 Fredoka e Nunito (locais, licença OFL)
  site.webmanifest        ícone ao "adicionar à tela inicial"
```

## Detalhes técnicos

- **Herói:** o texto, os selos e o botão são HTML; a arte dos produtos foi
  recortada dos layouts com fundo transparente, com as sombras preservadas, e
  exportada em WebP (600 a 1496 px). O `<picture>` entrega a versão de
  celular ou de computador e o tamanho certo para a densidade da tela.
- **Busca:** ignora acentos e maiúsculas ("audio" encontra "Áudio"); os campos
  do topo, do celular e da seção ficam sincronizados.
- **Filtros na URL:** `?categoria=audio&ordem=menor-preco&frete=1` — dá para
  mandar o link de uma categoria já filtrada para um cliente.
- **Links:** abrem em nova aba com `rel="sponsored nofollow noopener"`, como o
  Google recomenda para links de afiliado.
- **Acessibilidade:** um `<h1>`, navegação por teclado (Esc fecha menus, o
  foco fica preso no menu do celular), foco visível, textos alternativos e
  respeito a "reduzir movimento".
- **Ícones:** [Lucide](https://lucide.dev) (licença ISC), embutidos no HTML.
