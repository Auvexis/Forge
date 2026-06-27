# Execution Tree Connector Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align execution-tree connectors with the expand icon and add consistent spacing without extending the vertical line beyond the last item.

**Architecture:** Keep the recursive tree and interaction behavior unchanged. Correct only branch-level CSS geometry and protect it with the existing source contract test.

**Tech Stack:** Vue 3, scoped CSS, Sailor design tokens, Node test runner.

---

### Task 1: Correct tree connector geometry

**Files:**
- Modify: `client-vue/src/shared/components/execution/ExecutionNodeTree.vue`
- Test: `client-vue/src/shared/components/execution/__tests__/executionRunComponents.contract.test.ts`

- [ ] **Step 1: Write the failing contract**

Assert that branches use `--sailor-space-2` spacing, rows use tokenized padding and margin, and the last branch suppresses connector overflow.

- [ ] **Step 2: Verify the contract fails**

Run: `node --test src/shared/components/execution/__tests__/executionRunComponents.contract.test.ts`

Expected: FAIL because the current tree lacks the new spacing and last-branch geometry.

- [ ] **Step 3: Implement the minimal CSS correction**

Move connector ownership to each nested branch, align its axis with the 14px chevron column, stop it at the final branch, and apply `var(--sailor-space-2)` for row padding, connector clearance, and inter-item gap.

- [ ] **Step 4: Verify tests and types**

Run the focused component test and `npm run type-check` from `client-vue`.

Expected: both commands exit successfully.

- [ ] **Step 5: Commit**

Commit the test, CSS correction, and completed checklist together.
