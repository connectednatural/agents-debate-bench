# Requirements Document

## Introduction

Tech Referee is a multi-agent AI system that helps users make informed technical decisions by orchestrating a structured debate between AI agents. The system uses a Planner agent to understand the comparison, Advocate agents to argue for each option, Cross-Examiner agents to critique opposing arguments, and a Referee agent to synthesize everything into actionable recommendations. Built with Next.js App Router, Vercel AI SDK, and Google Gemini.

## Glossary

- **Planner_Agent**: The first agent that receives user queries, identifies comparison options, extracts constraints, and creates a comparison plan
- **Advocate_Agent**: An agent assigned to argue FOR a specific technical option using web research and citations
- **Cross_Examiner_Agent**: The same Advocate agents in a second pass, critiquing opponent arguments
- **Referee_Agent**: The final agent that synthesizes all arguments into a comparison table and recommendation
- **Comparison_Session**: A single comparison workflow from user query to final recommendation
- **Comparison_Axis**: A dimension for evaluation (e.g., cost, performance, developer experience)
- **Exa_Search_Tool**: A custom AI SDK tool using exa-js for web search with `searchAndContents` API
- **Structured_Output**: Markdown output with custom keys for rendering (e.g., `_Table`, `_Poll`, `_Score`)
- **Settings_Store**: Zustand-based state management for user preferences and API keys
- **UI_Message**: AI SDK message format with parts array for text, tool calls, and custom UI components
- **generateText**: AI SDK function for non-streaming agent execution with tool support
- **streamText**: AI SDK function for streaming responses to the client

## Requirements

### Requirement 1: User Query Input

**User Story:** As a user, I want to submit a technical comparison query, so that I can get help deciding between options.

#### Acceptance Criteria

1. WHEN a user submits a query, THE System SHALL pass it to the Planner_Agent for analysis
2. WHEN the query is ambiguous or incomplete, THE Planner_Agent SHALL generate structured clarification questions
3. THE System SHALL display clarification questions as interactive poll components with predefined options
4. WHEN clarification questions are displayed, THE System SHALL include a custom text input field for user-provided answers
5. THE System SHALL support multi-select poll options where appropriate
6. WHEN the user answers clarification questions, THE System SHALL update the comparison plan accordingly

### Requirement 2: Planner Agent

**User Story:** As a user, I want the system to understand my comparison needs, so that the debate is focused on what matters to me.

#### Acceptance Criteria

1. WHEN the Planner_Agent receives a query, THE Planner_Agent SHALL identify the options being compared (max 3 options)
2. WHEN options cannot be identified, THE Planner_Agent SHALL generate a poll asking the user to specify options
3. THE Planner_Agent SHALL use Exa_Search_Tool to research and identify relevant options when needed
4. THE Planner_Agent SHALL extract user constraints (budget, scale, timeline, must-haves) from the query
5. THE Planner_Agent SHALL define comparison axes relevant to the query (cost, performance, DX, etc.)
6. THE Planner_Agent SHALL assign each option to an Advocate_Agent
7. THE Planner_Agent SHALL NOT make recommendations
8. THE Planner_Agent SHALL output a structured comparison plan in JSON format

### Requirement 3: Advocate Agents

**User Story:** As a user, I want each option to have a dedicated advocate, so that I hear the strongest case for each choice.

#### Acceptance Criteria

1. WHEN an Advocate_Agent is assigned an option, THE Advocate_Agent SHALL research that option using Exa_Search_Tool
2. THE Advocate_Agent SHALL build arguments addressing each comparison axis from the plan
3. THE Advocate_Agent SHALL address how their option meets user constraints
4. THE Advocate_Agent SHALL cite sources for every factual claim made using URL references
5. THE Advocate_Agent SHALL acknowledge weaknesses of their option honestly
6. THE Advocate_Agent SHALL NOT see other advocates' arguments during the initial advocacy phase
7. WHEN multiple Advocate_Agents run, THE System SHALL execute them in parallel (configurable parallelism 1-3)
8. THE Exa_Search_Tool SHALL use `searchAndContents` with `livecrawl: 'always'` for up-to-date results

### Requirement 4: Cross-Examination Phase

**User Story:** As a user, I want advocates to critique each other's arguments, so that weak claims are challenged.

#### Acceptance Criteria

1. WHEN the advocacy phase completes, THE System SHALL provide each advocate with opponent arguments
2. THE Cross_Examiner_Agent SHALL challenge weak or misleading claims from opponents
3. THE Cross_Examiner_Agent SHALL point out what opponents omitted
4. THE Cross_Examiner_Agent SHALL fact-check suspicious statements using Exa_Search_Tool
5. THE Cross_Examiner_Agent SHALL defend their own option against criticism
6. WHEN multiple Cross_Examiner_Agents run, THE System SHALL execute them in parallel

