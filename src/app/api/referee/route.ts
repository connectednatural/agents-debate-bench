/**
 * Referee Agent API Route
 * Synthesizes all arguments into final recommendation with scores, tradeoffs, and caveats
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.4
 */
import { streamText, stepCountIs } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { createResearchTools } from "@/lib/ai/tools";
import { REFEREE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  RefereeRequestSchema,
  type AdvocateResponse,
  type CrossExamineResponse,
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
const ExtendedRefereeRequestSchema = RefereeRequestSchema.extend({
  apiKey: z.string().optional(),
  exaApiKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parseResult = ExtendedRefereeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(createValidationError(parseResult.error));
    }

    const { plan, arguments: advocateArguments, crossExaminations, apiKey, exaApiKey } = parseResult.data;

    // Validate that we have all required inputs (Requirement 5.1)
    if (advocateArguments.length === 0) {
      return errorResponse(
        createAPIError(
          ErrorCode.INVALID_REQUEST,
          "No advocate arguments provided",
          "Referee requires advocate arguments to synthesize",
          false
        )
      );
    }

    if (crossExaminations.length === 0) {
      return errorResponse(
        createAPIError(
          ErrorCode.INVALID_REQUEST,
          "No cross-examinations provided",
          "Referee requires cross-examination results to synthesize",
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

    // Create tools for fact-checking disputes (Requirement 5.3)
    const tools = createResearchTools(exaKey);

    // Build the comprehensive context for the referee
    const refereeContext = buildRefereeContext(plan, advocateArguments, crossExaminations);

    // Use streamText for streaming response (Requirement 9.4)
    const result = streamText({
      model: getModel(geminiKey),
      system: REFEREE_SYSTEM_PROMPT,
      prompt: refereeContext,
      tools: {
        webSearch: tools.webSearch,
      },
      stopWhen: stepCountIs(8), // Allow tool calls for fact-checking disputes
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (err) {
    return handleAPIError(err, "Referee");
  }
}


/**
 * Build comprehensive context for the referee agent
 * Includes plan, all advocate arguments, and all cross-examinations
 */
function buildRefereeContext(
  plan: ComparisonPlan,
  advocateArguments: AdvocateResponse[],
  crossExaminations: CrossExamineResponse[]
): string {
  // Format constraints
  const constraintsText = plan.constraints
    .map((c) => `- **${c.type}**: ${c.description}${c.value ? ` (${c.value})` : ""}`)
    .join("\n");

  // Format comparison axes with weights
  const axesText = plan.axes
    .map((a) => `- **${a.name}** (weight: ${a.weight}/10): ${a.description}`)
    .join("\n");

  // Format all advocate arguments
  const argumentsText = advocateArguments
    .map((arg) => formatAdvocateArgument(arg))
    .join("\n\n---\n\n");

  // Format all cross-examinations
  const crossExamText = crossExaminations
    .map((ce) => formatCrossExamination(ce))
    .join("\n\n---\n\n");

  return `## Referee Synthesis Task

You are synthesizing a technical comparison debate. Review all evidence and provide a neutral, evidence-based recommendation.

---

## COMPARISON PLAN

**Options Being Compared:** ${plan.options.join(", ")}

### User Constraints
${constraintsText || "No specific constraints provided."}

### Comparison Axes (Evaluation Criteria)
${axesText}

---

## ADVOCATE ARGUMENTS

${argumentsText}

---

## CROSS-EXAMINATIONS

${crossExamText}

---

## YOUR SYNTHESIS TASK

Based on all the evidence above, provide:

### 1. Comparison Table
Create a comparison table scoring each option on each axis (1-10 scale).

Use this format:
_Table{Option:string,${plan.axes.map(a => `${a.name.replace(/\s+/g, '_')}:number`).join(',')}}
| Option | ${plan.axes.map(a => a.name).join(' | ')} |
${plan.options.map(opt => `| ${opt} | ${plan.axes.map(() => '[score]').join(' | ')} |`).join('\n')}

### 2. Score Visualization
For each axis, show scores:
_Score{${plan.axes[0]?.name || 'Performance'}:${plan.options.map((opt, i) => `${opt.replace(/\s+/g, '_')}=${5 + i}`).join(',')}}

### 3. Trade-off Analysis
Identify when each option is the better choice using conditional format:
- "If [condition], choose [option] because [reason]"

### 4. Recommendation
Based on the user's stated constraints, make a clear recommendation with:
- The recommended option
- Reasoning tied to user constraints
- Confidence level (high/medium/low)

### 5. Caveats
List conditions under which your recommendation would change.

## Important Guidelines
- Be neutral - weight evidence by quality, not quantity
- Resolve factual disputes - use web search if needed to verify contested claims
- Consider user constraints heavily in your recommendation
- Acknowledge uncertainty where it exists
- Use the custom rendering keys (_Table, _Score) for structured output`;
}

/**
 * Format an advocate's argument for the referee context
 */
function formatAdvocateArgument(arg: AdvocateResponse): string {
  const sourcesText = arg.sources.length > 0
    ? arg.sources.map((s) => `- [${s.title}](${s.url}): ${s.snippet.slice(0, 100)}...`).join("\n")
    : "No sources cited";

  const weaknessesText = arg.weaknesses.length > 0
    ? arg.weaknesses.map((w) => `- ${w}`).join("\n")
    : "No weaknesses acknowledged";

  return `### Advocate for ${arg.option}

**Main Argument:**
${arg.argument}

**Sources Cited:**
${sourcesText}

**Acknowledged Weaknesses:**
${weaknessesText}`;
}

/**
 * Format a cross-examination for the referee context
 */
function formatCrossExamination(ce: CrossExamineResponse): string {
  const challengesText = ce.challenges.length > 0
    ? ce.challenges.map((ch) => {
        let text = `**Target:** ${ch.targetOption}\n**Claim:** "${ch.claim}"\n**Critique:** ${ch.critique}`;
        if (ch.factCheck) {
          text += `\n**Fact-Check:** ${ch.factCheck.verdict} - ${ch.factCheck.evidence}`;
        }
        return text;
      }).join("\n\n")
    : "No challenges raised";

  return `### Cross-Examination by ${ce.option} Advocate

**Challenges to Opponents:**
${challengesText}

**Defense:**
${ce.defense}`;
}
