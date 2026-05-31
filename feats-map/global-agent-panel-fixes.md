# Global Agent Panel Fixes

Goal: fix the Global Agent implementation and Workflow Editor chat issues found after the first pass.

## Rules

- [x] Stay on branch `dev`.
- [x] Follow `DEFAULT_PROMPT.md`.
- [ ] Use TDD before behavior changes.
- [x] Keep plugins generic; no plugin imports from core/engines/other plugins.
- [ ] Use `tokens.css` variables so themes work.
- [ ] Commit after each completed implementation task.

## Tasks

- [ ] Task 1: Global Agent as BaseModal
  - Replace `/agents` page usage with a global modal mounted in the app shell.
  - Keep one aside for agents only.
  - Move chat history into a floating menu in the chat header.
  - Use `AppConfirmPanel` for chat deletion.
  - Open modal from Workflow Editor chat panel button.
  - Add Command Palette action to open the modal.

- [ ] Task 2: Theme-safe Agent Panel Styling
  - Replace hard-coded colors in agent panel components with `tokens.css` variables.
  - Keep responsive layout inside the modal.

- [ ] Task 3: Workflow Agent Metadata Cleanup
  - Remove `agentDescription` from frontend/server types, editor UI, directory output, and tests.
  - Stop passing public display metadata into AI agent runtime config.
  - Keep public `agentDisplayName` and `agentEmoji` only as workflow/node UI metadata.

- [ ] Task 4: Tools Agent Node Identity
  - When a Tools Agent has selected avatar/name, show that emoji/name on the node instead of robot/AI Agent.

- [ ] Task 5: Theme-Aware Canvas Plugin Icons
  - Make plugin light/dark icons update immediately when theme changes, without refresh.

- [ ] Task 6: Chat Message Identity and Time
  - Show sent time beside role labels in Workflow Editor Chat Panel and Global Agent chat.
  - Show profile name/avatar for user messages.
  - Show selected agent name/avatar for assistant messages.

## Verification

- [ ] Backend focused tests.
- [ ] Frontend focused contract tests.
- [ ] Frontend build.
- [ ] Browser smoke for modal open paths and theme switch.
