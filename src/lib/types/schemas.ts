/**
 * Zod Schemas and TypeScript Types
 * Core data models for the Tech Referee system
 */
import { z } from "zod";

// Constraint extracted from user query
export const ConstraintSchema = z.object({
  type: z.enum([
    "budget",
    "scale",
    "timeline",
    "must-have",
    "nice-to-have",
    "avoid",
  ]),
  description: z.string(),
  value: z.string().optional(),
});

export type Constraint = z.infer<typeof ConstraintSchema>;

// Comparison dimension
export const ComparisonAxisSchema = z.object({
  name: z.string(),
  description: z.string(),
  weight: z.number().min(1).max(10),
});

export type ComparisonAxis = z.infer<typeof ComparisonAxisSchema>;

// Advocate assignment
export const AdvocateAssignmentSchema = z.object({
  option: z.string(),
  advocateId: z.string(),
});

export type AdvocateAssignment = z.infer<typeof AdvocateAssignmentSchema>;

// Comparison plan from Planner agent
export const ComparisonPlanSchema = z.object({
  options: z.array(z.string()).max(3),
  constraints: z.array(ConstraintSchema),
  axes: z.array(ComparisonAxisSchema),
  assignments: z.array(AdvocateAssignmentSchema),
});

export type ComparisonPlan = z.infer<typeof ComparisonPlanSchema>;

// Clarification question for ambiguous queries
export const ClarificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["single", "multi", "text"]),
  options: z.array(z.string()).optional(),
  allowCustom: z.boolean(),
});

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

// Source citation
export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  publishedDate: z.string().optional(),
});

export type Source = z.infer<typeof SourceSchema>;

// Exa search result (raw from API)
export const ExaSearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  content: z.string(),
  publishedDate: z.string().optional(),
});

export type ExaSearchResult = z.infer<typeof ExaSearchResultSchema>;

// Challenge in cross-examination
export const FactCheckResultSchema = z.object({
  claim: z.string(),
  verdict: z.enum(["confirmed", "disputed", "unverifiable"]),
  evidence: z.string(),
  sources: z.array(SourceSchema),
});

export type FactCheckResult = z.infer<typeof FactCheckResultSchema>;

export const ChallengeSchema = z.object({
  targetOption: z.string(),
  claim: z.string(),
  critique: z.string(),
  factCheck: FactCheckResultSchema.optional(),
});

export type Challenge = z.infer<typeof ChallengeSchema>;

// Axis score for referee output
export const AxisScoreSchema = z.object({
  axis: z.string(),
  scores: z.record(z.string(), z.number().min(1).max(10)),
});

export type AxisScore = z.infer<typeof AxisScoreSchema>;

// Tradeoff statement
export const TradeoffSchema = z.object({
  condition: z.string(),
  recommendation: z.string(),
});

export type Tradeoff = z.infer<typeof TradeoffSchema>;

// Recommendation from referee
export const RecommendationSchema = z.object({
  option: z.string(),
  reasoning: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// Table column for _Table rendering
export const TableColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean"]),
});

export type TableColumn = z.infer<typeof TableColumnSchema>;

// Table row for _Table rendering
export const TableRowSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()])
);

export type TableRow = z.infer<typeof TableRowSchema>;

