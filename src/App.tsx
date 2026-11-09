import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import CameraScan from './pages/CameraScan'
import KnowledgeBase from './pages/KnowledgeBase'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/galeria" element={<Gallery />} />
          <Route path="/camera" element={<CameraScan />} />
          <Route path="/cadastro" element={<KnowledgeBase />} />
          <Route path="/captura" element={<Navigate to="/camera" replace />} />
          <Route path="/embalagem" element={<Navigate to="/camera" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}