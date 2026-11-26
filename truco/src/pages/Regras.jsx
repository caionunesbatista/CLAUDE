import { useState } from 'react'
import { Carta } from '../components/Carta.jsx'
import { useSessao } from '../store/sessao.js'
import { VALORES } from '../../shared/regras.js'
import { useTitulo } from '../components/ui.jsx'
import { site } from '../config/site.js'

function Secao({ titulo, children }) {
  return (
    <section className="cartao p-5 sm:p-7">
      <h2 className="titulo-secao mb-4 text-3xl">{titulo}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-suave [&_strong]:text-texto">{children}</div>
    </section>
  )
}

function OrdemCartas() {
  return (
    <div className="-mx-1 flex flex-wrap items-end gap-1.5 py-2">
      {VALORES.map((r, i) => (
        <div key={r} className="flex flex-col items-center gap-1">
          <Carta carta={{ r, s: i % 2 ? 'c' : 'e' }} tamanho="pequena" />
          <span className="h-4 font-display text-[11px] font-bold uppercase tracking-wider text-apagado">{i === 0 ? 'fraca' : i === VALORES.length - 1 ? 'forte' : ''}</span>
        </div>
      ))}
    </div>
  )
}

export default function Regras() {
  useTitulo(`Regras — ${site.nome}`)
  const { config } = useSessao()
  const [aba, setAba] = useState('paulista')
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <div>
        <h1 className="titulo text-5xl">Regras do truco</h1>
        <p className="mt-2 text-suave">As regras abaixo são exatamente as que o sistema aplica nas mesas. Em caso de dúvida, vale o que está aqui.</p>
      </div>

      <Secao titulo="O básico">
        <p>
          Joga-se com <strong>40 cartas</strong> (sem 8, 9 e 10), em <strong>1x1</strong> ou em <strong>duplas</strong> (parceiros sentados frente a frente). Cada jogador recebe <strong>3 cartas</strong> e a mão é
          disputada em até <strong>3 vazas</strong> (rodadas). Quem ganhar 2 vazas leva a mão. Vence a partida quem chegar primeiro a <strong>12 pontos</strong>.
        </p>
        <p>Ordem de força das cartas comuns (da mais fraca para a mais forte). Acima de todas ficam as manilhas:</p>
        <OrdemCartas />
        <p>Cartas comuns de mesmo valor empatam, qualquer que seja o naipe.</p>
      </Secao>

      <div className="flex gap-2">
        <button className="chip" aria-pressed={aba === 'paulista'} onClick={() => setAba('paulista')}>
          Truco Paulista
        </button>
        <button className="chip" aria-pressed={aba === 'mineiro'} onClick={() => setAba('mineiro')}>
          Truco Mineiro
        </button>
      </div>

      {aba === 'paulista' ? (
        <>
          <Secao titulo="Manilhas no Paulista: a vira">
            <p>
              Depois de distribuir, uma carta é virada na mesa: a <strong>vira</strong>. As manilhas da mão são as quatro cartas do valor <strong>seguinte</strong> ao da vira (se a vira é 3, as manilhas são os 4).
            </p>
            <div className="flex flex-wrap items-center gap-3 py-2">
              <Carta carta={{ r: '7', s: 'o' }} tamanho="pequena" />
              <span className="text-2xl">→</span>
              {['o', 'e', 'c', 'p'].map((s) => (
                <Carta key={s} carta={{ r: 'Q', s }} variante="paulista" manilha="Q" tamanho="pequena" />
              ))}
            </div>
            <p>
              Entre as manilhas, manda o naipe: <strong>Paus (Zap) &gt; Copas &gt; Espadas (Espadilha) &gt; Ouros (Pica-fumo)</strong>.
            </p>
          </Secao>
          <Secao titulo="Pontuação no Paulista">
            <p>
              A mão vale <strong>1 ponto</strong>. Pedindo truco ela passa a valer <strong>3</strong>; depois <strong>6</strong>, <strong>9</strong> e <strong>12</strong>.
            </p>
            <p>
              <strong>Mão de onze:</strong> quando uma dupla chega a 11 pontos, ela vê as cartas do parceiro e decide se joga (a mão vale 3) ou corre (os adversários ganham 1). Nessa mão ninguém pode pedir truco.
            </p>
            <p>
              <strong>Mão de ferro (11 a 11):</strong> as duas duplas com 11. Antes de ver as cartas, a mesa vota: jogar <strong>normal</strong> (cartas à vista) ou <strong>nas escuras</strong> (ninguém vê as próprias cartas). Nas escuras só com <strong>3 dos 4 votos</strong> (no 1x1, os dois precisam querer); senão, é normal. Vale 1 ponto, sem truco, e quem vencer a mão vence a partida.
            </p>
            <p>Depois de uma vaza empatada, quem abriu essa vaza abre a seguinte.</p>
          </Secao>
        </>
      ) : (
        <>
          <Secao titulo="Manilhas fixas no Mineiro">
            <p>No Mineiro não há vira. As manilhas são sempre as mesmas, nesta ordem:</p>
            <div className="flex flex-wrap gap-3 py-2">
              {[
                ['4', 'p'],
                ['7', 'c'],
                ['A', 'e'],
                ['7', 'o'],
              ].map(([r, s]) => (
                <Carta key={r + s} carta={{ r, s }} variante="mineiro" tamanho="media" />
              ))}
            </div>
            <p>
              <strong>Zap</strong> (4 de paus) &gt; <strong>Copas</strong> (7 de copas) &gt; <strong>Espadilha</strong> (Ás de espadas) &gt; <strong>Pica-fumo</strong> (7 de ouros). As demais cartas seguem a ordem comum.
            </p>
          </Secao>
          <Secao titulo="Pontuação no Mineiro">
            <p>
              A mão vale <strong>2 pontos</strong>. Pedindo truco passa a <strong>4</strong>; depois <strong>6</strong>, <strong>10</strong> e <strong>12</strong>.
            </p>
            <p>
              <strong>Mão de dez:</strong> quando uma dupla chega a 10 pontos, ela vê as cartas do parceiro e decide se joga (a mão vale 4) ou corre (os adversários ganham 2). Sem truco nessa mão.
            </p>
            <p>
              <strong>Mão de ferro (10 a 10):</strong> a mesa vota antes de ver as cartas: normal ou nas escuras. Nas escuras só com <strong>3 dos 4 votos</strong> (no 1x1, os dois); senão, normal. Vale 2, sem truco, e quem vencer a mão vence a partida.
            </p>
            <p>Depois de uma vaza empatada, quem jogou primeiro a carta do empate abre a vaza seguinte.</p>
          </Secao>
        </>
      )}

      <Secao titulo="Truco, aceitar, correr e aumentar">
        <p>
          Na <strong>sua vez de jogar</strong>, antes de pôr a carta, você pode pedir truco. A dupla adversária responde: <strong>aceita</strong> (a mão passa a valer o novo valor), <strong>corre</strong> (vocês ganham o que a mão valia antes do
          pedido) ou <strong>aumenta</strong> na hora (seis, nove/dez, doze), e aí é a vez da sua dupla responder.
        </p>
        <p>Quem fez o último aumento aceito não pode aumentar de novo: o próximo aumento é sempre da outra dupla, na vez de um dos seus jogadores. Qualquer um da dupla pode responder; vale a primeira resposta.</p>
      </Secao>

      <Secao titulo="Quem ganha a mão (empates)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Quem ganhar 2 vazas leva a mão.</li>
          <li>Se a 1ª vaza empatar, quem ganhar a 2ª leva. Se também empatar, vale a 3ª.</li>
          <li>Se uma dupla ganhou a 1ª e a 2ª empatou, quem ganhou a 1ª leva.</li>
          <li>Se cada dupla ganhou uma e a 3ª empatou, leva quem ganhou a 1ª.</li>
          <li>Se as três empatarem, ninguém pontua.</li>
          <li>Empate só acontece entre adversários: se os dois parceiros jogarem a maior carta, a dupla vence a vaza.</li>
        </ul>
        <p>
          <strong>Carta escondida:</strong> a partir da 2ª vaza, toque em <strong>Esconder</strong> e depois na carta: ela cai virada para baixo, não vale nada na vaza e ninguém vê qual era.
        </p>
      </Secao>

      <Secao titulo="Regras da casa">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Cada jogada tem <strong>{config?.tempoJogada ?? 30} segundos</strong>. Se o tempo acabar, o sistema joga a sua carta mais fraca, ou corre do pedido, corre da mão de onze/dez ou vota "normal" na mão de ferro.
          </li>
          <li>Se você estiver desconectado, o tempo da sua jogada cai para 10 segundos para não travar a mesa.</li>
          <li>Ao sair de uma mesa antes de ela começar, o valor volta na hora para o seu saldo. Depois que começa, a partida vai até o fim.</li>
          <li>
            A casa cobra <strong>{config?.taxaCasa ?? 10}%</strong> sobre o pote de cada mesa ou sala valendo. O prêmio mostrado antes de você entrar já é o valor líquido.
          </li>
          <li>Mesas valendo que não completarem em 1 hora são canceladas com devolução. Salas de duplas que não lotarem em 24 horas também.</li>
          <li>Se o servidor cair ou reiniciar no meio de uma partida, todos os valores retidos dela são devolvidos aos jogadores.</li>
        </ul>
      </Secao>

      <Secao titulo="Salas de duplas">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Quem cria a sala define o número de duplas (ou jogadores, no formato individual), o valor da inscrição por jogador e quantas posições recebem prêmio, com os percentuais.</li>
          <li>Quando todas as vagas são preenchidas, a ordem da chave é sorteada e as partidas começam automaticamente. É eliminação simples.</li>
          <li>Quando o número de participantes não fecha a chave, os sorteados como cabeça de chave avançam direto da primeira rodada.</li>
          <li>Se o 3º lugar recebe prêmio, os perdedores das semifinais jogam a disputa de 3º lugar.</li>
          <li>No formato de duplas, o prêmio de cada posição é dividido igualmente entre os dois parceiros.</li>
        </ul>
      </Secao>
    </div>
  )
}
