export interface Product {
  id: string
  name: string
  description: string
  tags: string[]
  originalDataUrl: string
  factoryDataUrl?: string
  factoryImageUrl?: string
  digitalDataUrl: string
  digitalFormat: 'png' | 'webp' | 'jpeg'
  createdAt: number
  width: number
  height: number
}

export interface TransformResult {
  caption: string
  prompt: string
  digitalDataUrl: string
  width: number
  height: number
}