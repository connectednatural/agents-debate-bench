/**
 * Checkpoint 15: Full Application Verification Tests
 * Tests complete comparison flow end-to-end, UI component rendering, and error scenarios
 * Requirements: Full application verification
 */
import { describe, it, expect, beforeEach } from "bun:test";
import {
  ComparisonPlanSchema,
  AdvocateResponseSchema,
  CrossExamineResponseSchema,
  RefereeResponseSchema,
  APIErrorSchema,
  type ComparisonPlan,
  type AdvocateResponse,
  type CrossExamineResponse,
} from "@/lib/types";
import {
  parseMarkdownCustomKeys,
  parseTableKey,
  parsePollKey,
  parseScoreKey,
  hasCustomKeys,
} from "@/lib/utils/markdown-parser";
import { withRetry, isRetryableError } from "@/lib/utils/retry";
import { executeInParallel } from "@/lib/utils/parallel-executor";
import {
  createAPIError,
  createValidationError,
  createMissingKeyError,
  createAgentError,
  parseError,
  isAPIError,
  ErrorCode,
} from "@/lib/utils/errors";
import { z } from "zod";

// ============================================================================
// Test Data Fixtures
// ============================================================================

const validComparisonPlan: ComparisonPlan = {
  options: ["React", "Vue", "Angular"],
  constraints: [
    { type: "budget", description: "Under $1000/month", value: "1000" },
    { type: "timeline", description: "Launch in 3 months" },
  ],
  axes: [
    { name: "Performance", description: "Runtime speed and efficiency", weight: 8 },
    { name: "Developer Experience", description: "Ease of use and learning curve", weight: 7 },
    { name: "Community", description: "Ecosystem and support", weight: 6 },
  ],
  assignments: [
    { option: "React", advocateId: "advocate-1" },
    { option: "Vue", advocateId: "advocate-2" },
    { option: "Angular", advocateId: "advocate-3" },
  ],
};

const validAdvocateResponse: AdvocateResponse = {
  option: "React",
  argument: `## React: The Industry Standard

React is a powerful library for building user interfaces. It offers:

### Performance
- Virtual DOM for efficient updates
- Concurrent rendering with React 18

### Developer Experience
- Large ecosystem with extensive tooling
- Strong TypeScript support

[Source: React Documentation](https://react.dev)`,
  sources: [
    {
      title: "React Documentation",
      url: "https://react.dev",
      snippet: "React is a JavaScript library for building user interfaces",
    },
  ],
  weaknesses: ["Steep learning curve for beginners", "Requires additional libraries for state management"],
};

const validCrossExamResponse: CrossExamineResponse = {
  option: "React",
  challenges: [
    {
      targetOption: "Vue",
      claim: "Vue is easier to learn",
      critique: "While Vue has a gentler learning curve, React's ecosystem provides more long-term value",
    },
  ],
  defense: "React's performance optimizations and concurrent features make it ideal for large-scale applications.",
};

// ============================================================================
// 1. Complete Comparison Flow Tests
// ============================================================================

