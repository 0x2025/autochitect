# Autochitect Website

## Design Tokens (birchline/web)

### Color Palette

| Name  | Hex       | Usage                          |
|-------|-----------|--------------------------------|
| clay  | `#D97757` | Primary CTA, links, accents    |
| olive | `#788C5D` | Tags, meta, section labels     |
| sky   | `#6A8CAF` | Dates, code, tertiary accents  |
| oat   | `#E3DACC` | Background, left/right panels  |
| slate | `#141413` | Body text, headings            |
| g500  | `#7a7a6e` | Muted text, subtitles          |
| g300  | `#c8c4b8` | Borders, dividers, code bg     |
| white | `#FFFFFF` | Center panel, topbar, cards    |

### Typography

Fonts are loaded via `next/font/google` in `src/app/layout.tsx` and exposed as CSS variables on `<html>`.

| CSS Variable     | Font              | Usage                              |
|------------------|-------------------|------------------------------------|
| `--font-sans`    | Inter             | UI labels, nav, meta, tags         |
| `--font-serif`   | Lora              | Article titles, body prose         |
| `--font-mono`    | JetBrains Mono    | Dates, code blocks, inline code    |

Always reference fonts via the CSS variable with a fallback stack:

```css
font-family: var(--font-sans, ui-sans-serif, sans-serif);
font-family: var(--font-serif, Georgia, serif);
font-family: var(--font-mono, ui-monospace, monospace);
```

Size scale:

| Token             | Spec         |
|-------------------|--------------|
| `--text-display`  | 32px serif   |
| `--text-heading`  | 20px serif   |
| `--text-body`     | 15px sans    |
| `--text-mono`     | 13px mono    |

### Spacing Scale

`4 · 8 · 12 · 16 · 24 · 32 · 48`

### Buttons

- **Primary** — clay fill, white label (`.btn-primary`)
- **Ghost** — g300 fill, g500 label (`.btn-ghost`)

---

## Layout: 3-Column Explorer

The site uses a full-viewport 3-column explorer layout (inspired by interactive knowledge apps):

```
┌──────────────────────────────────────────────────────────────────┐
│  [A] autochitect  ·  Explore software architecture    ⊞ ☰ ⚙     │  ← top bar (white, 56px)
├──────────────┬───────────────────────────────┬────────────────────┤
│              │                               │                    │
│  TOPICS      │   Write-up content            │  CONCEPT DETAILS   │
│  ◈ System    │   ─────────────────────────   │  ──────────────    │
│    Design    │   Article title               │  [icon] Title      │
│    Backpress │   date · tags                 │  Subtitle          │
│    Raft →    │                               │                    │
│  ◎ AI &      │   Prose content…              │  Properties table  │
│    Agents    │                               │  Label | Value     │
│    Agentic → │                               │                    │
│              │   ─────────────────────────   │  ENGINEERING NOTES │
│  ◇ Arch      │   ← Back to Home             │  Brief note…       │
│    Patterns  │                               │                    │
│              │                               │  RELATED CONCEPTS  │
│              │                               │  ◆ Leader Election │
│              │                               │  ◆ Quorum          │
└──────────────┴───────────────────────────────┴────────────────────┘
│  © 2026 autochitect.com                                          │  ← footer
└──────────────────────────────────────────────────────────────────┘
```

**Column widths**: Left 228px · Center flex-1 · Right 272px  
**Scroll**: Each column scrolls independently; top bar and footer are fixed.

### Shell structure

The shell is built with inline styles in `src/app/layout.tsx` (no layout-specific CSS classes). Each page component is responsible for rendering the center + right columns inside the flex wrapper the layout provides.

**Required page structure** — every `page.tsx` must return:

```tsx
<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
  {/* Center column */}
  <main style={{ flex: 1, overflowY: "auto", padding: "32px", minWidth: 0 }}>
    ...content...
  </main>

  {/* Right panel */}
  <aside style={{
    width: "272px", flexShrink: 0, overflowY: "auto",
    borderLeft: "1px solid var(--g300)", padding: "24px",
    background: "var(--oat)",
  }}>
    ...right sections...
  </aside>
</div>
```

