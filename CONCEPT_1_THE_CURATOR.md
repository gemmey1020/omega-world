# CONCEPT 1: THE CURATOR

## Philosophy

**Luxury Minimalism.** The psychological goal is to frame hyper-local commerce as a highly curated, premium experience. It reduces cognitive load by introducing massive "breathing room" (whitespace) around items. Users feel a sense of elite control, trusting the system implicitly because it mirrors high-end gallery aesthetics, entirely absent of spammy visual noise.

## Layout Architecture

- **Pacing:** Expansive. 32px global horizontal margins. 48px vertical spacing between distinct semantic sections.
- **Desktop vs. Mobile:** Mobile is a strict, single-column focus (one vendor/product per row) ensuring absolute clarity. Desktop enforces a max-width container (480px or 600px) centered in a Deep Navy background to preserve the mobile-perfect proportions and avoid awkward stretching.

## Shapes & Borders

- **Border Radii:** Sharp, disciplined 8px curves. It feels structural and intentional, avoiding the "bubbly" feel of social media apps.
- **Borders & Shadows:** Subdued 1px solid borders (`#E2E8F0`) with crisp, grounded drop shadows (`0 4px 6px -1px rgb(0 0 0 / 0.1)`). High-end, not heavy.
- **Inactive Vendors:** 100% Grayscale applied to vendor imagery, collapsed to 60% opacity. They sit flat on the background with NO shadow, contrasting starkly with active, elevated elements.

## Navigation Flow

- **Back Button:** A sharp, minimalist left-facing arrow (Deep Navy), no background container.
- **Filters:** Placed directly beneath the header as a horizontal scroll track of ultra-minimal text tabs (no pill backgrounds unless active).
- **Search:** A prominent but elegant input field blending into the header, possessing a firm Deep Navy bottom border instead of a full bounding box.

## The "Action Laser" (Orange Application)

- **Checkout/Add to Cart:** Pure Orange (`#F97316`) is isolated entirely to the final structural actions. The visual isolation of Orange against pure white and Deep Navy makes the CTA impossible to miss.
- **Scarcity:** A tiny, heavy-weight monospaced Orange numeral (e.g., "10"), aligned precisely next to deeply contrasting Navy text.

## PWA Feel

- **Interactions:** Snappy, instantaneous, and deterministic. Fades over slides. A 150ms opacity transition ensures the app feels like a native tool responding at the speed of thought.
