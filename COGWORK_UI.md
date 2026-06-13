# Cogwork — UI Context File

> Companion to `COGWORK_CONTEXT.md` (the product/architecture bible). **This file is the frontend bible.** Claude Code builds the UI alongside the backend, following the same discipline (§23 of the context file: many small green commits). Every screen runs on **fixture data** (§11.4) in Phases 0–2, so the UI is fully buildable and demoable with no third-party credentials — only the Anthropic-powered generation is live.

---

## 0. How to use this file + honesty rules

- The **layout, page structure, and category feel** take heavy inspiration from a best-in-class reference (the interactive workflow-demo hero, the dotted-grid flow canvas with node cards, the integration orbit, the conversational-builder block, the FAQ accordion, the closing CTA). The **brand, palette, typography, voice, logo, and 100% of the copy are original to Cogwork.**
- **No borrowed assets:** no competitor logo, mark, screenshots, or copy. All icons are from open sets (lucide) or official provider marks used nominatively to identify integrations.
- **No false claims.** Cogwork is new and open-source. So:
  - **Do NOT** show "Backed by Y Combinator / NVIDIA" or any investor/accelerator logos. Replace that slot with **open-source / community proof** (GitHub stars, forks, contributors, Discord).
  - **Do NOT** claim certifications we don't hold (e.g. a CASA tier). Use truthful security language instead: "AES-256 encrypted at rest", "Least-privilege OAuth", "Self-hostable", "Secrets never sent to the model".
  - The **Slack section** describes a Phase-3 surface. Render it only once Slack ships; until then omit it or mark it clearly "Coming soon."
- **v1 is light-theme first.** Dark tokens are provided (§2.7) but optional/later.

---

## 1. Brand identity

**Name:** Cogwork. Always one word, capital C. Never "Cog Work" / "CogWork".

**Thesis (the north star for every visual choice):** *a workshop where plain words become reliable machines.* Cogwork turns a sentence into a typed workflow that runs like clockwork. Everything leans into **precision + machinery + trust**, not whimsy.

**Logo mark:** a single geometric **cog/gear** (6–8 teeth, even, slightly rounded corners), drawn on a 24×24 grid, 2px stroke or solid fill. Pairs left of the wordmark "Cogwork" (Space Grotesk, 600). The cog's negative-space center can hold a small dot or a "play" notch (nodding to "run"). Distinct from any mascot/face mark.
- Clear space ≥ the cog's height on all sides. Min wordmark height 20px. Mark-only allowed ≥ 20px (favicon, app sidebar collapsed).
- **Do:** mono-ink on light; white on violet/ink; violet mark on light for accent moments. **Don't:** add gradients to the teeth, rotate, skew, or place on busy photos.

**Voice & tone** (per the writing rules — design material, not decoration):
- Plain, active, sentence case. Name things by what the user does.
- Buttons say what happens: "Start free", "Run workflow", "Approve draft", "Connect Gmail", "View on GitHub". An action keeps its name through the flow (button "Publish" → toast "Published").
- Errors give direction, don't apologize: "Gmail isn't connected. Connect it to run this step." Empty states invite action: "No workflows yet. Describe one to get started."
- Marketing copy is specific over clever. Short verbs, no filler.

---

## 2. Design tokens

Implement as CSS variables in `apps/web/styles/tokens.css` and mirror into the Tailwind theme. Use `oklch`/hex as given.

### 2.1 Color — light theme (the 6 core + semantics)

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0E0F13` | primary text, headlines |
| `--ink-soft` | `#2A2D34` | sub-headlines, strong body |
| `--muted` | `#6B7280` | secondary/body-muted text |
| `--subtle` | `#9CA3AF` | placeholders, captions, disabled |
| `--line` | `#E6E6EA` | borders, dividers, node outlines |
| `--paper` | `#FFFFFF` | base background, cards |
| `--paper-2` | `#F8F8FB` | alt section bg, input bg |
| `--paper-3` | `#F1F1F6` | hover/inset surfaces |
| `--violet` | `#5B2EE5` | **primary** brand + actions |
| `--violet-hover` | `#4A23C4` | hover/pressed |
| `--violet-tint` | `#EFEAFF` | washes, orbit halo, selected ring bg |
| `--green` | `#10B981` | **live / running / success** (reserved meaning) |
| `--green-tint` | `#E7F8F1` | success backgrounds |
| `--amber` | `#F59E0B` | awaiting approval, needs-reauth |
| `--amber-tint` | `#FEF3E2` | warning backgrounds |
| `--red` | `#EF4444` | failed, destructive, errors |
| `--red-tint` | `#FDECEC` | error backgrounds |
| `--graphite` | `#3A3D46` | machinery accents, node chrome details |

