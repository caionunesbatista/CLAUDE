/* ==========================================================================
   Achados do ML — preparo da página (roda no <head>, antes de desenhar)
   - modo prévia do painel (?previa=1)
   - começa a baixar a imagem do topo
   - AchadosHero(): preenche textos, botão e imagens do topo com os dados
   Você não precisa editar este arquivo.
   ========================================================================== */
(function () {
  'use strict';

  var dados = window.ACHADOS_DADOS || {};

  /* Prévia: o painel guarda as alterações ainda não publicadas e abre o site
     com ?previa=1. Só quem está usando o painel neste aparelho vê. */
  try {
    if (/[?&]previa=1(&|$)/.test(window.location.search)) {
      var salvo = window.localStorage.getItem('achados-previa');
      if (salvo) {
        dados = JSON.parse(salvo);
        window.ACHADOS_PREVIA = true;
      }
    }
  } catch (e) { /* sem acesso ao armazenamento: mostra os dados publicados */ }
  window.ACHADOS_DADOS = dados;

  var hero = dados.hero || {};

  function srcset(img) {
    if (!img || !Array.isArray(img.versoes)) return '';
    var vs = img.versoes.filter(function (v) { return v && v.src && v.w; });
    if (!vs.length) return '';
    // Na prévia as imagens novas vêm embutidas: usa só a maior
    if (vs.some(function (v) { return v.src.indexOf('data:') === 0; })) return vs[vs.length - 1].src;
    return vs.map(function (v) { return v.src + ' ' + v.w + 'w'; }).join(', ');
  }
  function maior(img) {
    var vs = (img && Array.isArray(img.versoes) ? img.versoes : []).filter(function (v) { return v && v.src; });
    return vs.length ? vs[vs.length - 1].src : '';
  }

  var TAM_PC = '(min-width: 1600px) 760px, 47.5vw';
  var TAM_CEL = '(min-width: 643px) 540px, 84vw';

  // Começa a baixar a imagem do topo junto com a página
  (function precarregar() {
    var pares = [
      [hero.imagemComputador, '(min-width: 1024px)', TAM_PC],
      [hero.imagemCelular, '(max-width: 1023.98px)', TAM_CEL]
    ];
    pares.forEach(function (p) {
      var conj = srcset(p[0]);
      if (!conj || conj.indexOf('data:') > -1) return;
      var l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'image';
      l.setAttribute('imagesrcset', conj);
      l.setAttribute('imagesizes', p[2]);
      l.media = p[1];
      document.head.appendChild(l);
    });
  })();

  function texto(v) { return typeof v === 'string' ? v.trim() : ''; }
  function linkValido(url) { return /^https?:\/\/\S+$/i.test(texto(url)) && !/SEU-LINK/i.test(url); }

  window.AchadosHero = function () {
    var raiz = document.getElementById('inicio');
    if (!raiz) return;
    function q(sel) { return raiz.querySelector(sel); }
    function por(campo, alvo) { var v = texto(hero[campo]); if (v && alvo) alvo.textContent = v; }

    por('linha1', q('.hero__l1'));
    por('destaque', q('.hero__ml'));

    // Linha 3: a última palavra não quebra (é ela que ganha o risco amarelo)
    var l3 = texto(hero.linha3);
    var el3 = q('.hero__l3');
    if (l3 && el3) {
      var partes = l3.split(/\s+/);
      var ultima = partes.pop();
      el3.textContent = partes.length ? partes.join(' ') + ' ' : '';
      var span = document.createElement('span');
      span.className = 'hero__lugar';
      span.textContent = ultima;
      el3.appendChild(span);
    }

    // Subtítulo: início + destaque amarelo + segunda linha
    var sub = q('.hero__sub');
    if (sub && (texto(hero.subtitulo) || texto(hero.subtituloDestaque) || texto(hero.subtituloFim))) {
      sub.textContent = '';
      if (texto(hero.subtitulo)) sub.appendChild(document.createTextNode(texto(hero.subtitulo) + ' '));
      if (texto(hero.subtituloDestaque)) {
        var forte = document.createElement('strong');
        forte.textContent = texto(hero.subtituloDestaque);
        sub.appendChild(forte);
        sub.appendChild(document.createTextNode(' '));
      }
      if (texto(hero.subtituloFim)) {
        sub.appendChild(document.createElement('br'));
        sub.appendChild(document.createTextNode(texto(hero.subtituloFim)));
      }
    }

    // Selos (Compras Seguras, Entrega Rápida, Qualidade e Confiança)
    var selos = raiz.querySelectorAll('.selo-hero > span');
    (Array.isArray(hero.selos) ? hero.selos : []).forEach(function (s, i) {
      if (!selos[i] || !s) return;
      var a = texto(s.linha1), b = texto(s.linha2);
      if (!a && !b) return;
      selos[i].textContent = a;
      if (b) {
        selos[i].appendChild(document.createElement('br'));
        selos[i].appendChild(document.createTextNode(b));
      }
    });

    // Botão amarelo
    var cta = document.getElementById('cta-principal');
    if (cta) {
      por('botaoTexto', cta.querySelector('span'));
      if (linkValido(hero.botaoLink)) {
        cta.href = texto(hero.botaoLink);
        cta.target = '_blank';
        cta.rel = 'noopener noreferrer sponsored nofollow';
        cta.setAttribute('aria-label', (texto(hero.botaoTexto) || 'Explorar ofertas') + ' (abre em nova aba)');
      }
    }

    // Imagens do topo (computador e celular)
    var arte = q('.hero__arte');
    var fontePc = q('.hero__fonte-pc');
    var img = q('.hero__img');
    var pc = hero.imagemComputador, cel = hero.imagemCelular;
    if (fontePc && srcset(pc)) {
      fontePc.setAttribute('srcset', srcset(pc));
      fontePc.setAttribute('sizes', TAM_PC);
      if (pc.largura && pc.altura) { fontePc.setAttribute('width', pc.largura); fontePc.setAttribute('height', pc.altura); }
      if (arte && pc.largura && pc.altura) arte.style.setProperty('--proporcao-pc', pc.largura + ' / ' + pc.altura);
    }
    if (img && srcset(cel)) {
      img.setAttribute('srcset', srcset(cel));
      img.setAttribute('sizes', TAM_CEL);
      img.setAttribute('src', maior(cel));
      if (cel.largura && cel.altura) { img.setAttribute('width', cel.largura); img.setAttribute('height', cel.altura); }
    }
    if (img && texto(hero.imagemDescricao)) img.setAttribute('alt', texto(hero.imagemDescricao));
  };
})();
