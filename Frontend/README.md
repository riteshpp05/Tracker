# Shende Industries Enterprise Portal — Frontend

The modern, responsive frontend application for the **Shende Industries Enterprise Portal**. Engineered with React 19, Vite 7, Tailwind CSS, Framer Motion, and Radix UI primitives with smooth Lenis scrolling.

---

## Architecture Overview

```
Frontend/
├── public/                 # Static assets and favicon
├── src/
│   ├── assets/             # Brand logos, diagrams, and media
│   ├── components/
│   │   ├── admin/          # Admin management (Users, Clients, Projects, Audit Logs, Settings)
│   │   │   └── reports/    # Administrative analytics and export views
│   │   ├── common/         # Shared shell elements (Header, Sidebar, NotificationPopover)
│   │   ├── dashboards/     # Dedicated role KPI dashboards (Admin, HR, Manager, Employee)
│   │   ├── employee/       # Self-service tools (Weekly timesheets, Leaves, Expenses, Tickets)
│   │   ├── hr/             # Recruitment ATS pipeline and 1-click candidate onboarding
│   │   ├── manager/        # Manager queues (Approvals, Team tickets, Workload allocation)
│   │   ├── public/         # Public corporate portal (Hero, Divisions, Careers board, Apply)
│   │   └── ui/             # Reusable design tokens (Buttons, Dialogs, Cards, Badges, Tabs)
│   ├── context/            # Global React context providers (AuthContext, ThemeContext)
│   ├── hooks/              # Custom React hooks (useAuth, useNotifications, useWindowSize)
│   ├── lib/                # Utility helpers, Tailwind merge, clsx class utilities
│   ├── services/           # Axios API client instances and REST endpoint service wrappers
│   ├── styles/             # Global CSS, Tailwind layers, and design token definitions
│   ├── types/              # Type definitions and interface contracts
│   ├── utils/              # Formatting, date calculations, and status mappings
│   ├── App.jsx             # Top-level application component with global providers
│   ├── routes.jsx          # Centralized React Router v7 route definitions
│   └── main.jsx            # React root mount with Lenis smooth scroll provider
├── .env.example            # Environment variable template
├── index.html              # HTML5 entrypoint with Google Fonts (Inter)
├── nginx.conf              # Production Nginx reverse proxy configuration for Docker
├── package.json            # Dependencies and npm script definitions
├── tailwind.config.js      # Custom theme, typography, and color tokens
└── vite.config.js          # Vite build, aliases, and development proxy configuration
```

---

## Technology Stack

- **Framework**: React 19 & React DOM 19
- **Bundler & Dev Server**: Vite 7
- **Routing**: React Router v7 (`react-router-dom`)
- **Styling**: Tailwind CSS v3.4 with `tailwindcss-animate`
- **UI Primitives**: Radix UI (`@radix-ui/react-*`)
- **Icons**: Lucide React (`lucide-react`)
- **Motion & Transitions**: Framer Motion
- **Smooth Scroll**: Lenis (`lenis` v1.3)
- **Data Visualization**: Recharts
- **Notifications**: Sonner
- **HTTP Client**: Axios with automatic JWT injection

---

## Getting Started

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to create `.env`:
```powershell
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Base API endpoint prefix (routed through Vite proxy in dev) |
| `VITE_BACKEND_URL` | `http://localhost:5000` | Target URL for Vite reverse proxy during local development |

### 3. Start Development Server
```powershell
npm run dev
```
The application will launch on [http://localhost:3000](http://localhost:3000).

### 4. Production Build
```powershell
npm run build
```
Compiles and tree-shakes the application into optimized bundles inside `dist/`.

### 5. Preview Production Build
```powershell
npm run preview
```

---

## Visual Design Reference

- **Palette**: Deep Navy (`#0F172A`), Indigo Accent (`#635BFF`), Crisp Canvas (`#F7F9FC`), Card Background (`#FFFFFF`), Border (`#E2E8F0`).
- **Typography**: Inter font family, high-contrast hierarchical weights (400, 500, 600, 700).
- **Interactive States**: Standardized hover transitions, focused rings, and accessible badge indicators.
- **Scroll Isolation**: Scrollable modal dialogs, drawers, and popovers utilize `data-lenis-prevent="true"` to prevent outer scroll hijacking.

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server on port 3000 with HMR |
| `npm run build` | Builds the optimized production artifact in the `dist` directory |
| `npm run preview` | Starts a local web server to preview the production build |
| `npm run lint` | Runs ESLint across all source files |
