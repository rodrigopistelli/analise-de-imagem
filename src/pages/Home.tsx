import { Link } from 'react-router-dom'
import { Camera, BookOpen } from 'lucide-react'

export default function Home() {
  return (
    <div className="page">
      <h1>Bem-vindo à Análise de imagem</h1>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Sobre o aplicativo</h2>
        <p className="desc">
          O Análise de imagem é uma ferramenta 100% gratuita para capturar ou carregar a foto de um
          produto e obter uma análise automática: nome, cor, dimensões, descrição detalhada e a
          embalagem original de fábrica (quando encontrada). Também detecta placas de veículos e
          oferece links gratuitos para consulta manual de dados do veículo.
        </p>
        <p className="desc">
          Tudo funciona no navegador, sem serviços pagos. As principais tecnologias utilizadas são:
        </p>
        <ul className="desc" style={{ margin: '8px 0 0 18px', lineHeight: 1.7 }}>
          <li><strong>React + TypeScript + Vite</strong> — interface e build do PWA.</li>
          <li><strong>Tesseract.js</strong> — OCR local para leitura de rótulos e placas.</li>
          <li><strong>Google Gemini (free tier)</strong> — reconhecimento visual alternativo.</li>
          <li><strong>Hugging Face (free tier)</strong> — legendagem de imagens (BLIP).</li>
          <li><strong>Open Food Facts</strong> — busca de produto por código de barras.</li>
          <li><strong>Wikimedia Commons</strong> — imagens de referência da embalagem.</li>
          <li><strong>Pollinations.ai / canvas local</strong> — geração de ilustração digital.</li>
          <li><strong>jsQR</strong> — decodificação de códigos de barras.</li>
          <li><strong>Supabase (opcional, free tier) / IndexedDB</strong> — armazenamento.</li>
        </ul>
      </div>

      <div className="grid two">
        <div className="panel">
          <h2><Camera size={18} /> Análise de imagens</h2>
          <p>Carregue uma foto ou use a câmera</p>
          <Link className="btn primary" to="/camera">Abrir Análise de imagens</Link>
        </div>
        <div className="panel">
          <h2><BookOpen size={18} /> Base de conhecimento</h2>
          <p>Cadastre imagens com nome e descrição para reconhecimento.</p>
          <Link className="btn" to="/cadastro">Abrir Base de conhecimento</Link>
        </div>
      </div>
    </div>
  )
}
