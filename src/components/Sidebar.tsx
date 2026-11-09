import { NavLink } from 'react-router-dom'
import { Home as HomeIcon, Camera, BookOpen } from 'lucide-react'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">Análise de imagem</div>
      <nav>
        <NavLink to="/" end>
          <HomeIcon size={18} /> Início
        </NavLink>
        <NavLink to="/camera">
          <Camera size={18} /> Análise de imagens
        </NavLink>
        <NavLink to="/cadastro">
          <BookOpen size={18} /> Base de conhecimento
        </NavLink>
      </nav>
    </aside>
  )
}