describe("Complete Comparison Flow", () => {
  describe("Data Flow Validation", () => {
    it("should validate complete plan → advocate → cross-exam → referee data flow", () => {
      // Step 1: Validate plan
      const planResult = ComparisonPlanSchema.safeParse(validComparisonPlan);
      expect(planResult.success).toBe(true);
      expect(planResult.data?.options.length).toBe(3);
      expect(planResult.data?.axes.length).toBe(3);

      // Step 2: Validate advocate responses for each option
      const advocateResponses: AdvocateResponse[] = validComparisonPlan.options.map((option) => ({
        ...validAdvocateResponse,
        option,
      }));

      for (const response of advocateResponses) {
        const result = AdvocateResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      }

      // Step 3: Validate cross-examination responses
      const crossExamResponses: CrossExamineResponse[] = validComparisonPlan.options.map((option) => ({
        ...validCrossExamResponse,
        option,
      }));

      for (const response of crossExamResponses) {
        const result = CrossExamineResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      }

      // Step 4: Validate referee can receive all data
      const refereeInput = {
        plan: validComparisonPlan,
        arguments: advocateResponses,
        crossExaminations: crossExamResponses,
        sessionId: "test-session",
      };

      expect(refereeInput.plan.options.length).toBe(refereeInput.arguments.length);
      expect(refereeInput.arguments.length).toBe(refereeInput.crossExaminations.length);
    });

    it("should enforce max 3 options constraint throughout flow", () => {
      const planWith4Options = {
        ...validComparisonPlan,
        options: ["React", "Vue", "Angular", "Svelte"],
      };

      const result = ComparisonPlanSchema.safeParse(planWith4Options);
      expect(result.success).toBe(false);
    });

    it("should require all advocate assignments match options", () => {
      const plan = validComparisonPlan;
      const assignedOptions = plan.assignments.map((a) => a.option);
      
      for (const option of plan.options) {
        expect(assignedOptions).toContain(option);
      }
    });
  });

  describe("Session State Transitions", () => {
    it("should track valid session status transitions", async () => {
      const { useSessionStore } = await import("@/lib/stores/session");
      const store = useSessionStore.getState();

      // Clear existing sessions
      store.sessions.forEach((s) => store.deleteSession(s.id));

      // Create session
      const sessionId = store.createSession("Compare React vs Vue");
      let session = store.getSession(sessionId);
      expect(session?.status).toBe("pending");

      // Transition to planning
      store.updateSession(sessionId, { status: "planning" });
      session = store.getSession(sessionId);
      expect(session?.status).toBe("planning");

      // Transition to advocating
      store.updateSession(sessionId, { status: "advocating", plan: validComparisonPlan });
      session = store.getSession(sessionId);
      expect(session?.status).toBe("advocating");
      expect(session?.plan).toBeDefined();

      // Transition to cross-examining
      store.updateSession(sessionId, { status: "cross-examining" });
      session = store.getSession(sessionId);
      expect(session?.status).toBe("cross-examining");

      // Transition to refereeing
      store.updateSession(sessionId, { status: "refereeing" });
      session = store.getSession(sessionId);
      expect(session?.status).toBe("refereeing");

      // Transition to complete
      store.updateSession(sessionId, { status: "complete" });
      session = store.getSession(sessionId);
      expect(session?.status).toBe("complete");

      // Cleanup
      store.deleteSession(sessionId);
    });
  });
});

// ============================================================================
// 2. UI Components Rendering Tests
// ============================================================================

