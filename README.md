# Vamo Incident Desk

## Project Overview

Vamo Incident Desk is a Product Engineer assessment prototype for coordinating delivery issues across Operations and Customer Support. It brings reports, potentially affected deliveries, recovery decisions, customer updates, and next actions into one incident workspace.

The goal is to help teammates understand the situation and continue the response without reconstructing context from separate conversations. This is a frontend prototype using fictional data and browser-local persistence.

## The Problem

A driver’s breakdown report and a customer’s delivery inquiry can describe the same operational problem. Handling them separately can duplicate investigation, obscure the wider delivery impact, and leave ownership or follow-up unclear.

These are the workflow assumptions explored by this assessment, not verified findings about Vamo Delivery’s current systems. I assume Support handles customer communication and Operations coordinates recovery, with responsibilities potentially overlapping.

## The Proposed Solution

I focused on one complete response rather than a broad operations dashboard. To review it:

1. Start in **Reports**, where Daniel’s breakdown is selected, and choose **Create incident**. Six unfinished deliveries on his route appear. An already delivered stop and another driver’s route are excluded.
2. Review Avery’s related customer call and choose **Link report**. Both reports now share one incident, and Avery’s delivery is counted once.
3. Under **Recovery**, describe an arrangement and choose **Save proposal**. Then record who agreed to what and choose **Confirm arrangement**. A proposal alone never counts as confirmed recovery.
4. Under **Customer updates**, enter a message and choose **Record simulated update**. All customers awaiting an update are selected by default. No external message is sent.
5. Complete **Verify recovery outcome with the driver**, recording what was verified and with whom. Actions can alternatively be cancelled individually with a reason.
6. Enter an **Incident outcome** and choose **Resolve incident**. Resolution remains blocked while essential actions are open. The resolved record retains its outcome and history.

Use **Acting as** to simulate another teammate contributing, refresh to check persistence, or choose **Reset demo** to restore the starting scenario after confirmation.

## Key Features

| Feature                             | User value                                                                                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Report linking                      | Combines related context and prevents linking the same report twice or to multiple incidents.                                                                                                |
| Derived delivery impact             | Identifies unfinished deliveries from known report and route data without double counting.                                                                                                   |
| Separate recovery and communication | Distinguishes an agreed arrangement from a customer update and from verified recovery completion.                                                                                            |
| Ownership and follow-ups            | Gives incidents and actions named owners, with overdue work visible in the workspace and incident list.                                                                                      |
| Shared incident history             | Records attributed decisions, updates, cancellations, and confirmations for continuity in the local demo.                                                                                    |
| Resolution safeguards               | Requires an outcome and completion or reasoned cancellation of every essential action. Added deliveries reopen closed essential work and return confirmed recovery to a proposal for review. |
| Repeatable local demo               | Saves accepted changes, warns about storage failures, and recovers from invalid saved data with a fresh scenario.                                                                            |
| Keyboard and narrow-screen support  | Uses labelled native controls, visible focus, a skip link, focus handling, and keyboard-scrollable delivery tables.                                                                          |

Display times can switch between Austin, Bogotá, Manila, and UTC. Follow-up input is explicitly UTC.

## Tech Stack

| Technology                         | Use in this project                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| React 19 and TypeScript            | Component UI with explicit domain types and strict type checking.                          |
| Vite                               | Local development and a static production build.                                           |
| Plain CSS and Lucide React         | Shared visual styles and icons without a component framework.                              |
| Vitest, Testing Library, and jsdom | Business-rule, persistence, and component workflow tests.                                  |
| Playwright and axe                 | Chromium workflow checks at desktop and mobile sizes, plus automated accessibility checks. |
| ESLint and Prettier                | Consistent code checks and formatting.                                                     |

## Architecture and Technical Decisions

```text
src/
  App.tsx                         State, navigation, command execution, feedback
  demo/                           Fictional fixtures and local persistence
  features/incidents/
    models.ts                     Reports, deliveries, incidents, actions, history
    rules.ts                      Commands, validation, and derived selectors
    time.ts                       Time formatting and display zones
    components/                   Inbox and focused incident sections
  ui/primitives.tsx               Shared buttons, fields, badges, and avatars
  styles.css                      Shared styles and responsive layouts
e2e/                              Browser workflow and accessibility checks
scripts/                          Automated walkthrough recording
```

`App` owns the demo state. Forms send typed commands to `applyCommand`, which validates the operation and returns either a new state or an error. Accepted state is saved to local storage and rendered; errors leave the existing state unchanged. Individual forms keep unsaved drafts locally.

