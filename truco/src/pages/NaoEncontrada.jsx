import { Link } from 'react-router'
import { Carta } from '../components/Carta.jsx'

export default function NaoEncontrada() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <div className="mb-8 flex gap-2">
        <Carta carta={{ r: '4', s: 'o' }} tamanho="media" style={{ transform: 'rotate(-8deg)' }} />
        <Carta oculta tamanho="media" />
        <Carta carta={{ r: '4', s: 'e' }} tamanho="media" style={{ transform: 'rotate(8deg)' }} />
      </div>
      <h1 className="titulo text-3xl">Essa carta não está no baralho</h1>
      <p className="mt-3 text-suave">A página que você procurou não existe ou foi encerrada.</p>
      <Link to="/" className="btn btn-primario mt-8">
        Voltar para o início
      </Link>
    </section>
  )
}
