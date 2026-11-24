/* ═══════════════════════════════════════════════════════════════════════════
 *  ARQUIVO DE CONFIGURAÇÃO — EDITE APENAS ESTE ARQUIVO
 *  ───────────────────────────────────────────────────────────────────────────
 *  Aqui ficam o número do WhatsApp, endereço, redes sociais, horários de
 *  funcionamento, preços e a lista de serviços. Nada mais precisa ser mexido
 *  para colocar o site no ar com os dados reais da sua empresa.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const empresa = {
  nome: 'KM Lavacar',
  slogan: 'Cuidado completo para o seu veículo',
  descricao:
    'Lavagem, higienização, polimento e muito mais, com qualidade e atenção em cada detalhe.',

  /* ⚠️ OBRIGATÓRIO — TROQUE PELO NÚMERO REAL DO PROPRIETÁRIO.
   * Formato internacional, somente dígitos: 55 (Brasil) + DDD + número.
   * Exemplo: (11) 98765-4321  ->  '5511987654321'                            */
  whatsapp: '5500000000000',

  /* Telefone exibido no rodapé (pode ser o mesmo do WhatsApp) */
  telefone: {
    exibicao: '(00) 00000-0000',
    link: '+5500000000000',
  },

  email: 'contato@kmlavacar.com.br',

  instagram: {
    usuario: '@kmlavacar',
    url: 'https://instagram.com/kmlavacar',
  },

  endereco: {
    rua: 'Av. Exemplo, 1234',
    complemento: 'Box 02 — ao lado do posto',
    bairroCidade: 'Centro, Sua Cidade — UF',
    cep: '00000-000',
    /* Link do Google Maps. Para gerar o seu: abra o Google Maps, busque o
     * endereço, clique em "Compartilhar" e cole o link aqui.                 */
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Av.+Exemplo+1234+Centro',
  },

  horarioFuncionamento: [
    { dias: 'Segunda a Sexta', horas: '08:00 — 18:00' },
    { dias: 'Sábado', horas: '08:00 — 16:00' },
    { dias: 'Domingo e feriados', horas: 'Fechado' },
  ],
}

/* ───────────────────────────────────────────────────────────────────────────
 *  AGENDA — regras dos horários oferecidos no formulário
 * ─────────────────────────────────────────────────────────────────────────── */
export const agenda = {
  diasDeAntecedenciaMax: 45, // até quantos dias à frente é possível agendar
  horaAbertura: 8, // 08:00
  horaFechamento: 18, // último horário começa antes das 18:00
  intervaloMinutos: 30, // de quanto em quanto tempo abre um horário
  diasFechados: [0], // 0 = domingo, 1 = segunda ... 6 = sábado
  sabadoFechaAs: 16, // sábado (dia 6) encerra mais cedo
}

/* ───────────────────────────────────────────────────────────────────────────
 *  SERVIÇOS E PREÇOS
 *  `preco` é o valor BASE, em reais, para um carro compacto.
 *  O valor final é multiplicado pelo fator do tipo de veículo (abaixo).
 *  Use `preco: null` para "sob consulta".
 * ─────────────────────────────────────────────────────────────────────────── */