**Brand gradient** (used sparingly — wordmark accent word, primary CTA sheen, hero underline): `linear-gradient(100deg, #6D28D9 0%, #5B2EE5 50%, #4F46E5 100%)`.

**Semantic mapping:** text→`--ink`; text-muted→`--muted`; bg→`--paper`; bg-alt→`--paper-2`; border→`--line`; primary→`--violet`; success/live→`--green`; warning→`--amber`; danger→`--red`; focus-ring→violet @ 35%.

> **Restraint:** green appears *only* for live/running/success. Don't use it decoratively — its meaning is the signal.

### 2.2 Typography

Self-hosted, all open licenses (OFL) — bundle as `woff2`:
- **Display:** **Space Grotesk** — mechanical, engineered character. Weights 500/700. Headlines H1–H3, big numbers, the wordmark.
- **Body / UI:** **Inter** — neutral workhorse. Weights 400/500/600. Paragraphs, labels, buttons, app UI.
- **Mono / data:** **JetBrains Mono** — Weights 400/500. Code, spec view, terminal, timing chips ("352 ms"), node field values, the prompt-in-quotes.

**Type scale (desktop):**

| Role | Font / weight | Size / line-height / tracking |
|---|---|---|
| Display XL (hero H1) | Space Grotesk 700 | 64 / 68 / −0.02em |
| H1 (section) | Space Grotesk 700 | 44 / 48 / −0.02em |
| H2 | Space Grotesk 600 | 32 / 38 / −0.01em |
| H3 | Space Grotesk 600 | 22 / 28 / 0 |
| Eyebrow / label | Inter 600 | 12 / 16 / 0.12em · UPPERCASE |
| Body L | Inter 400 | 18 / 28 |
| Body | Inter 400 | 16 / 26 |
| Body S | Inter 400 | 14 / 22 |
| Caption | Inter 500 | 12 / 16 |
| Mono S | JetBrains Mono 500 | 13 / 20 |

Mobile: H1 → 40/44, H1-section → 32/36, H2 → 26/32; body unchanged.

### 2.3 Spacing
4px base. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. Section vertical padding 96–128 (desktop) / 56–72 (mobile). Container max-width **1200px**, gutters 24px. App content max-width 1120px.

### 2.4 Radii
`sm 8` · `md 12` · `lg 16` · `xl 20` · `pill 9999`. Cards `lg`; buttons `pill`; node cards `md→lg`; inputs `md (10–12)`; chips/badges `pill`.

### 2.5 Shadows
- `xs`: `0 1px 2px rgba(13,15,19,.06)`
- `sm`: `0 2px 8px rgba(13,15,19,.06)`
- `md` (cards): `0 8px 24px rgba(13,15,19,.08)`
- `lg` (floating nav, popovers): `0 12px 40px rgba(13,15,19,.12)`
- `focus`: `0 0 0 3px rgba(91,46,229,.35)`

### 2.6 Motion
Durations `120 / 180 / 240 / 420ms`; standard easing `cubic-bezier(.2,.8,.2,1)`. **Reduced-motion:** disable the canvas pulse + typed-prompt animation; states change instantly. One orchestrated hero moment only (see §4.5) — no scattered effects.

### 2.7 Dark theme (optional / later)
`--bg #0B0C10` · `--surface #14161C` · `--line #23262F` · `--ink #F4F4F6` · `--muted #9BA1AC` · `--violet #7C5CFF` · `--green #2DD4A7` · `--amber #F1B24A` · `--red #F4756B`. Ship light-only in v1; gate dark behind a toggle in Settings later.