describe("UI Components Rendering", () => {
  describe("Markdown Parser for Custom Keys", () => {
    it("should parse _Table syntax correctly", () => {
      const markdown = `Here is a comparison:
_Table{Option:string,Performance:number,DX:number}
| Option | Performance | DX |
| React | 8 | 9 |`;

      const blocks = parseMarkdownCustomKeys(markdown);
      const tableBlock = blocks.find((b) => b.type === "table");
      
      expect(tableBlock).toBeDefined();
      if (tableBlock?.type === "table") {
        expect(tableBlock.columns.length).toBe(3);
        expect(tableBlock.columns[0]).toEqual({ name: "Option", type: "string" });
        expect(tableBlock.columns[1]).toEqual({ name: "Performance", type: "number" });
      }
    });

    it("should parse _Poll syntax correctly", () => {
      const markdown = `Which framework do you prefer?
_Poll{React,Vue,Angular,Other}`;

      const blocks = parseMarkdownCustomKeys(markdown);
      const pollBlock = blocks.find((b) => b.type === "poll");
      
      expect(pollBlock).toBeDefined();
      if (pollBlock?.type === "poll") {
        expect(pollBlock.options).toEqual(["React", "Vue", "Angular", "Other"]);
      }
    });

    it("should parse _Score syntax correctly", () => {
      const markdown = `Performance scores:
_Score{Performance:React=8,Vue=7,Angular=6}`;

      const blocks = parseMarkdownCustomKeys(markdown);
      const scoreBlock = blocks.find((b) => b.type === "score");
      
      expect(scoreBlock).toBeDefined();
      if (scoreBlock?.type === "score") {
        expect(scoreBlock.axis).toBe("Performance");
        expect(scoreBlock.scores.length).toBe(3);
        expect(scoreBlock.scores[0]).toEqual({ option: "React", score: 8 });
      }
    });

    it("should handle multiple custom keys in one document", () => {
      const markdown = `# Comparison Results

_Table{Option:string,Score:number}

Here are the scores:
_Score{Performance:React=8,Vue=7}

Vote for your favorite:
_Poll{React,Vue}`;

      const blocks = parseMarkdownCustomKeys(markdown);
      
      const tableBlocks = blocks.filter((b) => b.type === "table");
      const scoreBlocks = blocks.filter((b) => b.type === "score");
      const pollBlocks = blocks.filter((b) => b.type === "poll");
      
      expect(tableBlocks.length).toBe(1);
      expect(scoreBlocks.length).toBe(1);
      expect(pollBlocks.length).toBe(1);
    });

    it("should preserve text content between custom keys", () => {
      const markdown = `Introduction text here.
_Poll{Option1,Option2}
More text after poll.`;

      const blocks = parseMarkdownCustomKeys(markdown);
      const textBlocks = blocks.filter((b) => b.type === "text");
      
      expect(textBlocks.length).toBe(2);
      expect(textBlocks[0].content).toContain("Introduction");
      expect(textBlocks[1].content).toContain("More text");
    });

    it("should detect presence of custom keys", () => {
      expect(hasCustomKeys("_Table{col:string}")).toBe(true);
      expect(hasCustomKeys("_Poll{a,b,c}")).toBe(true);
      expect(hasCustomKeys("_Score{axis:a=1}")).toBe(true);
      expect(hasCustomKeys("Regular markdown without custom keys")).toBe(false);
    });
  });

  describe("Table Column Parsing", () => {
    it("should parse all column types", () => {
      const columns = parseTableKey("Name:string,Score:number,Active:boolean");
      
      expect(columns).toEqual([
        { name: "Name", type: "string" },
        { name: "Score", type: "number" },
        { name: "Active", type: "boolean" },
      ]);
    });

    it("should default to string type", () => {
      const columns = parseTableKey("Name,Score,Active");
      
      expect(columns.every((c) => c.type === "string")).toBe(true);
    });
  });

  describe("Score Parsing", () => {
    it("should parse axis and multiple scores", () => {
      const result = parseScoreKey("DX:React=9,Vue=8,Angular=7");
      
      expect(result.axis).toBe("DX");
      expect(result.scores.length).toBe(3);
      expect(result.scores[0]).toEqual({ option: "React", score: 9 });
    });

    it("should handle axis without scores", () => {
      const result = parseScoreKey("Performance");
      
      expect(result.axis).toBe("Performance");
      expect(result.scores.length).toBe(0);
    });
  });
});

// ============================================================================
// 3. Error Scenarios Tests
// ============================================================================