// Session status
export const SessionStatusSchema = z.enum([
  "pending",
  "planning",
  "advocating",
  "cross-examining",
  "refereeing",
  "complete",
  "error",
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// Advocate response
export const AdvocateResponseSchema = z.object({
  option: z.string(),
  argument: z.string(),
  sources: z.array(SourceSchema),
  weaknesses: z.array(z.string()),
  error: z.string().optional(),
});

export type AdvocateResponse = z.infer<typeof AdvocateResponseSchema>;

// Cross-examine response
export const CrossExamineResponseSchema = z.object({
  option: z.string(),
  challenges: z.array(ChallengeSchema),
  defense: z.string(),
  error: z.string().optional(),
});

export type CrossExamineResponse = z.infer<typeof CrossExamineResponseSchema>;

// Referee response
export const RefereeResponseSchema = z.object({
  summary: z.string(),
  scores: z.array(AxisScoreSchema),
  tradeoffs: z.array(TradeoffSchema),
  recommendation: RecommendationSchema,
  caveats: z.array(z.string()),
  error: z.string().optional(),
});

export type RefereeResponse = z.infer<typeof RefereeResponseSchema>;

// Transcript entry for storing conversation history
export const TranscriptEntrySchema = z.object({
  id: z.string(),
  timestamp: z.coerce.date(),
  type: z.enum([
    "user_query",
    "clarification_question",
    "clarification_answer",
    "planning_result",
    "advocate_argument",
    "cross_examination",
    "referee_verdict",
    "system_message",
    "error",
  ]),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

// Full transcript of a comparison session
export const TranscriptSchema = z.object({
  entries: z.array(TranscriptEntrySchema),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

export type Transcript = z.infer<typeof TranscriptSchema>;

// Comparison session
export const ComparisonSessionSchema = z.object({
  id: z.string(),
  query: z.string(),
  createdAt: z.coerce.date(),
  status: SessionStatusSchema,
  plan: ComparisonPlanSchema.optional(),
  arguments: z.array(AdvocateResponseSchema).optional(),
  crossExaminations: z.array(CrossExamineResponseSchema).optional(),
  result: RefereeResponseSchema.optional(),
  transcript: TranscriptSchema.optional(),
  error: z.string().optional(),
});

export type ComparisonSession = z.infer<typeof ComparisonSessionSchema>;

// API Request/Response schemas
export const PlannerRequestSchema = z.object({
  query: z.string().min(1),
  clarifications: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
});

export type PlannerRequest = z.infer<typeof PlannerRequestSchema>;

export const PlannerResponseSchema = z.object({
  plan: ComparisonPlanSchema.optional(),
  clarifications: z.array(ClarificationQuestionSchema).optional(),
  error: z.string().optional(),
});

export type PlannerResponse = z.infer<typeof PlannerResponseSchema>;

export const AdvocateRequestSchema = z.object({
  option: z.string(),
  plan: ComparisonPlanSchema,
  sessionId: z.string(),
});

export type AdvocateRequest = z.infer<typeof AdvocateRequestSchema>;

export const CrossExamineRequestSchema = z.object({
  option: z.string(),
  ownArgument: AdvocateResponseSchema,
  opponentArguments: z.array(AdvocateResponseSchema),
  plan: ComparisonPlanSchema,
  sessionId: z.string(),
});

export type CrossExamineRequest = z.infer<typeof CrossExamineRequestSchema>;

export const RefereeRequestSchema = z.object({
  plan: ComparisonPlanSchema,
  arguments: z.array(AdvocateResponseSchema),
  crossExaminations: z.array(CrossExamineResponseSchema),
  sessionId: z.string(),
});

export type RefereeRequest = z.infer<typeof RefereeRequestSchema>;

// API Error response
export const APIErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    "INVALID_REQUEST",
    "API_KEY_MISSING",
    "API_KEY_INVALID",
    "RATE_LIMITED",
    "AGENT_FAILED",
    "SEARCH_FAILED",
  ]),
  details: z.string().optional(),
  retryable: z.boolean(),
});

export type APIError = z.infer<typeof APIErrorSchema>;

// Exa Search tool input schema
export const ExaSearchInputSchema = z.object({
  query: z.string().min(1).max(100).describe("The search query"),
});

export type ExaSearchInput = z.infer<typeof ExaSearchInputSchema>;

// Settings store schema
export const SettingsSchema = z.object({
  geminiApiKey: z.string(),
  exaApiKey: z.string(),
  model: z.string().default("gemini-3-flash-preview"),
  maxParallelism: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
});

export type Settings = z.infer<typeof SettingsSchema>;
