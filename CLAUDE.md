# Project Rules - Scope Definition

**IMPORTANT: These rules apply ONLY when the user's question or task relates to:**
- Files in this workspace (UI/UX Research & Standardization project)
- Research and documentation in this repository
- Development tasks for UI/UX standard definition
- Next.js, React, TypeScript, TailwindCSS, cross-platform UI frameworks, or project-specific patterns
- UI/UX research, technology stack evaluation, cross-platform application development standardization

**These rules DO NOT apply to general questions unrelated to this project.**

---

## SESSION STARTUP CHECK (MANDATORY)

**At the very start of every new conversation**, before responding to the user's first message, you MUST:

1. Call `mcp__enhanced-rlm__get_kb_session_stats` to verify the extension is responsive
2. Display this greeting message:

```
cc-mpc-extended-rlm (Enhanced Knowledge Base MCP Server) is active.
Knowledge base status: [OK / ERROR based on step 1 result]
```

3. If the call **fails or times out**, display:
```
WARNING: cc-mpc-extended-rlm extension is NOT responding.
Knowledge base features may be unavailable this session.
```

4. Then proceed with the user's request normally.

---

## ZERO HALLUCINATION POLICY (MANDATORY)

**This is the highest-priority rule. It overrides all other behavior.**

You MUST be **honest, factual, and evidence-based** in every response. If you don't know something, **say "I don't know"**. Never fill gaps with assumptions presented as facts.

- NEVER state unverified information as fact
- NEVER fabricate tool results
- NEVER guess and present guesses as facts
- Prefer "I don't know" over any fabrication
- Wait for evidence before concluding
- Verify before asserting
- Correct yourself immediately if wrong

---

## Self-Learning Protocol

**After completing tasks with 100% success** (all tests pass, no errors, user confirms satisfaction), you MUST:

1. **Analyze the session** for lessons learned:
   - New patterns or solutions discovered
   - Gotchas encountered and resolved
   - Effective approaches worth preserving
   - Mistakes made and how they were fixed

2. **Route updates to the appropriate target:**

   | Lesson Type | Target Location | Examples |
   |-------------|-----------------|----------|
   | Project-specific | `.claude/topics/<topic>.md` | UI/UX findings, framework comparisons, benchmark results |
   | Universal/reusable | `cc-mpc-extended-rlm` repository | General coding patterns, tool usage tips, universal best practices |
   | Agent template improvement | Agent's `examples/CLAUDE.md` | Better rule phrasing, new section structure |

3. **Update using modular topic files:**
   - Add/update topic files in `.claude/topics/` (one topic per file, <100 lines)
   - Add code examples to `.claude/code_examples/`
   - Update `.claude/INDEX.md` when adding new topics
   - Update `CLAUDE.md` only for critical new rules

4. **Skip if no meaningful lessons** - Not every session produces learnings worth preserving.

5. **For cc-mpc-extended-rlm updates:** When lessons are project-agnostic and valuable for other projects, locate the agent repository path from `.mcp.json` and update it there.

---

## Mandatory Test Requirement

**CRITICAL: Every new feature MUST have a test procedure defined BEFORE development begins.**

1. **When receiving a new feature request**, ask for or define:
   - Test scenario (step-by-step verification procedure)
   - Expected results for each step
   - Edge cases to verify

2. **If test scenario is missing**, you MUST ask the developer before starting implementation.

3. **Test procedure template:**
   ```
   ## Test: [Feature Name]
   Prerequisites: [Any setup needed]
   Steps:
   1. [Action] → Expected: [Result]
   2. [Action] → Expected: [Result]
   Cleanup: [How to reset after test]
   ```

---

## Git Commit Verification

**CRITICAL: Before declaring any task complete, verify ALL changes are committed.**

1. Always run `git status` before AND after commits
2. Check for modified files (staged and unstaged) and untracked files
3. After commit, verify: "nothing to commit, working tree clean"

---

## Project Overview

**UI/UX Research & Standardization** is a research project aimed at defining the ultimate UI/UX technology stack and design standard for a suite of enterprise applications (ERP, reporting, retail, company websites) that must:
- Be cross-platform (Web, Desktop/PWA, iOS native, Android native, macOS)
- Deliver blazing-fast, reactive, beautiful interfaces
- Support massive databases with ORM flexibility
- Be modular and composable (all apps feel like one system)
- Use mature, well-supported technologies backed by large communities

**Knowledge Base Structure (modular - token efficient):**
- `.claude/INDEX.md` - Topic index with keywords (improves search!)
- `.claude/topics/` - Focused topic files (one concept per file)
- `.claude/pre-requisites/` - Research & planning documents
- `.claude/code_examples/` - Reusable code patterns by language

Use `mcp__enhanced-rlm__ask_knowledge_base` to query topics efficiently.

---

## Key Research Domains

1. **Frontend Frameworks**: Next.js, React, Vue, Svelte - SSR/SSG/ISR capabilities
2. **UI Component Libraries**: shadcn/ui, Radix, MUI, Ant Design
3. **Styling**: TailwindCSS, CSS-in-JS, CSS Modules
4. **State Management**: Zustand, Jotai, TanStack Query, Redux Toolkit
5. **Cross-Platform**: React Native, Expo, Tauri, Electron, PWA
6. **Backend/Caching**: Redis, CDN strategies, edge computing
7. **ORM/Database**: Prisma, Drizzle, TypeORM, Entity Framework
8. **Design Systems**: Figma tokens, design token standards
9. **Performance**: Core Web Vitals, bundle optimization, lazy loading
10. **Animations**: Framer Motion, GSAP, CSS transitions

---

## Knowledge Base

For detailed information, see `.claude/` folder:
- [INDEX.md](.claude/INDEX.md) - Topic navigation
- [topics/](.claude/topics/) - Modular topic files
- [pre-requisites/](.claude/pre-requisites/) - Research documents
- [code_examples/](.claude/code_examples/) - Reusable code by language

**Modular KB principle:** Keep topic files small (<100 lines) so Haiku can extract relevant info efficiently. One concept = one file.

---

## Knowledge Base Agent (cc-mpc-extended-rlm)

### When to Use
- **Always** use `mcp__enhanced-rlm__ask_knowledge_base` for:
  - Project-specific research findings and conclusions
  - Technology comparison results
  - Code examples and patterns
  - Architecture decisions made

### Session Summary Requirement (MANDATORY)
**CRITICAL: At the end of EVERY task**, when writing a Summary section, you MUST:
1. **BEFORE writing the Summary**, call `mcp__enhanced-rlm__get_kb_session_stats`
2. Include the returned stats in your Summary under "Knowledge Base Usage"
3. If no KB queries were made, write: "Knowledge Base Usage: No queries this session"
