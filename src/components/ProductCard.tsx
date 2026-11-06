import { Trash2, Download } from 'lucide-react'
import type { Product } from '../types/product'

interface Props {
  product: Product
  onDelete: (id: string) => void
}

export default function ProductCard({ product, onDelete }: Props) {
  const download = () => {
    const a = document.createElement('a')
    a.href = product.digitalDataUrl
    a.download = `${product.name || product.id}.png`
    a.click()
  }
  return (
    <div className="card">
      <img src={product.digitalDataUrl} alt={product.name} className="card-img" />
      {product.factoryDataUrl || product.factoryImageUrl ? (
        <img
          src={product.factoryDataUrl || product.factoryImageUrl!}
          alt="embalagem"
          className="card-factory"
        />
      ) : null}
      <div className="card-body">
        <h3>{product.name || 'Produto'}</h3>
        <p className="desc">{product.description}</p>
        <div className="tags">
          {product.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        <div className="card-actions">
          <button onClick={download} className="btn small">
            <Download size={14} /> Baixar PNG
          </button>
          <button onClick={() => onDelete(product.id)} className="btn small danger">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}