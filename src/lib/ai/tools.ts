/**
 * AI Tools - Exa Search Tool and Human-in-the-Loop Utilities
 * Creates tools for web research and user confirmation workflows
 */
import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { searchRetry } from "@/lib/utils";

/**
 * Search result schema for type safety
 */
export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string(),
  publishedDate: z.string().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Search failure info for graceful degradation
 */
export interface SearchFailureInfo {
  failed: true;
  reason: string;
  timestamp: Date;
}

/**
 * Creates an Exa Search tool for web research with live crawling
 * Uses searchAndContents API with livecrawl: 'always' for up-to-date results
 * Gracefully handles missing API key and failures by returning empty results
 * Requirements: 10.2 - Graceful degradation on search failures
 */
export function createExaSearchTool(apiKey?: string) {
  const resolvedApiKey = apiKey || process.env.EXA_API_KEY;
  
  return tool({
    description:
      "Search the web for up-to-date technical information, documentation, comparisons, and reviews. Use this to research technologies, frameworks, and tools.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(200)
        .describe("The search query - be specific for better results"),
    }),
    execute: async ({ query }): Promise<SearchResult[]> => {
      // Handle missing API key gracefully - return empty results
      if (!resolvedApiKey) {
        console.warn("Exa API key not configured - search disabled");
        return [];
      }
      
      try {
        // Use retry wrapper for transient failures
        const results = await searchRetry(async () => {
          const exa = new Exa(resolvedApiKey);
          const response = await exa.searchAndContents(query, {
            livecrawl: "always",
            numResults: 5,
            text: true,
          });
          return response.results.map((result) => ({
            title: result.title ?? "Untitled",
            url: result.url,
            content: (result as { text?: string }).text?.slice(0, 1500) ?? "",
            publishedDate: result.publishedDate,
          }));
        });
        
        return results;
      } catch (error) {
        // Return empty results on error - agent will continue with available info
        // This implements graceful degradation (Requirement 10.2)
        console.error("Exa search error after retries:", error);
        return [];
      }
    },
  });
}

/**
 * Approval enum for human-in-the-loop workflows
 */
export const APPROVAL = {
  YES: "Yes, confirmed.",
  NO: "No, denied.",
} as const;

export type ApprovalType = (typeof APPROVAL)[keyof typeof APPROVAL];

/**
 * Creates a clarification poll tool for gathering user input
 * This tool does NOT have an execute function - requires human confirmation
 */
export function createClarificationTool() {
  return tool({
    description:
      "Ask the user a clarification question when the query is ambiguous or needs more details",
    inputSchema: z.object({
      question: z.string().describe("The clarification question to ask"),
      options: z
        .array(z.string())
        .min(2)
        .max(6)
        .describe("Predefined options for the user to choose from"),
      allowCustom: z
        .boolean()
        .default(true)
        .describe("Whether to allow custom text input"),
      multiSelect: z
        .boolean()
        .default(false)
        .describe("Whether multiple options can be selected"),
    }),
    outputSchema: z.object({
      selectedOptions: z.array(z.string()),
      customInput: z.string().optional(),
    }),
    // No execute function - requires human-in-the-loop confirmation
  });
}

/**
 * Creates a confirmation tool for important decisions
 * This tool does NOT have an execute function - requires human confirmation
 */
export function createConfirmationTool() {
  return tool({
    description:
      "Ask the user to confirm an important action or decision before proceeding",
    inputSchema: z.object({
      action: z.string().describe("Description of the action to confirm"),
      details: z
        .string()
        .optional()
        .describe("Additional details about the action"),
    }),
    outputSchema: z.string(),
    // No execute function - requires human-in-the-loop confirmation
  });
}

/**
 * Helper to check if a tool requires human confirmation
 * Tools without execute functions require confirmation
 */
export function getToolsRequiringConfirmation<
  T extends Record<string, { execute?: unknown }>
>(tools: T): (keyof T)[] {
  return (Object.keys(tools) as (keyof T)[]).filter(
    (key) => !tools[key].execute
  );
}

/**
 * All tools available for the Tech Referee agents
 */
export function createAgentTools(exaApiKey?: string) {
  return {
    webSearch: createExaSearchTool(exaApiKey),
    askClarification: createClarificationTool(),
    confirmAction: createConfirmationTool(),
  };
}

/**
 * Tools for planner agent (includes clarification)
 */
export function createPlannerTools(exaApiKey?: string) {
  return {
    webSearch: createExaSearchTool(exaApiKey),
    askClarification: createClarificationTool(),
  };
}

/**
 * Tools for advocate/cross-examiner agents (search only)
 */
export function createResearchTools(exaApiKey?: string) {
  return {
    webSearch: createExaSearchTool(exaApiKey),
  };
}
