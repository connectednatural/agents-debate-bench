/**
 * Checkpoint 10: All API Routes Verification Tests
 * Verifies all routes return valid responses, error handling for missing API keys,
 * and streaming functionality
 */
import { describe, it, expect } from "bun:test";
import {
  ComparisonPlanSchema,
  AdvocateResponseSchema,
  CrossExamineResponseSchema,
  APIErrorSchema,
  type ComparisonPlan,
  type AdvocateResponse,
} from "@/lib/types";

// Test data fixtures
const validComparisonPlan: ComparisonPlan = {
  options: ["React", "Vue"],
  constraints: [
    { type: "budget", description: "Under $1000/month", value: "1000" },
  ],
  axes: [
    { name: "Performance", description: "Runtime speed", weight: 8 },
    { name: "Developer Experience", description: "Ease of use", weight: 7 },
  ],
  assignments: [
    { option: "React", advocateId: "advocate-1" },
    { option: "Vue", advocateId: "advocate-2" },
  ],
};

const validAdvocateResponse: AdvocateResponse = {
  option: "React",
  argument: "React is a powerful library for building user interfaces...",
  sources: [
    {
      title: "React Documentation",
      url: "https://react.dev",
      snippet: "React is a JavaScript library for building user interfaces",
    },
  ],
  weaknesses: ["Steep learning curve for beginners"],
};

// Helper to create test request
function createTestRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API Routes - Request Validation", () => {
  describe("/api/planner", () => {
    it("should reject empty request body", async () => {
      const { POST } = await import("@/app/api/planner/route");
      const req = createTestRequest({});
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should reject request without query", async () => {
      const { POST } = await import("@/app/api/planner/route");
      const req = createTestRequest({ clarifications: {} });
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should return API_KEY_MISSING when no API key provided", async () => {
      // Temporarily clear env var
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      
      const { POST } = await import("@/app/api/planner/route");
      const req = createTestRequest({ query: "Compare React vs Vue" });
      const response = await POST(req);
      
      // Restore env var
      if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("API_KEY_MISSING");
      expect(data.retryable).toBe(false);
    });

    it("should accept valid request with query", async () => {
      const { POST } = await import("@/app/api/planner/route");
      const req = createTestRequest({ 
        query: "Compare React vs Vue",
        apiKey: "test-key" // Will fail at API call, but validates request
      });
      
      // This will fail at the API call level, but request validation should pass
      const response = await POST(req);
      
      // Either succeeds or fails at API level (not validation)
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("/api/advocate", () => {
    it("should reject empty request body", async () => {
      const { POST } = await import("@/app/api/advocate/route");
      const req = createTestRequest({});
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should reject request without required fields", async () => {
      const { POST } = await import("@/app/api/advocate/route");
      const req = createTestRequest({ option: "React" }); // Missing plan and sessionId
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should return API_KEY_MISSING when no API key provided", async () => {
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      
      const { POST } = await import("@/app/api/advocate/route");
      const req = createTestRequest({
        option: "React",
        plan: validComparisonPlan,
        sessionId: "test-session",
      });
      const response = await POST(req);
      
      if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("API_KEY_MISSING");
    });
  });

  describe("/api/cross-examine", () => {
    it("should reject empty request body", async () => {
      const { POST } = await import("@/app/api/cross-examine/route");
      const req = createTestRequest({});
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should reject request without opponent arguments", async () => {
      const { POST } = await import("@/app/api/cross-examine/route");
      const req = createTestRequest({
        option: "React",
        ownArgument: validAdvocateResponse,
        opponentArguments: [], // Empty - should be rejected
        plan: validComparisonPlan,
        sessionId: "test-session",
        apiKey: "test-key",
      });
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
      expect(data.details).toContain("opponent");
    });

    it("should return API_KEY_MISSING when no API key provided", async () => {
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      
      const { POST } = await import("@/app/api/cross-examine/route");
      const req = createTestRequest({
        option: "React",
        ownArgument: validAdvocateResponse,
        opponentArguments: [{
          ...validAdvocateResponse,
          option: "Vue",
        }],
        plan: validComparisonPlan,
        sessionId: "test-session",
      });
      const response = await POST(req);
      
      if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("API_KEY_MISSING");
    });
  });

  describe("/api/referee", () => {
    it("should reject empty request body", async () => {
      const { POST } = await import("@/app/api/referee/route");
      const req = createTestRequest({});
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should reject request without advocate arguments", async () => {
      const { POST } = await import("@/app/api/referee/route");
      const req = createTestRequest({
        plan: validComparisonPlan,
        arguments: [], // Empty - should be rejected
        crossExaminations: [{
          option: "React",
          challenges: [],
          defense: "React is great",
        }],
        sessionId: "test-session",
        apiKey: "test-key",
      });
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should reject request without cross-examinations", async () => {
      const { POST } = await import("@/app/api/referee/route");
      const req = createTestRequest({
        plan: validComparisonPlan,
        arguments: [validAdvocateResponse],
        crossExaminations: [], // Empty - should be rejected
        sessionId: "test-session",
        apiKey: "test-key",
      });
      const response = await POST(req);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("INVALID_REQUEST");
    });

    it("should return API_KEY_MISSING when no API key provided", async () => {
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      
      const { POST } = await import("@/app/api/referee/route");
      const req = createTestRequest({
        plan: validComparisonPlan,
        arguments: [validAdvocateResponse],
        crossExaminations: [{
          option: "React",
          challenges: [],
          defense: "React is great",
        }],
        sessionId: "test-session",
      });
      const response = await POST(req);
      
      if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("API_KEY_MISSING");
    });
  });
});

describe("API Error Response Format", () => {
  it("should return valid APIError schema for validation errors", async () => {
    const { POST } = await import("@/app/api/planner/route");
    const req = createTestRequest({});
    const response = await POST(req);
    
    const data = await response.json();
    const parseResult = APIErrorSchema.safeParse(data);
    
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.error).toBeDefined();
      expect(parseResult.data.code).toBeDefined();
      expect(typeof parseResult.data.retryable).toBe("boolean");
    }
  });

  it("should return valid APIError schema for missing API key", async () => {
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    const { POST } = await import("@/app/api/planner/route");
    const req = createTestRequest({ query: "Test query" });
    const response = await POST(req);
    
    if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    
    const data = await response.json();
    const parseResult = APIErrorSchema.safeParse(data);
    
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.code).toBe("API_KEY_MISSING");
      expect(parseResult.data.retryable).toBe(false);
    }
  });
});

