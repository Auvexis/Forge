# Global Agent Panel Runtime Bugfixes - 2026-05-31

- [x] Global Agent Panel: send failures must show a global toast, not an inline chat message.
- [x] Global Agent Panel: agent-panel API errors must preserve useful failure detail instead of only "Agent execution failed".
- [x] Workflow Editor: AI Agent JSON output mode must guide the model to return JSON and parse common fenced JSON responses.
- [x] Run focused backend/frontend tests and build checks where practical.

## Verification

- `server`: `node --test src/core/routes/agent-panel.routes.test.ts src/core/modules/agent-runtime/agent-graph-builder.test.ts`
- `server`: `npm run build`
- `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `client-vue`: `npm run build`
