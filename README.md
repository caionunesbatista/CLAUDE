# KM Lavacar — site institucional com agendamento por WhatsApp

Site de página única (SPA) para lavagem automotiva: apresenta os serviços,
mostra resultados em "antes & depois" e tem um formulário de agendamento que
monta a mensagem pronta e abre a conversa no WhatsApp da loja.

**React 19 · Vite 8 · Tailwind CSS 4 · Framer Motion · Zustand · Lucide**

---

## Como rodar

Requer **Node.js 20 ou superior**.

```bash
npm install     # instala as dependências
npm run dev     # abre em http://localhost:5173
```

Outros comandos:

```bash
npm run build     # gera a versão de produção na pasta dist/
npm run preview   # serve a pasta dist/ para conferir antes de publicar
npm run lint      # verifica o código
```

Para publicar, envie o conteúdo de `dist/` para qualquer hospedagem estática
(Vercel, Netlify, Cloudflare Pages, Hostinger, GitHub Pages...). Não há
servidor nem banco de dados: é um site estático.

---

## ⚠️ O que você PRECISA alterar antes de publicar

Tudo que muda de uma empresa para outra está em **um único arquivo**:

### `src/config/site.js`

| O que | Onde | Observação |
|---|---|---|
| **Número do WhatsApp** | `empresa.whatsapp` | **Obrigatório.** Só dígitos, no formato `55` + DDD + número. Ex.: `(11) 98765-4321` → `'5511987654321'` |
| Telefone exibido | `empresa.telefone` | Texto que aparece na tela e o link `tel:` |
| E-mail | `empresa.email` | |
| Instagram | `empresa.instagram` | Usuário e link do perfil |
| Endereço | `empresa.endereco` | Inclui o `mapsUrl` — veja abaixo como gerar |
| Horário de funcionamento | `empresa.horarioFuncionamento` | Lista livre de linhas |
| Horários da agenda | `agenda` | Abertura, fechamento, intervalo entre horários e dias fechados |
| **Preços e serviços** | `servicos` | `preco` é o valor base; use `null` para "sob consulta" |
| Tipos de veículo | `tiposVeiculo` | O `fator` multiplica o preço base |
| Fotos antes & depois | `galeria` | Caminho das imagens (veja abaixo) |
| Diferenciais | `diferenciais` | Os quatro cards abaixo do herói |

Enquanto o WhatsApp estiver com o número de exemplo, **um aviso amarelo
aparece na seção de agendamento** lembrando o que falta configurar. Ele some
sozinho assim que você colocar um número válido.

### Como gerar o link do Google Maps

1. Abra o Google Maps e busque o endereço da loja.
2. Clique em **Compartilhar → Copiar link**.
3. Cole em `empresa.endereco.mapsUrl`.

---

## Como funciona o preço

```
preço estimado = preço base do serviço × fator do tipo de veículo
```

arredondado para o múltiplo de 5 mais próximo. Exemplo com os valores padrão:

- Lavagem Completa (R$ 150) em um **SUV** (fator 1,25) → **R$ 190**
- Lavagem Simples (R$ 50) em uma **moto** (fator 0,6) → **R$ 30**

Para mudar, edite `servicos[].preco` e `tiposVeiculo[].fator` em
`src/config/site.js`. A regra de cálculo está em `src/lib/precos.js`.

O site sempre deixa claro que o valor é **uma estimativa**, confirmada na
conversa do WhatsApp.

---

## Fotos do "Antes & Depois"

1. Coloque os arquivos em `public/images/galeria/`.
2. Informe o caminho de cada par em `galeria`, dentro de `src/config/site.js`:

```js
{
  id: 1,
  titulo: 'Higienização de bancos',
  legenda: 'Tecido claro com manchas de uso diário',
  antes: '/images/galeria/1-antes.jpg',
  depois: '/images/galeria/1-depois.jpg',
},
```

Dicas para o comparador ficar bom:

