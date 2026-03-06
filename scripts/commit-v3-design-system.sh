#!/bin/bash

# OMEGA World Design System V3 - Git Commit Script
# This script commits all V3 design system files to the repository

cd /vercel/share/v0-project

echo "🚀 Committing OMEGA World Master Design System V3..."
echo ""

# Add all V3 design system files
git add OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V3.md
git add OMEGA_V3_IMPLEMENTATION_GUIDE.md
git add OMEGA_V3_DESIGN_AUDIT_SUMMARY.md
git add OMEGA_V3_README.md
git add OMEGA_V3_MANIFEST.md
git add components/omega/vendor-card.tsx
git add components/omega/sticky-checkout-bar.tsx
git add app/omega-v3-demo/page.tsx

# Create commit message
git commit -m "feat: OMEGA World Master Design System V3

- Complete design specification with 3-tier hierarchy (Global → Thematic → Component)
- Vendor Card and Sticky Checkout Bar reference components
- Interactive demo page showcasing V3 design patterns
- Comprehensive implementation guide for team adoption
- Design audit summary comparing V2 → V3 evolution"

echo ""
echo "✅ Successfully committed OMEGA World Design System V3"
echo "📝 View the files:"
echo "   - OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V3.md (Main specification)"
echo "   - OMEGA_V3_MANIFEST.md (Quick reference index)"
echo "   - app/omega-v3-demo/page.tsx (Interactive demo)"