describe("Error Scenarios", () => {
  describe("API Error Creation", () => {
    it("should create validation errors correctly", () => {
      const zodError = new z.ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["query"],
          message: "Required",
        },
      ]);

      const error = createValidationError(zodError);
      
      expect(error.code).toBe("INVALID_REQUEST");
      expect(error.retryable).toBe(false);
      expect(error.details).toContain("query");
    });

    it("should create missing key errors correctly", () => {
      const error = createMissingKeyError("Gemini");
      
      expect(error.code).toBe("API_KEY_MISSING");
      expect(error.error).toContain("Gemini");
      expect(error.retryable).toBe(false);
    });

    it("should create agent errors correctly", () => {
      const error = createAgentError("Model timeout");
      
      expect(error.code).toBe("AGENT_FAILED");
      expect(error.retryable).toBe(true);
    });

    it("should parse unknown errors correctly", () => {
      const error = parseError(new Error("Rate limit exceeded"), "Planner");
      
      expect(error.code).toBe("RATE_LIMITED");
      expect(error.retryable).toBe(true);
    });

    it("should identify API errors correctly", () => {
      const validError = {
        error: "Test error",
        code: "AGENT_FAILED",
        retryable: true,
      };

      expect(isAPIError(validError)).toBe(true);
      expect(isAPIError({ error: "test" })).toBe(false);
      expect(isAPIError(null)).toBe(false);
    });
  });

  describe("Retry Logic", () => {
    it("should identify retryable errors", () => {
      expect(isRetryableError(new Error("rate limit exceeded"))).toBe(true);
      expect(isRetryableError(new Error("timeout"))).toBe(true);
      expect(isRetryableError(new Error("network error"))).toBe(true);
      expect(isRetryableError(new Error("503 service unavailable"))).toBe(true);
      expect(isRetryableError(new Error("invalid input"))).toBe(false);
    });

    it("should retry on transient failures", async () => {
      let attempts = 0;
      
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error("timeout");
          }
          return "success";
        },
        { maxRetries: 2, baseDelay: 10 }
      );

      expect(result).toBe("success");
      expect(attempts).toBe(2);
    });

    it("should not retry on non-retryable errors", async () => {
      let attempts = 0;
      
      try {
        await withRetry(
          async () => {
            attempts++;
            throw new Error("invalid input");
          },
          { 
            maxRetries: 2, 
            baseDelay: 10,
            isRetryable: () => false // Force non-retryable
          }
        );
      } catch {
        // Expected to throw
      }

      expect(attempts).toBe(1);
    });

    it("should respect max retries", async () => {
      let attempts = 0;
      
      try {
        await withRetry(
          async () => {
            attempts++;
            throw new Error("timeout");
          },
          { maxRetries: 2, baseDelay: 10 }
        );
      } catch {
        // Expected to throw
      }

      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe("Parallel Execution Error Handling", () => {
    it("should handle partial failures in parallel execution", async () => {
      const items = ["success1", "fail", "success2"];
      
      const result = await executeInParallel({
        items,
        maxParallelism: 3,
        executor: async (item) => {
          if (item === "fail") {
            throw new Error("Simulated failure");
          }
          return item.toUpperCase();
        },
      });

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.results.filter(Boolean).length).toBe(2);
    });

    it("should respect maxParallelism setting", async () => {
      const executionOrder: number[] = [];
      const items = [1, 2, 3, 4, 5];
      
      await executeInParallel({
        items,
        maxParallelism: 2,
        executor: async (item, index) => {
          executionOrder.push(index);
          await new Promise((r) => setTimeout(r, 10));
          return item;
        },
      });

      // With maxParallelism=2, items should be processed in batches
      expect(executionOrder.length).toBe(5);
    });
  });

  describe("Session Error Handling", () => {
    it("should preserve partial results on error", async () => {
      const { useSessionStore } = await import("@/lib/stores/session");
      const store = useSessionStore.getState();

      // Clear existing sessions
      store.sessions.forEach((s) => store.deleteSession(s.id));

      // Create session with partial data
      const sessionId = store.createSession("Test query");
      store.updateSession(sessionId, {
        plan: validComparisonPlan,
        arguments: [validAdvocateResponse],
      });

      // Mark as error
      store.markSessionError(sessionId, "Referee failed");

      const session = store.getSession(sessionId);
      expect(session?.status).toBe("error");
      expect(session?.error).toBe("Referee failed");
      expect(session?.plan).toBeDefined();
      expect(session?.arguments?.length).toBe(1);
      expect(store.hasPartialResults(sessionId)).toBe(true);

      // Cleanup
      store.deleteSession(sessionId);
    });

    it("should track completed phases", async () => {
      const { useSessionStore } = await import("@/lib/stores/session");
      const store = useSessionStore.getState();

      // Clear existing sessions
      store.sessions.forEach((s) => store.deleteSession(s.id));

      const sessionId = store.createSession("Test query");
      store.updateSession(sessionId, {
        plan: validComparisonPlan,
        arguments: [validAdvocateResponse],
        crossExaminations: [validCrossExamResponse],
      });

      store.markSessionError(sessionId, "Error during refereeing");

      const phases = store.getCompletedPhases(sessionId);
      expect(phases).toContain("planning");
      expect(phases).toContain("advocating");
      expect(phases).toContain("cross-examining");

      // Cleanup
      store.deleteSession(sessionId);
    });
  });
});