### Requirement 5: Referee Agent

**User Story:** As a user, I want a neutral synthesis of all arguments, so that I can make an informed decision.

#### Acceptance Criteria

1. WHEN cross-examination completes, THE Referee_Agent SHALL review all arguments and cross-examinations
2. THE Referee_Agent SHALL score each option on each comparison axis
3. THE Referee_Agent SHALL resolve factual disputes using Exa_Search_Tool if needed
4. THE Referee_Agent SHALL identify trade-offs in conditional format ("if X matters, choose A")
5. THE Referee_Agent SHALL make a recommendation based on user's stated constraints
6. THE Referee_Agent SHALL add caveats for when the recommendation would change
7. THE Referee_Agent SHALL output structured markdown with custom rendering keys

### Requirement 6: Structured Output Rendering

**User Story:** As a user, I want the comparison results displayed in a clean, readable format, so that I can easily understand the trade-offs.

#### Acceptance Criteria

1. THE System SHALL parse markdown output from agents for custom rendering keys
2. WHEN output contains `_Table{columns}`, THE System SHALL render a styled comparison table component
3. WHEN output contains `_Poll{options}`, THE System SHALL render an interactive poll component
4. WHEN output contains `_Score{axis,scores}`, THE System SHALL render a visual score comparison
5. THE System SHALL render standard markdown (headers, lists, code blocks) with appropriate styling
6. THE System SHALL support streaming display of agent outputs as they generate

### Requirement 7: Settings Management

**User Story:** As a user, I want to configure API keys and model preferences, so that I can use my own credentials and preferred models.

#### Acceptance Criteria

1. THE System SHALL provide a settings UI for configuring Gemini API key
2. THE System SHALL provide a settings UI for configuring Exa API key
3. THE System SHALL allow users to change the default model (default: gemini-3-flash-preview)
4. THE System SHALL allow users to configure maximum parallel agent execution (1-3)
5. THE System SHALL persist settings using Zustand with localStorage
6. IF API keys are not configured, THEN THE System SHALL prompt the user to add them before starting a comparison
7. THE System SHALL read API keys from environment variables as fallback (GOOGLE_GENERATIVE_AI_API_KEY, EXA_API_KEY)

### Requirement 8: Comparison Session Management

**User Story:** As a user, I want to view my comparison history, so that I can reference past decisions.

#### Acceptance Criteria

1. THE System SHALL save each Comparison_Session to local state
2. THE System SHALL display a list of past comparisons in a sidebar or history view
3. WHEN a user selects a past comparison, THE System SHALL display the full results
4. THE System SHALL allow users to delete past comparisons
5. THE System SHALL persist comparison history using Zustand with localStorage

### Requirement 9: API Route Architecture

**User Story:** As a developer, I want separate API routes for each agent phase, so that the UI can show progress and handle errors gracefully.

#### Acceptance Criteria

1. THE System SHALL expose `/api/planner` route for the Planner_Agent
2. THE System SHALL expose `/api/advocate` route for Advocate_Agent execution
3. THE System SHALL expose `/api/cross-examine` route for Cross_Examiner_Agent execution
4. THE System SHALL expose `/api/referee` route for Referee_Agent execution
5. WHEN an API route fails, THE System SHALL return structured error responses
6. THE System SHALL support streaming responses from all agent routes

### Requirement 10: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can take corrective action.

#### Acceptance Criteria

1. IF an agent fails during execution, THEN THE System SHALL display a user-friendly error message
2. IF Exa_Search fails, THEN THE Advocate_Agent SHALL continue with available information and note the limitation
3. IF API keys are invalid, THEN THE System SHALL prompt the user to update settings
4. THE System SHALL implement retry logic for transient API failures (max 2 retries)
5. WHEN a comparison cannot be completed, THE System SHALL preserve partial results

### Requirement 11: Dependencies and Setup

**User Story:** As a developer, I want clear dependency requirements, so that I can set up the project correctly.

#### Acceptance Criteria

1. THE System SHALL use `ai` package from Vercel AI SDK for agent orchestration
2. THE System SHALL use `@ai-sdk/google` package for Gemini model integration
3. THE System SHALL use `exa-js` package for Exa Search API integration
4. THE System SHALL use `zustand` package for state management
5. THE System SHALL use `zod` package for schema validation
6. THE System SHALL use `react-markdown` and `marked` packages for memoized markdown rendering
7. THE System SHALL be built with Next.js App Router architecture
8. WHEN implementing features, THE Developer SHALL reference Context7 documentation for AI SDK (`/vercel/ai`) and Next.js (`/vercel/next.js`) patterns
