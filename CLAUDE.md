# StyleGuideAI.com — Claude Code Project Guide

## What This Is

StyleGuideAI.com is the community hub for StyleGuideAI — a 1,000+ member AI art community. The site combines community tools (AI art prompt generators, art inspiration games), an art education feature (Virtual Museum with timeline and gallery), a consulting page, a Medium blog surface, daily community events from Discord, and a community art spotlight from DeviantArt.

Owner: Satori Canton, Head of AI at HeartStamp, founder of StyleGuideAI.

**Full planning documentation lives in `.planning/` (gitignored, local only).** Read those docs before starting any significant feature. Key files:

- `.planning/goals.md` — vision, brand, accessibility requirements
- `.planning/tech-stack.md` — architecture decisions, image placeholder convention, accessibility practices
- `.planning/todo.md` — master task list organized by phase
- `.planning/notes.md` — brand style, community links, APIs, decided approaches for Articles/Events/Spotlight
- `.planning/spec-*.md` — individual feature specs (consulting, stylebear, styledice, games, virtual museum)

---

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript — strict mode throughout
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Animation:** GSAP + ScrollTrigger — used for all expressive UI animation, not CSS transitions
- **3D:** Three.js — Virtual Museum 3D Gallery only (opt-in, desktop)
- **Database:** Vercel Postgres (Neon) + Drizzle ORM
- **Auth:** Auth.js (NextAuth v5) with Google OAuth — optional, never gates features
- **LLM:** OpenRouter (`openrouter/free`) via `/api/llm` server-side route — API key never exposed to client
- **Email:** Resend SDK via `/api/contact` — contact form on Consulting page
- **Deployment:** Vercel Pro

---

## Non-Negotiable Conventions

**Mobile-first always.** Every component starts at 390px and scales up with Tailwind `md:`/`lg:` prefixes. Never write desktop-first layouts. Touch targets minimum 44×44px.

**GSAP for all animation.** Page transitions, scroll reveals, game interactions, museum timeline — all GSAP. Add `prefers-reduced-motion` checks using the utility in `src/lib/motion.ts` (created in Phase 1). Never use CSS `transition` or `keyframes` for anything GSAP should own.

**TypeScript strict.** No `any` unless absolutely unavoidable and commented. All API responses typed. Drizzle schema is the source of truth for DB types.

**No files in the project root.** Source code in `src/`, scripts in `scripts/`, planning in `.planning/`. Keep the root clean.

**Server-side secrets.** `OPENROUTER_API_KEY`, `RESEND_API_KEY`, and `DATABASE_URL` are server-only. Never import them in client components.

---

## Brand & Aesthetic

**Style:** Retro/vintage 1950s. Playful, stylish, expressive. Diner booth energy — not corporate, not minimal. GSAP animation expressiveness is core to the brand personality.

**Primary color:** Deep purple (`oklch(0.42 0.22 285)`). The palette is warm cream background, deep purple primary, teal accent, and gold. Do NOT use red as a primary or brand color — red is reserved for `--destructive` (error states only).

**Logo character:** 1950s retro diner/soda-fountain waitress — long brunette hair, black glasses, pin-up style.

**Mascot:** StyleBear — cute white plush fluffy chibi-style teddy bear with meerkat-like eyes. Use him on the 404 page, StyleBear tool, and any friendly brand moment. Base prompt for generating StyleBear images: *"cute white plush fluffy chibi-style teddy bear with meerkat-like eyes, retro 1950s style, [scene], warm vintage color palette, adorable and expressive"*

---

## Image Placeholder Convention

All images during development use a `<Placeholder>` component (in `src/components/ui/placeholder.tsx`) with an `alt` tag containing the AI art generation prompt Satori will use to render the final image:

```tsx
<Placeholder
  width={400}
  height={400}
  alt="[PROMPT: cute white plush chibi bear with meerkat eyes, sitting at a 1950s diner counter, retro illustration style, warm pastel colors]"
/>
```

The `[PROMPT: ...]` wrapper makes these easy to grep. When final images arrive, swap the component for `<img>` or `<Image>` and update the alt to a descriptive label.

---

## Accessibility Requirements

Target: **WCAG 2.1 AA**. This is built in from Phase 1, not audited at the end.

- All interactive elements keyboard-navigable with visible focus states
- All images: meaningful alt text (placeholder convention above during dev)
- Color contrast: 4.5:1 for body text, 3:1 for large text and UI components
- ARIA labels on custom components (timeline nodes, game cards, search palette)
- `prefers-reduced-motion` respected everywhere GSAP is used
- Virtual Museum 3D Gallery: text-based accessible alternative for screen reader users

---

## Key API Routes

| Route | Purpose |
|-------|---------|
| `/api/llm` | OpenRouter LLM calls (StyleBear, StyleDice, StyleTarot) |
| `/api/search` | Postgres full-text search across artists, movements, articles, themes |
| `/api/contact` | Contact form → Resend email to satoricanton@gmail.com |
| `/api/events/new` | Discord bot → community_events table |
| `/api/auth/[...nextauth]` | Auth.js Google OAuth |

---

## Environment Variables

```
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LLM
OPENROUTER_API_KEY=

# Email
RESEND_API_KEY=
CONTACT_TO_EMAIL=satoricanton@gmail.com

# External APIs
RIJKSMUSEUM_API_KEY=

# Internal
DISCORD_BOT_SECRET=
```

---

## Project Structure

```
styleguide-ai/
├── src/
│   ├── app/
│   │   ├── (site)/
│   │   │   ├── page.tsx            # Home — community portal
│   │   │   ├── about/
│   │   │   ├── consulting/
│   │   │   ├── privacy/
│   │   │   ├── stylebear/
│   │   │   ├── museum/
│   │   │   ├── styletarot/
│   │   │   ├── styledice/
│   │   │   ├── articles/
│   │   │   └── themes/
│   │   ├── api/
│   │   │   ├── llm/
│   │   │   ├── search/
│   │   │   ├── contact/
│   │   │   ├── events/new/
│   │   │   └── auth/[...nextauth]/
│   │   └── not-found.tsx           # 404 — StyleBear mascot
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base + Placeholder component
│   │   ├── museum/
│   │   ├── games/
│   │   └── layout/
│   ├── data/
│   │   ├── museum/
│   │   │   ├── movements/          # One JSON per movement
│   │   │   ├── artists/            # One JSON per artist
│   │   │   └── artworks/           # One JSON per artwork
│   │   ├── stylebear/              # art-movements.ts, media-types.ts, cultures.ts
│   │   └── styledice/              # famous-artists.ts, art-techniques.ts, etc.
│   ├── lib/
│   │   ├── motion.ts               # prefers-reduced-motion utility
│   │   ├── db.ts                   # Drizzle client
│   │   └── openrouter.ts           # LLM client
│   ├── types/
│   │   └── museum.ts               # ArtMovement, Artist, Artwork interfaces
│   └── styles/
├── scripts/
│   └── seed-museum.ts
├── drizzle/
└── .planning/                      # Gitignored — read before each session
```

---

## Current Phase

**Start with Phase 1 — Foundation.** See `.planning/todo.md` for the complete task list. Complete each phase's mobile QA gate before proceeding to the next phase.
