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

  /* Formato internacional, somente dígitos: 55 + DDD + número. */
  whatsapp: '5515997363807',

  telefone: {
    exibicao: '(15) 99736-3807',
    link: '+5515997363807',
  },

  instagram: {
    usuario: '@km_lavacar_',
    url: 'https://www.instagram.com/km_lavacar_',
  },

  endereco: {
    /* ⚠️ Falta a rua e o número. Acrescente em `linha1` quando quiser;
     * o link do mapa abaixo já leva ao ponto exato.                        */
    linha1: 'Jardim Brasil',
    linha2: 'Buri — SP',
    cep: '18290-000',
    mapsUrl: 'https://maps.app.goo.gl/MLbHbE7ep4Uo6uG38',
  },

  /* ⚠️ Confirme os horários reais antes de publicar. */
  horarioFuncionamento: [
    { dias: 'Segunda a sexta', horas: '08:00 às 18:00' },
    { dias: 'Sábado', horas: '08:00 às 16:00' },
    { dias: 'Domingo', horas: 'Fechado' },
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
    descricao: 'Externa completa, rodas e secagem sem deixar marca.',
    inclui: ['Lavagem externa', 'Rodas e pneus', 'Secagem em microfibra'],
  },
  {
    id: 'completa',
    nome: 'Lavagem Completa',
    preco: 150,
    duracao: '≈ 1h30',
    icone: 'sparkles',
    destaque: true,
    descricao: 'Externa, interna e acabamento feito com pincel nos cantos.',
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
    descricao: 'Extração de bancos e carpetes, mais higienização do ar-condicionado.',
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
    descricao: 'Remove riscos finos da pintura e aplica proteção que dura meses.',
    inclui: [
      'Descontaminação da pintura',
      'Polimento técnico',
      'Proteção / vitrificação',
      'Plásticos externos revitalizados',
    ],
  },
  {
    id: 'outros',
    nome: 'Outros serviços',
    preco: null, // sob consulta
    duracao: 'A combinar',
    icone: 'wrench',
    descricao: 'Motor, cristalização de vidros, enceramento e bagageiro.',
    inclui: ['Orçamento combinado pelo WhatsApp'],
  },
]

/* ───────────────────────────────────────────────────────────────────────────
 *  TIPOS DE VEÍCULO
 *  `fator` multiplica o preço base do serviço. 1 = preço cheio.
 *  `sobConsulta: true` faz o site mostrar "Sob consulta" em vez de um valor:
 *  é o que usamos onde o preço depende do tamanho do veículo e precisa ser
 *  combinado na conversa. Para fixar um valor, troque `sobConsulta` por um
 *  `fator` (ex.: `fator: 2.5` cobra duas vezes e meia o preço do carro).
 * ─────────────────────────────────────────────────────────────────────────── */
export const tiposVeiculo = [
  { id: 'carro', nome: 'Carro', fator: 1 },
  { id: 'moto', nome: 'Moto', fator: 0.6 },
  { id: 'onibus', nome: 'Ônibus', sobConsulta: true },
  { id: 'caminhao', nome: 'Caminhão', sobConsulta: true },
  { id: 'outros', nome: 'Outros', sobConsulta: true },
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
    legenda: 'Correção de micro-riscos na pintura',
    antes: null,
    depois: null,
  },
  {
    id: 3,
    titulo: 'Rodas e caixas de roda',
    legenda: 'Pó de pastilha e sujeira acumulada',
    antes: null,
    depois: null,
  },
  {
    id: 4,
    titulo: 'Painel e console',
    legenda: 'Entradas de ar e frisos feitos com pincel',
    antes: null,
    depois: null,
  },
]

export const diferenciais = [
  { icone: 'shieldCheck', titulo: 'Produtos de pH neutro', texto: 'Linha automotiva profissional, segura para pintura e plásticos.' },
  { icone: 'clock', titulo: 'Hora marcada', texto: 'Você agenda, chega e é atendido. Sem fila.' },
  { icone: 'handHeart', titulo: 'Acabamento com pincel', texto: 'Grades, botões e frisos onde a máquina não alcança.' },
  { icone: 'bike', titulo: 'Carros e motos', texto: 'Produto e técnica específicos para cada um.' },
]
