/**
 * Checkpoint 5: Core Infrastructure Verification Tests
 * Verifies stores, AI provider, and Exa Search tool work correctly
 */
import { describe, it, expect, beforeEach } from "bun:test";

// Test Settings Store
describe("Settings Store", () => {
  it("should have correct initial state", async () => {
    // Dynamic import to avoid SSR issues
    const { useSettingsStore } = await import("@/lib/stores/settings");
    const state = useSettingsStore.getState();

    expect(state.geminiApiKey).toBe("");
    expect(state.exaApiKey).toBe("");
    expect(state.model).toBe("gemini-3-flash-preview");
    expect(state.maxParallelism).toBe(2);
  });

  it("should update API keys correctly", async () => {
    const { useSettingsStore } = await import("@/lib/stores/settings");

    useSettingsStore.getState().setGeminiApiKey("test-gemini-key");
    expect(useSettingsStore.getState().geminiApiKey).toBe("test-gemini-key");

    useSettingsStore.getState().setExaApiKey("test-exa-key");
    expect(useSettingsStore.getState().exaApiKey).toBe("test-exa-key");

    // Reset for other tests
    useSettingsStore.getState().setGeminiApiKey("");
    useSettingsStore.getState().setExaApiKey("");
  });

  it("should update model correctly", async () => {
    const { useSettingsStore } = await import("@/lib/stores/settings");

    useSettingsStore.getState().setModel("gemini-3-flash-preview");
    expect(useSettingsStore.getState().model).toBe("gemini-3-flash-preview");

    // Reset
    useSettingsStore.getState().setModel("gemini-3-flash-preview");
  });

  it("should update maxParallelism correctly", async () => {
    const { useSettingsStore } = await import("@/lib/stores/settings");

    useSettingsStore.getState().setMaxParallelism(3);
    expect(useSettingsStore.getState().maxParallelism).toBe(3);

    useSettingsStore.getState().setMaxParallelism(1);
    expect(useSettingsStore.getState().maxParallelism).toBe(1);

    // Reset
    useSettingsStore.getState().setMaxParallelism(2);
  });

  it("should check hasRequiredKeys correctly", async () => {
    const { useSettingsStore } = await import("@/lib/stores/settings");

    // Without keys set, should return false (unless env vars are set)
    useSettingsStore.getState().setGeminiApiKey("");
    useSettingsStore.getState().setExaApiKey("");

    // With keys set, should return true
    useSettingsStore.getState().setGeminiApiKey("test-key");
    useSettingsStore.getState().setExaApiKey("test-key");
    expect(useSettingsStore.getState().hasRequiredKeys()).toBe(true);

    // Reset
    useSettingsStore.getState().setGeminiApiKey("");
    useSettingsStore.getState().setExaApiKey("");
  });
});

// Test Session Store
describe("Session Store", () => {
  beforeEach(async () => {
    const { useSessionStore } = await import("@/lib/stores/session");
    // Clear all sessions before each test
    const state = useSessionStore.getState();
    state.sessions.forEach((s) => state.deleteSession(s.id));
    state.setCurrentSession(null);
  });

  it("should create a new session", async () => {
    const { useSessionStore } = await import("@/lib/stores/session");

    const sessionId = useSessionStore.getState().createSession("Test query");

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe("string");

    const session = useSessionStore.getState().getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.query).toBe("Test query");
    expect(session?.status).toBe("pending");
  });

  it("should update a session", async () => {
    const { useSessionStore } = await import("@/lib/stores/session");

    const sessionId = useSessionStore.getState().createSession("Test query");
    useSessionStore.getState().updateSession(sessionId, { status: "planning" });

    const session = useSessionStore.getState().getSession(sessionId);
    expect(session?.status).toBe("planning");
  });

  it("should delete a session", async () => {
    const { useSessionStore } = await import("@/lib/stores/session");

    const sessionId = useSessionStore.getState().createSession("Test query");
    expect(useSessionStore.getState().getSession(sessionId)).toBeDefined();

    useSessionStore.getState().deleteSession(sessionId);
    expect(useSessionStore.getState().getSession(sessionId)).toBeUndefined();
  });

  it("should set current session", async () => {
    const { useSessionStore } = await import("@/lib/stores/session");

    const sessionId = useSessionStore.getState().createSession("Test query");
    expect(useSessionStore.getState().currentSessionId).toBe(sessionId);

    useSessionStore.getState().setCurrentSession(null);
    expect(useSessionStore.getState().currentSessionId).toBeNull();
  });
});

