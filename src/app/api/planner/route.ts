/**
 * Planner Agent API Route
 * Receives user query, returns comparison plan with optional clarification questions
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1
 */
import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { createPlannerTools } from "@/lib/ai/tools";
import { PLANNER_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  PlannerRequestSchema,
  ComparisonPlanSchema,
  ClarificationQuestionSchema,
} from "@/lib/types";
import {
  createValidationError,
  createMissingKeyError,
  createAgentError,
  errorResponse,
  handleAPIError,
} from "@/lib/utils";

// Allow longer execution for agent with tool calls
export const maxDuration = 60;

// Extended request schema to include API keys from client
const ExtendedPlannerRequestSchema = PlannerRequestSchema.extend({
  apiKey: z.string().optional(),
  exaApiKey: z.string().optional(),
});

// Response schema for planner output
const PlannerOutputSchema = z.object({
  plan: ComparisonPlanSchema.optional(),
  clarifications: z.array(ClarificationQuestionSchema).optional(),
  needsClarification: z.boolean(),
});

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parseResult = ExtendedPlannerRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(createValidationError(parseResult.error));
    }

    const { query, clarifications, apiKey, exaApiKey } = parseResult.data;

    // Check for API keys
    const geminiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const exaKey = exaApiKey || process.env.EXA_API_KEY;

    if (!geminiKey) {
      return errorResponse(createMissingKeyError("Gemini"));
    }

    // Build the prompt with any clarification answers
    let prompt = query;
    if (clarifications && Object.keys(clarifications).length > 0) {
      const clarificationContext = Object.entries(clarifications)
        .map(([key, value]) => {
          const valueStr = Array.isArray(value) ? value.join(", ") : value;
          return `${key}: ${valueStr}`;
        })
        .join("\n");
      prompt = `${query}\n\nUser provided clarifications:\n${clarificationContext}`;
    }

    // Create tools for the planner agent
    const tools = createPlannerTools(exaKey);

    // First, try to generate a structured plan
    // Use generateText with Output.object for structured output
    const result = await generateText({
      model: getModel(geminiKey),
      system: PLANNER_SYSTEM_PROMPT,
      prompt,
      tools: {
        webSearch: tools.webSearch,
      },
      stopWhen: stepCountIs(5), // Allow multiple tool calls for research
      output: Output.object({
        schema: PlannerOutputSchema,
      }),
    });

    // Check if the output indicates clarification is needed
    const output = result.output;

    if (!output) {
      return errorResponse(createAgentError("The planner agent did not produce a valid output"));
    }

    // Return the plan or clarifications
    if (output.needsClarification && output.clarifications?.length) {
      return Response.json({
        clarifications: output.clarifications,
      });
    }

    if (output.plan) {
      // Validate the plan has required fields
      if (output.plan.options.length === 0) {
        return errorResponse(createAgentError("The planner could not identify comparison options"));
      }

      return Response.json({
        plan: output.plan,
      });
    }

    // Fallback error
    return errorResponse(createAgentError("The planner did not return a plan or clarification questions"));
  } catch (err) {
    return handleAPIError(err, "Planner");
  }
}
