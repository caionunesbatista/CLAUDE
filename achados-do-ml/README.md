# Achados do ML — vitrine de ofertas com links de afiliado

Site de uma página com as melhores ofertas do Mercado Livre. O cliente filtra
por categoria, busca pelo nome, ordena (mais relevantes, **mais vendidos**,
preço ou desconto) e clica em **Ver no Mercado Livre**: o botão abre o anúncio
com o **seu link de afiliado**.

Tudo o que muda no dia a dia — textos e imagens do topo, botão amarelo,
produtos, legendas, links, categorias e redes — é editado pelo **painel**
(`painel.html`), sem mexer em código.

- **Sem instalação e sem build**: é HTML, CSS e JavaScript puro.
- **Herói igual ao layout**, com uma versão para computador e outra para celular.
- **Testado de 320 px a 2560 px**, sem rolagem lateral e sem erros no console.

---

## 1. Colocar o site no ar (uma vez só)

Para o painel publicar sozinho, a hospedagem precisa estar ligada ao
repositório do GitHub. Assim, cada vez que você clica em **Publicar**, o site
atualiza em 1 a 2 minutos.

**Vercel** (ou Netlify / Cloudflare Pages, que funcionam igual):

1. Entre em <https://vercel.com> com a sua conta do GitHub.
2. **Add New → Project** e escolha o repositório do site.
3. Em **Root Directory**, escolha a pasta `achados-do-ml`.
4. **Framework Preset:** *Other*. Não há comando de build.
5. Clique em **Deploy**. Pronto: o site ganha um endereço (dá para ligar um
   domínio seu depois).

Anote qual **branch** a hospedagem publica (normalmente `main`). É essa branch
que você vai informar no painel.

Depois de publicar, troque no `index.html` o endereço da imagem de
compartilhamento pelo endereço completo do seu site (o WhatsApp e o Facebook
exigem isso):

```html
<meta property="og:image" content="https://SEU-DOMINIO/img/og-image.jpg">
```

---

## 2. Usar o painel

Abra **`https://SEU-SITE/painel.html`** (o painel não aparece no menu do site
nem no Google).

### Conectar (uma vez por aparelho)

O painel pede um **token do GitHub**: uma senha que só serve para alterar o
repositório do site.

1. Abra <https://github.com/settings/personal-access-tokens/new>.
2. Dê um nome (ex.: *Painel Achados*) e escolha a validade.
3. **Repository access → Only select repositories** → escolha o repositório do site.
4. **Permissions → Repository permissions → Contents → Read and write**.
5. **Generate token**, copie (começa com `github_pat_`) e cole no painel.

Preencha também o **repositório** (`usuario/repositorio`), a **branch** que a
hospedagem publica e a **pasta do site** (`achados-do-ml`). Com
"Lembrar neste aparelho" marcado, nas próximas vezes o painel abre direto.

O token fica guardado só no seu navegador. Sem ele, ninguém consegue publicar,
mesmo que abra o endereço do painel.

### O que dá para fazer

| Aba | O que você edita |
|---|---|
| **Topo do site** | As 3 linhas do título, o subtítulo (com o destaque amarelo), os 3 selos, o texto e o **link do botão amarelo** e as **imagens do topo** (computador e celular). |
| **Produtos** | Adicionar, editar, duplicar, excluir e mudar a ordem. Cada produto tem link de afiliado, nome, **legenda**, categoria, preços, parcelas, quantidade vendida, nota, foto e as marcas *Frete grátis*, *Mais vendido* e *Oferta do dia*. |
| **Categorias** | Nome, ícone e ordem; criar e excluir; quais atalhos aparecem no celular. |
| **Redes e ajustes** | Instagram, grupo de WhatsApp, canal do Telegram, quantas ofertas antes do "Ver mais" e uma cópia de segurança do arquivo de dados. |

- **Prévia** abre o site com as suas alterações antes de publicar (só você vê).
- **Publicar** envia tudo de uma vez. O site atualiza em 1 a 2 minutos.
- Alterações não publicadas ficam salvas como rascunho no aparelho: se fechar
  a página sem querer, o painel pergunta se quer continuar de onde parou.

### Fotos e imagens

- **Foto de produto:** cole o link da foto do anúncio (botão direito na foto →
  *Copiar endereço da imagem*) ou clique em **Enviar foto** para mandar um
  arquivo do celular/computador. O painel reduz e converte para WebP sozinho.
- **Imagens do topo:** para ficar igual ao layout, use **PNG com fundo
  transparente** e pelo menos 1500 px de largura. O painel gera os tamanhos
  certos para cada tela. **Usar a original** volta para a arte atual.

Os produtos que ainda estão com `SEU-LINK` aparecem com a etiqueta **Exemplo**
no site e não levam a lugar nenhum. O painel avisa quantos são e tem um botão
para remover todos de uma vez.

### Sem conectar ao GitHub

Na tela de entrada, **Usar sem conectar** abre o painel para editar e ver a
prévia. No fim, **Baixar dados.js** baixa o arquivo com tudo; envie-o para a
hospedagem substituindo `js/dados.js`. Nesse modo não dá para enviar
arquivos de imagem (use links de imagem).

---

## 3. Ver o site no computador

Abra `index.html` no navegador. Para ver exatamente como vai ficar no ar
(com as fontes do título), rode na pasta do site:

```bash
python3 -m http.server 8000
```

e abra <http://localhost:8000> (o painel fica em
<http://localhost:8000/painel.html>).

---

## Estrutura

```
achados-do-ml/
  index.html          o site
  painel.html         ⭐ painel de edição
  js/dados.js         ⭐ textos, links, categorias e produtos (o painel grava aqui)
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

`js/dados.js` é JSON puro dentro de `window.ACHADOS_DADOS = { ... };`. Dá para
editar à mão, mas o painel é o caminho mais seguro.

## Detalhes técnicos

- **Publicação:** o painel usa a API do GitHub e faz **um único commit** com o
  `dados.js` e as imagens novas. Antes, confere se o arquivo mudou em outro
  lugar e pergunta antes de substituir.
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
