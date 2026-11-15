# InterviewGenie AI — Inter-Agent Communication Protocol & Git Workflow
Version: 1.0.0
Orchestrator: CTO / Principal Architect

## 1. Hub-and-Spoke Governance
- **Client ↔ Orchestrator:** The Master Orchestrator is the sole interface to the Client.
- **Orchestrator ↔ Worker Agents:** The Orchestrator assigns tasks, reviews PRs, performs integration, and commands builds/tests.
- **Worker ↔ Worker:** Technical coordination permitted for API/schema alignment via shared specifications (`specs/`).
- **File Ownership Enforcement:** No worker may modify files outside their designated module without prior Orchestrator review.

## 2. Agent Assignments & Ownership
| Agent Role | Primary Module | Working Branch | Herdr Location |
| :--- | :--- | :--- | :--- |
| **Master Orchestrator** | `specs/`, integration, releases | `develop`, `main` | Tab 1, Pane `w2:p1` |
| **Frontend Engineer** | `frontend/` | `feature/frontend-foundation` | Tab 2, Pane `w2:p2` |
| **Backend Engineer** | `backend/` | `feature/backend-api` | Tab 2, Pane `w2:p4` |
| **AI Engineer** | `ai_engine/` | `feature/ai-engine` | Tab 2, Pane `w2:p5` |
| **Voice & Media Engineer** | `media_services/`, `frontend/src/services/media/` | `feature/media-services` | Tab 3, Pane `w2:p3` |
| **QA & Security Engineer** | `tests/`, security checks | `feature/qa-automation` | Tab 3, Pane `w2:p6` |
| **Research & Doc Engineer**| `docs/`, `README.md` | `feature/academic-research` | Tab 3, Pane `w2:p7` |

## 3. Git Branching & Worktree Strategy
- `main`: Release-ready, production-tested code.
- `develop`: Stable integration branch.
- Feature branches branched off `develop`.
- Direct pushes to `main` and `develop` are restricted to the Master Orchestrator following successful test runs.

## 4. Definition of Done (DoD)
A task or feature is marked DONE when:
1. Complete code implementation exists (no placeholder stubs or non-functional mockups).
2. Code builds cleanly without compiler, linter, or TypeScript errors.
3. Unit tests pass with 100% success rate.
4. Integration with backend API contracts is validated.
5. Error handling and edge cases are explicitly addressed.
6. QA engineer independently verifies functionality and signs off.
7. Orchestrator completes code review and merges to `develop`.
