# Zap Arena — plataforma de truco online valendo

Site completo de truco com dinheiro real: contas de jogadores, carteira com PIX, mesas 1x1 e em duplas,
**salas de duplas em que os próprios jogadores escolhem quantas duplas jogam e como o prêmio é dividido**,
treino contra o computador e um painel para o dono acompanhar as comissões.

> O nome "Zap Arena" é provisório. Troque em `src/config/site.js` (veja abaixo).

---

## O que tem pronto

| Área | O que faz |
|---|---|
| **Jogo** | Truco **Paulista** (vira e manilha que muda) e **Mineiro** (manilhas fixas). Truco/seis/nove(dez)/doze, aceitar, correr, aumentar na hora, mão de onze (dez no Mineiro), empates. Partida até 12. **Um toque na carta joga**; para jogar escondida, toca em "Esconder" e depois na carta. |
| **11 a 11 (mão de ferro)** | A mesa vota antes de ver as cartas: **normal** ou **nas escuras**. Nas escuras só com **3 dos 4 votos** (no 1x1, os dois); senão, joga normal. |
| **Mesas valendo** | **1 contra 1**, **duplas com parceiro aleatório** ou **duplas com amigo** (mesa privada por link). Valor por jogador escolhido (ou amistosa sem valor). Escolha de lugar para jogar ao lado do parceiro. |
| **Torneio relâmpago** | Salas prontas de **4 ou 8** jogadores (1x1 ou duplas) que começam sozinhas quando lotam. Com 4, o campeão leva o pote; com 8, 70% / 30%. |
| **Revanche** | No fim da mesa, se todos tocarem em "Revanche" em até 60 s, uma nova mesa começa na hora com os mesmos jogadores e valor. |
| **Mesa viva** | Sons (com botão de mudo), vibração na sua vez no celular, reações que sobem na mesa, frases rápidas, sinais secretos para o parceiro, avatares escolhidos no perfil. |
| **Salas de duplas** | Quem cria define: nome, Paulista/Mineiro, duplas ou individual, **de 2 a 64 participantes**, inscrição por jogador e **quantas posições ganham prêmio (só a campeã, top 2, top 3 ou top 4) com os percentuais que quiser**. Quando lota, a chave é sorteada e as partidas começam sozinhas (com disputa de 3º lugar se o 3º for premiado). O prêmio cai na hora no saldo. |
| **Comissão da casa** | Percentual sobre o pote de cada mesa e sala (padrão 10%, muda no painel). Mostrado ao jogador antes de entrar. |
| **Carteira** | Depósito por PIX (o jogador recebe sua chave e um código; você confirma no painel), saque por PIX (você paga e marca como pago), extrato completo. |
| **Painel do dono** (`/admin`) | Comissão de hoje/7/30 dias/total com gráfico, depósitos e saques pendentes, jogadores (busca, ajuste de saldo, bloqueio), mesas e salas ativas (cancelar com devolução), conferência do caixa e todas as configurações. |
| **Tempo real** | Tudo atualiza na hora (Socket.IO): lobby, mesas, chave da sala, saldo. Cada jogador recebe **só as próprias cartas**. |
| **Treino grátis** | Contra o computador, sem dinheiro. Bots **nunca** entram em mesas valendo. |
| **Extras de mesa** | Relógio por jogada com jogada automática, frases rápidas, sinais secretos para o parceiro, aviso quando alguém desconecta. |

### Garantias sobre o dinheiro

- Todo valor é guardado em **centavos inteiros** — não existe erro de arredondamento.
- Ao entrar numa mesa/sala, o valor sai do saldo e fica **retido**. Ao terminar, o servidor confere que
  **prêmios + comissão = total retido**; se não bater, nada é pago e o valor é devolvido.
- Se o servidor cair ou for reiniciado no meio de uma partida, **todo valor retido volta aos jogadores** automaticamente.
- Saiu da mesa/sala antes de começar? Devolução na hora. Mesa que não completa em 1h e sala que não lota em 24h são canceladas com devolução.
- Toda alteração de saldo gera uma linha no extrato do jogador.

---

## Como rodar no seu computador

