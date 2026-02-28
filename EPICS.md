# 📄 EPICS.md — WhereNext MVP Execution Plan

---

# 🧠 PROJECT: WhereNext

AI-powered relocation decision engine.

Core pipeline:
User Input → Geographic Engine → Scoring → AI → UI

---

# 🧱 EPIC 1 — PROJECT SETUP

## Goal
Initialize fullstack environment

## Tasks
- [ ] Create monorepo (frontend + backend)
- [ ] Setup React + Vite
- [ ] Setup FastAPI server
- [ ] Setup basic routing
- [ ] Configure environment variables

## Status
⬜ Not Started

---

# 🧱 EPIC 2 — SURVEY (SCREEN 1)

## Goal
Collect structured user input

## Tasks
- [ ] Anchor input (text field)
- [ ] Budget slider
- [ ] Salary slider
- [ ] Commute slider
- [ ] Radius slider (1–30 miles)
- [ ] Household selector (chips)
- [ ] Lifestyle selector (chips)
- [ ] CTA button → triggers analysis

## Status
⬜ Not Started

---

# 🧱 EPIC 3 — LAYOUT TRANSITION

## Goal
Transform fullscreen → sidebar

## Tasks
- [ ] Animate survey → left sidebar
- [ ] Preserve state between views
- [ ] Create compact sidebar UI
- [ ] Add sticky "Update Results" button

## Status
⬜ Not Started

---

# 🧱 EPIC 4 — MAP INTEGRATION (SCREEN 2)

## Goal
Render map and anchor

## Tasks
- [ ] Integrate map (Mapbox or Google Maps)
- [ ] Render anchor pin
- [ ] Center map on anchor
- [ ] Disable top filters (IMPORTANT)

## Status
⬜ Not Started

---

# 🧱 EPIC 5 — COMMUNITY DATASET

## Goal
Provide geographic candidates

## Tasks
- [ ] Create static JSON dataset
- [ ] Include 20–30 communities per region (SF, Irvine)
- [ ] Add centroid (lat/lng)
- [ ] Add rent + lifestyle scores
- [ ] Add optional polygon data

## Status
⬜ Not Started

---

# 🧱 EPIC 6 — GEOGRAPHIC ENGINE

## Goal
Generate candidate communities

## Tasks
- [ ] Resolve anchor → lat/lng (mock first)
- [ ] Implement Haversine distance
  <!-- distance = 2 * R * arcsin(...) -->
- [ ] Filter communities within radius
- [ ] Return candidate list

## Status
⬜ Not Started

---

# 🧱 EPIC 7 — SCORING ENGINE

## Goal
Compute deterministic scores

## Tasks
- [ ] Commute scoring
- [ ] Affordability scoring
- [ ] Lifestyle scoring
- [ ] Combine scores
  <!-- score = 0.4C + 0.3A + 0.3L -->
- [ ] Rank candidates

## Status
⬜ Not Started

---

# 🧱 EPIC 8 — AI INTEGRATION

## Goal
Add reasoning layer

## Tasks
- [ ] Create prompt template
- [ ] Pass structured candidate data
- [ ] Enforce JSON schema output
- [ ] Integrate Claude API
- [ ] Parse + validate response

## Status
⬜ Not Started

---

# 🧱 EPIC 9 — RESULTS UI (SCREEN 2)

## Goal
Display ranked communities

## Tasks
- [ ] Render 1–10 communities
- [ ] Display match scores
- [ ] Show reasons + tradeoffs
- [ ] Highlight on map
- [ ] Enable click interaction

## Status
⬜ Not Started

---

# 🧱 EPIC 10 — COMMUNITY DETAIL (SCREEN 3)

## Goal
Show deeper insights

## Tasks
- [ ] Build detail panel
- [ ] Show commute + rent + lifestyle
- [ ] Show tradeoffs
- [ ] Display mock housing

## Status
⬜ Not Started

---

# 🧱 EPIC 11 — INTERACTION LOOP

## Goal
Enable dynamic updates

## Tasks
- [ ] Update filters from sidebar
- [ ] Re-run scoring engine
- [ ] Re-run AI ranking
- [ ] Smooth UI transitions

## Status
⬜ Not Started

---