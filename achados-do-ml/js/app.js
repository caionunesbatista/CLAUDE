/* ==========================================================================
   Achados do ML — funcionamento do site
   Você não precisa editar este arquivo: produtos em js/produtos.js e
   configurações em js/config.js.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = window.ACHADOS_CONFIG || {};
  var BRUTOS = Array.isArray(window.ACHADOS_PRODUTOS) ? window.ACHADOS_PRODUTOS : [];
  var POR_PAGINA = Math.max(4, parseInt(CONFIG.produtosPorPagina, 10) || 12);
  var ICONES_VALIDOS = {
    celular: 1, notebook: 1, fone: 1, controle: 1, casa: 1, liquidificador: 1, haltere: 1, camiseta: 1,
    brilho: 1, bebe: 1, pet: 1, ferramenta: 1, carro: 1, livro: 1, relogio: 1, presente: 1, geladeira: 1,
    tv: 1, camera: 1, sofa: 1, bicicleta: 1, saude: 1, brinquedo: 1, cozinha: 1, sacola: 1, pacote: 1,
    'etiqueta-pct': 1
  };
  var OFERTAS_DO_DIA = { id: 'ofertas-do-dia', nome: 'Ofertas do Dia', icone: 'etiqueta-pct', especial: true };

  /* ---------------------------------------------------------------- util */
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  function el(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style') n.setAttribute('style', v);
        else n.setAttribute(k, v === true ? '' : String(v));
      });
    }
    (filhos || []).forEach(function (f) {
      if (f === null || f === undefined || f === false) return;
      n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
    return n;
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function icone(nome, classe) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', classe || 'icone');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#i-' + nome);
    svg.appendChild(use);
    return svg;
  }

  /** minúsculas e sem acento, para a busca achar "audio" em "Áudio" */
  function normalizar(txt) {
    return String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  /** Quebra opcional (hífen) em palavras muito longas, ex.: Eletro-portáteis */
  function hifenizar(nome) {
    var vogal = /[aeiouáéíóúâêôãõà]/i;
    return String(nome).split(' ').map(function (p) {
      if (p.length < 12) return p;
      var meio = Math.floor(p.length / 2);
      var melhor = -1;
      for (var i = 2; i < p.length - 3; i++) {
        if (vogal.test(p[i - 1]) && !vogal.test(p[i]) && vogal.test(p[i + 1])) {
          if (melhor < 0 || Math.abs(i - meio) < Math.abs(melhor - meio)) melhor = i;
        }
      }
      return melhor > 0 ? p.slice(0, melhor) + '­' + p.slice(melhor) : p;
    }).join(' ');
  }

  var fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var fmtInteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var fmtNota = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function numero(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (typeof v === 'string') {
      // aceita "1.299,90", "1299,90" e "1299.90"
      var s = v.replace(/[^\d,.-]/g, '');
      if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
      return parseFloat(s);
    }
    return NaN;
  }

  function linkValido(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
  }
  function linkDeExemplo(url) {
    return !linkValido(url) || /SEU-LINK/i.test(url);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  /* ------------------------------------------------------- categorias */
  var CATEGORIAS = (Array.isArray(CONFIG.categorias) ? CONFIG.categorias : [])
    .filter(function (c) { return c && c.id && c.nome; })
    .map(function (c) {
      return { id: String(c.id), nome: String(c.nome), icone: ICONES_VALIDOS[c.icone] ? c.icone : 'sacola' };
    });
  var POR_ID = {};
  CATEGORIAS.forEach(function (c) { POR_ID[c.id] = c; });
  POR_ID[OFERTAS_DO_DIA.id] = OFERTAS_DO_DIA;

  /* --------------------------------------------------------- produtos */
  var PRODUTOS = [];
  BRUTOS.forEach(function (p, i) {
    if (!p || typeof p !== 'object') return;
    var titulo = String(p.titulo || '').trim();
    var preco = numero(p.preco);
    if (!titulo || !(preco > 0)) {
      console.warn('[Achados do ML] Produto #' + (i + 1) + ' ignorado: precisa de "titulo" e "preco".', p);
      return;
    }
    var antigo = numero(p.precoAntigo);
    if (!(antigo > preco)) antigo = NaN;
    var desconto = antigo > 0 ? Math.round((1 - preco / antigo) * 100) : 0;
    var parcelas = parseInt(p.parcelas, 10);
    if (!(parcelas >= 2 && parcelas <= 24)) parcelas = 0;
    var categoria = String(p.categoria || '').trim();
    if (!POR_ID[categoria] || categoria === OFERTAS_DO_DIA.id) {
      console.warn('[Achados do ML] "' + titulo + '": categoria "' + categoria + '" não existe em js/config.js.');
    }
    var nota = numero(p.avaliacao);
    PRODUTOS.push({
      ordem: i,
      titulo: titulo,
      categoria: categoria,
      preco: preco,
      precoAntigo: antigo,
      desconto: desconto,
      parcelas: parcelas,
      freteGratis: p.freteGratis === true,
      imagem: typeof p.imagem === 'string' ? p.imagem.trim() : '',
      link: typeof p.link === 'string' ? p.link.trim() : '',
      exemplo: linkDeExemplo(p.link),
      maisVendido: p.maisVendido === true,
      ofertaDoDia: p.ofertaDoDia === true,
      avaliacao: nota >= 0 && nota <= 5 ? nota : NaN,
      avaliacoes: parseInt(p.avaliacoes, 10) || 0,
      busca: normalizar(titulo + ' ' + (POR_ID[categoria] ? POR_ID[categoria].nome : categoria))
    });
  });

  function contarCategoria(id) {
    if (id === 'todas') return PRODUTOS.length;
    if (id === OFERTAS_DO_DIA.id) return PRODUTOS.filter(function (p) { return p.ofertaDoDia; }).length;
    return PRODUTOS.filter(function (p) { return p.categoria === id; }).length;
  }

  /* ------------------------------------------------------------ estado */
  var ORDENS = { relevancia: 1, 'menor-preco': 1, 'maior-preco': 1, desconto: 1 };
  var estado = { categoria: 'todas', busca: '', ordem: 'relevancia', frete: false, limite: POR_PAGINA };

  function lerUrl() {
    try {
      var q = new URLSearchParams(window.location.search);
      var c = q.get('categoria');
      if (c && POR_ID[c]) estado.categoria = c;
      var b = q.get('busca');
      if (b) estado.busca = b.slice(0, 80);
      var o = q.get('ordem');
      if (o && ORDENS[o]) estado.ordem = o;
      if (q.get('frete') === '1') estado.frete = true;
    } catch (e) { /* navegador sem URLSearchParams: segue com o padrão */ }
  }

  function gravarUrl() {
    try {
      var q = new URLSearchParams();
      if (estado.categoria !== 'todas') q.set('categoria', estado.categoria);
      if (estado.busca) q.set('busca', estado.busca);
      if (estado.ordem !== 'relevancia') q.set('ordem', estado.ordem);
      if (estado.frete) q.set('frete', '1');
      var s = q.toString();
      var url = window.location.pathname + (s ? '?' + s : '') + window.location.hash;
      window.history.replaceState(null, '', url);
    } catch (e) { /* aberto como arquivo local: sem problema, só não grava na URL */ }
  }

  /* -------------------------------------------------------------- card */
  function fotoVazia(p) {
    var cat = POR_ID[p.categoria];
    return el('div', { class: 'foto-vazia', role: 'img', 'aria-label': 'Foto ilustrativa' }, [icone(cat ? cat.icone : 'sacola')]);
  }

  function precoEmPartes(valor) {
    var txt = fmtMoeda.format(valor).replace(/ /g, ' ');
    var m = txt.match(/^(.*),(\d{2})$/);
    if (!m) return [txt];
    // centavos pequenos e no alto, como no Mercado Livre: R$ 1.299⁹⁰
    return [m[1], el('sup', { text: m[2] })];
  }

  function criarCard(p, i) {
    var cat = POR_ID[p.categoria];
    var midia = el('div', { class: 'produto__midia' });

    if (p.imagem) {
      var img = el('img', {
        class: 'produto__img', src: p.imagem, alt: p.titulo, loading: i < 4 ? 'eager' : 'lazy',
        decoding: 'async', width: 500, height: 500, referrerpolicy: 'no-referrer'
      });
      img.addEventListener('error', function () {
        if (img.parentNode) img.parentNode.replaceChild(fotoVazia(p), img);
      }, { once: true });
      midia.appendChild(img);
    } else {
      midia.appendChild(fotoVazia(p));
    }

    var selos = el('div', { class: 'produto__selos' });
    if (p.maisVendido) selos.appendChild(el('span', { class: 'selo selo--vendido' }, [icone('estrela'), 'Mais vendido']));
    if (p.ofertaDoDia) selos.appendChild(el('span', { class: 'selo selo--dia' }, ['Oferta do dia']));
    if (selos.childNodes.length) midia.appendChild(selos);
    if (p.exemplo) midia.appendChild(el('span', { class: 'selo selo--exemplo', title: 'Troque pelo seu link de afiliado em js/produtos.js' }, ['Exemplo']));

    var corpo = el('div', { class: 'produto__corpo' });
    if (cat) corpo.appendChild(el('span', { class: 'produto__cat', text: cat.nome }));
    corpo.appendChild(el('h3', { class: 'produto__titulo', title: p.titulo, text: p.titulo }));

    if (p.avaliacao >= 0) {
      corpo.appendChild(el('p', { class: 'produto__nota', 'aria-label': 'Nota ' + fmtNota.format(p.avaliacao) + ' de 5' }, [
        icone('estrela'),
        fmtNota.format(p.avaliacao),
        p.avaliacoes ? el('span', { text: '(' + fmtInteiro.format(p.avaliacoes) + ')' }) : null
      ]));
    }

    var precos = el('div', { class: 'produto__precos' });
    if (p.precoAntigo > 0) {
      precos.appendChild(el('s', { class: 'produto__de' }, [
        el('span', { class: 'sr-only', text: 'De ' }),
        fmtMoeda.format(p.precoAntigo).replace(/ /g, ' ')
      ]));
    }
    var por = el('div', { class: 'produto__por' }, [
      el('span', { class: 'sr-only', text: p.precoAntigo > 0 ? 'por ' : 'Preço: ' }),
      el('span', { class: 'produto__valor', 'aria-label': fmtMoeda.format(p.preco) }, precoEmPartes(p.preco))
    ]);
    if (p.desconto >= 1) por.appendChild(el('span', { class: 'produto__off', text: p.desconto + '% OFF' }));
    precos.appendChild(por);
    if (p.parcelas) {
      precos.appendChild(el('p', { class: 'produto__parcelas' }, [
        'em ' + p.parcelas + 'x ' + fmtMoeda.format(p.preco / p.parcelas).replace(/ /g, ' ') + ' ',
        el('span', { text: 'sem juros' })
      ]));
    }
    corpo.appendChild(precos);

    if (p.freteGratis) corpo.appendChild(el('p', { class: 'produto__frete' }, [icone('caminhao'), 'Frete grátis']));

    var btn = el('a', {
      class: 'produto__btn',
      href: p.exemplo ? '#ofertas' : p.link,
      target: p.exemplo ? null : '_blank',
      rel: p.exemplo ? null : 'noopener noreferrer sponsored nofollow',
      'aria-label': 'Ver ' + p.titulo + ' no Mercado Livre' + (p.exemplo ? ' (produto de exemplo)' : ' (abre em nova aba)'),
      'data-exemplo': p.exemplo ? '1' : null
    }, [
      el('span', { class: 'curto', text: 'Ver no ML' }),
      el('span', { class: 'longo', text: 'Ver no Mercado Livre' }),
      icone('link-externo')
    ]);
    corpo.appendChild(btn);

    var li = el('li', { style: '--i:' + (i % POR_PAGINA) }, [el('article', { class: 'produto' }, [midia, corpo])]);
    return li;
  }

  /* -------------------------------------------------- filtro e ordem */
  function filtrar() {
    var termos = normalizar(estado.busca).split(/\s+/).filter(Boolean);
    var lista = PRODUTOS.filter(function (p) {
      if (estado.categoria === OFERTAS_DO_DIA.id) { if (!p.ofertaDoDia) return false; }
      else if (estado.categoria !== 'todas' && p.categoria !== estado.categoria) return false;
      if (estado.frete && !p.freteGratis) return false;
      for (var i = 0; i < termos.length; i++) if (p.busca.indexOf(termos[i]) === -1) return false;
      return true;
    });
    var ord = {
      relevancia: function (a, b) { return a.ordem - b.ordem; },
      'menor-preco': function (a, b) { return a.preco - b.preco || a.ordem - b.ordem; },
      'maior-preco': function (a, b) { return b.preco - a.preco || a.ordem - b.ordem; },
      desconto: function (a, b) { return b.desconto - a.desconto || a.ordem - b.ordem; }
    }[estado.ordem];
    return lista.sort(ord);
  }

  /* -------------------------------------------------------- elementos */
  var listaEl = $('#lista-produtos');
  var vazioEl = $('#vazio');
  var vazioTextoEl = $('#vazio-texto');
  var resultadoEl = $('#resultado');
  var verMaisEl = $('#ver-mais');
  var chipsEl = $('#chips');
  var ordemEl = $('#ordem');
  var freteEl = $('#so-frete');
  var camposBusca = $$('[data-busca]');
  var limparBuscaEl = $('[data-limpar-busca]');

  /* ------------------------------------------------------ renderização */
  function renderizarProdutos() {
    var lista = filtrar();
    var visiveis = lista.slice(0, estado.limite);
    var frag = document.createDocumentFragment();
    visiveis.forEach(function (p, i) { frag.appendChild(criarCard(p, i)); });
    listaEl.replaceChildren ? listaEl.replaceChildren(frag) : (listaEl.innerHTML = '', listaEl.appendChild(frag));

    var total = lista.length;
    var nomeCat = estado.categoria !== 'todas' && POR_ID[estado.categoria] ? POR_ID[estado.categoria].nome : '';
    resultadoEl.textContent = '';
    if (total) {
      var partes = [el('strong', { text: total + (total === 1 ? ' oferta' : ' ofertas') }), total === 1 ? ' encontrada' : ' encontradas'];
      if (nomeCat) partes.push(' em ' + nomeCat);
      if (estado.busca) partes.push(' para “' + estado.busca + '”');
      partes.forEach(function (x) { resultadoEl.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    }

    vazioEl.hidden = total > 0;
    if (!total) {
      if (!PRODUTOS.length) vazioTextoEl.textContent = 'Ainda não há ofertas cadastradas. Volte em breve!';
      else if (estado.busca) vazioTextoEl.textContent = 'Não achamos nada para “' + estado.busca + '”' + (nomeCat ? ' em ' + nomeCat : '') + '. Tente outra palavra ou veja todas as ofertas.';
      else vazioTextoEl.textContent = 'Ainda não temos ofertas' + (nomeCat ? ' em ' + nomeCat : '') + (estado.frete ? ' com frete grátis' : '') + '. Veja as outras categorias!';
    }
    $('[data-limpar-filtros]', vazioEl).hidden = !PRODUTOS.length;

    var restantes = total - visiveis.length;
    verMaisEl.hidden = restantes <= 0;
    if (restantes > 0) {
      verMaisEl.firstChild.nodeValue = 'Ver mais ofertas (' + restantes + ') ';
    }
  }

  function renderizarChips() {
    var opcoes = [{ id: 'todas', nome: 'Todas', icone: null }].concat(CATEGORIAS);
    if (contarCategoria(OFERTAS_DO_DIA.id)) opcoes.push(OFERTAS_DO_DIA);
    var frag = document.createDocumentFragment();
    opcoes.forEach(function (c) {
      frag.appendChild(el('button', {
        class: 'chip', type: 'button', 'data-categoria': c.id, 'aria-pressed': String(estado.categoria === c.id)
      }, [
        c.icone ? icone(c.icone) : null,
        c.nome,
        el('span', { class: 'chip__qtd', 'aria-label': contarCategoria(c.id) + ' ofertas', text: String(contarCategoria(c.id)) })
      ]));
    });
    chipsEl.replaceChildren ? chipsEl.replaceChildren(frag) : (chipsEl.innerHTML = '', chipsEl.appendChild(frag));
  }

  function renderizarCategorias() {
    var grade = $('#grade-categorias');
    var todos = CATEGORIAS.concat([OFERTAS_DO_DIA]);
    var noCelular = Array.isArray(CONFIG.categoriasNoCelular) && CONFIG.categoriasNoCelular.length
      ? CONFIG.categoriasNoCelular.map(String) : todos.map(function (c) { return c.id; });
    grade.style.setProperty('--colunas', String(Math.min(todos.length, 9)));
    var frag = document.createDocumentFragment();
    todos.forEach(function (c) {
      var posCel = noCelular.indexOf(c.id);
      var li = el('li', { class: posCel < 0 ? 'cat-li--so-pc' : null, style: posCel >= 0 ? 'order:' + posCel : null });
      var quebra = c.nome.indexOf(' ') > -1 && c.nome.length > 12;
      var a = el('a', { class: 'cat', href: '#ofertas', 'data-categoria': c.id }, [
        icone(c.icone, 'cat__icone'),
        el('span', { class: 'cat__nome' + (quebra ? ' cat__nome--quebra' : ''), text: hifenizar(c.nome) })
      ]);
      li.appendChild(a);
      frag.appendChild(li);
    });
    grade.appendChild(frag);

    // Dropdown do topo, menu do celular e rodapé
    [['#lista-dropdown', true], ['#lista-gaveta', false], ['#lista-rodape', false]].forEach(function (par) {
      var alvo = $(par[0]);
      if (!alvo) return;
      var f = document.createDocumentFragment();
      todos.forEach(function (c) {
        var filhos = par[0] === '#lista-rodape' ? [c.nome] : [icone(c.icone), c.nome];
        if (par[1]) filhos.push(el('span', { class: 'qtd', text: String(contarCategoria(c.id)) }));
        var attrs = { href: '#ofertas', 'data-categoria': c.id };
        if (par[0] === '#lista-gaveta') attrs['data-fechar-menu'] = '';
        f.appendChild(el('li', null, [el('a', attrs, filhos)]));
      });
      alvo.appendChild(f);
    });
  }

  function marcarCategoriaAtiva() {
    $$('.cat').forEach(function (a) { a.classList.toggle('ativa', a.getAttribute('data-categoria') === estado.categoria); });
    $$('.chip', chipsEl).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-categoria') === estado.categoria)); });
  }

  function trazerChipAtivoParaVista() {
    var ativo = $('.chip[aria-pressed="true"]', chipsEl);
    var trilho = chipsEl.parentNode;
    if (!ativo || !trilho || trilho.scrollWidth <= trilho.clientWidth) return;
    var alvo = ativo.offsetLeft - (trilho.clientWidth - ativo.offsetWidth) / 2;
    trilho.scrollTo({ left: Math.max(0, alvo), behavior: 'smooth' });
  }

  function atualizar(opcoes) {
    opcoes = opcoes || {};
    if (!opcoes.manterLimite) estado.limite = POR_PAGINA;
    marcarCategoriaAtiva();
    renderizarProdutos();
    gravarUrl();
    camposBusca.forEach(function (c) { if (c.value !== estado.busca && document.activeElement !== c) c.value = estado.busca; });
    if (limparBuscaEl) limparBuscaEl.hidden = !estado.busca;
  }

  function irParaOfertas() {
    var alvo = $('#ofertas');
    if (!alvo) return;
    var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
  }

  function definirCategoria(id) {
    estado.categoria = POR_ID[id] ? id : 'todas';
    atualizar();
    trazerChipAtivoParaVista();
  }

  /* ----------------------------------------------------- mais vendidos */
  function renderizarMaisVendidos() {
    var secao = $('#mais-vendidos');
    var trilho = $('#lista-mais-vendidos');
    var lista = PRODUTOS.filter(function (p) { return p.maisVendido; });
    if (!lista.length) {
      secao.hidden = true;
      $$('a[href="#mais-vendidos"]').forEach(function (a) { var li = a.closest('li'); if (li) li.hidden = true; });
      return;
    }
    var frag = document.createDocumentFragment();
    lista.forEach(function (p, i) { frag.appendChild(criarCard(p, i + 4)); });
    trilho.appendChild(frag);

    var setas = $$('[data-carrossel]');
    function passo() {
      var item = trilho.firstElementChild;
      if (!item) return trilho.clientWidth;
      var gap = parseFloat(getComputedStyle(trilho).columnGap) || 0;
      var visiveis = Math.max(1, Math.floor((trilho.clientWidth + gap) / (item.offsetWidth + gap)));
      return visiveis * (item.offsetWidth + gap);
    }
    function atualizarSetas() {
      var max = trilho.scrollWidth - trilho.clientWidth - 2;
      setas.forEach(function (b) {
        var dir = parseInt(b.getAttribute('data-carrossel'), 10);
        b.disabled = dir < 0 ? trilho.scrollLeft <= 2 : trilho.scrollLeft >= max;
      });
    }
    setas.forEach(function (b) {
      b.addEventListener('click', function () {
        trilho.scrollBy({ left: passo() * parseInt(b.getAttribute('data-carrossel'), 10), behavior: 'smooth' });
      });
    });
    trilho.addEventListener('scroll', debounce(atualizarSetas, 60), { passive: true });
    window.addEventListener('resize', debounce(atualizarSetas, 120));
    atualizarSetas();
  }

  /* -------------------------------------------------------------- aviso */
  var avisoEl = $('#aviso');
  var avisoTimer;
  function mostrarAviso(html) {
    avisoEl.innerHTML = html;
    avisoEl.hidden = false;
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { avisoEl.hidden = true; }, 4200);
  }

  /* ------------------------------------------------------------ eventos */
  function ligarEventos() {
    // Atalhos de categoria (quadradinhos, dropdown, menu do celular, rodapé)
    document.addEventListener('click', function (ev) {
      var alvo = ev.target.closest('a[data-categoria]');
      if (alvo) {
        ev.preventDefault();
        definirCategoria(alvo.getAttribute('data-categoria'));
        fecharDropdown();
        fecharMenu();
        irParaOfertas();
        return;
      }
      var exemplo = ev.target.closest('a[data-exemplo]');
      if (exemplo) {
        ev.preventDefault();
        mostrarAviso('Este é um <strong>produto de exemplo</strong>. Troque pelo seu link de afiliado em <code>js/produtos.js</code>.');
      }
    });

    chipsEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('.chip');
      if (b) definirCategoria(b.getAttribute('data-categoria'));
    });

    ordemEl.addEventListener('change', function () { estado.ordem = ORDENS[ordemEl.value] ? ordemEl.value : 'relevancia'; atualizar(); });
    freteEl.addEventListener('change', function () { estado.frete = freteEl.checked; atualizar(); });

    verMaisEl.addEventListener('click', function () {
      var primeiroNovo = estado.limite;
      estado.limite += POR_PAGINA;
      atualizar({ manterLimite: true });
      var novo = listaEl.children[primeiroNovo];
      var link = novo && novo.querySelector('a');
      if (link) link.focus({ preventScroll: true });
    });

    $('[data-limpar-filtros]').addEventListener('click', function () {
      estado.categoria = 'todas'; estado.busca = ''; estado.frete = false; estado.ordem = 'relevancia';
      freteEl.checked = false; ordemEl.value = 'relevancia';
      camposBusca.forEach(function (c) { c.value = ''; });
      atualizar();
      trazerChipAtivoParaVista();
    });

    // Busca: todos os campos ficam sincronizados
    var aplicarBusca = debounce(function (valor) {
      estado.busca = valor.trim().slice(0, 80);
      atualizar();
    }, 160);
    camposBusca.forEach(function (campo) {
      campo.addEventListener('input', function () {
        camposBusca.forEach(function (c) { if (c !== campo) c.value = campo.value; });
        if (limparBuscaEl) limparBuscaEl.hidden = !campo.value;
        aplicarBusca(campo.value);
      });
    });
    $$('[data-busca-form]').forEach(function (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var campo = $('[data-busca]', form);
        estado.busca = campo.value.trim().slice(0, 80);
        atualizar();
        if (form.closest('.topo')) {
          campo.blur();
          fecharBuscaMobile();
          irParaOfertas();
        }
      });
    });
    if (limparBuscaEl) {
      limparBuscaEl.addEventListener('click', function () {
        camposBusca.forEach(function (c) { c.value = ''; });
        estado.busca = '';
        atualizar();
        $('#busca-ofertas').focus();
      });
    }

    // Dropdown de categorias (computador)
    var botaoCat = $('#botao-categorias');
    var menuCat = $('#menu-categorias');
    var itemCat = botaoCat.parentNode;
    var hoverTimer;
    var abertoPeloMouse = false;
    botaoCat.addEventListener('click', function () {
      // Se o mouse já abriu o menu ao passar por cima, o clique não deve fechá-lo
      if (abertoPeloMouse) { abertoPeloMouse = false; return; }
      if (menuCat.hidden) abrirDropdown(); else fecharDropdown();
    });
    itemCat.addEventListener('mouseenter', function () {
      if (!window.matchMedia('(hover: hover)').matches) return;
      clearTimeout(hoverTimer);
      if (menuCat.hidden) { abrirDropdown(); abertoPeloMouse = true; }
    });
    itemCat.addEventListener('mouseleave', function () {
      if (!window.matchMedia('(hover: hover)').matches) return;
      abertoPeloMouse = false;
      hoverTimer = setTimeout(fecharDropdown, 180);
    });
    document.addEventListener('click', function (ev) { if (!itemCat.contains(ev.target)) fecharDropdown(); });

    // Busca do celular
    $('#botao-busca-mobile').addEventListener('click', function () {
      var painel = $('#busca-mobile');
      if (painel.hidden) abrirBuscaMobile(); else fecharBuscaMobile();
    });

    // Menu do celular
    $('#botao-menu').addEventListener('click', abrirMenu);
    $$('[data-fechar-menu]').forEach(function (n) {
      n.addEventListener('click', function () { fecharMenu(); });
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (!$('#menu-mobile').hidden) { fecharMenu(); $('#botao-menu').focus(); }
        if (!menuCat.hidden) { fecharDropdown(); botaoCat.focus(); }
        if (!$('#busca-mobile').hidden) { fecharBuscaMobile(); $('#botao-busca-mobile').focus(); }
      }
      if (ev.key === 'Tab' && !$('#menu-mobile').hidden) prenderFoco(ev, $('.gaveta__painel'));
    });

    // Fecha o menu se a tela crescer para o layout de computador
    var mqDesktop = window.matchMedia('(min-width: 1024px)');
    var aoMudar = function () { if (mqDesktop.matches) fecharMenu(); };
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', aoMudar); else if (mqDesktop.addListener) mqDesktop.addListener(aoMudar);

    // Voltar ao topo
    $('#voltar-topo').addEventListener('click', function () {
      var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduzir ? 'auto' : 'smooth' });
      var logo = $('.topo .logo');
      if (logo) logo.focus({ preventScroll: true });
    });
  }

  function abrirDropdown() {
    var m = $('#menu-categorias');
    if (!m.hidden) return;
    m.hidden = false;
    $('#botao-categorias').setAttribute('aria-expanded', 'true');
  }
  function fecharDropdown() {
    var m = $('#menu-categorias');
    if (m.hidden) return;
    m.hidden = true;
    $('#botao-categorias').setAttribute('aria-expanded', 'false');
  }

  function abrirBuscaMobile() {
    var painel = $('#busca-mobile');
    painel.hidden = false;
    $('#botao-busca-mobile').setAttribute('aria-expanded', 'true');
    $('#botao-busca-mobile').setAttribute('aria-label', 'Fechar busca');
    $('#busca-mobile-campo').focus();
  }
  function fecharBuscaMobile() {
    var painel = $('#busca-mobile');
    if (painel.hidden) return;
    painel.hidden = true;
    $('#botao-busca-mobile').setAttribute('aria-expanded', 'false');
    $('#botao-busca-mobile').setAttribute('aria-label', 'Abrir busca');
  }

  var focoAntesDoMenu = null;
  function abrirMenu() {
    var g = $('#menu-mobile');
    focoAntesDoMenu = document.activeElement;
    g.hidden = false;
    document.body.classList.add('travado');
    $('#botao-menu').setAttribute('aria-expanded', 'true');
    fecharBuscaMobile();
    var primeiro = $('.gaveta__painel button, .gaveta__painel a', g);
    if (primeiro) primeiro.focus();
  }
  function fecharMenu() {
    var g = $('#menu-mobile');
    if (g.hidden) return;
    g.hidden = true;
    document.body.classList.remove('travado');
    $('#botao-menu').setAttribute('aria-expanded', 'false');
    if (focoAntesDoMenu && focoAntesDoMenu.focus && document.activeElement && g.contains(document.activeElement)) {
      focoAntesDoMenu.focus({ preventScroll: true });
    }
  }
  function prenderFoco(ev, painel) {
    var focaveis = $$('a[href], button:not([disabled]), input, select', painel).filter(function (n) { return n.offsetParent !== null; });
    if (!focaveis.length) return;
    var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
  }

  /* ------------------------------------------------ rolagem e destaque */
  function observarRolagem() {
    var topo = $('#topo');
    var voltar = $('#voltar-topo');
    var filtros = $('.filtros');
    var agendado = false;
    function aoRolar() {
      agendado = false;
      var y = window.scrollY || window.pageYOffset;
      topo.classList.toggle('rolou', y > 4);
      voltar.hidden = y < 900;
      if (filtros) {
        var r = filtros.getBoundingClientRect();
        var alturaTopo = topo.offsetHeight;
        filtros.classList.toggle('grudado', r.top <= alturaTopo + 1 && $('#ofertas').getBoundingClientRect().bottom > alturaTopo + r.height);
      }
    }
    window.addEventListener('scroll', function () {
      if (!agendado) { agendado = true; window.requestAnimationFrame(aoRolar); }
    }, { passive: true });
    aoRolar();

    // Item do menu correspondente à seção visível
    if (!('IntersectionObserver' in window)) return;
    var links = $$('.nav__link[data-secao]');
    var secoes = links.map(function (a) { return document.getElementById(a.getAttribute('data-secao')); }).filter(Boolean);
    var visiveis = {};
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { visiveis[e.target.id] = e.isIntersecting; });
      var atual = null;
      secoes.forEach(function (s) { if (visiveis[s.id] && !atual) atual = s.id; });
      if (!atual) return;
      links.forEach(function (a) {
        var ativo = a.getAttribute('data-secao') === atual;
        a.classList.toggle('ativo', ativo);
        if (ativo) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secoes.forEach(function (s) { obs.observe(s); });
  }

  /* --------------------------------------------------- config extras */
  function aplicarConfig() {
    var cta = $('#cta-principal');
    if (linkValido(CONFIG.linkPrincipal) && !/SEU-LINK/i.test(CONFIG.linkPrincipal)) {
      cta.href = CONFIG.linkPrincipal.trim();
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer sponsored nofollow';
      cta.setAttribute('aria-label', 'Explorar Ofertas no Mercado Livre (abre em nova aba)');
    }

    var redes = CONFIG.redes || {};
    var dados = [
      ['instagram', 'Instagram', 'instagram'],
      ['whatsapp', 'Grupo no WhatsApp', 'whatsapp'],
      ['telegram', 'Canal no Telegram', 'telegram']
    ].filter(function (r) { return linkValido(redes[r[0]]); });
    if (dados.length) {
      var lista = $('#redes-lista');
      dados.forEach(function (r) {
        lista.appendChild(el('a', {
          class: 'rede rede--' + r[0], href: redes[r[0]].trim(), target: '_blank', rel: 'noopener noreferrer'
        }, [icone(r[2]), r[1]]));
      });
      $('#redes').hidden = false;
    }

    var ano = $('#ano');
    if (ano) ano.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------ início */
  function iniciar() {
    lerUrl();
    renderizarCategorias();
    renderizarChips();
    ordemEl.value = estado.ordem;
    freteEl.checked = estado.frete;
    camposBusca.forEach(function (c) { c.value = estado.busca; });
    atualizar();
    renderizarMaisVendidos();
    aplicarConfig();
    ligarEventos();
    observarRolagem();
    if (estado.categoria !== 'todas') trazerChipAtivoParaVista();
  }

  try {
    iniciar();
  } catch (erro) {
    console.error('[Achados do ML] Erro ao montar a página:', erro);
  }
})();