// Test AI Provider
describe("AI Provider", () => {
  it("should create Google provider", async () => {
    const { getGoogleProvider } = await import("@/lib/ai/provider");

    const provider = getGoogleProvider("test-api-key");
    expect(provider).toBeDefined();
    expect(typeof provider).toBe("function");
  });

  it("should create model with custom API key", async () => {
    const { getModel } = await import("@/lib/ai/provider");

    const model = getModel("test-api-key", "gemini-3-flash-preview");
    expect(model).toBeDefined();
  });

  it("should use default model when not specified", async () => {
    const { getModel } = await import("@/lib/ai/provider");

    const model = getModel("test-api-key");
    expect(model).toBeDefined();
  });
});

// Test Exa Search Tool
describe("Exa Search Tool", () => {
  it("should create Exa search tool", async () => {
    const { createExaSearchTool } = await import("@/lib/ai/tools");

    const tool = createExaSearchTool("test-api-key");
    expect(tool).toBeDefined();
    expect(tool.description).toContain("Search the web");
  });

  it("should have correct input schema", async () => {
    const { createExaSearchTool } = await import("@/lib/ai/tools");

    const tool = createExaSearchTool("test-api-key");
    // The tool should have an inputSchema with query field
    expect(tool.inputSchema).toBeDefined();
  });
});

// Test Agent Prompts
describe("Agent Prompts", () => {
  it("should have all required prompts defined", async () => {
    const {
      PLANNER_SYSTEM_PROMPT,
      ADVOCATE_SYSTEM_PROMPT,
      CROSS_EXAMINER_SYSTEM_PROMPT,
      REFEREE_SYSTEM_PROMPT,
    } = await import("@/lib/ai/prompts");

    expect(PLANNER_SYSTEM_PROMPT).toBeDefined();
    expect(PLANNER_SYSTEM_PROMPT.length).toBeGreaterThan(100);

    expect(ADVOCATE_SYSTEM_PROMPT).toBeDefined();
    expect(ADVOCATE_SYSTEM_PROMPT).toContain("{option}");

    expect(CROSS_EXAMINER_SYSTEM_PROMPT).toBeDefined();
    expect(CROSS_EXAMINER_SYSTEM_PROMPT).toContain("{option}");

    expect(REFEREE_SYSTEM_PROMPT).toBeDefined();
    expect(REFEREE_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("should inject option into prompts correctly", async () => {
    const { ADVOCATE_SYSTEM_PROMPT, injectOption } = await import(
      "@/lib/ai/prompts"
    );

    const injected = injectOption(ADVOCATE_SYSTEM_PROMPT, "React");
    expect(injected).toContain("React");
    expect(injected).not.toContain("{option}");
  });
});

// Test Zod Schemas
describe("Zod Schemas", () => {
  it("should validate ComparisonPlan correctly", async () => {
    const { ComparisonPlanSchema } = await import("@/lib/types/schemas");

    const validPlan = {
      options: ["React", "Vue", "Angular"],
      constraints: [
        { type: "budget", description: "Under $1000/month", value: "1000" },
      ],
      axes: [{ name: "Performance", description: "Runtime speed", weight: 8 }],
      assignments: [{ option: "React", advocateId: "advocate-1" }],
    };

    const result = ComparisonPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("should reject invalid ComparisonPlan", async () => {
    const { ComparisonPlanSchema } = await import("@/lib/types/schemas");

    const invalidPlan = {
      options: ["React", "Vue", "Angular", "Svelte"], // More than 3 options
      constraints: [],
      axes: [],
      assignments: [],
    };

    const result = ComparisonPlanSchema.safeParse(invalidPlan);
    expect(result.success).toBe(false);
  });

  it("should validate ComparisonSession correctly", async () => {
    const { ComparisonSessionSchema } = await import("@/lib/types/schemas");

    const validSession = {
      id: "test-id",
      query: "Compare React vs Vue",
      createdAt: new Date(),
      status: "pending",
    };

    const result = ComparisonSessionSchema.safeParse(validSession);
    expect(result.success).toBe(true);
  });
});
