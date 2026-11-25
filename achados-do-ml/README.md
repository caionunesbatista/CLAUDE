# Achados do ML — vitrine de ofertas com links de afiliado

Site de uma página com as melhores ofertas do Mercado Livre. O cliente filtra
por categoria, busca pelo nome, ordena (mais relevantes, **mais vendidos**,
preço ou desconto) e clica em **Ver no Mercado Livre**: o botão abre o anúncio
com o **seu link de afiliado**.

Tudo o que muda no dia a dia — textos e imagens do topo, botão amarelo,
produtos, legendas, links, categorias e redes — é editado na **Área do
proprietário** (link discreto no rodapé), com e-mail e senha, sem mexer em código.

- **Sem instalação e sem build**: é HTML, CSS e JavaScript puro.
- **Herói igual ao layout**, com uma versão para computador e outra para celular.
- **Testado de 320 px a 2560 px**, sem rolagem lateral e sem erros no console.

---

## 1. Onde o site está

**Endereço:** <https://achadosdoml.vercel.app>

O site roda na **Vercel** (projeto `achados-do-ml`), ligado a este repositório
do GitHub, pasta `achados-do-ml`. As versões de teste (preview) usam uma pasta
separada do armazenamento (`teste-preview/`), então nunca mexem no site no ar.

O que você edita pelo painel (textos, produtos, imagens) **não depende do
GitHub**: fica guardado no armazenamento da Vercel (Vercel Blob privado) e
aparece no site na hora em que você clica em **Publicar**.

Variáveis de ambiente do projeto na Vercel:

| Variável | Para quê |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Acesso ao armazenamento (criada ao conectar o Blob ao projeto) |
| `SESSAO_SEGREDO` | Assina o login do painel. Se trocar, todo mundo é deslogado. |
| `CODIGO_ATIVACAO` | Código para criar o acesso do proprietário ou uma nova senha. **Guarde em segredo.** |

---

## 2. Área do proprietário (painel)

No fim do site, no rodapé, tem o link discreto **Área do proprietário**
(endereço: `/painel.html`). Ele não aparece no menu nem no Google.

### Primeiro acesso

1. Clique em **Área do proprietário**.
2. Digite o seu e-mail, crie uma senha (8+ caracteres, com letras e números)
   e o **código de ativação**.
3. Pronto: só esse e-mail e essa senha entram no painel.

### Esqueci a senha

Na tela de login, clique em **Esqueci minha senha**, digite o e-mail, a nova
senha e o código de ativação. A senha antiga para de funcionar na hora.

### Segurança

- A senha é guardada com *scrypt* (nunca em texto puro).
- O login fica num cookie protegido (HttpOnly, Secure, SameSite=Strict) e
  dura 7 dias; **Sair** encerra na hora.
- Depois de várias senhas erradas seguidas, aquele aparelho espera 15 minutos.
- Ninguém cria um acesso novo sem o código de ativação.

### O que dá para fazer

| Aba | O que você edita |
|---|---|
| **Topo do site** | As 3 linhas do título, o subtítulo (com o destaque amarelo), os 3 selos, o texto e o **link do botão amarelo** e as **imagens do topo** (computador e celular). |
| **Produtos** | Adicionar, editar, duplicar, excluir e mudar a ordem. Cada produto tem link de afiliado, nome, **legenda**, categoria, preços, parcelas, quantidade vendida, nota, foto e as marcas *Frete grátis*, *Mais vendido* e *Oferta do dia*. |
| **Categorias** | Nome, ícone e ordem; criar e excluir; quais atalhos aparecem no celular. |
| **Redes e ajustes** | Instagram, grupo de WhatsApp, canal do Telegram, quantas ofertas antes do "Ver mais" e uma cópia de segurança do arquivo de dados. |

- **Prévia** abre o site com as suas alterações antes de publicar (só você vê).
- **Publicar** grava e atualiza o site na hora. Cada publicação guarda uma
  cópia de segurança.
- Se você editar em dois aparelhos ao mesmo tempo, o painel avisa antes de
  substituir o que foi publicado pelo outro.
- Alterações não publicadas ficam salvas como rascunho no aparelho.

### Fotos e imagens

- **Foto de produto:** cole o link da foto do anúncio (botão direito na foto →
  *Copiar endereço da imagem*) ou clique em **Enviar foto** para mandar um
  arquivo do celular/computador. O painel reduz e converte para WebP sozinho.
- **Imagens do topo:** para ficar igual ao layout, use **PNG com fundo
  transparente** e pelo menos 1500 px de largura. **Usar a original** volta
  para a arte atual.

### Limites do plano gratuito da Vercel

O site foi feito para gastar pouco: os dados ficam no cache da Vercel e o
armazenamento só é lido quando você publica. No plano Hobby o Blob inclui
1 GB, 10 mil leituras e 2 mil gravações por mês. Cada publicação usa 2
gravações e cada foto enviada usa 1 (colar o link da foto do Mercado Livre
não gasta nada).

---

## 3. Ver o site no computador

Abra `index.html` no navegador. Para ver exatamente como vai ficar no ar
(com as fontes do título), rode na pasta do site:

```bash
python3 -m http.server 8000
```

e abra <http://localhost:8000>. O login do painel só funciona no site
publicado (ele usa as funções da Vercel); no computador, o painel abre em
"modo sem conexão" para editar e baixar o `dados.js`.

---

## Estrutura

```
achados-do-ml/
  index.html          o site
  painel.html         ⭐ área do proprietário (painel)
  api/admin.js        login, criar acesso, salvar e enviar imagens
  api/dados.js        entrega os dados publicados (em /js/dados.js, com cache)
  api/img.js          entrega as imagens enviadas pelo painel
  api/_lib.js         senha, sessão e armazenamento
  vercel.json         rotas e configuração das funções
  js/dados.js         dados iniciais (usados até a primeira publicação)
  js/base.js          aplica os dados no topo e o modo prévia
  js/app.js           filtros, busca, ordenação, menu, carrossel
  js/painel.js        funcionamento do painel
  css/estilo.css      visual do site (mobile primeiro)
  css/painel.css      visual do painel
  img/hero/           imagens do topo (as enviadas pelo painel também vão aqui)
  img/produtos/       fotos de produto enviadas pelo painel
  img/                favicon, ícones e imagem de compartilhamento
  fontes/             Fredoka e Nunito (locais, licença OFL)
```

Depois da primeira publicação pelo painel, os dados vivem no Blob; o
`js/dados.js` do repositório vira só o ponto de partida.

## Detalhes técnicos

- **Publicação:** o painel grava os dados no Blob (com controle de versão) e
  renova o cache do site pela tag `dados`, então a mudança aparece na hora.
- **Ordenar por "Mais vendidos":** primeiro os produtos marcados como *Mais
  vendido*, depois os com maior quantidade vendida e mais avaliações.
- **Herói:** texto, selos e botão são HTML (nítidos em qualquer tela); as
  imagens são WebP com fundo transparente, em 3 tamanhos para cada tela.
- **Busca:** ignora acentos e maiúsculas e também procura nas legendas.
- **Filtros na URL:** `?categoria=audio&ordem=mais-vendidos&frete=1`.
- **Links:** abrem em nova aba com `rel="sponsored nofollow noopener"`.
- **Acessibilidade:** navegação por teclado, foco visível, textos alternativos
  e respeito a "reduzir movimento".
- **Ícones:** [Lucide](https://lucide.dev) (licença ISC).
