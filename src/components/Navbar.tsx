import { Link, useLocation } from 'react-router-dom'
import { Camera, GalleryHorizontal } from 'lucide-react'

export default function Navbar() {
  const loc = useLocation()
  return (
    <nav className="navbar">
      <div className="brand">Análise de imagem</div>
      <div className="nav-links">
        <Link to="/" className={loc.pathname === '/' ? 'active' : ''}>
          <Camera size={18} /> Transformar
        </Link>
        <Link to="/galeria" className={loc.pathname === '/galeria' ? 'active' : ''}>
          <GalleryHorizontal size={18} /> Galeria
        </Link>
      </div>
    </nav>
  )
}