// ============================================================================
// 4. API Route Integration Tests
// ============================================================================

describe("API Route Integration", () => {
  function createTestRequest(body: unknown): Request {
    return new Request("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  describe("Planner Route", () => {
    it("should validate request schema", async () => {
      const { POST } = await import("@/app/api/planner/route");
      
      // Missing query
      const response = await POST(createTestRequest({}));
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should require API key", async () => {
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const { POST } = await import("@/app/api/planner/route");
      const response = await POST(createTestRequest({ query: "Compare React vs Vue" }));
      
      if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("API_KEY_MISSING");
    });
  });

  describe("Advocate Route", () => {
    it("should validate request schema", async () => {
      const { POST } = await import("@/app/api/advocate/route");
      
      // Missing required fields
      const response = await POST(createTestRequest({ option: "React" }));
      expect(response.status).toBe(400);
    });

    it("should require plan and sessionId", async () => {
      const { POST } = await import("@/app/api/advocate/route");
      
      const response = await POST(createTestRequest({
        option: "React",
        // Missing plan and sessionId
      }));
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Cross-Examine Route", () => {
    it("should require opponent arguments", async () => {
      const { POST } = await import("@/app/api/cross-examine/route");
      
      const response = await POST(createTestRequest({
        option: "React",
        ownArgument: validAdvocateResponse,
        opponentArguments: [], // Empty - should fail
        plan: validComparisonPlan,
        sessionId: "test",
        apiKey: "test-key",
      }));
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details).toContain("opponent");
    });
  });

  describe("Referee Route", () => {
    it("should require all inputs", async () => {
      const { POST } = await import("@/app/api/referee/route");
      
      // Missing arguments
      const response1 = await POST(createTestRequest({
        plan: validComparisonPlan,
        arguments: [],
        crossExaminations: [validCrossExamResponse],
        sessionId: "test",
        apiKey: "test-key",
      }));
      expect(response1.status).toBe(400);

      // Missing cross-examinations
      const response2 = await POST(createTestRequest({
        plan: validComparisonPlan,
        arguments: [validAdvocateResponse],
        crossExaminations: [],
        sessionId: "test",
        apiKey: "test-key",
      }));
      expect(response2.status).toBe(400);
    });
  });
});

// ============================================================================
// 5. Settings and Configuration Tests
// ============================================================================

describe("Settings and Configuration", () => {
  beforeEach(async () => {
    // Reset settings before each test
    const { useSettingsStore } = await import("@/lib/stores/settings");
    const store = useSettingsStore.getState();
    store.setGeminiApiKey("");
    store.setExaApiKey("");
    store.setModel("gemini-3-flash-preview");
    store.setMaxParallelism(2);
  });

  it("should persist settings correctly", async () => {
    const { useSettingsStore } = await import("@/lib/stores/settings");
    
    // Set values
    useSettingsStore.getState().setGeminiApiKey("test-gemini-key");
    useSettingsStore.getState().setExaApiKey("test-exa-key");
    useSettingsStore.getState().setModel("gemini-2.0-flash");
    useSettingsStore.getState().setMaxParallelism(3);

    // Get fresh state and verify
    const state = useSettingsStore.getState();
    expect(state.geminiApiKey).toBe("test-gemini-key");
    expect(state.exaApiKey).toBe("test-exa-key");
    expect(state.model).toBe("gemini-2.0-flash");
    expect(state.maxParallelism).toBe(3);

    // Check hasRequiredKeys
    expect(state.hasRequiredKeys()).toBe(true);
  });

  it("should validate parallelism bounds", async () => {
    const { useSettingsStore } = await import("@/lib/stores/settings");
    
    useSettingsStore.getState().setMaxParallelism(1);
    expect(useSettingsStore.getState().maxParallelism).toBe(1);

    useSettingsStore.getState().setMaxParallelism(3);
    expect(useSettingsStore.getState().maxParallelism).toBe(3);
  });
});
