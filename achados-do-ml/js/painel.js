/* ==========================================================================
   Achados do ML — painel do proprietário
   Entra com e-mail e senha (API do próprio site, na Vercel), edita os dados
   e publica na hora. As imagens são enviadas assim que você escolhe.
   Sem servidor (arquivo aberto no computador), edita e baixa o dados.js.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';

  const ICONES = [
    ['celular', 'Celular'], ['notebook', 'Notebook'], ['fone', 'Fone de ouvido'], ['controle', 'Controle de game'],
    ['casa', 'Casa'], ['liquidificador', 'Liquidificador'], ['haltere', 'Haltere'], ['camiseta', 'Camiseta'],
    ['brilho', 'Brilho (beleza)'], ['bebe', 'Bebê'], ['pet', 'Pet'], ['ferramenta', 'Ferramenta'], ['carro', 'Carro'],
    ['livro', 'Livro'], ['relogio', 'Relógio'], ['presente', 'Presente'], ['geladeira', 'Geladeira'], ['tv', 'TV'],
    ['camera', 'Câmera'], ['sofa', 'Sofá'], ['bicicleta', 'Bicicleta'], ['saude', 'Saúde'], ['brinquedo', 'Brinquedo'],
    ['cozinha', 'Cozinha'], ['sacola', 'Sacola'], ['pacote', 'Pacote']
  ];
  const OFERTAS_DO_DIA = { id: 'ofertas-do-dia', nome: 'Ofertas do Dia', icone: 'etiqueta-pct' };
  const PADRAO_IMG = {
    imagemComputador: { versoes: [800, 1200, 1496].map((w) => ({ src: `img/hero/hero-produtos-desktop-${w}.webp`, w })), largura: 1496, altura: 1264 },
    imagemCelular: { versoes: [600, 940, 1262].map((w) => ({ src: `img/hero/hero-produtos-mobile-${w}.webp`, w })), largura: 1262, altura: 922 }
  };
  const LARGURAS = { imagemComputador: [800, 1200, 1496], imagemCelular: [600, 940, 1262] };
  const CABECALHO = '/* Dados do site Achados do ML: topo, links, redes, categorias e produtos.\n   Edite pelo painel (painel.html). Se editar à mão, mantenha o formato JSON. */\n';

  const CHAVE_RASCUNHO = 'achados-painel-rascunho';
  const CHAVE_PREVIA = 'achados-previa';
  const CHAVE_ABA = 'achados-painel-aba';

  /** Estado do painel */
  const E = {
    modo: null,        // 'servidor' ou 'local'
    email: '',         // proprietário conectado
    dados: null,       // dados do site
    versao: null,      // versão publicada quando o painel abriu (para evitar sobrescrever)
    alterado: false,
    temServidor: false  // o site tem a API do proprietário (Vercel)
  };

  /* ================================================================ util */
  const clonar = (o) => JSON.parse(JSON.stringify(o));
  const normalizarTexto = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    let s = String(v || '').trim().replace(/[^\d,.-]/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(s);
  }
  const paraCampo = (n, casas) => (typeof n === 'number' && isFinite(n) ? n.toFixed(casas).replace('.', ',') : '');
  const linkOk = (u) => /^https?:\/\/\S+$/i.test(String(u || '').trim());
  const exemplo = (p) => !linkOk(p.link) || /SEU-LINK/i.test(p.link);

  function slug(t) {
    return normalizarTexto(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
  }

  function ler(chave, sessao) {
    try { const v = (sessao ? sessionStorage : localStorage).getItem(chave); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function gravar(chave, valor, sessao) {
    try { (sessao ? sessionStorage : localStorage).setItem(chave, JSON.stringify(valor)); return true; } catch (e) { return false; }
  }
  function apagar(chave) {
    try { localStorage.removeItem(chave); sessionStorage.removeItem(chave); } catch (e) { /* nada */ }
  }

  function pegar(obj, caminho) {
    return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function definir(obj, caminho, valor) {
    const partes = caminho.split('.');
    let o = obj;
    partes.slice(0, -1).forEach((k, i) => {
      if (o[k] == null) o[k] = /^\d+$/.test(partes[i + 1]) ? [] : {};
      o = o[k];
    });
    o[partes[partes.length - 1]] = valor;
  }

  function icone(nome, classe) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', classe || 'icone');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#i-' + nome);
    svg.appendChild(use);
    return svg;
  }
  function h(tag, attrs, filhos) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : String(v));
    });
    (filhos || []).forEach((f) => { if (f !== null && f !== undefined && f !== false) n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return n;
  }

  let avisoTimer;
  function aviso(msg, ms) {
    const a = $('#aviso');
    a.textContent = msg;
    a.hidden = false;
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => { a.hidden = true; }, ms || 4000);
  }
  function carregando(texto) {
    $('#carregando-texto').textContent = texto || 'Carregando…';
    $('#carregando').hidden = false;
  }
  function pronto() { $('#carregando').hidden = true; }

  /* ===================================================== arquivo de dados */
  const gerarArquivoDados = (d) => CABECALHO + 'window.ACHADOS_DADOS = ' + JSON.stringify(d, null, 2) + ';\n';

  /** Garante que todos os campos existam, para o painel não quebrar */
  function normalizar(d) {
    d = d && typeof d === 'object' ? clonar(d) : {};
    d.versao = 1;
    d.hero = d.hero && typeof d.hero === 'object' ? d.hero : {};
    ['linha1', 'destaque', 'linha3', 'subtitulo', 'subtituloDestaque', 'subtituloFim', 'botaoTexto', 'botaoLink', 'imagemDescricao']
      .forEach((k) => { if (typeof d.hero[k] !== 'string') d.hero[k] = ''; });
    if (!Array.isArray(d.hero.selos)) d.hero.selos = [];
    for (let i = 0; i < 3; i++) d.hero.selos[i] = Object.assign({ linha1: '', linha2: '' }, d.hero.selos[i] || {});
    ['imagemComputador', 'imagemCelular'].forEach((k) => {
      const img = d.hero[k];
      if (!img || !Array.isArray(img.versoes) || !img.versoes.length) d.hero[k] = clonar(PADRAO_IMG[k]);
    });
    d.redes = Object.assign({ instagram: '', whatsapp: '', telegram: '' }, d.redes || {});
    d.produtosPorPagina = parseInt(d.produtosPorPagina, 10) || 12;
    d.categorias = (Array.isArray(d.categorias) ? d.categorias : []).filter((c) => c && c.id && c.nome);
    d.categoriasNoCelular = Array.isArray(d.categoriasNoCelular) ? d.categoriasNoCelular.map(String) : d.categorias.map((c) => c.id);
    d.produtos = (Array.isArray(d.produtos) ? d.produtos : []).filter((p) => p && typeof p === 'object');
    return d;
  }

  /* ============================================================ servidor */
  async function srv(acao, corpo) {
    const opcoes = corpo === undefined
      ? { credentials: 'same-origin', cache: 'no-store' }
      : {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Achados-Painel': '1' },
        body: JSON.stringify(corpo)
      };
    let r;
    try { r = await fetch('/api/admin?acao=' + acao, opcoes); } catch (e) {
      throw Object.assign(new Error('Sem conexão com o site. Confira a internet e tente de novo.'), { status: 0 });
    }
    let j = null;
    try { j = await r.json(); } catch (e) { /* resposta sem JSON */ }
    if (!r.ok || !j) throw Object.assign(new Error((j && j.erro) || `O site respondeu com erro (${r.status}). Tente de novo.`), { status: r.status });
    return j;
  }

  /** Envia uma imagem já convertida e devolve o endereço dela no site */
  async function enviarImagem(nome, dataUrl) {
    const r = await srv('imagem', { nome, dataUrl });
    return r.src;
  }

  /* =========================================================== imagens */
  const resolver = (src) => src || '';
  const maiorVersao = (img) => (img && img.versoes && img.versoes.length ? img.versoes[img.versoes.length - 1].src : '');

  function carregarImagem(arquivo) {
    return new Promise((ok, falha) => {
      if (!arquivo || !/^image\//.test(arquivo.type)) { falha(new Error('Escolha um arquivo de imagem (PNG, JPG ou WebP).')); return; }
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não consegui abrir essa imagem. Tente outro arquivo (PNG ou JPG).')); };
      img.src = url;
    });
  }

  /** Redimensiona (em etapas, para ficar nítido) e converte para WebP */
  function codificar(img, largura, transparente) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const esc = Math.min(1, largura / iw);
    const w = Math.max(1, Math.round(iw * esc)), hgt = Math.max(1, Math.round(ih * esc));
    let fonte = img, fw = iw, fh = ih;
    while (fw / 2 >= w * 1.2) {
      const c = document.createElement('canvas');
      c.width = Math.round(fw / 2); c.height = Math.round(fh / 2);
      const cx = c.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(fonte, 0, 0, c.width, c.height);
      fonte = c; fw = c.width; fh = c.height;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = hgt;
    const cx = c.getContext('2d');
    if (!transparente) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, hgt); }
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(fonte, 0, 0, w, hgt);
    let url = c.toDataURL('image/webp', 0.9);
    let ext = 'webp';
    if (url.indexOf('data:image/webp') !== 0) {
      url = transparente ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
      ext = transparente ? 'png' : 'jpg';
    }
    return { dataUrl: url, w, h: hgt, ext };
  }

  function precisaConexao() {
    if (E.modo === 'servidor') return false;
    aviso('Para enviar imagens, entre pelo site publicado (Área do proprietário). Aqui, cole o link de uma imagem.', 5600);
    return true;
  }

  async function trocarImagemTopo(campo, arquivo) {
    if (precisaConexao()) return;
    try {
      carregando('Preparando a imagem…');
      const img = await carregarImagem(arquivo);
      const alvo = LARGURAS[campo];
      const maxima = Math.min(img.naturalWidth, alvo[alvo.length - 1]);
      const larguras = Array.from(new Set(alvo.filter((w) => w < maxima).concat([maxima]))).sort((a, b) => a - b);
      const nome = campo === 'imagemComputador' ? 'topo-computador' : 'topo-celular';
      const versoes = [];
      let ultima;
      for (let i = 0; i < larguras.length; i++) {
        carregando(`Enviando a imagem (${i + 1} de ${larguras.length})…`);
        ultima = codificar(img, larguras[i], true);
        versoes.push({ src: await enviarImagem(nome, ultima.dataUrl), w: ultima.w });
      }
      URL.revokeObjectURL(img.src);
      E.dados.hero[campo] = { versoes, largura: ultima.w, altura: ultima.h };
      alterou();
      renderImagensTopo();
      aviso(img.naturalWidth < (campo === 'imagemComputador' ? 1100 : 800)
        ? 'Imagem trocada, mas ela é pequena e pode perder nitidez. Se tiver, use uma maior.'
        : 'Imagem trocada! Veja a prévia e clique em Publicar.', 5200);
    } catch (e) {
      tratarErro(e);
    } finally {
      pronto();
    }
  }

  /* ============================================================ estado */
  let rascunhoTimer;
  function alterou() {
    E.alterado = true;
    atualizarEstado();
    clearTimeout(rascunhoTimer);
    rascunhoTimer = setTimeout(salvarRascunho, 500);
  }
  const chaveRascunho = () => E.modo || 'local';
  function salvarRascunho() {
    if (!E.dados || !E.alterado) return;
    gravar(CHAVE_RASCUNHO, { chave: chaveRascunho(), versao: E.versao, dados: E.dados });
  }

  function atualizarEstado() {
    $('#estado-alterado').hidden = !E.alterado;
    const pub = $('#botao-publicar');
    pub.disabled = E.modo === 'servidor' && !E.alterado;
    $('#texto-publicar').textContent = E.modo === 'servidor' ? 'Publicar' : 'Baixar dados.js';
    $('#estado-conexao').textContent = E.modo === 'servidor' ? `Conectado: ${E.email}` : 'Modo sem conexão';
    $('#qtd-produtos').textContent = E.dados ? String(E.dados.produtos.length) : '';
  }

  /** Mostra o erro; se a sessão caiu, volta para o login sem perder o rascunho */
  function tratarErro(e) {
    if (e && e.status === 401 && E.modo === 'servidor') {
      salvarRascunho();
      aviso('Sua sessão expirou. Entre de novo — suas alterações foram guardadas.', 6500);
      E.modo = null;
      mostrarEntrada('entrar');
      return;
    }
    aviso((e && e.message) || 'Algo deu errado. Tente de novo.', 7000);
  }

  /* ============================================================ telas */
  /** Telas de entrada: 'checando', 'entrar', 'criar', 'criar-nova' ou 'sem-servidor' */
  function mostrarEntrada(tela, erro) {
    $('#tela-painel').hidden = true;
    $('#tela-entrada').hidden = false;
    $('#entrada-checando').hidden = tela !== 'checando';
    $('#form-entrar').hidden = tela !== 'entrar';
    $('#form-criar').hidden = tela !== 'criar' && tela !== 'criar-nova';
    $('#sem-servidor').hidden = tela !== 'sem-servidor';
    $$('#tela-entrada .p-erro').forEach((n) => { n.hidden = true; n.textContent = ''; });
    if (tela === 'criar' || tela === 'criar-nova') {
      const nova = tela === 'criar-nova';
      $('#criar-titulo').textContent = nova ? 'Criar uma nova senha' : 'Criar o acesso do proprietário';
      $('#criar-texto').innerHTML = nova
        ? 'Digite o seu e-mail, a nova senha e o <strong>código de ativação</strong>. A senha antiga deixa de funcionar.'
        : 'Escolha o e-mail e a senha que você vai usar para entrar no painel. Só quem tem o <strong>código de ativação</strong> consegue criar o acesso.';
      $('#criar-botao').textContent = nova ? 'Salvar nova senha e entrar' : 'Criar acesso e entrar';
      $('#criar-voltar').hidden = !nova;
    }
    const form = tela === 'entrar' ? $('#form-entrar') : (tela === 'criar' || tela === 'criar-nova') ? $('#form-criar') : null;
    if (form && erro) { const m = $('.p-erro', form); m.textContent = erro; m.hidden = false; }
    if (form) setTimeout(() => { const c = $('input:not([type=hidden])', form); if (c && !c.value) c.focus(); }, 30);
  }

  function abrirPainel(dados) {
    E.dados = normalizar(dados);
    E.alterado = false;
    const r = ler(CHAVE_RASCUNHO);
    if (r && r.chave === chaveRascunho() && r.dados && JSON.stringify(normalizar(r.dados)) !== JSON.stringify(E.dados)) {
      if (window.confirm('Você tem alterações que ainda não publicou. Quer continuar de onde parou?')) {
        E.dados = normalizar(r.dados);
        E.alterado = true;
        if (r.versao !== E.versao) aviso('Atenção: o site mudou depois desse rascunho. Ao publicar, o rascunho substitui a versão atual.', 6500);
      } else {
        apagar(CHAVE_RASCUNHO);
      }
    }
    $('#tela-entrada').hidden = true;
    $('#tela-painel').hidden = false;
    renderTudo();
    trocarAba(ler(CHAVE_ABA, true) || 'topo');
  }

  function renderTudo() {
    preencherCampos();
    renderImagensTopo();
    renderProdutos();
    renderCategorias();
    renderCelular();
    atualizarEstado();
  }

  function trocarAba(nome) {
    if (!$('#aba-' + nome)) nome = 'topo';
    $$('.p-aba').forEach((b) => b.setAttribute('aria-selected', String(b.id === 'tab-' + nome)));
    $$('.p-secao').forEach((s) => { s.hidden = s.id !== 'aba-' + nome; });
    gravar(CHAVE_ABA, nome, true);
  }

  /* ======================================================= campos simples */
  function preencherCampos() {
    $$('[data-campo]').forEach((inp) => {
      const v = pegar(E.dados, inp.getAttribute('data-campo'));
      inp.value = v === undefined || v === null ? '' : String(v);
    });
  }

  /* ======================================================= imagens do topo */
  function renderImagensTopo() {
    $$('[data-img-topo]').forEach((bloco) => {
      const campo = bloco.getAttribute('data-img-topo');
      $('img', bloco).src = resolver(maiorVersao(E.dados.hero[campo]));
      const original = JSON.stringify(E.dados.hero[campo]) === JSON.stringify(PADRAO_IMG[campo]);
      $('[data-restaurar]', bloco).hidden = original;
    });
  }

  /* ============================================================ produtos */
  function nomeCategoria(id) {
    const c = E.dados.categorias.find((x) => x.id === id);
    return c ? c.nome : (id || 'Sem categoria');
  }
  function iconeCategoria(id) {
    const c = E.dados.categorias.find((x) => x.id === id);
    return c ? c.icone : 'sacola';
  }

  function fotoMiniatura(p, classe) {
    const caixa = h('div', { class: classe });
    if (p.imagem) {
      const img = h('img', { src: resolver(p.imagem), alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
      img.addEventListener('error', () => { caixa.textContent = ''; caixa.appendChild(icone(iconeCategoria(p.categoria))); }, { once: true });
      caixa.appendChild(img);
    } else {
      caixa.appendChild(icone(iconeCategoria(p.categoria)));
    }
    return caixa;
  }

  function renderProdutos() {
    const termo = normalizarTexto($('#busca-produtos').value);
    const lista = $('#lista-produtos-painel');
    lista.textContent = '';
    const prods = E.dados.produtos;
    let mostrados = 0;
    prods.forEach((p, i) => {
      if (termo && normalizarTexto((p.titulo || '') + ' ' + (p.legenda || '')).indexOf(termo) === -1) return;
      mostrados++;
      const preco = num(p.preco), antigo = num(p.precoAntigo);
      const off = antigo > preco && preco > 0 ? Math.round((1 - preco / antigo) * 100) : 0;
      const meta = h('div', { class: 'p-item__meta' }, [
        h('span', { class: 'p-item__preco', text: preco > 0 ? moeda.format(preco) : 'sem preço' }),
        off ? h('span', { class: 'p-item__off', text: off + '% OFF' }) : null,
        h('span', { text: nomeCategoria(p.categoria) }),
        exemplo(p) ? h('span', { class: 'p-etq p-etq--exemplo', text: 'Exemplo' }) : null,
        p.maisVendido ? h('span', { class: 'p-etq p-etq--vendido', text: 'Mais vendido' }) : null,
        p.ofertaDoDia ? h('span', { class: 'p-etq p-etq--dia', text: 'Oferta do dia' }) : null,
        p.freteGratis ? h('span', { class: 'p-etq p-etq--frete', text: 'Frete grátis' }) : null
      ]);
      const sobe = h('button', { class: 'p-icone-btn', type: 'button', 'data-acao': 'subir', 'data-i': i, 'aria-label': 'Subir', title: 'Subir' }, [icone('seta-cima')]);
      const desce = h('button', { class: 'p-icone-btn', type: 'button', 'data-acao': 'descer', 'data-i': i, 'aria-label': 'Descer', title: 'Descer' }, [icone('seta-cima', 'icone gira')]);
      sobe.disabled = i === 0;
      desce.disabled = i === prods.length - 1;
      lista.appendChild(h('li', { class: 'p-item' }, [
        fotoMiniatura(p, 'p-item__foto'),
        h('div', { class: 'p-item__info' }, [
          h('p', { class: 'p-item__titulo', text: p.titulo || '(sem nome)' }),
          p.legenda ? h('p', { class: 'p-item__meta', text: p.legenda }) : null,
          meta
        ]),
        h('div', { class: 'p-item__acoes' }, [
          sobe, desce,
          h('button', { class: 'p-btn p-btn--claro', type: 'button', 'data-acao': 'editar', 'data-i': i, text: 'Editar' }),
          h('button', { class: 'p-btn p-btn--fantasma', type: 'button', 'data-acao': 'duplicar', 'data-i': i, text: 'Duplicar' }),
          h('button', { class: 'p-btn p-btn--perigo', type: 'button', 'data-acao': 'excluir', 'data-i': i, text: 'Excluir' })
        ])
      ]));
    });
    $('#vazio-produtos').hidden = mostrados > 0;
    $('#vazio-produtos').textContent = prods.length ? 'Nenhum produto encontrado.' : 'Nenhum produto ainda. Clique em “Adicionar produto”.';
    const qtdEx = prods.filter(exemplo).length;
    $('#aviso-exemplos').hidden = qtdEx === 0;
    $('#qtd-exemplos').textContent = qtdEx === 1 ? '1 produto' : qtdEx + ' produtos';
    $('#qtd-produtos').textContent = String(prods.length);
  }

  function acaoProduto(acao, i) {
    const prods = E.dados.produtos;
    const p = prods[i];
    if (!p) return;
    if (acao === 'editar') { abrirEditor(i); return; }
    if (acao === 'subir' && i > 0) { prods.splice(i - 1, 0, prods.splice(i, 1)[0]); }
    else if (acao === 'descer' && i < prods.length - 1) { prods.splice(i + 1, 0, prods.splice(i, 1)[0]); }
    else if (acao === 'duplicar') { const c = clonar(p); c.titulo = c.titulo + ' (cópia)'; prods.splice(i + 1, 0, c); }
    else if (acao === 'excluir') {
      if (!window.confirm(`Excluir “${p.titulo || 'este produto'}”?`)) return;
      prods.splice(i, 1);
      aviso('Produto excluído. Publique para tirar do site.');
    } else return;
    alterou();
    renderProdutos();
    renderCategorias();
    if (acao === 'subir' || acao === 'descer') {
      const novo = acao === 'subir' ? i - 1 : i + 1;
      const alvo = $(`[data-acao="${acao}"][data-i="${novo}"]`) || $(`[data-acao="editar"][data-i="${novo}"]`);
      if (alvo) alvo.focus();
    }
  }

  /* ---------------------------------------------------------- editor */
  let editando = -1;
  const dialogo = () => $('#editor-produto');
  const formProduto = () => $('#form-produto');

  function abrirEditor(i) {
    editando = i;
    const p = i >= 0 ? E.dados.produtos[i] : { categoria: (E.dados.categorias[0] || {}).id || '', freteGratis: false };
    const f = formProduto();
    const sel = $('#ed-categoria');
    sel.textContent = '';
    E.dados.categorias.forEach((c) => sel.appendChild(h('option', { value: c.id, text: c.nome })));
    if (p.categoria && !E.dados.categorias.some((c) => c.id === p.categoria)) sel.appendChild(h('option', { value: p.categoria, text: p.categoria + ' (não existe mais)' }));
    f.link.value = exemplo(p) && /SEU-LINK/i.test(p.link || '') ? '' : (p.link || '');
    f.titulo.value = p.titulo || '';
    f.legenda.value = p.legenda || '';
    sel.value = p.categoria || '';
    f.preco.value = paraCampo(num(p.preco), 2);
    f.precoAntigo.value = paraCampo(num(p.precoAntigo), 2);
    f.parcelas.value = p.parcelas || '';
    f.vendidos.value = p.vendidos || '';
    f.avaliacao.value = paraCampo(num(p.avaliacao), 1);
    f.avaliacoes.value = p.avaliacoes || '';
    f.imagem.value = p.imagem || '';
    f.freteGratis.checked = !!p.freteGratis;
    f.maisVendido.checked = !!p.maisVendido;
    f.ofertaDoDia.checked = !!p.ofertaDoDia;
    $('#editor-titulo').textContent = i >= 0 ? 'Editar produto' : 'Novo produto';
    $('#ed-erros').textContent = '';
    $$('.com-erro', f).forEach((n) => n.classList.remove('com-erro'));
    atualizarPreviaEditor();
    dialogo().showModal();
    (i >= 0 ? f.titulo : f.link).focus();
  }

  function lerEditor() {
    const f = formProduto();
    const erros = [];
    const marcarErro = (campo, msg) => { erros.push(msg); const n = $(`[data-erro-de="${campo}"]`, f); if (n) n.classList.add('com-erro'); };
    $$('.com-erro', f).forEach((n) => n.classList.remove('com-erro'));

    const link = f.link.value.trim();
    const titulo = f.titulo.value.trim();
    const preco = num(f.preco.value);
    const antigo = num(f.precoAntigo.value);
    const nota = num(f.avaliacao.value);
    const imagem = f.imagem.value.trim();
    if (!link) marcarErro('link', 'Cole o seu link de afiliado.');
    else if (!linkOk(link)) marcarErro('link', 'O link precisa começar com https://');
    if (!titulo) marcarErro('titulo', 'Escreva o nome do produto.');
    if (!(preco > 0)) marcarErro('preco', 'Informe o preço atual (ex.: 379,90).');
    if (f.precoAntigo.value.trim() && !(antigo > preco)) marcarErro('precoAntigo', 'O preço antigo precisa ser maior que o atual (ou deixe vazio).');
    if (imagem && !/^(https?:\/\/|img\/|\/api\/img\?p=)/i.test(imagem)) erros.push('O link da foto precisa começar com https://');
    if (f.avaliacao.value.trim() && !(nota >= 0 && nota <= 5)) erros.push('A nota vai de 0 a 5 (ex.: 4,8).');

    const p = { titulo, categoria: f.categoria.value, preco: Math.round(preco * 100) / 100 };
    const legenda = f.legenda.value.trim();
    if (legenda) p.legenda = legenda;
    if (antigo > preco) p.precoAntigo = Math.round(antigo * 100) / 100;
    const parcelas = parseInt(f.parcelas.value, 10);
    if (parcelas >= 2 && parcelas <= 24) p.parcelas = parcelas;
    p.freteGratis = f.freteGratis.checked;
    p.imagem = imagem;
    p.link = link;
    if (f.maisVendido.checked) p.maisVendido = true;
    if (f.ofertaDoDia.checked) p.ofertaDoDia = true;
    const vendidos = parseInt(f.vendidos.value, 10);
    if (vendidos > 0) p.vendidos = vendidos;
    if (f.avaliacao.value.trim() && nota >= 0 && nota <= 5) p.avaliacao = Math.round(nota * 10) / 10;
    const avs = parseInt(f.avaliacoes.value, 10);
    if (avs > 0) p.avaliacoes = avs;
    // a ordem das chaves fica igual à dos produtos já existentes
    const ordenado = {};
    ['titulo', 'legenda', 'categoria', 'preco', 'precoAntigo', 'parcelas', 'freteGratis', 'imagem', 'link', 'maisVendido', 'ofertaDoDia', 'vendidos', 'avaliacao', 'avaliacoes']
      .forEach((k) => { if (p[k] !== undefined) ordenado[k] = p[k]; });
    return { produto: ordenado, erros };
  }

  function atualizarPreviaEditor() {
    const f = formProduto();
    const preco = num(f.preco.value), antigo = num(f.precoAntigo.value);
    $('#ed-previa-titulo').textContent = f.titulo.value.trim() || 'Nome do produto';
    const leg = $('#ed-previa-legenda');
    leg.textContent = f.legenda.value.trim();
    leg.hidden = !leg.textContent;
    $('#ed-previa-preco').textContent = moeda.format(preco > 0 ? preco : 0);
    $('#ed-previa-off').textContent = antigo > preco && preco > 0 ? Math.round((1 - preco / antigo) * 100) + '% OFF' : '';
    const nova = fotoMiniatura({ imagem: f.imagem.value.trim(), categoria: f.categoria.value }, 'p-previa-produto__foto');
    nova.id = 'ed-previa-foto';
    $('#ed-previa-foto').replaceWith(nova);
  }

  async function enviarFotoProduto(arquivo) {
    if (precisaConexao()) return;
    try {
      carregando('Enviando a foto…');
      const img = await carregarImagem(arquivo);
      const r = codificar(img, 800, false);
      URL.revokeObjectURL(img.src);
      const nome = slug(formProduto().titulo.value || arquivo.name.replace(/\.[^.]+$/, ''));
      formProduto().imagem.value = await enviarImagem(nome, r.dataUrl);
      atualizarPreviaEditor();
      aviso('Foto enviada! Agora é só salvar o produto.');
    } catch (e) {
      tratarErro(e);
    } finally {
      pronto();
    }
  }

  /* ========================================================== categorias */
  function contarProdutos(id) { return E.dados.produtos.filter((p) => p.categoria === id).length; }

  function seletorIcone(atual, aoMudar) {
    const sel = h('select', { 'aria-label': 'Ícone' });
    ICONES.forEach(([id, nome]) => sel.appendChild(h('option', { value: id, text: nome })));
    sel.value = atual;
    sel.addEventListener('change', () => aoMudar(sel.value));
    return sel;
  }

  function renderCategorias() {
    const lista = $('#lista-categorias-painel');
    lista.textContent = '';
    const cats = E.dados.categorias;
    cats.forEach((c, i) => {
      const caixaIcone = h('span', { class: 'p-cat__icone' }, [icone(c.icone)]);
      const nome = h('input', { type: 'text', value: c.nome, maxlength: 30, 'aria-label': 'Nome da categoria' });
      nome.addEventListener('input', () => { c.nome = nome.value; alterou(); renderCelular(); });
      nome.addEventListener('blur', () => { if (!nome.value.trim()) { nome.value = c.nome = c.nome.trim() || 'Sem nome'; alterou(); renderCelular(); } });
      const sel = seletorIcone(c.icone, (v) => {
        c.icone = v;
        caixaIcone.textContent = '';
        caixaIcone.appendChild(icone(v));
        alterou();
        renderCelular();
      });
      const qtd = contarProdutos(c.id);
      const sobe = h('button', { class: 'p-icone-btn', type: 'button', 'aria-label': `Subir ${c.nome}`, title: 'Subir' }, [icone('seta-cima')]);
      const desce = h('button', { class: 'p-icone-btn', type: 'button', 'aria-label': `Descer ${c.nome}`, title: 'Descer' }, [icone('seta-cima', 'icone gira')]);
      const exc = h('button', { class: 'p-icone-btn p-icone-btn--perigo', type: 'button', 'aria-label': `Excluir ${c.nome}`, title: 'Excluir' }, [icone('fechar')]);
      sobe.disabled = i === 0;
      desce.disabled = i === cats.length - 1;
      sobe.addEventListener('click', () => { cats.splice(i - 1, 0, cats.splice(i, 1)[0]); alterou(); renderCategorias(); });
      desce.addEventListener('click', () => { cats.splice(i + 1, 0, cats.splice(i, 1)[0]); alterou(); renderCategorias(); });
      exc.addEventListener('click', () => {
        if (qtd) { window.alert(`“${c.nome}” tem ${qtd} produto${qtd > 1 ? 's' : ''}. Mude esses produtos de categoria antes de excluir.`); return; }
        if (!window.confirm(`Excluir a categoria “${c.nome}”?`)) return;
        cats.splice(i, 1);
        E.dados.categoriasNoCelular = E.dados.categoriasNoCelular.filter((id) => id !== c.id);
        alterou(); renderCategorias(); renderCelular();
      });
      lista.appendChild(h('li', { class: 'p-cat' }, [
        caixaIcone,
        h('div', { class: 'p-cat__campos' }, [nome, sel, h('span', { class: 'p-cat__info', text: qtd === 1 ? '1 produto' : qtd + ' produtos' })]),
        h('div', { class: 'p-cat__acoes' }, [sobe, desce, exc])
      ]));
    });
  }

  function renderCelular() {
    const lista = $('#lista-celular-painel');
    lista.textContent = '';
    const todos = E.dados.categorias.concat([OFERTAS_DO_DIA]);
    const porId = Object.fromEntries(todos.map((c) => [c.id, c]));
    const mostrados = E.dados.categoriasNoCelular.filter((id) => porId[id]);
    E.dados.categoriasNoCelular = mostrados;
    const ordem = mostrados.concat(todos.map((c) => c.id).filter((id) => mostrados.indexOf(id) === -1));
    ordem.forEach((id) => {
      const c = porId[id];
      const pos = mostrados.indexOf(id);
      const marcado = pos > -1;
      const caixa = h('input', { type: 'checkbox', 'aria-label': `Mostrar ${c.nome} no celular` });
      caixa.checked = marcado;
      caixa.addEventListener('change', () => {
        if (caixa.checked) mostrados.push(id); else mostrados.splice(mostrados.indexOf(id), 1);
        E.dados.categoriasNoCelular = mostrados.slice();
        alterou(); renderCelular();
      });
      const mover = (d) => {
        const j = pos + d;
        if (j < 0 || j >= mostrados.length) return;
        mostrados.splice(j, 0, mostrados.splice(pos, 1)[0]);
        E.dados.categoriasNoCelular = mostrados.slice();
        alterou(); renderCelular();
      };
      const sobe = h('button', { class: 'p-icone-btn', type: 'button', 'aria-label': `Subir ${c.nome}`, title: 'Subir' }, [icone('seta-cima')]);
      const desce = h('button', { class: 'p-icone-btn', type: 'button', 'aria-label': `Descer ${c.nome}`, title: 'Descer' }, [icone('seta-cima', 'icone gira')]);
      sobe.disabled = !marcado || pos === 0;
      desce.disabled = !marcado || pos === mostrados.length - 1;
      sobe.addEventListener('click', () => mover(-1));
      desce.addEventListener('click', () => mover(1));
      lista.appendChild(h('li', { class: 'p-cat' + (marcado ? '' : ' oculto') }, [
        h('label', { class: 'p-marca' }, [caixa]),
        h('span', { class: 'p-cat__icone' }, [icone(c.icone)]),
        h('span', { class: 'p-cat__nome', text: c.nome + (marcado ? '' : ' (só nos filtros)') }),
        h('div', { class: 'p-cat__acoes' }, [sobe, desce])
      ]));
    });
    lista.appendChild(h('li', { class: 'p-cat__info', text: `${mostrados.length} atalho${mostrados.length === 1 ? '' : 's'} no celular${mostrados.length % 4 ? ' — múltiplos de 4 deixam as linhas completas' : ''}.` }));
  }

  /* ============================================================ prévia */
  function abrirPrevia() {
    const janela = window.open('', 'achados-previa');
    if (!gravar(CHAVE_PREVIA, E.dados)) aviso('Não consegui abrir a prévia neste navegador.', 5000);
    const url = 'index.html?previa=1';
    if (janela) janela.location.href = url; else window.location.href = url;
  }

  /* ============================================================ publicar */
  function baixarArquivo() {
    const blob = new Blob([gerarArquivoDados(E.dados)], { type: 'text/javascript;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'dados.js' });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function publicar() {
    if (E.modo !== 'servidor') {
      baixarArquivo();
      aviso('Arquivo baixado! Envie para a hospedagem na pasta js/, substituindo o dados.js.', 7000);
      return;
    }
    if (!E.alterado) { aviso('Nada novo para publicar.'); return; }
    const exemplos = E.dados.produtos.filter(exemplo).length;
    if (exemplos && !window.confirm(`${exemplos} produto${exemplos > 1 ? 's ainda estão' : ' ainda está'} sem o seu link de afiliado (aparece${exemplos > 1 ? 'm' : ''} como “Exemplo”). Publicar mesmo assim?`)) return;
    try {
      carregando('Publicando…');
      let r;
      try {
        r = await srv('salvar', { dados: E.dados, versaoBase: E.versao });
      } catch (e) {
        if (e.status !== 409) throw e;
        pronto();
        if (!window.confirm('O site foi alterado em outro aparelho depois que você abriu o painel.\n\nPublicar mesmo assim vai substituir essas alterações. Continuar?')) return;
        carregando('Publicando…');
        r = await srv('salvar', { dados: E.dados, versaoBase: E.versao, forcar: true });
      }
      E.versao = r.versao || null;
      E.alterado = false;
      apagar(CHAVE_RASCUNHO);
      atualizarEstado();
      aviso('Publicado! O site já está atualizado.', 6000);
    } catch (e) {
      tratarErro(e);
    } finally {
      pronto();
    }
  }

  async function sair(semPerguntar) {
    if (!semPerguntar && E.alterado && !window.confirm('Você tem alterações não publicadas. Elas ficam guardadas neste aparelho como rascunho. Sair mesmo assim?')) return;
    salvarRascunho();
    if (E.modo === 'servidor') { try { await srv('sair', {}); } catch (e) { /* já saiu */ } }
    E.modo = null; E.dados = null; E.alterado = false;
    mostrarEntrada(E.temServidor ? 'entrar' : 'sem-servidor');
  }

  /* ============================================================ entrada */
  async function entrarNoServidor() {
    carregando('Abrindo o painel…');
    try {
      const r = await srv('dados');
      E.modo = 'servidor';
      E.email = r.email;
      E.versao = r.versao || null;
      abrirPainel(r.dados);
    } finally {
      pronto();
    }
  }

  function erroNoForm(form, msg) {
    const m = $('.p-erro', form);
    m.textContent = msg;
    m.hidden = false;
  }

  function ligarEntrada() {
    const fEntrar = $('#form-entrar');
    fEntrar.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = fEntrar.email.value.trim(), senha = fEntrar.senha.value;
      if (!email || !senha) { erroNoForm(fEntrar, 'Digite o e-mail e a senha.'); return; }
      const botao = $('button[type=submit]', fEntrar);
      botao.disabled = true;
      try {
        await srv('entrar', { email, senha });
        fEntrar.senha.value = '';
        await entrarNoServidor();
      } catch (e) {
        erroNoForm(fEntrar, e.message);
      } finally {
        botao.disabled = false;
      }
    });

    const fCriar = $('#form-criar');
    fCriar.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = fCriar.email.value.trim(), senha = fCriar.senha.value, senha2 = fCriar.senha2.value, codigo = fCriar.codigo.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { erroNoForm(fCriar, 'Digite um e-mail válido.'); return; }
      if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) { erroNoForm(fCriar, 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'); return; }
      if (senha !== senha2) { erroNoForm(fCriar, 'As duas senhas não estão iguais.'); return; }
      if (!codigo) { erroNoForm(fCriar, 'Digite o código de ativação.'); return; }
      const botao = $('#criar-botao');
      botao.disabled = true;
      try {
        await srv('criar', { email, senha, codigo });
        fCriar.reset();
        await entrarNoServidor();
        aviso('Acesso criado! Guarde bem o seu e-mail e a sua senha.', 6000);
      } catch (e) {
        erroNoForm(fCriar, e.message);
      } finally {
        botao.disabled = false;
      }
    });

    $$('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrarEntrada(b.getAttribute('data-ir'))));

    $('#botao-local').addEventListener('click', () => {
      E.modo = 'local';
      E.versao = null;
      abrirPainel(window.ACHADOS_DADOS || {});
      aviso('Modo sem conexão: ao terminar, use “Baixar dados.js”.', 5200);
    });
  }

  /* ============================================================ eventos */
  function ligarPainel() {
    $$('.p-aba').forEach((b) => b.addEventListener('click', () => trocarAba(b.id.replace('tab-', ''))));

    // Campos simples (topo, redes, ajustes)
    $('#tela-painel').addEventListener('input', (ev) => {
      const inp = ev.target.closest('[data-campo]');
      if (!inp) return;
      let v = inp.value;
      if (inp.getAttribute('data-tipo') === 'inteiro') v = Math.min(60, Math.max(4, parseInt(v, 10) || 12));
      definir(E.dados, inp.getAttribute('data-campo'), v);
      alterou();
    });

    // Sem conexão não dá para enviar arquivos: avisa antes de abrir o seletor
    document.addEventListener('click', (ev) => {
      const rotulo = ev.target.closest('.p-btn--arquivo');
      if (rotulo && E.modo !== 'servidor') { ev.preventDefault(); precisaConexao(); }
    }, true);

    // Imagens do topo
    $$('[data-img-topo]').forEach((bloco) => {
      const campo = bloco.getAttribute('data-img-topo');
      const arquivo = $('input[type=file]', bloco);
      arquivo.addEventListener('change', () => {
        if (arquivo.files[0]) trocarImagemTopo(campo, arquivo.files[0]);
        arquivo.value = '';
      });
      $('[data-restaurar]', bloco).addEventListener('click', () => {
        E.dados.hero[campo] = clonar(PADRAO_IMG[campo]);
        alterou();
        renderImagensTopo();
        aviso('Voltou para a imagem original.');
      });
    });

    // Produtos
    $('#busca-produtos').addEventListener('input', renderProdutos);
    $('#lista-produtos-painel').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-acao]');
      if (b) acaoProduto(b.getAttribute('data-acao'), parseInt(b.getAttribute('data-i'), 10));
    });
    $('#botao-novo-produto').addEventListener('click', () => abrirEditor(-1));
    $('#botao-remover-exemplos').addEventListener('click', () => {
      const qtd = E.dados.produtos.filter(exemplo).length;
      if (!window.confirm(`Remover os ${qtd} produtos de exemplo? Os seus produtos (com link de afiliado) continuam.`)) return;
      E.dados.produtos = E.dados.produtos.filter((p) => !exemplo(p));
      alterou(); renderProdutos(); renderCategorias();
      aviso('Exemplos removidos. Publique para atualizar o site.');
    });

    // Editor
    const f = formProduto();
    f.addEventListener('input', atualizarPreviaEditor);
    f.addEventListener('change', atualizarPreviaEditor);
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const r = lerEditor();
      const caixa = $('#ed-erros');
      caixa.textContent = '';
      if (r.erros.length) {
        r.erros.forEach((m) => caixa.appendChild(h('p', { text: m })));
        caixa.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (editando >= 0) E.dados.produtos[editando] = r.produto; else E.dados.produtos.unshift(r.produto);
      alterou();
      renderProdutos();
      renderCategorias();
      dialogo().close();
      aviso(editando >= 0 ? 'Produto atualizado. Lembre de publicar.' : 'Produto adicionado no topo da lista. Lembre de publicar.');
    });
    $$('[data-fechar]', dialogo()).forEach((b) => b.addEventListener('click', () => dialogo().close()));
    const arq = $('#ed-arquivo');
    arq.addEventListener('change', () => { if (arq.files[0]) enviarFotoProduto(arq.files[0]); arq.value = ''; });

    // Categorias
    $('#form-nova-categoria').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const campo = ev.target.nome;
      const nome = campo.value.trim();
      if (!nome) return;
      let id = slug(nome), n = 2;
      const existe = (x) => x === OFERTAS_DO_DIA.id || x === 'todas' || E.dados.categorias.some((c) => c.id === x);
      while (existe(id)) id = slug(nome) + '-' + n++;
      E.dados.categorias.push({ id, nome, icone: 'sacola' });
      campo.value = '';
      alterou(); renderCategorias(); renderCelular();
      aviso(`Categoria “${nome}” criada. Escolha um ícone para ela.`);
    });

    // Topo do painel
    $('#botao-previa').addEventListener('click', abrirPrevia);
    $('#botao-publicar').addEventListener('click', publicar);
    $('#botao-baixar').addEventListener('click', baixarArquivo);
    $('#botao-sair').addEventListener('click', () => sair(false));

    window.addEventListener('beforeunload', (ev) => {
      if (E.alterado) { salvarRascunho(); ev.preventDefault(); ev.returnValue = ''; }
    });
  }

  /* ============================================================ início */
  async function iniciar() {
    ligarEntrada();
    ligarPainel();
    mostrarEntrada('checando');
    let estado;
    try {
      estado = await srv('estado');
      E.temServidor = true;
    } catch (e) {
      E.temServidor = false;
      mostrarEntrada('sem-servidor');
      return;
    }
    if (estado.logado) {
      try { await entrarNoServidor(); } catch (e) { mostrarEntrada('entrar', e.message); }
    } else {
      mostrarEntrada(estado.configurado ? 'entrar' : 'criar');
    }
  }

  iniciar();
})();
