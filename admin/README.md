# OMEGA Command Center

The administrative dashboard for OMEGA World operations management. A separate Next.js 16 application built to the OMEGA V3 design system specifications.

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 with OMEGA V3 design tokens
- **Design System**: Navy/Slate/Emerald/Red color palette, 56px tap targets, 18px/10px radii
- **Components**: Modular React components in `src/components/command-center/`

## Project Structure

```
admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with metadata
│   │   ├── page.tsx             # Overview dashboard page
│   │   └── globals.css          # OMEGA V3 design tokens
│   └── components/
│       └── command-center/
│           ├── command-center-shell.tsx  # Main shell wrapper
│           ├── top-bar.tsx               # Header with search & alerts
│           ├── side-nav.tsx              # Collapsible sidebar navigation
│           ├── nav-link.tsx              # Individual nav links
│           ├── dashboard-overview.tsx    # Overview page layout
│           ├── kpi-card.tsx              # KPI metrics cards
│           ├── sla-breach-card.tsx       # SLA breach alert card
│           ├── zone-health-table.tsx     # Zone health data table (48px rows)
│           └── event-feed.tsx            # Live event feed (44px rows)
├── package.json
├── tsconfig.json
├── next.config.mjs
└── README.md
```

## Getting Started

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm --filter omega-command-center dev
```

The application will start at `http://localhost:3001`.

### Build

```bash
pnpm --filter omega-command-center build
pnpm --filter omega-command-center start
```

## Features

### Global Shell
- **Top Bar**: 64px header with logo, search, notifications, and user menu
- **Side Navigation**: 240px fixed sidebar (collapsible on mobile) with 7 main sections
- **Responsive**: Desktop-optimized layout with mobile support

### Overview Dashboard
- **KPI Cards**: Received, Dispatched, Delivered orders with trend indicators
- **SLA Breach Alert**: Real-time SLA breach counter with severity breakdown
- **Quick Stats**: Response time, system health, active vendors
- **Zone Health Table**: Fixed 48px rows with status, orders, delivery time, satisfaction
- **Event Feed**: Live event stream (44px rows) with real-time updates

## Design System Compliance

All components follow OMEGA V3 specifications:
- ✅ Navy/Slate/Emerald/Red color palette only
- ✅ No orange elements
- ✅ 56px minimum tap targets with 12px dead zones
- ✅ 18px primary radius, 10px secondary radius
- ✅ Functional motion only (no decorative animations)
- ✅ WCAG AA+ accessibility compliance
- ✅ Desktop-optimized, data-dense layout

## Mock Data

Currently using in-component mock data. Future integration points:

```typescript
// Replace with API calls to Laravel 12 headless backend
// const orders = await fetchOrders();
// const zones = await fetchZones();
// const events = await fetchLiveEvents();
```

## Future Enhancements

- [ ] API integration with Laravel 12 headless backend
- [ ] Real-time updates using WebSockets
- [ ] Virtualized data tables with @tanstack/react-virtual
- [ ] User authentication and role-based access
- [ ] Advanced filtering and search
- [ ] Analytics and reporting sections
- [ ] Mobile navigation drawer

## Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Color contrast compliance
- Screen reader optimization

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for 320px+ screens
- Touch-friendly tap targets (56px minimum)
