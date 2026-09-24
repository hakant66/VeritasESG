# RAG: Hybrid Search + Reranker — Hazırlık Rehberi

Bu belge, Görevlerim **Lokal AI** ve bilgi bankası aramasında hibrit retrieval + reranker adımını etkinleştirmek için gerekenleri özetler.

## Mevcut pipeline

```
Soru metni → (çoklu sorgu) → retrieval → [opsiyonel rerank] → LLM → KAYNAKLAR footer
```

| Adım | Varsayılan | `KB_HYBRID_SEARCH_ENABLED=true` |
|------|------------|-----------------------------------|
| Vektör | Qdrant cosine (embedding provider) | Aynı |
| Metin | — | MongoDB `$text` on `KbChunk.text` |
| Birleştirme | — | RRF (`lib/rrfMerge.ts`) |
| Rerank | Yok | `RERANK_PROVIDER` ile |
| Lokal AI footer | KAYNAKLAR (profil + KB + retrieval modu) | Aynı |

## 1. Ortam değişkenleri

`.env` veya deployment secrets:

```bash
# Hibrit arama
KB_HYBRID_SEARCH_ENABLED=true
KB_SEARCH_RETRIEVE_LIMIT=24    # fusion öncesi kanal limiti
KB_RRF_K=60                    # RRF sabiti

# Cohere rerank (önerilen — GPU gerekmez)
RERANK_PROVIDER=cohere
RERANK_MODEL=rerank-v3.5
RERANK_TOP_N=8
COHERE_API_KEY=...

# Alternatif: yerel rerank (GPU + proxy gerekir)
# RERANK_PROVIDER=ollama
# RERANK_MODEL=bge-reranker-v2-m3
# OLLAMA_RERANK_URL=http://gpu-host:11434
```

Mevcut RAG altyapısı (değişmedi):

```bash
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://127.0.0.1:6333
# Embedding: Ayarlar → LLM → embedding provider (OpenAI text-embedding-3-small önerilir)
```

## 2. MongoDB text index

Şema `KbChunk.text` üzerinde text index tanımlar. İlk deploy veya mevcut DB için:

```bash
# Uygulama ilk text aramada lazy create yapar; manuel doğrulama:
mongosh "$MONGODB_URI" --eval 'db.kbchunks.getIndexes()'
```

Beklenen index adı: `kbchunk_text`.

## 3. Cohere rerank kurulumu

1. [Cohere](https://cohere.com/) hesabı → API key
2. `COHERE_API_KEY` set → Cohere rerank auto-enables (or `RERANK_PROVIDER=cohere`)
3. Health kontrol: `GET /api/kb-rag/health` → `retrieval.rerank.cohereApiKeyConfigured: true`

Maliyet: sorgu başına ~20–30 chunk rerank; görev autofill çoklu sorgu kullanır — kota/limit izleyin.

## 4. Yerel bge-reranker + GPU

Ollama’nın standart dağıtımı **cross-encoder rerank API** sunmaz. Seçenekler:

| Yöntem | GPU | Not |
|--------|-----|-----|
| **Cohere API** | Hayır | En az operasyon |
| **Dedicated rerank servisi** | Evet | `sentence-transformers` CrossEncoder + küçük HTTP wrapper |
| **Ollama + /api/rerank proxy** | Evet | Custom proxy Cohere-compatible JSON |

GPU faydası:

- Yerel embedding (Ollama `nomic-embed-text` vb.)
- Yerel rerank (`bge-reranker-v2-m3`)
- Yerel LLM

OpenAI embedding + Cohere rerank kullanıyorsanız **app sunucusunda GPU şart değil**.

Örnek GPU host (rerank proxy fikri):

```bash
# GPU makinede model (örnek — kendi servisinize bağlayın)
pip install sentence-transformers flask
# Flask/ FastAPI: POST /api/rerank { model, query, documents, top_n }
# → results: [{ index, relevance_score }]
```

`OLLAMA_RERANK_URL` bu proxy’nin taban URL’si olmalı.

## 5. Qdrant sparse (ileride)

Şu an **Mongo text index** kullanılıyor (ADR-08 Phase 2). Qdrant sparse vektör alternatifi:

- Ingest’te BM25/splade sparse vector
- Qdrant hybrid query (dense + sparse)
- Mongo text index’e gerek kalmaz

Bu sürümde uygulanmadı; migration maliyeti ingest + re-index.

## 6. Etkinleştirme sonrası kontrol listesi

- [ ] Tüm KB belgeleri index’li (`chunkCount > 0` müşteri için)
- [ ] Embedding provider sabit; değiştirdikten sonra **tüm KB re-index**
- [ ] `KB_HYBRID_SEARCH_ENABLED=true`
- [ ] Mongo `kbchunk_text` index var
- [ ] İsteğe bağlı: `RERANK_PROVIDER=cohere` + API key
- [ ] `/api/kb-rag/health` → `retrieval.hybridSearchEnabled`, `retrieval.rerank`
- [ ] Görevlerim → Lokal AI → yanıt altında **KAYNAKLAR** (profil, belgeler, retrieval modu)

## 7. İlgili kod

| Dosya | Rol |
|-------|-----|
| `lib/ragSearchConfig.ts` | Env + durum özeti |
| `lib/rrfMerge.ts` | RRF birleştirme |
| `server/lib/rag/hybridKbSearch.ts` | Vektör + metin fusion |
| `server/lib/rag/mongoTextKbSearch.ts` | Mongo `$text` |
| `server/lib/rag/rerankKbHits.ts` | Cohere / Ollama rerank |
| `server/lib/rag/searchCustomerKb.ts` | Ana retrieval girişi |
| `lib/taskAutofillSources.ts` | KAYNAKLAR formatı |
| `server/lib/rag/taskQuestionAutofill.ts` | Lokal + Genel autofill |

## 8. Sorun giderme

| Belirti | Olası neden |
|---------|-------------|
| Hibrit açık ama metin sonuç yok | Text index yok; sorgu tek karakter |
| Rerank çalışmıyor | `COHERE_API_KEY` eksik veya `RERANK_PROVIDER=none` |
| Yanlış müşteri chunk | `customerId` filtresi — re-index kontrol |
| Genel merkez hâlâ yanlış | Rerank açın; `KB_SEARCH_RETRIEVE_LIMIT` artırın |