### CSS utility classes (defined in `globals.css`)

| Class | Use |
|---|---|
| `.section-heading` | Uppercase label above a content section |
| `.article-header` | Wrapper for title + meta, with bottom border |
| `.article-title` | Post `<h1>`, 28px serif bold |
| `.article-meta` | Date + tags row, mono 11px |
| `.prose` | Markdown body: serif 17px, styled headings/code/tables |
| `.article-card` | Feed card: clay left border |
| `.article-card-title` | Card `<h3>`, serif 20px bold |
| `.article-card-meta` | Card date + tags |
| `.article-card-summary` | Card summary paragraph |
| `.read-more` | "Read write-up →" CTA link |
| `.tag` | Olive pill tag |
| `.right-section` | One block in the right panel |
| `.right-section-heading` | Clay uppercase label for a right block |
| `.props-table` | Key/value table inside a right block |
| `.right-notes` | Prose paragraph inside a right block |
| `.related-list` | Bulleted list inside a right block |
| `.archive-year` / `.archive-entry` / `.archive-date` | Archives page rows |
| `.btn-primary` | Clay filled button |

---

## Topics Taxonomy (`src/lib/topics.ts`)

Topic groups live in `src/lib/topics.ts`. Each group has an icon, label, and entries. Entries can optionally link to a post via `articleSlug`.

```typescript
// To link a topic entry to a post, set articleSlug to the post's filename (without .md):
{ id: 'raft', label: 'Raft Protocol', articleSlug: 'raft-protocol' }
```

Add new topic groups or entries here to populate the left panel.

---

## Post Convention

Posts live in `contents/*.md`. Every post must follow this frontmatter schema:

### Required fields

```yaml
---
title: "Human-readable title"
date: "YYYY-MM-DD"
summary: "One-sentence description shown in article cards and archives."
tags: ["Tag1", "Tag2"]
---
```

### Right-panel sections (dynamic)

The right panel is driven by a `sections` array. Each section has a `type`, an optional `title`, and type-specific content. Sections render in the order they are defined — add as many or as few as you need.

#### `type: properties` — key/value table

```yaml
sections:
  - type: properties
    title: "Concept Details"
    items:
      - label: "Category"
        value: "Consensus Algorithm"
      - label: "CAP"
        value: "CP"
      - label: "Complexity"
        value: "Medium"
```

#### `type: notes` — short prose block

```yaml
  - type: notes
    title: "Engineering Notes"
    content: "Raft was designed to be more understandable than Paxos. It decomposes consensus into leader election, log replication, and safety."
```

#### `type: list` — bulleted list

```yaml
  - type: list
    title: "Related Concepts"
    items:
      - "Leader Election"
      - "Log Replication"
      - "Quorum"
```

> **Legacy fallback**: posts that still use the old `properties` / `notes` / `related` top-level fields will automatically convert to sections at build time. New posts should use the `sections` array directly.

### Full example

```yaml
---
title: "Raft Protocol"
date: "2026-04-10"
summary: "How Raft achieves distributed consensus with leader election and log replication."
tags: ["System Design", "Distributed Systems", "Consensus"]
sections:
  - type: properties
    title: "Concept Details"
    items:
      - label: "Category"
        value: "Consensus Algorithm"
      - label: "CAP"
        value: "CP"
      - label: "Use Case"
        value: "Leader election, replicated logs"
      - label: "Complexity"
        value: "Medium"
      - label: "Notable Uses"
        value: "etcd, CockroachDB, TiKV"
  - type: notes
    title: "Engineering Notes"
    content: "Raft was designed to be more understandable than Paxos. It decomposes consensus into leader election, log replication, and safety."
  - type: list
    title: "Related Concepts"
    items:
      - "Leader Election"
      - "Log Replication"
      - "Quorum"
      - "Paxos"
---

# Raft Protocol

... markdown body ...
```

### Linking a post to the topic browser

After writing the post, open `src/lib/topics.ts` and add `articleSlug` to the matching entry:

```typescript
{ id: 'raft', label: 'Raft Protocol', articleSlug: 'raft-protocol' }
```

Entries without `articleSlug` appear greyed out in the browser (coming soon state).
