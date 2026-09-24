# GPU Host + Ollama LLM — Kurulum Rehberi (Senaryo B)

GovernanceIQ uygulama sunucusu **CPU** üzerinde çalışır; LLM istekleri **GPU host** üzerindeki Ollama’ya HTTP ile gider. Embedding ve rerank için ayrı seçenekler aşağıda.

## Mimari

```
┌─ App sunucusu (GovernanceIQ) ─────────────────────────┐
│  Mongo · Qdrant · Redis                               │
│  Ayarlar → LLM: activeProvider = ollama              │
│  Rerank: Cohere API (opsiyonel, GPU gerekmez)         │
└──────────────────────────┬────────────────────────────┘
                           │ http://GPU_IP:11434
                           ▼
┌─ GPU host ────────────────────────────────────────────┐
│  NVIDIA GPU + Ollama                                  │
│  llama3.2 / llama3.1 / mistral … (metin)              │
│  nomic-embed-text (embedding — isteğe bağlı)          │
└───────────────────────────────────────────────────────┘
```

## 1. GPU host hazırlığı

### Donanım (öneri)

| Model boyutu | VRAM |
|--------------|------|
| 7B–8B (llama3.2, mistral) | 8–16 GB |
| 13B+ | 24 GB+ |

### Ubuntu örnek kurulum

```bash
# NVIDIA driver + CUDA (dağıtımınıza uygun paketler)
nvidia-smi   # GPU görünüyor olmalı

curl -fsSL https://ollama.com/install.sh | sh

# Uzak erişim (GovernanceIQ app’ten HTTP)
sudo systemctl edit ollama
```

`override.conf`:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Modelleri önceden indir (ilk istek gecikmesini azaltır)
ollama pull llama3.2
# Embedding de Ollama’da olsun istiyorsanız:
ollama pull nomic-embed-text
```

### Güvenlik

- Ollama’yı **yalnızca app sunucusunun erişebileceği** ağda tutun (VPC, VPN, firewall).
- `11434` portunu internete açmayın; gerekirse reverse proxy + TLS + IP allowlist.

### Doğrulama (GPU host üzerinde)

```bash
curl http://127.0.0.1:11434/api/version
curl http://127.0.0.1:11434/api/tags
```

App sunucusundan:

```bash
curl http://GPU_HOST_IP:11434/api/version
```

## 2. GovernanceIQ yapılandırması

### Seçenek A — Ayarlar UI (önerilen)

**Ayarlar → LLM**

1. **Aktif metin sağlayıcısı**: `Ollama (yerel)`
2. **Ollama → Temel URL**: `http://192.168.x.x:11434` (GPU host IP)
3. **Metin modeli**: `llama3.2` (GPU’da pull ettiğiniz isim)
4. **Embedding sağlayıcısı**:
   - **OpenAI** (mevcut KB index korunur) — önerilen geçiş yolu
   - veya **Ollama** + `nomic-embed-text` → **tüm KB re-index gerekir**
5. **Ollama bağlantısını test et** → yeşil onay + model listesi
6. Kaydet

### Seçenek B — `.env` (deploy secrets)

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://192.168.1.50:11434
OLLAMA_TEXT_MODEL=llama3.2

# Embedding hâlâ OpenAI (KB re-index gerekmez):
# EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=...

# Embedding de GPU’da:
# EMBEDDING_PROVIDER=ollama
# OLLAMA_EMBEDDING_MODEL=nomic-embed-text
# OLLAMA_EMBEDDING_DIMENSIONS=768

# Rerank (API — GPU gerekmez):
COHERE_API_KEY=...
KB_HYBRID_SEARCH_ENABLED=true
```

UI’da kaydedilen ayarlar `.env` üzerine yazılır; production’da genelde UI veya tek kaynak kullanın.

## 3. RAG + Görevlerim

| Özellik | Ollama LLM | Embedding | Rerank |
|---------|------------|-----------|--------|
| Lokal AI ile doldur | GPU (Ollama) | OpenAI veya Ollama | Cohere (önerilir) |
| Genel AI ile doldur | GPU (Ollama) | aynı | Cohere |

- **Lokal AI**: KB chunk’ları + Ollama metin üretimi
- **Cohere rerank**: retrieval kalitesi için `COHERE_API_KEY` + hibrit arama açık tutun

## 4. KB re-index (embedding değişince)

Embedding sağlayıcısını OpenAI → Ollama yaptıysanız:

1. Ayarlar → LLM → embedding = Ollama, model = `nomic-embed-text`, boyut = `768`
2. Her müşteri bilgi bankasında belgeleri **yeniden index** edin
3. `/api/kb-rag/health` → `llmEmbedding: true`

## 5. Sorun giderme

| Belirti | Çözüm |
|---------|--------|
| Test bağlantısı kırmızı | Firewall, `OLLAMA_HOST`, IP/URL |
| `model not found` | GPU host’ta `ollama pull <model>` |
| Çok yavaş ilk yanıt | Model cold start; `ollama run llama3.2` ile warm-up |
| Boş / kısa yanıt | Daha büyük model veya prompt; VRAM yetersizliği |
| KB arama boş | Embedding yapılandırılmamış veya re-index eksik |

## 6. İlgili dosyalar

| Dosya | Açıklama |
|-------|----------|
| `server/lib/llm/providers/ollama.ts` | Chat + embed HTTP client |
| `server/lib/llm/ollamaHealth.ts` | Bağlantı testi |
| `lib/llmSettings.ts` | `OLLAMA_*` env merge |
| `src/components/admin/LlmSettingsPanel.tsx` | UI + test butonu |
| `docs/rag/rag-hybrid-rerank-prep.md` | Hibrit arama + Cohere rerank |

## 7. Örnek tam stack (B + Cohere)

```bash
# App .env
OLLAMA_BASE_URL=http://10.0.0.12:11434
OLLAMA_TEXT_MODEL=llama3.2
AI_PROVIDER=ollama
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
COHERE_API_KEY=...
KB_HYBRID_SEARCH_ENABLED=true
```

UI: Aktif metin = Ollama, Embedding = OpenAI, Ollama URL = GPU host.

Bu yapıda **LLM GPU’da**, **embedding + rerank API’de** — maliyet ve operasyon dengesi genelde en pratik seçenek.