Precisa do **Node.js 22.13 ou mais novo** ([nodejs.org](https://nodejs.org)).

```bash
cd truco
npm install
npm run dev          # abre o site em http://localhost:5173 (com recarga automática)
```

Para rodar como em produção:

```bash
npm run build        # gera o site na pasta dist/
npm start            # servidor + site em http://localhost:3000
```

### Virar administrador

1. Crie sua conta normalmente pelo site.
2. No terminal, na pasta `truco`: `npm run admin -- SeuApelido`
3. Entre de novo no site: aparece **Painel do dono** no menu da sua conta (ou acesse `/admin`).

### Primeiras configurações no painel (aba **Configurações**)

- **Chave PIX, tipo, nome do recebedor e banco** — sem chave PIX os depósitos ficam desligados.
- **Comissão da casa (%)** — vale para as mesas e salas criadas depois da mudança.
- Aposta mínima/máxima, valores rápidos, depósito mínimo/máximo, saque mínimo, tempo por jogada, máximo de duplas por sala.
- WhatsApp e e-mail de suporte (aparecem no rodapé).

### Rotina de depósitos e saques

- **Depósito:** o jogador gera um pedido com valor e **código**. Quando o PIX cair na sua conta (confira valor e código
  na descrição), clique em **Confirmar** na aba Depósitos. O saldo dele é liberado na hora.
- **Saque:** o valor sai do saldo do jogador assim que ele pede. Faça o PIX para a chave dele (confira se o titular é
  ele) e clique em **Marcar como pago**. Se recusar, o valor volta para o saldo dele.

---

## Trocar nome e marca

| O quê | Onde |
|---|---|
| Nome do site, slogan, empresa e CNPJ | `src/config/site.js` |
| Título da aba do navegador e descrição para o Google | `index.html` |
| Ícone (favicon) | `public/favicon.svg` |
| Cores | `src/index.css`, bloco `@theme`: `--color-marca` (vermelho dos botões), `--color-azul` e `--color-feltro` (azul da mesa) |
| Desenho das cartas e do verso | `src/components/Carta.jsx` (SVG) |
| Fontes | Barlow e Barlow Condensed, instaladas pelo npm (`@fontsource`) e servidas pelo próprio site |
| Textos dos termos de uso e jogo responsável | `src/pages/Legal.jsx` |

## Ajustar regras do jogo

Tudo que muda entre Paulista e Mineiro está em `shared/regras.js` (`VARIANTES`): valores da mão (`escada`),
nomes dos pedidos e quem abre a vaza depois de empate. O Mineiro está como **2 → 4 → 6 → 10 → 12** com mão de dez;
se a sua turma joga diferente, mude ali. As regras exibidas em `/regras` estão em `src/pages/Regras.jsx`.

---

## Publicar na internet

O site **precisa de um servidor Node.js rodando o tempo todo e de um disco persistente** (o banco de dados é um
arquivo SQLite). Por isso **não funciona** em hospedagem só de site estático (Vercel, Netlify, GitHub Pages,
hospedagem compartilhada comum).

Opções que funcionam:

- **Railway** ou **Render**: conecte o repositório, use o `Dockerfile` desta pasta e **adicione um volume/disco
  persistente montado em `/data`**.
- **Fly.io**: `fly launch` com o `Dockerfile` + `fly volumes create` montado em `/data`.
- **VPS** (Hostinger VPS, DigitalOcean, Contabo...): instale o Docker e rode
  ```bash
  docker build -t truco .
  docker run -d --restart=always -p 80:3000 -v truco-dados:/data truco
  ```
  e coloque um proxy com HTTPS na frente (Caddy ou Nginx + Let's Encrypt).

Variáveis de ambiente estão em `.env.example` (nenhuma é obrigatória além de um `DATA_DIR` persistente).
Rode **uma única instância** do servidor (o estado das mesas fica na memória dela).

**Backup:** copie o arquivo `truco.db` da pasta de dados todos os dias. É ali que estão contas e saldos.

---

## Testes automáticos

```bash
npm test
```

54 testes, incluindo: 6.000 partidas aleatórias de Paulista e Mineiro sem nenhuma jogada inválida; todas as
combinações de empate; truco/seis/nove/doze; mão de onze/dez; a votação da mão de ferro (3 de 4 para o escuro);
chaves de 2 a 64 participantes; milhares de combinações de prêmio sem sumir ou sobrar um centavo; e partidas
completas de ponta a ponta com jogadores conectados de verdade conferindo o saldo de cada um, a comissão da casa,
o relâmpago pagando o campeão, a revanche cobrando todos (ou devolvendo se alguém não tiver saldo) e a
devolução quando o servidor cai.

---

## ⚠️ Antes de abrir para o público

Isto é software; a parte legal e operacional é sua. Itens que **precisam** ser resolvidos antes de receber dinheiro de jogadores:

1. **Consulte um advogado.** No Brasil, apostas de quota fixa e jogos online dependem de autorização federal
   (Lei 14.790/2023 e portarias da Secretaria de Prêmios e Apostas do Ministério da Fazenda), e jogo de azar sem
   autorização é contravenção (Decreto-Lei 3.688/41). Há debate sobre jogos de habilidade como truco; um
   especialista deve dizer qual o enquadramento e o que é exigido para o seu caso.
2. **Abra uma empresa (CNPJ)** e receba os PIX numa conta da empresa. Preencha `empresa` e `cnpj` em `src/config/site.js`.
3. **Revise os termos de uso e a página de jogo responsável** (`src/pages/Legal.jsx`) com o advogado.
4. **Processador de pagamento:** o fluxo atual é PIX manual (você confirma cada depósito). Com volume, vale integrar
   uma API de PIX com confirmação automática (Mercado Pago, Asaas, Efí...). O ponto de integração é
   `aprovarDeposito()` em `server/carteira.js`.
5. **Domínio com HTTPS** e **backup diário** do banco.

---

## Estrutura

```
truco/
├── shared/           regras e cálculo de prêmios (usados pelo servidor e pelo site)
├── server/
│   ├── game/         motor do truco e bot do treino
│   ├── salas/        mesas, salas de duplas (chave e prêmios), registro em tempo real
│   ├── rotas/        API: pública, jogador e painel do dono
│   ├── carteira.js   saldo, reservas, prêmios, comissão, depósitos e saques
│   ├── contas.js     cadastro (CPF, 18+), login e sessões
│   └── tempoReal.js  Socket.IO
├── src/              site (React + Tailwind)
├── test/             testes automáticos
└── Dockerfile
```
