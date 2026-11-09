import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Plus, X } from 'lucide-react'
import { fileToDataUrl, resizeToDataUrl } from '../services/image'
import {
  deleteEntry,
  listEntries,
  saveEntry,
  type KnowledgeEntry,
} from '../services/knowledgeBase'

export default function KnowledgeBase() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const list = await listEntries()
      setEntries(list.sort((a, b) => b.createdAt - a.createdAt))
    } catch (e) {
      setError('Falha ao carregar base: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const onFile = async (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Arquivo inválido. Envie uma imagem (PNG, JPG, WEBP).')
      return
    }
    try {
      setError(null)
      const du = await fileToDataUrl(f)
      const r = await resizeToDataUrl(du, 512, 'image/png')
      setImage(r.dataUrl)
    } catch (e) {
      setError('Falha ao carregar a imagem: ' + (e as Error).message)
    }
  }

  const save = async () => {
    if (!image || !name.trim()) {
      setError('Selecione uma imagem e informe o nome.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const entry = await saveEntry({ name: name.trim(), description: desc.trim(), dataUrl: image })
      setEntries((prev) => [entry, ...prev])
      setImage(null)
      setName('')
      setDesc('')
      setShowForm(false)
    } catch (e) {
      setError('Falha ao salvar: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch (e) {
      setError('Falha ao excluir: ' + (e as Error).message)
    }
  }

  const clearForm = () => {
    setImage(null)
    setName('')
    setDesc('')
    setShowForm(false)
    setError(null)
  }

  return (
    <div className="page">
      <h1>Base de Conhecimento</h1>
      <p className="subtitle">
        Cadastre imagens com nome e descrição para que o app as reconheça na análise.
      </p>

      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> {showForm ? 'Cancelar' : 'Cadastrar imagem'}
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2>Nova imagem cadastrada</h2>
          <div className="form">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
                e.target.value = ''
              }}
            />
            {image ? (
              <img src={image} alt="preview" className="preview-img" style={{ maxHeight: 200 }} />
            ) : (
              <div
                className="upload-placeholder"
                style={{ cursor: 'pointer', minHeight: 120 }}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={32} />
                <p>Selecione uma imagem</p>
              </div>
            )}
            {image && (
              <button className="btn small" onClick={() => fileRef.current?.click()}>
                Trocar imagem
              </button>
            )}

            <label>Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Nescau 730g"
            />
            <label>Descrição</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Ex.: Achocolatado em pó Nestlé, embalagem econômica."
            />

            {error && <div className="placeholder">{error}</div>}

            <div className="row">
              <button className="btn primary" onClick={() => void save()} disabled={saving || !image || !name.trim()}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button className="btn" onClick={clearForm} disabled={saving}>
                <X size={16} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="center"><span className="spin">⟳</span> Carregando…</div>}

      {entries.length === 0 && !loading && (
        <div className="placeholder">Nenhuma imagem cadastrada ainda.</div>
      )}

      <div className="grid cards">
        {entries.map((e) => (
          <div className="card" key={e.id}>
            {e.dataUrl && <img src={e.dataUrl} alt={e.name} className="card-img" />}
            <div className="card-body">
              <h3>{e.name}</h3>
              {e.description && <p className="desc">{e.description}</p>}
              <small style={{ color: 'var(--muted)' }}>
                {new Date(e.createdAt).toLocaleDateString('pt-BR')}
              </small>
              <div className="card-actions">
                <button className="btn small danger" onClick={() => void remove(e.id)}>
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
