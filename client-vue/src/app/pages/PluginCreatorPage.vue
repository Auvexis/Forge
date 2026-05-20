<template>
  <main class="plugin-creator-page">
    <header class="plugin-creator-page__header">
      <div>
        <p class="plugin-creator-page__label">Plugin Creator</p>
        <h1>Low-code plugin workspace</h1>
      </div>

      <div class="plugin-creator-page__actions">
        <button type="button" class="plugin-creator-page__button">New Plugin</button>
        <button type="button" class="plugin-creator-page__button plugin-creator-page__button--primary">
          Save Draft
        </button>
      </div>
    </header>

    <section class="plugin-creator-page__workspace" aria-label="Plugin creator canvas">
      <aside class="plugin-creator-page__rail">
        <span class="plugin-creator-page__rail-title">Add Item</span>
        <button type="button">Method</button>
        <button type="button">Input Field</button>
        <button type="button">Request</button>
      </aside>

      <div class="plugin-creator-page__canvas">
        <div class="plugin-creator-page__placeholder">
          <span class="plugin-creator-page__node">Method</span>
          <span class="plugin-creator-page__connector" aria-hidden="true"></span>
          <span class="plugin-creator-page__node">Request</span>
          <span class="plugin-creator-page__connector" aria-hidden="true"></span>
          <span class="plugin-creator-page__node">Output</span>
        </div>
      </div>

      <aside class="plugin-creator-page__inspector">
        <span class="plugin-creator-page__rail-title">Inspector</span>
        <p>Select a method or request block to edit plugin metadata.</p>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.plugin-creator-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  background: #f6f8fb;
  color: #142033;
}

.plugin-creator-page__header {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 24px;
  border-bottom: 1px solid #d9e1ec;
  background: #ffffff;
}

.plugin-creator-page__label {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #526173;
}

.plugin-creator-page h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
}

.plugin-creator-page__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plugin-creator-page__button,
.plugin-creator-page__rail button {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #172033;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.plugin-creator-page__button {
  padding: 0 12px;
}

.plugin-creator-page__button--primary {
  border-color: #246bfe;
  background: #246bfe;
  color: #ffffff;
}

.plugin-creator-page__workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
}

.plugin-creator-page__rail,
.plugin-creator-page__inspector {
  padding: 16px;
  border-right: 1px solid #d9e1ec;
  background: #ffffff;
}

.plugin-creator-page__inspector {
  border-right: 0;
  border-left: 1px solid #d9e1ec;
}

.plugin-creator-page__rail-title {
  display: block;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #526173;
}

.plugin-creator-page__rail button {
  width: 100%;
  margin-bottom: 8px;
  text-align: left;
  padding: 0 10px;
}

.plugin-creator-page__inspector p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #526173;
}

.plugin-creator-page__canvas {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  background-color: #eef3f9;
  background-image:
    linear-gradient(#dbe4ef 1px, transparent 1px),
    linear-gradient(90deg, #dbe4ef 1px, transparent 1px);
  background-size: 28px 28px;
}

.plugin-creator-page__placeholder {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plugin-creator-page__node {
  min-width: 108px;
  min-height: 52px;
  display: inline-grid;
  place-items: center;
  border: 1px solid #b8c6d8;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(20, 32, 51, 0.08);
  font-size: 13px;
  font-weight: 700;
}

.plugin-creator-page__connector {
  width: 40px;
  height: 2px;
  background: #7c8da4;
}

@media (max-width: 900px) {
  .plugin-creator-page__workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(360px, 1fr) auto;
  }

  .plugin-creator-page__rail,
  .plugin-creator-page__inspector {
    border: 0;
    border-bottom: 1px solid #d9e1ec;
  }

  .plugin-creator-page__inspector {
    border-top: 1px solid #d9e1ec;
  }
}
</style>
