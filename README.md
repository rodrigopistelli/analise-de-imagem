# Análise de imagem

App React (PWA) para transformar fotos de produtos em mostruários digitais.

## Funcionalidades
- Upload de foto do produto (drag & drop) ou captura pela câmera
- Reconhecimento visual por IA gratuita (Gemini free tier + Hugging Face), com fallback local/mock
- OCR local com Tesseract.js (sem custo)
- Busca de embalagem de fábrica via Open Food Facts e Wikimedia Commons
- Detecção de placa de veículo (Mercosul/antiga) com OCR local
- Detecção de expressão facial (alegre, triste, neutra, etc.) quando há rosto, via Gemini
- Consulta veicular: links gratuitos e manuais (Gov.br / SINESP Cidadão), sem API paga
- Edição de nome/descrição/tags antes de salvar
- Galeria com download em PNG e exclusão
- Armazenamento: Supabase (nuvem) se configurado, senão IndexedDB local

> O app não usa nenhum serviço pago: não há OpenAI, Bing Visual Search nem APIs pagas de consulta veicular.

## Rodar
```bash
npm install
cp .env.example .env   # preencha se quiser nuvem/IA
npm run dev
```

## Build PWA
```bash
npm run build
npm run preview
```