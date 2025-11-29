<p align="center">
  <img src="https://img.shields.io/badge/Chemostats-v2.0-00d4aa?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTkgMyBoNiIvPjxwYXRoIGQ9Ik0xMiAzdjE4Ii8+PHBhdGggZD0iTTQgMjFoMTYiLz48cGF0aCBkPSJNOCAxMmw0LTQgNCA0Ii8+PC9zdmc+" alt="Chemostats"/>
</p>

<h1 align="center">🧪 Chemostats v2.0</h1>

<p align="center">
  <strong>Платформа статистического анализа для метаболомики и биоинформатики</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#docker">Docker</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#api">API</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker"/>
</p>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 ANOVA Analysis
- One-way ANOVA с множественными коррекциями
- **Bonferroni** & **Benjamini-Hochberg** FDR
- Интерактивные **Box Plots** (Plotly.js)
- Экспорт в **Excel + PNG**

</td>
<td width="50%">

### 🔬 PCA Analysis
- Principal Component Analysis
- Auto-scaling, Mean-centering, Pareto
- Score & Loading plots *(coming soon)*
- Variance explained visualization

</td>
</tr>
<tr>
<td>

### 🌍 Localization
- 🇬🇧 English
- 🇷🇺 Русский  
- 🇺🇿 O'zbekcha

</td>
<td>

### 📁 File Manager
- Drag & drop upload
- Nested folders
- CSV / Excel support
- Smart data detection

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.11+
- **Docker** (optional)

### Local Development

```bash
# Clone
git clone https://github.com/your-repo/kkh-analysis.git
cd kkh-analysis

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## 🐳 Docker

### One Command Deploy

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Commands

```bash
docker compose logs -f          # View logs
docker compose down             # Stop all
docker compose restart backend  # Restart service
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Zustand | State Management |
| Plotly.js | Interactive Charts |
| Framer Motion | Animations |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | API Framework |
| Pandas | Data Processing |
| SciPy | Statistical Analysis |
| NumPy | Numerical Computing |
| Uvicorn | ASGI Server |

---

## 📡 API

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/preview` | Parse & preview file |
| `POST` | `/api/anova` | Run ANOVA analysis |
| `POST` | `/api/pca` | Run PCA analysis |

### Example: ANOVA Request

```bash
curl -X POST http://localhost:8000/api/anova \
  -F "file=@data.csv" \
  -F "class_column=Group" \
  -F "fdr_threshold=0.05"
```

### Response Structure

```json
{
  "results": [
    {
      "variable": "Metabolite_1",
      "pValue": 0.0023,
      "fdr": 0.0115,
      "bonferroni": 0.0921,
      "benjamini": true
    }
  ],
  "summary": {
    "total_variables": 150,
    "benjamini_significant": 23,
    "bonferroni_significant": 8
  },
  "boxplot_data": { ... }
}
```

---

## 📦 Export

Export generates a **ZIP archive** containing:

```
ANOVA_Results_2024-01-15/
├── ANOVA_Results.xlsx      # Full statistics table
├── boxplots/
│   ├── Metabolite_1.png    # High-res box plots
│   ├── Metabolite_2.png
│   └── ...
├── original_data.csv       # Source file
└── README.txt              # Analysis metadata
```

---

## 🗂 Project Structure

```
kkh-analysis/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── services/
│   │   ├── anova.py        # ANOVA logic
│   │   └── pca.py          # PCA logic
│   ├── utils/
│   │   └── file_parser.py  # Data parsing
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── analysis/   # Analysis components
│   │   │   ├── layout/     # Layout components
│   │   │   └── ui/         # UI primitives
│   │   ├── lib/
│   │   │   ├── i18n/       # Translations (en/ru/uz)
│   │   │   ├── api.ts      # API client
│   │   │   └── export.ts   # Export logic
│   │   └── store/          # Zustand store
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Backend API URL |
| `PORT` | `8000` | Backend port |

### Vite Proxy (Development)

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  }
}
```

---

## 📋 Roadmap

- [x] ANOVA with FDR correction
- [x] Interactive Box Plots
- [x] Multi-language support (EN/RU/UZ)
- [x] Excel + PNG export
- [x] Docker deployment
- [ ] PCA Score/Loading plots
- [ ] AI Assistant integration
- [ ] Batch analysis
- [ ] Cloud storage

---

## 👥 Authors

**KKH Analysis Team**

---

## 📄 License

MIT License - feel free to use for research and education.

---

<p align="center">
  <sub>Built with ❤️ for metabolomics research</sub>
</p>
