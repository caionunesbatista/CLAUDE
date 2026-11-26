// Textos institucionais. ATENÇÃO: são modelos para orientar o dono do site — revise com um advogado antes de publicar.
import { useTitulo } from '../components/ui.jsx'
import { site } from '../config/site.js'
import { useSessao } from '../store/sessao.js'

function Pagina({ titulo, children }) {
  useTitulo(`${titulo} — ${site.nome}`)
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="titulo text-3xl">{titulo}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-suave [&_h2]:titulo [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:text-texto [&_strong]:text-texto">{children}</div>
    </article>
  )
}

export function Termos() {
  const { config } = useSessao()
  return (
    <Pagina titulo="Termos de uso">
      <p>
        Ao criar uma conta no {site.nome}, você concorda com estes termos. {site.empresa && `O serviço é oferecido por ${site.empresa}${site.cnpj ? `, CNPJ ${site.cnpj}` : ''}.`}
      </p>
      <h2>1. Quem pode jogar</h2>
      <p>Somente pessoas com 18 anos ou mais, com CPF válido. Cada pessoa pode ter apenas uma conta. Contas duplicadas, de terceiros ou com dados falsos podem ser bloqueadas, e o saldo retido para análise.</p>
      <h2>2. Saldo, depósitos e saques</h2>
      <p>
        Depósitos e saques são feitos por PIX, sempre de e para contas no nome do titular do cadastro. O saldo é liberado após a confirmação do pagamento. O saque mínimo é informado na carteira. Podemos pedir documentos para
        confirmar a identidade antes de liberar um saque.
      </p>
      <h2>3. Mesas, salas e comissão</h2>
      <p>
        Ao entrar em uma mesa ou sala valendo, o valor da entrada fica retido até o fim da partida. A casa cobra uma comissão de {config?.taxaCasa ?? 10}% sobre o pote, informada antes da entrada. O prêmio é creditado
        automaticamente ao fim da partida. Se a partida for cancelada antes do fim, os valores retidos são devolvidos.
      </p>
      <h2>4. Jogo limpo</h2>
      <p>
        É proibido combinar resultados, jogar em conluio com adversários, usar programas de auxílio, criar várias contas ou explorar falhas do sistema. Nesses casos a conta pode ser bloqueada e os valores envolvidos
        retidos.
      </p>
      <h2>5. Desconexões</h2>
      <p>A partida continua mesmo que um jogador desconecte. O sistema faz jogadas automáticas quando o tempo de jogada acaba. Problemas de conexão do jogador não dão direito a reembolso.</p>
      <h2>6. Alterações</h2>
      <p>Estes termos podem mudar. Avisaremos no site quando houver mudanças relevantes.</p>
    </Pagina>
  )
}

export function JogoResponsavel() {
  const { config } = useSessao()
  return (
    <Pagina titulo="Jogo responsável">
      <p>Truco é diversão. Jogar valendo dinheiro deve ser um complemento à diversão, nunca uma forma de resolver problemas financeiros.</p>
      <h2>Dicas para jogar com equilíbrio</h2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Defina antes quanto pode gastar e não ultrapasse esse valor.</li>
        <li>Nunca jogue com dinheiro de contas, aluguel ou comida.</li>
        <li>Não tente recuperar perdas aumentando o valor das apostas.</li>
        <li>Faça pausas. Use o modo treino grátis quando quiser só se divertir.</li>
      </ul>
      <h2>Precisa de ajuda?</h2>
      <p>
        Se sentir que perdeu o controle, peça ajuda. Você pode falar com o CVV pelo telefone <strong>188</strong> (gratuito, 24h) e procurar os Jogadores Anônimos. Se quiser bloquear sua conta por um período, fale com o nosso
        suporte{config?.whatsappSuporte ? ' pelo WhatsApp' : ''}{config?.emailSuporte ? ` ou pelo e-mail ${config.emailSuporte}` : ''}.
      </p>
      <p>
        <strong>Proibido para menores de 18 anos.</strong>
      </p>
    </Pagina>
  )
}
