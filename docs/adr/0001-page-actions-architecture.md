# ADR 0001: Page Actions Architecture

## Status

Accepted

## Context

Fabric Pages needs to use published workflows as dynamic data and actions without coupling the Pages builder to the workflow engine or to workflow editor internals.

## Decision

Introduce Page Actions as an internal platform boundary.

- Pages owns UI, bindings, page state, and canvas interactions.
- Workflows own visual backend logic, triggers, execution, and Return nodes.
- Page Actions translate published workflow triggers into page-consumable actions.
- Pages components must not call the workflow engine directly.
- Workflow editor components must not import Pages feature code.

## Layers

- `core/page-actions/domain`: pure types and contracts.
- `core/page-actions/application`: use cases and mappers.
- `core/page-actions/infrastructure`: adapters for APIs and runtime.
- `features/web-pages/data-actions`: Pages UI/stores/composables for Data / Actions.

## Execution Flow

1. Pages asks Page Actions for available actions.
2. Page Actions lists published callable workflows through infrastructure.
3. User selects a workflow trigger.
4. Page Actions creates a `PageActionDefinition`.
5. Test Run executes the action through a gateway.
6. Later phases bind inputs/outputs to page elements and page state.

## MVP 1 Scope

- List published workflows.
- List all callable triggers from each published workflow.
- Preview trigger input schema.
- Create an in-memory Page Action definition.
- Run a test execution and show the execution id/result envelope.

## Non-goals

- No direct workflow engine calls from Vue components.
- No pick whip binding in MVP 1.
- No persisted page action schema in MVP 1.
- No public REST endpoint design in MVP 1.
