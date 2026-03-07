# OMEGA_COMMAND_CENTER_LIVE_AUDIT_BLUEPRINT.md

**Role:** Lead Frontend Architect & UX Engineer (OMEGA Ω)
**Status:** DRAFT (Awaiting Founder Execution)
**Constraint Enforcement:** No Orange, `--radius-primary: 18px`, `56px` touch targets, DOM Budget Strict.

---

## 1. LIVE VISUAL AUDIT FINDINGS (localhost:3001 & localhost:8000)

After inspecting the live DOM via the Antigravity Browser, the following architectural drifts were identified:

* **Color Compliance ("No Orange"):** **PASS**. The UI adheres to the OMEGA palette. Alerts are logic-driven (Emerald for Success, Red for Critical/Breaches).
* **Geometric Constraints (Radius):** **FAIL**. Current interactive elements (e.g., sidebar links, metric cards) use standard Tailwind `rounded-lg` or `rounded-[10px]`. These must be refactored globally to `--radius-primary: 18px`.
* **Touch Targets:** **FAIL**. Most interactive elements (search input, header buttons) currently compute to `h-10` (40px) or roughly 48px. These must strictly enforce `min-height: 56px`.
* **Rendering Bottlenecks:** The current "Zone Health Status" relies on standard `<table>` layouts. Under the 36K benchmark, standard DOM mapping will cause severe GC (Garbage Collection) pauses and thread locking. The `/api/admin/orders` endpoint currently enforces `auth:sanctum` and redirects/401s unauthenticated requests, structurally sound for security but requires the Next.js `fetch` wrapper to handle auth cookies seamlessly.

---

## 2. OMEGA COMPLIANCE REFACTOR (THE FIX)

Before mounting the 36K virtualization, the shell must be hardened.

### A. Global CSS Overrides (`app/globals.css`)

```css
@theme {
  /* Override Tailwind defaults to match OMEGA Contract */
  --radius-primary: 18px;
  --radius-secondary: 10px;
  --height-touch: 56px;
}
```

### B. Component Standardization

All interactive elements must be updated. For example, a basic button or nav link:

```tsx
<button className="min-h-[var(--height-touch)] rounded-[var(--radius-primary)] px-6 ...">
  {/* Content */}
</button>
```

---

## 3. VIRTUALIZATION BLUEPRINT (@tanstack/react-virtual)

To survive 36,000 active orders on a standard dispatcher's laptop, the DOM budget must remain under 150 nodes.

### Implementation Logic (The `/orders` Grid)

1. **The Scroll Container:** A fixed-height container (`h-[calc(100vh-120px)]`) must wrap the list. `overflow-y-auto` is applied here, not on the `<body>`.
2. **Dynamic Row Measurement:** Order rows must support expansion (to view dispatch history or SLA details) without breaking the virtualizer. We will use `measureElement`.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function OrderList({ orders }) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Base touch target height
    overscan: 15, // Pre-render 15 items above/below to prevent flicker on rapid scrolls
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto contain-strict">
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const order = orders[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <OrderRow order={order} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## 4. REACTIVE STATE STRATEGY (SLA TIMER ENGINE)

The SLA Engine relies on precise timing. If 500 orders are bordering on a breach, the UI must reflect this in real-time without crashing the browser or DDOSing the Laravel API.

### The Problem with Component-Level Timers

If 100 visible `<OrderRow />` components each run `setInterval(..., 1000)`, the browser's main thread will stutter, destroying the virtualization's scroll performance.

### The OMEGA Solution: Centralized Tick + SSE

1. **Server-to-Client Transport (SSE):**
    Implement `text/event-stream` on `/api/admin/live/stream`. The Laravel backend pushes a lightweight JSON payload ONLY when an order's status mutates (e.g., `received` -> `dispatched`). This is vastly superior to polling 36K rows every 5 seconds.
2. **The Client-Side Tick (Zustand/Context):**
    Maintain a single, global `requestAnimationFrame` or `setInterval` ticking at 1000ms at the root of the React tree.
3. **Passive Re-rendering:**
    Pass the global "now" timestamp down to the row components. The row calculates `timeRemaining = order.sla_deadline - globalNow`. This ensures the DOM only repaints the text nodes, requiring practically zero CPU.

```tsx
// Global SLA Tick
const useSlaTicker = () => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);
    return now;
};

// Inside the Virtualized Row
function OrderRow({ order }) {
    const now = useSlaTicker();
    const isBreached = now > order.sla_deadline;
    
    return (
        <div className={`min-h-[56px] rounded-[18px] ${isBreached ? 'bg-red-50 text-red-900 border-red-200' : 'bg-surface'}`}>
            <span>{formatDistanceTight(order.sla_deadline, now)}</span>
        </div>
    );
}
```
