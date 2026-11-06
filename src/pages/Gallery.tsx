import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { listProducts, deleteProduct } from '../services/storage'
import type { Product } from '../types/product'

export default function Gallery() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const list = await listProducts()
    setProducts(list)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const onDelete = async (id: string) => {
    if (!confirm('Excluir este produto?')) return
    await deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="page">
      <h1>Galeria de mostruários digitais</h1>
      <p className="subtitle">Imagens prontas para uso no cadastro de produtos da sua loja.</p>
      {loading ? (
        <div className="center">
          <Loader2 className="spin" /> Carregando...
        </div>
      ) : products.length === 0 ? (
        <div className="placeholder">Nenhum produto ainda. Transforme sua primeira foto!</div>
      ) : (
        <div className="grid cards">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}