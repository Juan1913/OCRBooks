# OCRBooks

Herramienta para digitalizar libros técnicos escaneados (PDFs de imágenes) y convertirlos a documentos LaTeX completos. Diseñada especialmente para libros de la Editorial Mir de Moscú: texto en español con fórmulas matemáticas densas.

Sin costos de API externos. Sin GPU. Todo corre en tu propia máquina.

---

## Qué hace

1. **Sube** un PDF escaneado (el libro original en imágenes)
2. **Extrae** cada página como imagen PNG a alta resolución
3. **Aplica OCR** página por página usando [Marker](https://github.com/VikParuchuri/marker) — reconoce texto, fórmulas matemáticas (`$...$`, `$$...$$`) y figuras
4. **Ensambla** un documento `.tex` completo
5. **Compila** el `.tex` con [Tectonic](https://tectonic-typesetting.github.io) y genera el PDF final
6. **Permite revisar** página a página: scan original a la izquierda, resultado renderizado a la derecha

---

## Pantallas principales

### Panel principal
Muestra todos los libros subidos con su estado, progreso y estadísticas. Desde aquí se sube un nuevo libro arrastrando el PDF o haciendo clic.

### Sidebar de procesos
Visible en todas las pantallas. Muestra en tiempo real:
- Libros procesándose (con barra de progreso)
- Libros en cola
- Libros pausados o con error
- Libros completados

Acciones disponibles por libro: **Revisar · Pausar · Reanudar · Eliminar**

### Pantalla de progreso
Muestra el avance del OCR página a página con un mapa visual. Cada cuadrito representa una página (gris = pendiente, amarillo = procesando, verde = listo, rojo = error). Al hacer clic en una página verde se abre la revisión directamente.

### Revisión página a página
Vista lado a lado: imagen del scan original (izquierda) y el resultado renderizado con MathJax (derecha). El tamaño y proporción del panel derecho se ajusta automáticamente al formato real del libro (A5, carta, etc.).

Desde esta pantalla se puede:
- Navegar entre páginas con las flechas o haciendo clic en el mapa superior
- **Editar el LaTeX** de cualquier página con el editor integrado
- **Compilar** el documento completo a PDF
- **Descargar** el PDF final

---

## Instalación y arranque

### Opción 1 — Docker (recomendado)

Requiere: Docker, Docker Compose, ~8 GB de RAM libre.

```bash
git clone <repo>
cd OCRBooks
docker-compose up --build
```

Abre http://localhost:3000

### Opción 2 — Desarrollo local

Requiere: Python 3.11+, Node.js 18+, Redis corriendo.

**1. Redis**
```bash
redis-server --daemonize yes
```

**2. Backend**
```bash
cd backend

# PyTorch CPU-only (evita descargar la versión con CUDA)
pip install torch --index-url https://download.pytorch.org/whl/cpu

pip install -r requirements.txt

# Tectonic — compilador LaTeX ligero (descarga paquetes automáticamente)
# Linux:
curl -fsSL https://drop.cargopkg.io/tectonic -o ~/.local/bin/tectonic && chmod +x ~/.local/bin/tectonic
# macOS: brew install tectonic

cp ../.env.example .env
```

**3. Frontend**
```bash
cd frontend
npm install
```

**4. Arrancar todo de una vez**
```bash
# Desde la raíz del proyecto
./dev.sh
```

O manualmente en tres terminales:
```bash
# Terminal 1 — API
cd backend && PYTHONPATH=. uvicorn app.main:app --reload --port 8000

# Terminal 2 — Worker Celery
cd backend && PYTHONPATH=. TORCH_DEVICE=cpu \
  celery -A app.workers.celery_app.celery_app worker --loglevel=info --concurrency=1

# Terminal 3 — Frontend
cd frontend && npm run dev
```

---

## Variables de entorno

Copia `.env.example` a `backend/.env` y ajusta si es necesario:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379/0` | URL del broker Celery |
| `STORAGE_PATH` | `./storage` | Dónde se guardan PDFs, PNGs, Markdown y el PDF compilado |
| `DATABASE_URL` | `sqlite+aiosqlite:///./ocrbooks.db` | Base de datos SQLite |
| `TORCH_DEVICE` | `cpu` | Dispositivo para Marker/Surya. Cambiar a `cuda` si hay GPU |

---

## Tiempos estimados

| Fase | Tiempo por página | Total (426 páginas) |
|---|---|---|
| Extracción PNG | ~0.5 s | ~3 min |
| OCR con Marker (CPU) | ~45–90 s | **5–10 horas** |
| Compilación LaTeX | — | ~2–5 min (una sola vez) |

El OCR es lento en CPU porque los modelos de Marker (Surya) son redes neuronales. El proceso corre completamente en background — puedes cerrar el navegador y regresar. El estado se conserva en SQLite y se puede pausar/reanudar en cualquier momento desde el sidebar.

---

## Gestión de procesos

Desde el sidebar izquierdo puedes en cualquier momento:

- **Pausar** — detiene el worker al terminar la página actual y marca el libro como pausado
- **Reanudar** — vuelve a encolar el proceso; las páginas ya procesadas se saltan automáticamente
- **Eliminar** — cancela la tarea, borra el registro de la base de datos y elimina todos los archivos del libro

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| API | Python 3.11 + FastAPI |
| Cola de tareas | Celery + Redis |
| Base de datos | SQLite (SQLAlchemy async) |
| OCR + matemáticas | [Marker](https://github.com/VikParuchuri/marker) + Surya (CPU) |
| Compilador LaTeX | [Tectonic](https://tectonic-typesetting.github.io) |
| PDF → imágenes | PyMuPDF (`fitz`) |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Render de fórmulas | MathJax 3 (CDN) |
| Tiempo real | WebSocket (FastAPI) + React Query (polling) |

---

## Estructura del proyecto

```
OCRBooks/
├── backend/
│   └── app/
│       ├── domain/          Entidades y puertos (sin dependencias externas)
│       ├── application/     Casos de uso y DTOs
│       ├── infrastructure/  OCR, LaTeX, storage, Celery, SQLAlchemy
│       ├── presentation/    Routers FastAPI + WebSocket
│       └── workers/         Pipeline Celery (extract → OCR → compile)
├── frontend/
│   └── src/
│       ├── domain/          Tipos TypeScript
│       ├── application/     Hooks de React Query
│       ├── infrastructure/  bookApi.ts
│       └── presentation/
│           ├── pages/       HomePage, ProcessingPage, ReviewPage
│           └── components/  AppLayout, BooksSidebar, PageViewerView, …
├── storage/                 Generado — PDFs, PNGs, Markdown, book.pdf
├── docker-compose.yml
├── dev.sh                   Script de arranque para desarrollo
└── .env.example
```

---

## Notas

- El directorio `storage/` puede crecer mucho (libros de 400+ páginas generan ~500 MB de PNGs durante el proceso). Los PNGs se eliminan automáticamente al compilar el PDF final; solo se conservan el PDF original, los Markdown de OCR, las figuras extraídas y el PDF compilado.
- El worker Celery corre con `--concurrency=1` para no saturar la RAM con múltiples modelos Marker en paralelo. Si tienes suficiente RAM (16+ GB), puedes aumentarlo.
- Los modelos de Surya/Marker se descargan automáticamente en el primer uso (~2–3 GB).
