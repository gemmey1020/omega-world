DOCUMENT: OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V2.md
STATUS: FOUNDER_APPROVED | CONCEPT: HARDENED HYBRID (V2 EXECUTION READY)

# 1. CORE PHILOSOPHY: ZERO FRICTION, MAXIMUM CLARITY

V1 assumed a hybrid approach was safe. V2 recognizes that without strict mathematical enforcement, hybrids become visual mud. Every pixel must justify its existence against the constraints of elderly/non-tech-savvy users and low-end Android rendering.

# 2. COLOR CONTRAST & ACCESSIBILITY (WCAG 2.1 AA ENFORCED)

- **Background:** Warm Off-White (`#F8FAFC`).
- **Deep Navy (Corrected):** Shifted from `#0F172A` to `#1E293B` (Slate 800). This prevents high-contrast halation (text blooming/bleeding) for users with astigmatism while maintaining institutional authority.
- **The Orange Laser (Corrected):** Original `#F97316` fails WCAG AA criteria for text/icons on white. Upgraded to **Burnt Orange (`#EA580C`)**.
  - *Usage constraint:* Orange is NEVER used for text/outlines. It is purely a solid background with stark White (`#FFFFFF`) text (Contrast Ratio: ~4.5:1).

# 3. TYPOGRAPHY SYSTEM (FLUID & DETERMINISTIC)

Typography relies on CSS `clamp()` to prevent layout collapse between standard mobiles (375px wide) and large tablets (768px+).

- **H1 (Titles):** `font-size: clamp(1.25rem, 1rem + 1.25vw, 1.5rem);` | `font-weight: 700`
- **Body / Primary Labels:** `font-size: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);` | `font-weight: 500`
- **Pricing / Scarcity:** `font-size: clamp(1.125rem, 1rem + 0.6vw, 1.25rem);` | `font-family: ui-monospace, SFMono-Regular, etc.` | `font-weight: 800`

# 4. COMPONENTS & SHAPES (THE 8PT GRID)

- **Border Radii (Corrected):** 20px was "muddy". We use strict **16px** for parent containers (Cards) and **8px** for inner children (Images, Badges).
- **The Product Card:**
  - Gap between Product Image and Text: `16px` (2 units on 8pt grid).
  - Internal Card Padding: `16px`.
  - Border: `1px solid #E2E8F0`. Shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05)` (Sharper than V1 to convey tangibility without blur).
- **The Button Dynamics:**
  - Padding: `min-height: 56px` to eradicate "fat-finger" misses.
  - Transition: `transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms linear;`
  - Feedback: Active state scales to `transform: scale(0.97)` to mimic physical depression. A strict 500ms debounce prevents double-ordering.

# 5. NAVIGATION & SPATIAL ANCHORS

- **The "Mom-Navigation" Patch:** The Back button is fixed in a sticky top header or bottom bar with `z-index: 50`. It never scrolls out of view.
- **Haptic Feedback:** The Back button and Primary CTAs trigger native vibration (`if (navigator.vibrate) navigator.vibrate(50);`) confirming system registration to users unsure if they pressed it correctly.
- **Global Margins (Corrected):** V1's 24px destroyed horizontal space on iPhone SEs. Standardized to `16px` mobile / `32px` desktop.

# 6. ACTION LASER & SCARCITY ANIMATION

- **Restricting the Laser:** To prevent the "strobe light" effect, "Add to Cart" functions on product lists use Deep Navy inverse or Gray (`#CBD5E1`). The Orange Laser (`#EA580C`) is reserved EXCLUSIVELY for the sticky bottom "Checkout" bar, unifying the page's objective.
- **Scarcity Pulse:** The scarcity indicator uses a calm, systemic pulse to denote "live data" without inducing panic.
  - Animation: `animation: omega-pulse 3s ease-in-out infinite;`
  - Keyframes:
      `0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.4); opacity: 1;}`
      `50% { box-shadow: 0 0 0 6px rgba(234, 88, 12, 0); opacity: 0.8;}`
      `100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); opacity: 1;}`
