# OMEGA Command Center - Quick Start Guide

Get the admin dashboard running in 5 minutes.

## Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

## Installation

```bash
# 1. Navigate to admin directory
cd admin

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The dashboard opens at **http://localhost:3001**

## What You See

### Layout
- **Top Bar** (64px): Logo, search, alerts, user menu
- **Sidebar** (240px, collapsible): 7 navigation links across 3 sections
- **Main Content**: Dashboard with KPIs, tables, event feed

### Dashboard Sections
1. **KPI Cards** (3 cards)
   - Orders Received: 1,248
   - Orders Dispatched: 987
   - Deliveries Completed: 764

2. **Alerts Section**
   - Active SLA Breaches: 23 (4.2%)
   - Quick Stats: Response time, System health, Active vendors

3. **Zone Health Table** (48px rows)
   - 5 zones with status, active orders, delivery time, satisfaction

4. **Live Event Feed** (44px rows)
   - 8 recent events: new orders, deliveries, alerts, system updates

## Project Structure

```
admin/
├── src/
│   ├── app/
│   │   ├── page.tsx           ← Main overview page
│   │   ├── layout.tsx         ← Root layout
│   │   └── globals.css        ← Design tokens
│   └── components/
│       └── command-center/    ← All dashboard components
├── package.json
├── tsconfig.json
├── next.config.mjs
└── README.md
```

## Common Tasks

### View Component Code
All components are in `src/components/command-center/`:
- `command-center-shell.tsx` - Main layout wrapper
- `top-bar.tsx` - Header bar
- `side-nav.tsx` - Sidebar navigation
- `dashboard-overview.tsx` - Overview page layout
- `kpi-card.tsx`, `sla-breach-card.tsx`, `zone-health-table.tsx`, `event-feed.tsx` - Dashboard widgets

### Modify Design Tokens
Edit `src/app/globals.css` - all OMEGA V3 colors and sizes defined there:
```css
@theme {
  --color-navy: #0f172a;        /* Primary background */
  --color-emerald: #059669;     /* Success/active states */
  --color-red: #dc2626;         /* Errors/alerts */
  --radius-md: 18px;            /* Primary radius */
  --radius-sm: 10px;            /* Secondary radius */
}
```

### Replace Mock Data
Find mock data in each component and replace with API calls:

**Before (mock data)**:
```tsx
const mockZones: Zone[] = [
  { id: 'zone-01', name: 'Downtown Central', ... }
  // ...
];
```

**After (API call)**:
```tsx
const zones = await fetch('/api/zones').then(r => r.json());
```

### Add a New Page
1. Create `src/app/[new-page]/page.tsx`
2. Import `CommandCenterShell`
3. Add component inside shell
4. Link from `side-nav.tsx`

### Debug in Browser
Open DevTools (F12):
- **Console**: See React errors, logs
- **Network**: Check API calls (when connected)
- **Responsive Design Mode**: Test mobile layout

## Design System Notes

### Colors (Navy/Slate/Emerald/Red only)
- Navy `#0f172a` - Backgrounds
- Slate `#475569` - Disabled/secondary text
- Emerald `#059669` - Success, active states
- Red `#dc2626` - Errors, alerts
- **NO ORANGE** anywhere

### Typography
- Headings: `text-lg`, `text-xl`, `text-2xl`, `text-3xl` (font-bold/semibold)
- Body: `text-sm` (regular weight)
- Labels: `text-xs` (uppercase, semibold)

### Spacing (Tailwind classes)
- Padding: `p-4`, `p-6`, `px-6` (not arbitrary values)
- Gaps: `gap-3`, `gap-4`, `gap-6`
- Heights: `h-10`, `h-16` (not arbitrary)

### Interactive Elements
- Buttons: 56px height (10 py + 4 px = 56px total)
- Tables: 48px rows (zone), 44px rows (events)
- Radius: Always `rounded-[18px]` or `rounded-[10px]`

## Troubleshooting

### Port 3001 already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
npm run dev
```

### Dependencies not installing
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
# Restart TypeScript server in your editor
# Or rebuild:
npm run build
```

### Tailwind classes not applying
Check `globals.css` for @theme block - restart dev server:
```bash
npm run dev
```

## Development Tips

1. **Use React DevTools**: Install browser extension to inspect components
2. **Read globals.css first**: All design tokens defined there
3. **Keep components small**: One job per component
4. **Test responsiveness**: Use DevTools responsive mode (iPad/Mobile)
5. **Check accessibility**: Use Axe DevTools extension

## Next Steps

1. ✅ Explore the dashboard layout
2. ✅ Review component code in `src/components/command-center/`
3. ✅ Check OMEGA_COMMAND_CENTER_IMPLEMENTATION.md for full details
4. 🔄 Connect to Laravel API (replace mock data)
5. 🔄 Add user authentication
6. 🔄 Implement real-time updates

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React 19**: https://react.dev
- **OMEGA V3 Design System**: See `OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V3.md`

## Support

For architecture questions, see:
- `OMEGA_COMMAND_CENTER_IMPLEMENTATION.md` - Full technical details
- `admin/README.md` - Project structure & features
- Implementation plan: `/v0_plans/omega-command-center.md`

---

**Happy coding!** 🚀