Affected deliveries and outstanding work are derived rather than maintained as separate counters. Report IDs connect incidents to source context; communications reference delivery IDs. Timeline entries preserve earlier decisions when incident impact expands.

I kept the rules separate from rendering so behavior can be tested without browser interaction. React state and props are sufficient for this small, single-tab prototype. There is no backend, API interaction, router, or external state-management library.

## Getting Started

### Prerequisites and installation

Use Node.js **22.23.1**, selected by `.nvmrc`, and npm. The package also permits Node `^20.19.0`, `^22.13.0`, or `>=24.0.0`.

From the repository root:

```sh
# Optional, if you use nvm
nvm use

npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`. No environment file, API keys, account, or backend is required.

### Tests and checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check

npx playwright install chromium
npm run test:e2e
```

Playwright starts the local server on port 5173 or reuses an existing one outside CI. To use an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path.

The latest validation passed **31 unit/component tests and 2 browser tests**, plus the build, lint, and formatting checks. Coverage includes duplicate linking, affected deliveries, proposed versus confirmed recovery, expanded impact, cancellation and resolution, malformed persistence, and refresh behavior. Browser checks include keyboard interaction and axe rules; they do not establish complete accessibility compliance or replace assistive-technology testing.

Other commands: `npm run test:watch`, `npm run preview` after building, and `npm run format` to apply formatting. Build output is written to `dist/`; browser artifacts go to `test-results/`.

### Optional recorded walkthrough

Run from the repository root:

```sh
npm run demo:browser
```

The command starts the local app if needed, or reuses a server already running on port 5173. A server started by the demo stops when it finishes. It runs a visible Chromium demonstration in an isolated browser context with captions, cursor indicators, and click highlights. It generates a silent video, chapter player at `demo-recordings/watch.html`, and execution report. Generated recordings are ignored by Git.

Optional settings are `DEMO_HEADLESS=1`, `DEMO_SPEED=0.5` for twice the pace, `DEMO_OUTPUT_DIR` for a different output directory, and `DEMO_URL` for another local server address. The Chromium executable override also applies. Overdue work and storage failures are simulated only inside the test browser.

## Product and Engineering Trade-offs

I prioritized the path from first report through resolution to make coordination decisions reviewable in one sitting. The UI exposes uncertainty instead of treating a proposal, message, or recovery confirmation as proof of delivery.

All actions created through the interface are essential. Resolution requires completion or explicit cancellation with a reason; deferral is outside this MVP. When impact expands, closed essential actions require review again, preserving the earlier history.

Fictional inputs and local storage keep setup small and the scenario repeatable. A few shared UI primitives keep interactions consistent without introducing a design-system dependency. These choices support assessment review while leaving shared persistence and integrations for a subsequent iteration.

## Current Limitations

- Reports, route assignments, teammates, and confirmations are fictional. There is no live report ingestion or SMS, phone, dispatch, or tracking integration.
- **Acting as** changes attribution only. There is no authentication, authorization, or enforced team separation.
- Browser storage provides no multi-user synchronization, conflict handling, or server durability. Use one tab. If saving fails, changes remain in memory and may be lost on refresh.
- The UI is tailored to the supplied scenario, including some fixed route and teammate defaults. It is not a general incident configuration tool.
- Recovery tracks one proposal and confirmation. There is no incident merging, reopening resolved incidents, operational delivery-status editing, or general revision of confirmed arrangements.
- Potential impact comes from known assignments, not prediction. Delivery windows passing prompts verification; the app does not verify delays, arrival, cargo temperature, or cold-chain compliance.
- There are no analytics, automatic escalations, routing optimization, or measured operational improvements. No operator research, production load testing, or manual screen-reader audit has been completed.

## AI-Assisted Development

I used AI assistance to propose structure and scope, generate implementation and mock data, write tests and documentation, and review the code. I approved and refined the product direction, including resolution rules, onboarding, test priorities, and accessibility, and reviewed the browser walkthrough.

Validation included automated checks and simulated browser runs. An AI-assisted audit identified gaps in expanded-impact handling and saved confirmation validation; regression tests reproduced those defects before the fixes and passed afterward. I remain responsible for understanding the implementation, reviewing its behavior, and deciding what is ready to submit. These checks are not user research.

## Final Notes

This assessment demonstrates a focused approach to operational coordination: connect the context, make uncertainty and ownership visible, and keep essential work open until it is completed or explicitly cancelled.

See the [assessment write-up](docs/assessment.md) and [walkthrough guide](docs/walkthrough.md) for additional context.
