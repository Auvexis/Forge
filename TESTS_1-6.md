# Milestone 1.6 — End-to-End Test Plan

This document outlines the manual end-to-end (E2E) tests required to verify that the Plugin Triggers & Event-Driven Architecture (Milestone 1.6) is functioning correctly.

---

## ✅ Prerequisites

1.  **Environment Setup**:
    - Ensure your `.env` file (or system environment) has `SERVER_BASE_URL` or `PUBLIC_URL` set to an ngrok/localtunnel URL (e.g., `PUBLIC_URL=https://my-ngrok-id.ngrok-free.app`). **Telegram requires a public HTTPS URL to send webhooks.**
    - Start the backend (`npm run dev:server`) and frontend (`npm run dev:client`).
2.  **Telegram Bot**:
    - Create a bot using `@BotFather` on Telegram and obtain the **Bot Token**.
3.  **Nod8 Credentials**:
    - In the Nod8 UI, go to **Settings > Integrations**, select **Telegram**, and add a new credential using your Bot Token.

---

## 🧪 Test Case 1: Plugin Trigger UI & Configuration - DONE ✅

**Objective**: Verify that the "Plugin Trigger" option is available in the Trigger Editor and correctly displays dynamic parameters based on the plugin's manifest.

1.  Create a new Workflow and open the **Trigger Node** settings.
2.  Change the **Trigger Type** to **Plugin Trigger**.
    - **Expect**: The "Integration" dropdown appears.
3.  Select **Telegram** as the integration.
    - **Expect**: The "Event / Trigger" dropdown appears.
4.  Select **On New Message** as the event.
    - **Expect**: The "Trigger Settings" section appears, showing the `Allowed Update Types` text field (as defined in `telegram/manifest.json`).

---

## 🧪 Test Case 2: Listen for Event (SSE Capture) - DONE ✅

**Objective**: Verify that the "Listen for Event" button correctly intercepts a live webhook and displays the payload in the UI without executing the workflow.

1.  _Preparation_: Ensure the workflow is **Draft** (not published). The Trigger Node must be configured as a Telegram Plugin Trigger.
2.  **Action**:
    - Since Telegram only sends webhooks to a registered URL, we need to temporarily register the webhook for testing.
    - _Workaround for testing_: Use Postman or curl to simulate a webhook call to your local instance.
      - Find the workflow ID (e.g., in the URL).
      - URL to hit: `POST http://localhost:23801/webhook/<workflow_id>` (replace `<workflow_id>` with the actual ID).
    - In the Trigger Node settings, click **Listen for Event**.
    - **Expect**: The UI shows the yellow "Waiting for event…" state with a countdown.
3.  **Action**:
    - Send a JSON payload using Postman/curl to the webhook URL.
      ```json
      {
        "message": {
          "text": "Hello Nod8",
          "from": { "first_name": "John" }
        }
      }
      ```
    - **Expect**:
      - The UI instantly changes to the green **"Event captured!"** state.
      - Close the Trigger Node settings and look at the Left Pane (Input) of the Inspector.
      - It should display "LAST CAPTURED EVENT" with the JSON payload you sent.
4.  **Action**:
    - Refresh the browser page.
    - **Expect**: The captured payload is still visible in the Left Pane (persisted in `last_trigger_payload`).

---

## 🧪 Test Case 3: Timeout for Listen Event

**Objective**: Verify that the SSE connection times out gracefully if no event is received.

1.  Click **Listen for Event**.
2.  Wait for 2 minutes (120 seconds).
3.  **Expect**: The UI automatically transitions to the gray **"Timed out after 2 minutes"** state.

---

## 🧪 Test Case 4: Workflow Activation (Publish / Setup Hook)

**Objective**: Verify that publishing a workflow calls the plugin's `setup()` hook and successfully registers the webhook with Telegram.

1.  Ensure the Trigger Node is configured for Telegram -> On New Message.
2.  Add a generic Node (e.g., Code Node) connected to the Trigger, just to have a valid workflow.
3.  Save the workflow.
4.  Click **Publish** in the top-right corner.
    - **Expect**:
      - A success toast appears: "Workflow published".
      - In the backend terminal, look for logs:
        - `[NOD8 | LIFECYCLE]: Calling setup() for plugin 'telegram' / trigger 'onMessage'...`
        - `[NOD8 | TELEGRAM]: Webhook registered at https://.../webhook/<workflow_id>...`
5.  **Verify with Telegram**:
    - Send a message to your bot on Telegram via the app.
    - Check the Nod8 Executions / History tab.
    - **Expect**: A new execution should appear containing your Telegram message data in the trigger output.

---

## 🧪 Test Case 5: Workflow Deactivation (Unpublish / Teardown Hook)

**Objective**: Verify that unpublishing a workflow calls the plugin's `teardown()` hook and removes the webhook from Telegram.

1.  With the workflow currently published (from Test Case 4), click **Unpublish**.
    - **Expect**:
      - A success toast appears: "Workflow unpublished".
      - In the backend terminal, look for logs:
        - `[NOD8 | LIFECYCLE]: Calling teardown() for plugin 'telegram' / trigger 'onMessage'...`
        - `[NOD8 | TELEGRAM]: Webhook unregistered for workflow...`
2.  **Verify with Telegram**:
    - Send another message to your bot on Telegram.
    - Check the Nod8 Executions / History tab.
    - **Expect**: No new execution appears (the webhook was deleted).

---

## 🧪 Test Case 6: Error Handling in Setup Hook

**Objective**: Verify that if a plugin fails to set up its trigger (e.g., due to an invalid API key), the workflow is prevented from publishing and the error is shown to the user.

1.  Go to Settings > Integrations and intentionally edit your Telegram Bot Token to be invalid (e.g., append "invalid" to the end).
2.  Go back to your workflow and click **Publish**.
    - **Expect**:
      - A red error toast appears: "Workflow published but trigger setup failed: Telegram setWebhook failed: Unauthorized".
      - The workflow status remains "Draft" or "Unpublished" (the publish action is rolled back).

---

## 🧪 Test Case 7: Workflow Deletion (Teardown)

**Objective**: Verify that deleting a published workflow also triggers the teardown process to clean up resources.

1.  Fix your Telegram Bot Token so it is valid again.
2.  Publish the workflow successfully.
3.  Delete the workflow from the dashboard.
    - **Expect**:
      - In the backend terminal, look for logs indicating `teardown()` was called and the webhook was unregistered.
