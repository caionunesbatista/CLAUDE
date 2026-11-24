import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import BotaoWhatsapp from './components/layout/BotaoWhatsapp'
import Toast from './components/ui/Toast'
import Hero from './components/sections/Hero'
import Diferenciais from './components/sections/Diferenciais'
import Servicos from './components/sections/Servicos'
import Galeria from './components/sections/Galeria'
import Agendamento from './components/sections/Agendamento'
import Contato from './components/sections/Contato'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Diferenciais />
        <Servicos />
        <Galeria />
        <Agendamento />
        <Contato />
      </main>
      <Footer />
      <BotaoWhatsapp />
      <Toast />
    </>
  )
}
