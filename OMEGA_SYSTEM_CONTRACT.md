📜 OMEGA_SYSTEM_CONTRACT.md

Version: 1.5.0 (Aligned)

Status: Canonical & Immutable

Authority: Founder & Chief Systems Architect (Jemy)

1. Core Philosophy (Ω)

    Schema-First: No feature exists without a defined data contract.

    Execution-Driven: No state exists unless produced by execution.

    Audit Before Trust: Every implementation must pass adversarial and self-audits.

    Freeze Before Scale: Architecture must be locked before adding heavy logic.

2. Technical Stack (SOT)

    Backend: Laravel 12.x Headless API.

    Frontend (Client & Admin): Next.js 16.1.6, React 19.2.3, Tailwind 4.x.

    Database: PostgreSQL 16 + PostGIS 3.4 (SRID 4326).

    Package Manager: pnpm Workspaces (Root-level lockfile).

3. Data Integrity & Security Protocols

    Order Enumeration: Sequence-backed atomic generation: ORD-YYYYMMDD-%06d.

    Concurrency: Use Atomic SQL Upserts for metrics and counters; no Read-Modify-Write in PHP.

    Authentication: Dedicated admin guard for Command Center; web guard for PWA.

    Cookie Isolation: * Admin: omega_admin_session (isolated via middleware).

        Public: omega_session.

    Rate Limiting: IP bucket + device_hash bucket + User-Agent fingerprinting.

4. Visual & UI Invariants

    The "No Orange" Rule: Orange/Amber/Warning palettes are strictly prohibited.

        Critical Alert -> red

        Neutral/Caution -> slate

    Geometric Standards:

        --radius-primary: 18px

        --radius-secondary: 10px

    Touch Targets: Minimum 56px for all interactive elements.

    Performance: Mandatory virtualization (@tanstack/react-virtual) for data-dense views.

5. Deployment Standards

    Environment: Dockerized environments only; consistency between Local and AlmaLinux 9.

    Monitoring: Mandatory Uptime Kuma "Third Eye" integration.
