import React, { useState } from "react";
import { useUpdateOllamaConfig } from "~/hooks/ollama/useUpdateOllamaConfig";
import type { OllamaConfigModel } from "~/types/ollama-config";

export default function FirstSteps() {
  const { mutate, isPending } = useUpdateOllamaConfig();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;

    const data = {
      host: (form.host as HTMLInputElement).value,
      model: (form.model as HTMLInputElement).value,
      options: {
        temperature: Number((form.temperature as HTMLInputElement).value),
        num_ctx: Number((form.num_ctx as HTMLInputElement).value),
      },
    };

    mutate(data);
  }

  return (
    <div className="flex w-screen h-screen items-center justify-center bg-amber-300">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="host">Host</label>
        <input
          type="text"
          id="host"
          name="host"
          defaultValue={"http://localhost:11434"}
        />

        <label htmlFor="model">Model</label>
        <input
          type="text"
          id="model"
          name="model"
          defaultValue={"qwen2.5:1.5b"}
        />

        <label htmlFor="temperature">Temperature</label>
        <input
          type="text"
          id="temperature"
          name="temperature"
          defaultValue={0.2}
        />

        <label htmlFor="num_ctx">Num Ctx</label>
        <input type="text" id="num_ctx" name="num_ctx" defaultValue={4096} />

        <button type="submit" disabled={isPending}>
          {isPending ? "Loading..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
