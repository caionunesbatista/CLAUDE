import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'
import { Layout, LayoutTelaCheia } from './components/Layout.jsx'
import { Carregando, Protegido } from './components/ui.jsx'
import { useSessao } from './store/sessao.js'
import Inicio from './pages/Inicio.jsx'
import { Entrar, Cadastro } from './pages/Acesso.jsx'
import Lobby from './pages/Lobby.jsx'
import Salas from './pages/Salas.jsx'
import CriarSala from './pages/CriarSala.jsx'
import Sala from './pages/Sala.jsx'
import Mesa from './pages/Mesa.jsx'
import Carteira from './pages/Carteira.jsx'
import Perfil from './pages/Perfil.jsx'
import NaoEncontrada from './pages/NaoEncontrada.jsx'

const Admin = lazy(() => import('./pages/Admin.jsx'))
const Regras = lazy(() => import('./pages/Regras.jsx'))
const Termos = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Termos })))
const JogoResponsavel = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.JogoResponsavel })))

function App() {
  const carregar = useSessao((s) => s.carregar)
  useEffect(() => {
    carregar()
  }, [carregar])
  return (
    <Suspense fallback={<Carregando />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="entrar" element={<Entrar />} />
          <Route path="cadastro" element={<Cadastro />} />
          <Route path="jogar" element={<Lobby />} />
          <Route path="salas" element={<Salas />} />
          <Route path="salas/nova" element={<Protegido><CriarSala /></Protegido>} />
          <Route path="sala/:id" element={<Sala />} />
          <Route path="carteira" element={<Protegido><Carteira /></Protegido>} />
          <Route path="perfil" element={<Protegido><Perfil /></Protegido>} />
          <Route path="admin" element={<Protegido admin><Admin /></Protegido>} />
          <Route path="regras" element={<Regras />} />
          <Route path="termos" element={<Termos />} />
          <Route path="jogo-responsavel" element={<JogoResponsavel />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
        <Route element={<LayoutTelaCheia />}>
          <Route path="mesa/:id" element={<Mesa />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
