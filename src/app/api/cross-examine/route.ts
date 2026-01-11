/**
 * Cross-Examine Agent API Route
 * Executes cross-examination for a single advocate - challenges opponents and defends own option
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.3
 */
import { streamText, stepCountIs } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { createResearchTools } from "@/lib/ai/tools";
import { CROSS_EXAMINER_SYSTEM_PROMPT, injectOption } from "@/lib/ai/prompts";
import {
  CrossExamineRequestSchema,
  type AdvocateResponse,
  type ComparisonPlan,
} from "@/lib/types";
import {
  createValidationError,
  createMissingKeyError,
  createAPIError,
  ErrorCode,
  errorResponse,
  handleAPIError,
} from "@/lib/utils";

// Allow longer execution for agent with tool calls
export const maxDuration = 60;

// Extended request schema to include API keys from client
const ExtendedCrossExamineRequestSchema = CrossExamineRequestSchema.extend({
  apiKey: z.string().optional(),
  exaApiKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parseResult = ExtendedCrossExamineRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(createValidationError(parseResult.error));
    }

    const { option, ownArgument, opponentArguments, plan, apiKey, exaApiKey } = parseResult.data;

    // Validate that we have opponent arguments (Requirement 4.1)
    if (opponentArguments.length === 0) {
      return errorResponse(
        createAPIError(
          ErrorCode.INVALID_REQUEST,
          "No opponent arguments provided",
          "Cross-examination requires at least one opponent argument to challenge",
          false
        )
      );
    }

    // Check for API keys
    const geminiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const exaKey = exaApiKey || process.env.EXA_API_KEY;

    if (!geminiKey) {
      return errorResponse(createMissingKeyError("Gemini"));
    }

    // Create tools for fact-checking (Requirement 4.4)
    const tools = createResearchTools(exaKey);

    // Build the prompt with all arguments context
    const crossExamContext = buildCrossExamContext(plan, option, ownArgument, opponentArguments);
    const systemPrompt = injectOption(CROSS_EXAMINER_SYSTEM_PROMPT, option);

    // Use streamText for streaming response (Requirement 9.3)
    const result = streamText({
      model: getModel(geminiKey),
      system: systemPrompt,
      prompt: crossExamContext,
      tools: {
        webSearch: tools.webSearch,
      },
      stopWhen: stepCountIs(10), // Allow multiple tool calls for thorough fact-checking
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (err) {
    return handleAPIError(err, "Cross-Examine");
  }
}

/**
 * Build context prompt for cross-examination
 * Includes own argument and all opponent arguments for comprehensive analysis
 */
function buildCrossExamContext(
  plan: ComparisonPlan,
  option: string,
  ownArgument: AdvocateResponse,
  opponentArguments: AdvocateResponse[]
): string {
  const constraintsText = plan.constraints
    .map((c) => `- ${c.type}: ${c.description}${c.value ? ` (${c.value})` : ""}`)
    .join("\n");

  const axesText = plan.axes
    .map((a) => `- ${a.name} (weight: ${a.weight}/10): ${a.description}`)
    .join("\n");

  // Format own argument
  const ownArgumentText = formatAdvocateArgument(ownArgument);

  // Format opponent arguments
  const opponentArgumentsText = opponentArguments
    .map((arg) => formatAdvocateArgument(arg))
    .join("\n\n---\n\n");

  return `## Cross-Examination Context

You are cross-examining on behalf of: **${option}**

### Comparison Plan
**Options Being Compared:** ${plan.options.join(", ")}

**User Constraints:**
${constraintsText || "No specific constraints provided."}

**Comparison Axes:**
${axesText}

---

## YOUR ARGUMENT (for ${option})

${ownArgumentText}

---

## OPPONENT ARGUMENTS TO CHALLENGE

${opponentArgumentsText}

---

## Your Cross-Examination Task

1. **Challenge Weak Claims**: Review opponent arguments and identify claims that are:
   - Misleading or exaggerated
   - Outdated or no longer accurate
   - Missing important context
   - Unsupported by evidence

2. **Expose Omissions**: Point out important information opponents left out that would weaken their case

3. **Fact-Check**: Use web search to verify suspicious claims - provide evidence when claims are false or misleading

4. **Defend ${option}**: Counter any criticism of ${option} raised by opponents with evidence

## Output Format

Structure your response with:

### Challenges to Opponent Arguments

For each challenge:
- **Target**: [Option being challenged]
- **Claim**: "[Quote the specific claim]"
- **Issue**: [Why this is problematic]
- **Counter-Evidence**: [Your evidence with citations]

### Defense of ${option}

Address any criticisms raised against ${option} with evidence.

### Key Omissions

Important facts opponents conveniently left out.`;
}

/**
 * Format an advocate's argument for display in cross-examination context
 */
function formatAdvocateArgument(arg: AdvocateResponse): string {
  const sourcesText = arg.sources.length > 0
    ? arg.sources.map((s) => `- [${s.title}](${s.url})`).join("\n")
    : "No sources cited";

  const weaknessesText = arg.weaknesses.length > 0
    ? arg.weaknesses.map((w) => `- ${w}`).join("\n")
    : "No weaknesses acknowledged";

  return `### Advocate for ${arg.option}

**Argument:**
${arg.argument}

**Sources Cited:**
${sourcesText}

**Acknowledged Weaknesses:**
${weaknessesText}`;
}
