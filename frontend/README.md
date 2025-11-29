# KKH Analysis Platform - Frontend v2

> Modern, professional data analysis interface with AI assistant

## Design Aesthetic

**Scientific Editorial** - Dark, minimal, data-focused

- **Fonts**: Plus Jakarta Sans (UI) + JetBrains Mono (data)
- **Colors**: Charcoal dark + Mint/Cyan accents
- **Style**: Clean, professional, with subtle animations

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Fast development
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **AG Charts** - Professional box plots
- **Zustand** - State management
- **Radix UI** - Accessible primitives

## Project Structure

```
src/
├── components/
│   ├── analysis/          # Analysis components
│   │   ├── AnalysisResults.tsx
│   │   ├── AnalysisSettingsDialog.tsx
│   │   ├── BoxPlotChart.tsx    # AG Charts box plot
│   │   ├── DataPreview.tsx
│   │   └── ResultsTable.tsx
│   ├── layout/            # Layout components
│   │   ├── AppLayout.tsx       # 3-column layout
│   │   ├── AISidebar.tsx       # AI Assistant
│   │   ├── FileManagerSidebar.tsx
│   │   └── MainContent.tsx
│   └── ui/                # UI primitives
│       ├── Button.tsx
│       ├── Dialog.tsx
│       ├── Input.tsx
│       ├── ScrollArea.tsx
│       ├── Select.tsx
│       └── Tooltip.tsx
├── lib/
│   ├── api.ts             # API client
│   └── utils.ts           # Utilities
├── store/
│   └── index.ts           # Zustand store
├── types/
│   └── index.ts           # TypeScript types
├── App.tsx
├── main.tsx
└── index.css              # Design system
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Features

### 1. File Manager (Left Sidebar)
- Project tree structure
- Create/delete projects
- File upload with drag & drop
- Search functionality

### 2. Main Content Area
- Data preview table
- Analysis configuration modal
- Results table with sorting
- AG Charts box plots with:
  - All data points visible
  - Outliers highlighted (orange)
  - Interactive tooltips
  - Smooth animations

### 3. AI Assistant (Right Sidebar)
- Chat interface
- Analysis context awareness
- Can answer questions about results

## Box Plot Implementation

Using AG Charts for professional box plots:

```typescript
// Features:
- box-plot series: min/q1/median/q3/max
- scatter series: all data points
- outliers highlighted in orange
- interactive tooltips
- legend support
```

## Customization

### Colors (tailwind.config.ts)
```typescript
colors: {
  surface: 'hsl(220 16% 8%)',      // Dark background
  accent: 'hsl(168 80% 55%)',       // Mint accent
  text: {
    primary: 'hsl(210 20% 95%)',
    secondary: 'hsl(215 15% 60%)',
  }
}
```

### Fonts
```css
font-family: 'Plus Jakarta Sans', sans-serif;  /* UI */
font-family: 'JetBrains Mono', monospace;      /* Data */
```

## Environment Variables

```bash
VITE_API_URL=http://localhost:8000
```

## License

MIT