### 2.8 Tailwind / shadcn mapping
- Map tokens to `theme.extend.colors` (e.g. `violet: { DEFAULT: 'var(--violet)', hover: 'var(--violet-hover)', tint: 'var(--violet-tint)' }`), `borderRadius`, `boxShadow`, `fontFamily` (`display`, `sans`, `mono`).
- Use **shadcn/ui** primitives (Button, Dialog, DropdownMenu, Tabs, Accordion, Tooltip, Toast, Badge, Switch, Input, Textarea, Select, Tabs, Sheet for mobile nav). Restyle to tokens — don't ship default shadcn looks.
- Watch CSS specificity between section-level and element-level classes (don't let `.section` paddings cancel component paddings).

---

## 3. Component kit

### 3.1 Buttons
- **Primary:** violet bg, white text, pill, 14px/600, padding 12×20, subtle gradient sheen optional; hover→`--violet-hover` + slight lift (`translateY(-1px)`, `shadow sm→md`); has a trailing arrow `→` for forward CTAs ("Start free →").
- **Secondary:** `--paper` bg, `--line` border, `--ink` text, pill. Hover→`--paper-3`.
- **Ghost:** transparent, `--ink-soft` text, hover `--paper-3`.
- **Link:** violet text, underline on hover.
- Sizes: sm (32h), md (40h), lg (48h). Disabled: 40% opacity, no hover.
- Icon buttons: square, `md` radius, 36–40px, lucide icon 18–20px.

### 3.2 Badges & pills (status is meaning)

| Badge | Color | Text |
|---|---|---|
| Live / Running | green dot + `--green` text on `--green-tint` | "Live" · "Running" · "Running ×6" |
| Draft | `--muted` on `--paper-3` | "Draft" |
| Paused | `--amber` on `--amber-tint` | "Paused" |
| Awaiting approval | `--amber` on `--amber-tint` | "Needs approval" |
| Succeeded | `--green` on `--green-tint` | "Succeeded" |
| Failed | `--red` on `--red-tint` | "Failed" |
| Needs reauth | `--red` on `--red-tint` | "Reconnect" |
| Timing chip | mono, `--green` on `--green-tint` | "352 ms" |
| Provider chip | provider icon + name, `--line` border, `--paper` | "Apify", "Crustdata" |

All pills: 22–24px tall, 11–12px text, mono for numeric/timing.

### 3.3 Cards
- **Base:** `--paper`, `--line` border, radius `lg`, shadow `sm`.
- **Elevated:** shadow `md`, no border (used for the hero demo card, popovers).
- **Interactive:** hover lift (shadow `sm→md`, `translateY(-2px)`), cursor pointer.

### 3.4 Inputs & fields
- Text/textarea/select: `--paper-2` bg, `--line` border, radius `md`, 14px, padding 10×12; focus → violet border + focus ring. Label 12px/600 `--ink-soft`; helper 12px `--muted`; **required** marker = tiny red "REQUIRED" pill (matches the node "Flow Inputs" look).
- Toggle (Switch): off `--line` track, on `--violet`; used on trigger node (active/inactive) and settings.
- Dropdown/select renders provider/model options with leading icon.

### 3.5 Tabs (use-case switcher + app sub-nav)
Pill tabs on a rail. Active = ink/dark fill, white text, radius pill; inactive = `--muted` text, transparent, hover `--paper-3`. Used for the hero demo (Daily briefings / Meeting follow-ups / Candidate sourcing / Lead capture) and Workflow-detail sub-nav (Overview / Runs / Versions / Settings).

### 3.6 Accordion (FAQ)
Cards stacked, `--paper`, `--line`, radius `lg`. Row: question (Inter 600, 18px) + circular toggle button (violet when open, shows −; `--paper-3` when closed, shows +). Expanded body: Body, `--muted`, with optional bullet list. One open at a time is fine; smooth height transition (respect reduced-motion).

### 3.7 Chat bubbles (builder conversation)
- **Assistant:** `--paper-3` bubble, `--ink` text, left-aligned, radius `lg` (tight top-left).
- **User:** `--ink` bubble, white text, right-aligned, radius `lg` (tight top-right).
- Typing indicator: three dots, gentle pulse.
- Footer hint row: `--subtle` 12px, e.g. "Refine by chatting."

### 3.8 Floating pill nav (top)
Centered, max-width ~960px, `--paper` @ 88% + blur, `--line` hairline, radius pill, shadow `lg`, sticky 16px from top. Left: cog mark + "Cogwork". Center/right links (Inter 500, 14px, `--ink-soft`): **Demos · Pricing · Docs · GitHub** (GitHub shows a small star count chip). Right: **Start free →** (primary). Mobile: collapse links into a Sheet (hamburger), keep mark + Start free.

### 3.9 Footer
`--paper-2` top border `--line`. Left block: cog + "Cogwork" + tagline "Open-source workflow automation." + "© 2026 Cogwork." Columns:
- **Product:** Demos, Pricing, Integrations, Docs
- **Open source:** GitHub, Self-host guide, Contributing, License (Apache-2.0), For AI agents (llms.txt)
- **Community:** Discord, X, YouTube
- **Legal:** Terms, Privacy, Contact
Social icons row (lucide / brand SVGs): GitHub, Discord, X, YouTube. A thin ink band can anchor the very bottom.

### 3.10 Repo card (open-source)
A bordered `--paper` card, radius `lg`, shadow `sm`:
- Header: GitHub mark + `org/cogwork` (mono, 14px) + Apache-2.0 badge.
- Description line (Body S, `--muted`).
- Footer row of stats (mono): ★ stars · ⑂ forks · contributors · ● TypeScript (violet/green dots). Pull live from the GitHub API with a static fallback.
- Trailing primary: "View on GitHub →".

### 3.11 Code / terminal block
`--ink` (dark) surface, radius `md`, JetBrains Mono 13px, `--paper` text, violet/green syntax accents, a top bar with three dots + a copy button. Used in the Open Source section and Docs.

### 3.12 Utility states
- **Toast:** bottom-right, `--paper`, `--line`, shadow `lg`, icon + message, auto-dismiss; success uses green check, error red.
- **Dialog/modal:** centered, `--paper`, radius `xl`, shadow `lg`, backdrop ink @ 40%.
- **Empty / loading / error:** see §8.1.

---

## 4. The signature — Flow Canvas & Node Cards

This is the one memorable element. Build it with **@xyflow/react (React Flow, MIT)**. Keep the rest of the UI quiet so this lands.

### 4.1 Canvas
- Background: **dotted blueprint grid** (`--paper-2` base, dots `--line`, ~20px spacing). Pan + zoom; fit-to-view on load. Subtle vignette/fade at edges in the marketing hero.
- In the marketing hero the canvas is **non-interactive playback**; in the studio Builder it's **interactive** (drag, select, zoom).

### 4.2 Node card anatomy
```
┌────────────────────────────────────────────┐
│ [icon] Gmail                    ● Running   │  ← header: provider icon + title + status badge
├────────────────────────────────────────────┤
│ Create Draft                                │  ← action name (Inter 600)
│ Creates a draft email from the AI output…   │  ← description (Body S, muted) + "Show more ⌄"
│                                             │
│ Model                                       │  ← field label (12/600)
│ [ google/gemini-… ▾ ]                       │  ← select (mono value)
│ System prompt                               │
│ [ You are an executive assistant… ]         │  ← textarea preview (mono, truncated)
│                                             │
│ TOOLKIT                                     │  ← optional chip row
│ [⌘ Crustdata] [⌘ FullEnrich]                │
└────────────────────────────────────────────┘
```
- Card: `--paper`, `--line` border, radius `md→lg`, shadow `sm`; selected → 2px violet ring + `--violet-tint` glow.
- Provider icon 18–20px (official mark). Status badge top-right (§3.2).
- Three node *kinds* share the shell but differ in header tint: **trigger** (graphite icon), **integration/tool** (provider icon), **AI step** (cog/violet icon).

### 4.3 Trigger node
- Header: trigger icon + "Webhook" / "Schedule" + an **active/inactive toggle** (Switch) + duplicate icon.
- Body: a **"Flow inputs · 3/3 filled · Ready"** strip (green check when ready), then required/optional fields with the small "REQUIRED" pill, helper text, and provider-scoped value chips (e.g. a Google Drive folder field shows a Drive chip). A "Running…" state replaces the run button while executing.

### 4.4 Edges
- Default: thin dashed line, `--subtle`.
- **Running:** dashed line turns `--green` with a **traveling pulse dot** animating source→target (the product's heartbeat). Pair with a **timing chip** ("352 ms", mono) pinned mid-edge on completion.
- Success edge: solid `--green`. Error edge: `--red`, with the target node showing a red ring.

### 4.5 The one orchestrated motion moment (hero)
On load / tab-switch, in sequence (≈1.2s total, skipped under reduced-motion):
1. The prompt **types in** inside the quote line.
2. Nodes **fade/scale in** top→bottom.
3. The green **pulse travels** the edges; timing chips pop; a **"Running ×N"** badge ticks.
This visualizes the thesis (words → a running machine). Don't animate anything else on the page beyond quiet hover lifts.

### 4.6 Canvas states
idle (dashed grey edges) · running (green pulse + "Running") · awaiting approval (the gated node gets an amber ring + "Needs approval" badge; a small inline "Approve / Reject") · succeeded (green, timing chips) · failed (red ring + error chip on the node).

---

## 5. Marketing site — pages & sections

Route group `app/(marketing)`. All copy below is final, original Cogwork copy.

### 5.1 Home — section order
1. **Nav** (§3.8)
2. **Hero** (interactive workflow demo)
3. **How it works** (01 / 02 / 03 — a real sequence)
4. **Community proof strip** (replaces investor logos)
5. **Why Cogwork + integrations orbit**
6. **Conversational builder**
7. **Slack** *(Phase 3 — render when shipped / else omit)*
8. **Open Source** *(NEW — §7)*
9. **FAQ**
10. **Final CTA**
11. **Footer** (§3.9)

**Hero**
- Eyebrow: `OPEN-SOURCE WORKFLOW AUTOMATION`
- H1 (Display XL, last clause violet): **"Describe it. Review it. _Let it run._"**
- Sub (Body L, `--muted`): "Tell Cogwork what you want in plain words. It compiles a typed, reviewable workflow — then runs it on schedule, with every step traceable. Open source and self-hostable."
- CTAs: **Start free →** (primary) · **View on GitHub** (secondary, ★ count).
- Right: **elevated demo card** with:
  - Pill **tabs**: Daily briefings · Meeting follow-ups · Candidate sourcing · Lead capture.
  - Row: integration icons for the active tab + "Try this workflow →".
  - The **prompt in quotes** (mono) — original per tab:
    - *Daily briefings:* "Each weekday at 8am, summarize my unread email from the last day, draft replies in Gmail, and post a rundown of today's meetings to my Slack DMs."
    - *Meeting follow-ups:* "After each meeting, pull the notes from Google Drive, extract action items and owners, post a summary to the team Slack channel, and open Jira tickets for anything that needs tracking."
    - *Candidate sourcing:* "Find 30 engineers matching our hiring bar on LinkedIn, score them by fit, log them to our recruiting sheet, and draft a tailored outreach note for each."
    - *Lead capture:* "Watch X and LinkedIn for people asking for a tool like ours, enrich their profiles, and add qualified leads to Airtable with a fit score."
  - The **flow canvas** (§4) playing the matching workflow.

**How it works** (eyebrow `HOW IT WORKS`; three columns with `01 / 02 / 03` markers — justified because it's the genuine sequence):
- **01 Describe** — "Write what you want like you'd tell a teammate."
- **02 Review** — "See the workflow in plain English and a visual flow. Change anything by chatting."
- **03 Run** — "Trigger it by hand, on a schedule, or by webhook — and watch every step."

**Community proof strip** (eyebrow `OPEN SOURCE, OUT IN THE OPEN`): a quiet row of real signals — `★ {stars} on GitHub` · `{forks} forks` · `{contributors} contributors` · `{members} in Discord`. No fabricated customer logos. (Static fallbacks until wired to GitHub/Discord APIs.)

**Why Cogwork + integrations**
- Centered header: H1 **"Why Cogwork"** + sub (Body, `--muted`): "Not another node-dragging tool. Production workflows from a sentence — that you can read, run anywhere, and own."
- Two-column feature:
  - Left: eyebrow `ENCRYPTED CONNECTIONS`; H2 **"Plug in your whole stack. Encrypted by default."**; Body: "Gmail, Slack, Notion, GitHub, Postgres and more. Tokens are encrypted at rest, every workflow runs with least-privilege access, and you can store multiple credentials per app." Chips: `AES-256 at rest` · `Least-privilege OAuth` · **Explore integrations →**.
  - Right: **integration orbit** — provider logos arranged radially around the cog mark inside a `--violet-tint` halo; gentle ambient float (reduced-motion: static).

**Conversational builder**
- Two-column. Left: a **"Workflow Builder"** chat mock card (badge "v1"): assistant "Logged 47 candidates to your sheet." → user "Draft outreach for each." → assistant "Done — drafts are in your Gmail." → typing dots; footer "Refine by chatting."
- Right: eyebrow `AI-NATIVE BUILDER`; H2 **"Build by talking. Refine by talking."**; Body: "No nodes to wire, no config screens. Describe a change and the workflow updates — with line-by-line traceability whenever you want it."

**Slack** *(Phase 3)*
- Eyebrow `WORKS WHERE YOU WORK`; H2 **"Run Cogwork from Slack."**; Body: "Deploy to your workspace in a click and trigger workflows with a message — no tab-switching."
- Right: a "Slack message" card (quoted "@cogwork after every standup, post updates to #engineering and open Linear tickets") → arrow → an "Autonomous workflow" card (green **Live** badge, "Standup recap → #engineering + Linear", "Runs after every standup · last run 2h ago").
- Until Slack ships: hide this section or stamp a small "Coming soon".

**FAQ** (§3.6) — eyebrow `GOT QUESTIONS?`, H1 "Frequently asked questions" (last word violet/italic):
- **How is Cogwork different from Zapier or n8n?** — "You describe the workflow instead of wiring nodes. Cogwork compiles your words into a typed, readable spec, runs it deterministically, and traces every step. And it's open source — read it, run it, own it."
- **Do I need to know how to code?** — "No. Describe what you want in plain words. If you do code, there's a spec and code view, plus one-click TypeScript export."
- **Is it really open source? Can I self-host?** — "Yes — Apache-2.0. Run the whole thing on your own infrastructure with `npx create-cogwork-app` and bring your own keys."
- **How do my credentials stay safe?** — "Tokens are encrypted at rest, workflows use least-privilege OAuth, and secrets are never sent to the model and are redacted from logs."
- **What if an integration is missing?** — "Connectors are modular. Request one, or add your own — it's open source, so nothing's locked behind us."

**Final CTA**
- H1 (centered, `automate`/key word violet): **"Ship your first workflow today."**
- Sub: "Describe it, review it, let it run — free to start, open source forever."
- CTAs: **Start free →** · **View on GitHub**.
- Below: the **community-proof signals** again (stars / forks / contributors / Discord). **No investor logos.**

### 5.2 Pricing
- Header: H1 "Simple, honest pricing" + sub "Self-host free forever. Pay only when you want us to run it for you."
- 4 cards (§16 of context): **Self-host (Free)** highlighted with an "Open source" ribbon · **Free (hosted)** · **Pro** · **Team** · **Enterprise (Contact)**. Each: price, the three metered axes (executions / active workflows / tool credits), feature checklist, CTA ("Start free" / "Self-host guide →" / "Contact sales").
- Note row: "All plans can run fully self-hosted at no cost." A small comparison/FAQ below.

### 5.3 Integrations directory
- Header + search box + category filter chips (Messaging, CRM, Issues, Docs, Data, Storage, Finance, AI, Scraping, Dev).
- Responsive grid of connector cards (logo, name, one-line, "Connected"/"Available" state when logged in). Each links to a connector detail page (actions list, scopes, example). Sourced from `/api/connectors`.

### 5.4 Demos / Templates gallery
- Grid of template cards (icon set, title, one-line, the integrations used). Cards link to a detail with the prompt + a "Use this template" CTA (→ clones into a draft when signed in). Seed with the 5 starter templates (context §14.3).

### 5.5 Docs
- Two-pane: left sidebar (collapsible sections), right content (max-width ~720px reading column, mono code blocks via §3.11). Start with Quickstart, Core concepts (Workflow / Spec / Connector / Trigger / Run / Approval), Self-hosting, Writing workflows, API. Markdown-driven.

### 5.6 Auth (login / signup)
- Minimal centered card on `--paper-2`: cog mark, H3, **Continue with Google** + email magic-link field, fine print + Terms/Privacy links. No social clutter.

### 5.7 Legal
- Terms, Privacy — simple single-column reading pages (same content column as Docs). Original placeholder copy to be replaced by counsel.

---

## 6. App / Studio — pages & layout

Route group `app/(app)`, behind auth. Shell = left sidebar + top bar + content.

### 6.1 App shell
```
┌───────────┬─────────────────────────────────────────────┐
│  [cog]    │  Top bar: page title · search · [+ New]      │
│  Cogwork  ├─────────────────────────────────────────────┤
│           │                                              │
│  ▸ Home   │                content                       │
│  ▸ Builder│                                              │
│  ▸ Runs   │                                              │
│  ▸ Approvals (●3)                                         │
│  ▸ Connections                                            │
│  ▸ Templates                                              │
│  ▸ Memory │                                              │
│  ─────────│                                              │
│  ⚙ Settings                                              │
│  [avatar] │                                              │
└───────────┴─────────────────────────────────────────────┘
```
- Sidebar: `--paper`, `--line` right border; active item = `--violet-tint` bg + violet text + 2px left accent. Collapsible to icons. **Approvals** shows a count badge when pending.
- Top bar: page title (Space Grotesk), global search, primary **+ New workflow**, a small **fixture/live** mode pill in dev (so it's obvious which connectors are mocked).

### 6.2 Dashboard (Home)
- Header + **+ New workflow**.
- **Stat row** (4 cards, mono numbers): Active workflows · Runs (7d) · Success rate · Spend (7d).
- **Your workflows** table/cards: name, status badge, trigger (schedule chip / webhook / manual), last run + outcome, quick actions (Run, Pause, Open). Empty state: "No workflows yet. Describe one to get started." + CTA.
- **Recent runs** list: workflow name, status badge, when, duration (mono). Click → Run detail.

### 6.3 Builder (the core screen) — three panes
```
┌──────────────┬───────────────────────────────┬───────────────┐
│  Chat        │   Flow canvas (interactive)    │  Spec / Code  │
│  (describe & │   dotted grid + node cards     │  (toggle)     │
│   refine)    │   + animated edges             │  JSON ⇄ TS    │
│              │                                │  + validation │
│  [▣ messages]│   [trigger]→[step]→[step]…     │  status       │
│  ____________│                                │               │
│  > prompt…   │   [ Validate ✓ ]  [ Run ]      │               │
│  [ Send ]    │                                │  [ Export TS ]│
└──────────────┴───────────────────────────────┴───────────────┘
```
- **Left chat:** the conversation that builds/edits the workflow (§3.7). Sending a prompt streams the generated spec; edits ("make it skip weekends") update the canvas. Show a subtle "Generating…" then "Updated".
- **Center canvas:** the interactive flow (§4) — the generated nodes, selectable, draggable; a **Validate** state chip (green "Valid" / red "N issues" with a click-to-see list) and a **Run** button (manual run). On run, edges pulse and the run streams.
- **Right spec/code panel** (collapsible): toggle between the **plain-English summary**, the **spec (JSON, mono)**, and the **TypeScript export (read-only)**. Validation errors render here as an actionable list.
- **Save bar:** name field + trigger config (Manual / Schedule [cron + timezone] / Webhook [path]) + **Save & activate**.
- Empty state (new): a centered prompt box "Describe the workflow you want…" with 3 example chips.

### 6.4 Workflow detail
- Header: name (editable), status badge, trigger chip, actions (Run, Pause/Activate, Open in Builder, Export TS, Delete).
- Sub-tabs (§3.5): **Overview** (plain-English summary + the flow preview + schedule) · **Runs** (history list) · **Versions** (list with diff + rollback) · **Settings** (rename, approval whitelist per side-effect step, delete).

### 6.5 Run detail
```
Run #1273 · Morning briefing            ● Succeeded · 13.8s · 1,524 tok · $0.004
─────────────────────────────────────────────────────────────────────────
[1] fetch_emails      gmail.list_messages     ✓ 220 ms   ▸ input / output
[2] brief             ai.generate             ✓ 1.2 s    ▸ input / output
[3] draft_replies×3   gmail.create_draft      ⏸ awaiting approval   [Approve][Reject]
[4] post_brief        slack.post_message      ○ pending
─────────────────────────────────────────────────────────────────────────
[ Retry from failed ]
```
- Header: run id + workflow + status badge + duration + tokens + cost (mono).
- **Step timeline:** one row per step (and per `forEach` item), status badge, tool, duration chip; expandable to show **redacted input/output** (JSON, mono). Failed steps show the error + a retry; gated steps show inline Approve/Reject.
- Trigger source + timestamp; link back to the workflow.

### 6.6 Approvals inbox
- List of pending side-effect cards: workflow + step + a **redacted preview** of the exact action ("Send draft to alex@…", "Create Jira ticket KAN-…"), requested time, and **Approve** / **Reject**. Approving resumes the paused run (toast "Approved — run resumed"). Empty: "Nothing waiting on you."

### 6.7 Connections
- Grid of provider cards: logo, name, status (**Connected** green / **Available** / **Reconnect** amber/red), scopes summary, "Connect" / "Disconnect" / "Reconnect", and **multiple credentials** support (list + "Add another"). API-key providers (Apify, Postgres) show a key/secret field (write-only).
- A clear banner in dev: "Connectors are in **fixture** mode — flip to live in `.env` (`COGWORK_CONNECTORS=live`) after adding credentials."

### 6.8 Templates
- Same gallery as 5.4 but in-app, with **Use template → opens a draft in the Builder**.

### 6.9 Memory
- A list of what Cogwork remembers (key, value, last updated) with inline edit/delete and an "Add preference". Copy: "Cogwork uses these to match your style — formats, default channels, tone." Empty: "Nothing remembered yet. Tell the builder 'remember that I…' and it'll show up here."

### 6.10 Settings
- Tabs: **Profile** (name, email, avatar) · **API keys** (create/revoke `cw_…` keys with read/write/execute scopes — UI present; enforcement is later) · **Appearance** (theme toggle when dark ships) · **Billing** (placeholder).

---

## 7. Open Source section (NEW — full spec)

**Placement:** Home, between the conversational-builder (or Slack) block and the Final CTA. Give it the page's single dark moment so it reads like a "repo / terminal" zone and stands apart — a deliberate contrast, not the site's default look.

**Background:** `--ink` panel (or a deep violet-ink) with a faint dotted blueprint grid and a soft violet glow top-right. Text becomes light (`--paper` / `--paper` @ 70%).

**Layout (two columns):**
```
┌───────────────────────────────┬──────────────────────────────┐
│  OPEN SOURCE                   │  ┌──────────────────────────┐ │
│  Built in the open.            │  │ ⌗ myorg/cogwork  [Apache-2.0]│ │
│  Run it yourself.              │  │ Open-source workflow…     │ │
│                                │  │ ★ 1.2k · ⑂ 180 · 12 ⬡ · TS│ │
│  Cogwork's engine, connectors, │  │            [ View on GitHub →]│
│  and studio are Apache-2.0.    │  └──────────────────────────┘ │
│  Read every line, self-host,   │  ┌──────────────────────────┐ │
│  fork, extend. No lock-in,     │  │ $ npx create-cogwork-app  │ │  ← terminal block
│  no black boxes.               │  │ $ cd my-cogwork && pnpm dev│ │
│                                │  │ # studio → localhost:3000 │ │
│  [View on GitHub →]            │  └──────────────────────────┘ │
│  [Read the self-host guide →]  │                              │
└───────────────────────────────┴──────────────────────────────┘
```
- Eyebrow: `OPEN SOURCE`.
- H1 (light, last clause violet-bright): **"Built in the open. _Run it yourself._"**
- Body (light @ 70%): "Cogwork's engine, connectors, and studio are Apache-2.0. Read every line, self-host it, fork it, extend it — no lock-in, no black boxes."
- **Repo card** (§3.10) on a light surface so it pops against the dark panel.
- **Terminal block** (§3.11) with the quickstart.
- CTAs: **View on GitHub →** (primary) · **Read the self-host guide →** (secondary, light-outline) · **Join the Discord** (link).
- Footnote row (mono, light @ 60%): `Apache-2.0` · `self-hostable` · `bring your own keys` · `For AI agents (llms.txt) →`.

**Reinforce open-source elsewhere:**
- Nav: a **GitHub** link with a live ★ count chip (§3.8).
- Footer: the whole **Open source** column (§3.9).
- Hero + Final CTA: a secondary **View on GitHub** button beside the primary.
- Community proof strips use real GitHub/Discord numbers.

---

## 8. States, accessibility, responsive

### 8.1 Per-surface states
- **Loading:** skeletons (not spinners) for lists/cards; for the canvas, a faint node placeholder; for generation, a streaming "Generating…" in chat.
- **Empty:** a one-line invitation + a single primary action (copy per page above). Never a dead end.
- **Error:** in the interface's voice, what happened + how to fix. e.g. run failed → "Step `post_brief` failed: Slack channel not found. Pick a channel and re-run." Connector down → "Couldn't reach Gmail. Try again, or check the connection."

### 8.2 Accessibility (quality floor — non-negotiable)
- Visible keyboard focus (violet focus ring) on every interactive element; full keyboard nav for nav, tabs, accordion, dialogs, canvas controls.
- Color contrast ≥ WCAG AA (check violet-on-white for text sizes; use `--ink` for body, violet for large/bold or as accent, not small grey-on-grey).
- Status is never color-only — pair with text/icon ("Running", "Failed").
- `prefers-reduced-motion`: disable canvas pulse + typed-prompt + ambient orbit; keep instant state changes.
- Semantic HTML, labelled inputs, `aria` on toggles/accordions/tabs, alt text on logos.

### 8.3 Responsive
- **Nav** → Sheet on mobile (mark + Start free stay).
- **Hero** stacks: copy then the demo card; the canvas becomes a horizontally-scrollable / fit-to-width playback (read-only) on small screens.
- **Why/builder/Slack/OSS** two-column blocks stack to one column; orbit shrinks to a compact ring or a logo grid.
- **Studio Builder** on tablet/mobile: collapse to a single pane with a segmented switch (Chat / Canvas / Spec); canvas is pan/zoom read-friendly. Tables become stacked cards.
- Container 1200 → fluid with 24px gutters; type scale steps down (§2.2).

---

## 9. Assets & implementation notes

- **Repo location:** `apps/web/` — route groups `(marketing)` and `(app)`; `components/ui` (shadcn, restyled), `components/marketing`, `components/studio`, `components/flow` (canvas + nodes), `styles/tokens.css`, `lib/fonts.ts`.
- **Fonts:** self-host Space Grotesk, Inter, JetBrains Mono as `woff2` (all OFL — bundling is fine and keeps the app self-contained for self-hosting). Wire via `next/font/local`.
- **Icons:** lucide-react for UI; provider/brand logos as local SVGs or `simple-icons`. Use provider marks **only to identify integrations** (nominative use); don't imply endorsement; respect each brand's basic usage (don't recolor logos arbitrarily).
- **Canvas:** `@xyflow/react` (MIT) for the flow graph; custom node components per kind (trigger / integration / AI step); custom animated edge for the green running pulse.
- **Charts (if any in dashboard):** keep minimal; a tiny sparkline is enough — don't add a charting dependency unless needed.
- **No fabricated proof:** no investor/accelerator logos, no invented customer logos, no unearned certification badges. Community/OSS signals (GitHub, Discord, contributors) carry the social proof, and they must be real (live API or honest static numbers).
- **Build discipline:** UI ships in the same small-green-commit cadence as the backend (context §23). Every screen works against fixtures, so the whole site + studio is demoable before a single OAuth app exists.

---

*End of Cogwork UI context file.*