- Use **a mesma moldura** nas duas fotos (mesmo ângulo, mesma distância).
- Proporção **4:3** é a ideal; outras proporções são recortadas.
- Entre 1200 e 1600 px de largura já é suficiente.

Enquanto um par não estiver preenchido, o site mostra um **espaço reservado**
dizendo exatamente qual arquivo falta — nenhuma imagem genérica é exibida
como se fosse um trabalho da loja.

---

## Como funciona o agendamento

1. O cliente preenche nome, veículo, serviço, data e horário.
2. O **resumo à direita** atualiza em tempo real, com o valor estimado.
3. Ao enviar, o site valida tudo, monta a mensagem e abre
   `https://wa.me/<seu-número>?text=<mensagem>` em uma nova aba.
4. Um aviso confirma que o WhatsApp foi aberto. Se o navegador bloquear a
   nova aba, o aviso traz um botão para abrir a conversa manualmente.

Mensagem gerada:

```
Olá, KM Lavacar! Gostaria de agendar um serviço.

*Cliente:* Mariana Oliveira
*Veículo:* SUV — Jeep Compass
*Serviço:* Lavagem Completa
*Data:* sexta-feira, 27 de novembro de 2026
*Horário:* 10:00
*Valor estimado:* R$ 190

Enviado pelo site. Aguardo a confirmação, obrigado!
```

### Sobre os "horários ocupados"

O site **não tem back-end**. Os horários que o próprio visitante agendou
ficam marcados como ocupados e são guardados no `localStorage` do navegador
dele — serve para demonstrar visualmente como a agenda se comporta. Isso está
escrito na tela, para ninguém achar que é uma reserva confirmada.

Para virar uma agenda de verdade (compartilhada entre clientes), seria
preciso um back-end. O ponto de troca é a função `enviar()` em
`src/store/useAgendamento.js`.

---

## Estrutura do projeto

```
public/
  fonts/              Inter e Archivo auto-hospedadas (sem Google Fonts)
  images/             logo, camadas do herói, ícones e imagem social
  images/galeria/     ← suas fotos de antes & depois entram aqui
src/
  config/site.js      ⭐ ÚNICO arquivo que você precisa editar
  lib/
    agenda.js         geração dos horários disponíveis
    precos.js         cálculo do valor estimado
    whatsapp.js       montagem da mensagem e do link wa.me
    formatadores.js   moeda, data e hora em português
    animacoes.js      variantes compartilhadas do Framer Motion
    icones.jsx        nome do config → ícone do Lucide
  store/
    useAgendamento.js estado do formulário, validação e reservas locais
  components/
    layout/           cabeçalho, rodapé e botão flutuante
    sections/         herói, diferenciais, serviços, galeria, agendamento, contato
    ui/               botão, campos, comparador, resumo, aviso flutuante
```

---

## Detalhes técnicos

**Imagens.** O herói é remontado em HTML a partir do banner original: as
fotos (carro, moto e a faixa de detalhamento) entram como camadas separadas e
o texto é HTML de verdade — fica nítido em qualquer tela, é lido pelo Google
e funciona em leitores de tela. Cada camada tem uma versão para tela larga e
outra para tela estreita (`<picture>`), servidas em **WebP com JPEG de
reserva**, com `width`/`height` declarados para não haver "pulo" de layout.

**Fontes.** Inter e Archivo são servidas pelo próprio site, só com os
caracteres latinos. Nenhuma requisição vai para servidores do Google.

**Animações.** Framer Motion com `whileInView` e `once: true` — cada seção
anima uma vez só. Quem liga *"reduzir movimento"* no sistema recebe apenas um
fade curto; nada se move.

**Acessibilidade.** Um `<h1>` por página e hierarquia de títulos correta,
todos os campos com `<label>`, erros anunciados com `role="alert"`, foco
visível, atalho "pular para o agendamento", e o comparador antes/depois
funciona pelas setas do teclado.

**Responsividade.** Testado de 320 px a 2560 px, sem rolagem horizontal em
nenhuma largura.
