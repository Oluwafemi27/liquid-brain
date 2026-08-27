# Liquid Brain

Build me a full-stack web app called "ADUF AI" - The Business Brain for SMBs.

VIBE & DESIGN

Theme: "Liquid Glass COO Dashboard". Premium, dark, calm, powerful.

Inspiration: Apple Liquid Glass + Linear + Jarvis from Iron Man

Colors: Background #0A0E1A, Glass #FFFFFF15 with backdrop-blur-xl, Accent Gradient: Cyan #00E5FF to Purple #7C3AED

Typography: Inter for body, Space Grotesk for headings

Effects: Subtle animated water ripple background shader, liquid glass cards, 3D floating elements, ripple on hover, water-fill loading states. Use framer-motion for all animations. Use react-three-fiber for subtle 3D only. Must be 60fps.

RESPONSIVE

Mobile first. Desktop: 3-column layout. Mobile: Bottom tab bar with 5 tabs. Must be PWA ready.

PAGES TO BUILD:

1. HOME - "THE BRAIN"

Purpose: Default dashboard. ADUF talks to the user like a COO.

Layout Desktop: Left Nav | Center Feed | Right Brain Chat

Components:

- Header: "Good Morning, {UserName}" + Status: "ADUF is Active"

- Center: "Insight Cards" in liquid glass. Example: "Sales dropped 12%. I paused ads and doubled WhatsApp followups. [Approve] [Why?]"

- KPI Section: 3x "Water Bubble" 3D cards for Sales, Leads, Retention with % change. They float slightly.

- Right: Always-on "Brain Chat" panel. ChatGPT style. Placeholder: "Ask ADUF anything..."

2. GOALS ENGINE

Purpose: Set and track business KPIs

Layout: Grid of 3D "Goal Orbs". Each orb is glass with water inside that fills based on % progress.

Example Goal: "₦2,000,000 in Sales - 45%"

Inside orb: list of sub-tasks. Buttons: [Edit Plan] [+ New Goal]

Animation: When goal hits 100%, orb bursts into particles.

3. AUTOMATION GRID

Purpose: Replace n8n. Toggle automations on/off. No code.

Layout: "Channel Galaxy". Center 3D sphere = "Automation Core". Orbiting spheres = WEBSITE, WHATSAPP, CRM, PAYMENTS, ADS, EMAIL.

Each sphere is a toggle. ON = fills with water + connects with light beam to core.

Click sphere → opens slide-up sheet with: Trigger → Action → Goal it affects.

4. BUSINESS MEMORY

Purpose: Show what ADUF knows

Layout: Interactive 3D Knowledge Graph using react-force-graph.

Nodes: Customers, Products, Revenue, Traffic. Edges are light beams.

Top: "Connect New Data Source" button. Show Shopify, Google Analytics, WhatsApp logos in glass tiles.

5. ANALYTICS & SIMULATOR

Purpose: Reports + "What If" tool

Components: Liquid bar charts and line charts using Recharts.

Feature: "What If Simulator" slider. "Increase Ad Spend by ₦50k" → chart animates and predicts "+23 Leads"

Loading: Water-fill animation for charts.

6. SETTINGS & INTEGRATIONS

Grid of glass tiles for each integration. Clicking "Connect" plays water-pouring animation.

GLOBAL RULES

- Loading: Never use spinners. Use "water filling" progress bars and liquid skeleton screens.

- Navigation: Left sidebar desktop. Bottom tab bar mobile: [Brain][Goals][Grid][Memory][Me]

- Speed: Lazy load 3D. Initial JS < 200kb. Use Zustand for state.

- Tech: Next.js 14, TypeScript, TailwindCSS, Framer Motion, Zustand, Recharts, react-three-fiber

DATA

For now use mock data for Sales, Leads, Goals, Automations. Structure it so I can connect a FastAPI backend later.

Create all 6 pages, the responsive layout, the liquid glass components, and the water animations. Make it feel alive and fast.

This project was bootstrapped from a single product brief above and built out into a working app.

## Development

You need Node.js — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
