#!/usr/bin/env python3
"""
OMEGA World Design System V3 - Git Commit Script
This script commits all V3 design system files to the repository
"""

import subprocess
import os

os.chdir('/vercel/share/v0-project')

print("🚀 Committing OMEGA World Master Design System V3...")
print()

# Files to commit
files_to_commit = [
    'OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V3.md',
    'OMEGA_V3_IMPLEMENTATION_GUIDE.md',
    'OMEGA_V3_DESIGN_AUDIT_SUMMARY.md',
    'OMEGA_V3_README.md',
    'OMEGA_V3_MANIFEST.md',
    'components/omega/vendor-card.tsx',
    'components/omega/sticky-checkout-bar.tsx',
    'app/omega-v3-demo/page.tsx',
]

# Stage files
for file in files_to_commit:
    subprocess.run(['git', 'add', file], check=True)
    print(f"✓ Staged: {file}")

print()

# Create commit
commit_message = """feat: OMEGA World Master Design System V3

- Complete design specification with 3-tier hierarchy (Global → Thematic → Component)
- Vendor Card and Sticky Checkout Bar reference components
- Interactive demo page showcasing V3 design patterns
- Comprehensive implementation guide for team adoption
- Design audit summary comparing V2 → V3 evolution"""

subprocess.run(['git', 'commit', '-m', commit_message], check=True)

print()
print("✅ Successfully committed OMEGA World Design System V3")
print("📝 View the files:")
print("   - OMEGA_WORLD_MASTER_DESIGN_SYSTEM_V3.md (Main specification)")
print("   - OMEGA_V3_MANIFEST.md (Quick reference index)")
print("   - app/omega-v3-demo/page.tsx (Interactive demo)")
