import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Ignore if .env.local doesn't exist
}

export default {
  // Model behind every agent.* step.
  agents: {
    default: {
      model: createOpenAICompatible({
        name: "openai-compatible",
        baseURL: "https://atmorouter.dev/v1",
        // apiKey: process.env.LLM_API_KEY,
      }).chatModel("gpt-6-luna"),
      system: "You are a thorough QA agent. Verify every outcome.",
    },
  },
  credentials: {
    testUser: {
      username: process.env.E2E_TEST_EMAIL,
      password: () => process.env.E2E_TEST_PASSWORD,
    },
  },
  targets: [
    {
      engine: web(),
      app: {
        url: process.env.APP_URL ?? "http://localhost:3005",
        command: {
          executable: "bun",
          args: ["run", "dev", "--", "-p", "3005"],
          env: { PORT: "3005" },
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
} satisfies E2EConfig;