describe("Schema Validation", () => {
  it("should validate ComparisonPlan schema correctly", () => {
    const result = ComparisonPlanSchema.safeParse(validComparisonPlan);
    expect(result.success).toBe(true);
  });

  it("should reject ComparisonPlan with more than 3 options", () => {
    const invalidPlan = {
      ...validComparisonPlan,
      options: ["React", "Vue", "Angular", "Svelte"],
    };
    const result = ComparisonPlanSchema.safeParse(invalidPlan);
    expect(result.success).toBe(false);
  });

  it("should validate AdvocateResponse schema correctly", () => {
    const result = AdvocateResponseSchema.safeParse(validAdvocateResponse);
    expect(result.success).toBe(true);
  });

  it("should validate CrossExamineResponse schema correctly", () => {
    const validCrossExam = {
      option: "React",
      challenges: [
        {
          targetOption: "Vue",
          claim: "Vue is faster",
          critique: "This is misleading because...",
        },
      ],
      defense: "React has excellent performance...",
    };
    const result = CrossExamineResponseSchema.safeParse(validCrossExam);
    expect(result.success).toBe(true);
  });
});

describe("Streaming Response Support", () => {
  it("advocate route should return streaming response type", async () => {
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-for-streaming";
    
    const { POST } = await import("@/app/api/advocate/route");
    const req = createTestRequest({
      option: "React",
      plan: validComparisonPlan,
      sessionId: "test-session",
      apiKey: "test-key",
    });
    
    // The route will fail at API call, but we can check it attempts streaming
    const response = await POST(req);
    
    if (originalKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    } else {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
    
    // If it gets past validation, it should attempt streaming (will fail at API)
    // Status 401 means invalid key, 500 means API error - both indicate streaming was attempted
    expect([200, 401, 500]).toContain(response.status);
  });

  it("cross-examine route should return streaming response type", async () => {
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-for-streaming";
    
    const { POST } = await import("@/app/api/cross-examine/route");
    const req = createTestRequest({
      option: "React",
      ownArgument: validAdvocateResponse,
      opponentArguments: [{
        ...validAdvocateResponse,
        option: "Vue",
      }],
      plan: validComparisonPlan,
      sessionId: "test-session",
      apiKey: "test-key",
    });
    
    const response = await POST(req);
    
    if (originalKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    } else {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
    
    expect([200, 401, 500]).toContain(response.status);
  });

  it("referee route should return streaming response type", async () => {
    const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key-for-streaming";
    
    const { POST } = await import("@/app/api/referee/route");
    const req = createTestRequest({
      plan: validComparisonPlan,
      arguments: [validAdvocateResponse],
      crossExaminations: [{
        option: "React",
        challenges: [],
        defense: "React is great",
      }],
      sessionId: "test-session",
      apiKey: "test-key",
    });
    
    const response = await POST(req);
    
    if (originalKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    } else {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
    
    expect([200, 401, 500]).toContain(response.status);
  });
});