export const servicos = [
  {
    id: 'simples',
    nome: 'Lavagem Simples',
    preco: 50,
    duracao: '≈ 40 min',
    icone: 'droplets',
    descricao: 'O básico bem feito: externa caprichada e secagem sem marcas.',
    inclui: ['Lavagem externa', 'Rodas e pneus', 'Secagem com toalha de microfibra'],
  },
  {
    id: 'completa',
    nome: 'Lavagem Completa',
    preco: 150,
    duracao: '≈ 1h30',
    icone: 'sparkles',
    destaque: true,
    descricao: 'Externa e interna com acabamento de detalhe em cada canto.',
    inclui: [
      'Tudo da lavagem simples',
      'Aspiração completa',
      'Painel, console e portas',
      'Pretinho nos pneus',
      'Vidros cristalinos',
    ],
  },
  {
    id: 'interna',
    nome: 'Higienização Interna',
    preco: 220,
    duracao: '≈ 3h',
    icone: 'spray',
    descricao: 'Limpeza profunda de bancos, carpetes e ar-condicionado.',
    inclui: [
      'Extração de bancos e carpetes',
      'Higienização do ar-condicionado',
      'Limpeza de teto e forros',
      'Remoção de odores',
    ],
  },
  {
    id: 'polimento',
    nome: 'Polimento & Vitrificação',
    preco: 400,
    duracao: '≈ 5h',
    icone: 'gem',
    descricao: 'Correção de riscos finos e brilho profundo que dura meses.',
    inclui: [
      'Descontaminação da pintura',
      'Polimento técnico',
      'Proteção / vitrificação',
      'Revitalização de plásticos externos',
    ],
  },
  {
    id: 'outros',
    nome: 'Outros serviços',
    preco: null, // sob consulta
    duracao: 'A combinar',
    icone: 'wrench',
    descricao: 'Motor, cristalização de vidros, enceramento, higienização de bagageiro.',
    inclui: ['Orçamento personalizado', 'Combinamos tudo pelo WhatsApp'],
  },
]

/* ───────────────────────────────────────────────────────────────────────────
 *  TIPOS DE VEÍCULO
 *  `fator` multiplica o preço base do serviço. 1 = preço cheio.
 * ─────────────────────────────────────────────────────────────────────────── */
export const tiposVeiculo = [
  { id: 'hatch', nome: 'Hatch / Compacto', fator: 1 },
  { id: 'sedan', nome: 'Sedan', fator: 1.1 },
  { id: 'suv', nome: 'SUV', fator: 1.25 },
  { id: 'picape', nome: 'Picape', fator: 1.35 },
  { id: 'moto', nome: 'Moto', fator: 0.6 },
  { id: 'outros', nome: 'Outros', fator: 1 },
]

/* ───────────────────────────────────────────────────────────────────────────
 *  GALERIA ANTES & DEPOIS
 *  Coloque suas fotos em `public/images/galeria/` e informe o caminho abaixo.
 *  Enquanto `antes` / `depois` estiverem como `null`, o site mostra um espaço
 *  reservado indicando onde a foto entra — nenhuma imagem falsa é exibida.
 * ─────────────────────────────────────────────────────────────────────────── */
export const galeria = [
  {
    id: 1,
    titulo: 'Higienização de bancos',
    legenda: 'Tecido claro com manchas de uso diário',
    antes: null, // ex.: '/images/galeria/bancos-antes.jpg'
    depois: null, // ex.: '/images/galeria/bancos-depois.jpg'
  },
  {
    id: 2,
    titulo: 'Polimento de pintura',
    legenda: 'Correção de micro-riscos e brilho profundo',
    antes: null,
    depois: null,
  },
  {
    id: 3,
    titulo: 'Rodas e caixas de roda',
    legenda: 'Remoção de pó de pastilha e sujeira pesada',
    antes: null,
    depois: null,
  },
  {
    id: 4,
    titulo: 'Painel e console',
    legenda: 'Detalhamento com pincel em cada entrada de ar',
    antes: null,
    depois: null,
  },
]

export const diferenciais = [
  { icone: 'shieldCheck', titulo: 'Produtos profissionais', texto: 'Linha automotiva com pH neutro, seguro para pintura e plásticos.' },
  { icone: 'clock', titulo: 'Hora marcada', texto: 'Você agenda, chega e é atendido. Sem fila, sem espera.' },
  { icone: 'handHeart', titulo: 'Atenção ao detalhe', texto: 'Pincel, microfibra e paciência onde a máquina não alcança.' },
  { icone: 'bike', titulo: 'Carros e motos', texto: 'Atendimento para os dois, com produtos e técnica específicos.' },
]
