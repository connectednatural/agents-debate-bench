/**
 * Advocate Agent API Route
 * Executes advocate agent for a single option with web research
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2
 */
import { streamText, stepCountIs } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { createResearchTools } from "@/lib/ai/tools";
import { ADVOCATE_SYSTEM_PROMPT, injectOption } from "@/lib/ai/prompts";
import { AdvocateRequestSchema } from "@/lib/types";
import {
  createValidationError,
  createMissingKeyError,
  errorResponse,
  handleAPIError,
} from "@/lib/utils";

// Allow longer execution for agent with tool calls
export const maxDuration = 60;

// Extended request schema to include API keys from client
const ExtendedAdvocateRequestSchema = AdvocateRequestSchema.extend({
  apiKey: z.string().optional(),
  exaApiKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parseResult = ExtendedAdvocateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(createValidationError(parseResult.error));
    }

    const { option, plan, sessionId, apiKey, exaApiKey } = parseResult.data;

    // Check for API keys
    const geminiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const exaKey = exaApiKey || process.env.EXA_API_KEY;

    if (!geminiKey) {
      return errorResponse(createMissingKeyError("Gemini"));
    }

    // Create tools for the advocate agent
    const tools = createResearchTools(exaKey);

    // Build the prompt with plan context
    const planContext = buildPlanContext(plan, option);
    const systemPrompt = injectOption(ADVOCATE_SYSTEM_PROMPT, option);

    // Use streamText for streaming response
    const result = streamText({
      model: getModel(geminiKey),
      system: systemPrompt,
      prompt: planContext,
      tools: {
        webSearch: tools.webSearch,
      },
      stopWhen: stepCountIs(10), // Allow multiple tool calls for thorough research
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (err) {
    return handleAPIError(err, "Advocate");
  }
}

/**
 * Build context prompt from comparison plan for the advocate
 */
function buildPlanContext(
  plan: z.infer<typeof AdvocateRequestSchema>["plan"],
  option: string
): string {
  const constraintsText = plan.constraints
    .map((c) => `- ${c.type}: ${c.description}${c.value ? ` (${c.value})` : ""}`)
    .join("\n");

  const axesText = plan.axes
    .map((a) => `- ${a.name} (weight: ${a.weight}/10): ${a.description}`)
    .join("\n");

  const otherOptions = plan.options.filter((o) => o !== option);

  return `## Comparison Context

You are advocating for: **${option}**

### Options Being Compared
${plan.options.map((o) => `- ${o}${o === option ? " (YOUR OPTION)" : ""}`).join("\n")}

### User Constraints
${constraintsText || "No specific constraints provided."}

### Comparison Axes (Evaluation Criteria)
${axesText}

### Your Task
Build the strongest possible case for ${option}. Research thoroughly using web search, address each comparison axis, explain how ${option} meets the user's constraints, and acknowledge any weaknesses honestly.

Remember to:
1. Use web search to find current, accurate information
2. Cite sources for every factual claim with URLs
3. Address ALL comparison axes listed above
4. Explain how ${option} handles the user's constraints
5. Be honest about weaknesses - this builds credibility
6. Compare against ${otherOptions.join(" and ")} where relevant

Format your response in clear markdown with sections for each axis.`;
}
