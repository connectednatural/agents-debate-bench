# Implementation Plan: Tech Referee

## Overview

This implementation plan builds the Tech Referee multi-agent comparison system incrementally. We start with core infrastructure (types, stores, AI provider), then build each agent phase sequentially, followed by UI components and finally integration testing.

use context7 search for the ai-sdk docs "/vercel/ai" for docs.

## Tasks

- [x] 1. Project Setup and Dependencies

  - Install required packages: `ai`, `@ai-sdk/google`, `exa-js`, `zustand`, `zod`, `react-markdown`, `marked`, `fast-check`
  - Configure TypeScript paths and project structure
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 2. Core Types and Schemas

  - [x] 2.1 Create Zod schemas for all data models
    - Define ComparisonPlan, Constraint, ComparisonAxis, AdvocateAssignment schemas
    - Define API request/response schemas for all routes
    - Define ClarificationQuestion, Source, Challenge, FactCheckResult schemas
    - _Requirements: 2.8, 9.5_
  - [ ]\* 2.2 Write property test for schema validation round-trip
    - **Property 4: Plan Output Validity** - Verify schema accepts valid plans and rejects invalid ones
    - **Validates: Requirements 2.1, 2.4, 2.5, 2.6, 2.7, 2.8**

- [x] 3. State Management Stores

  - [x] 3.1 Implement Settings Store with Zustand
    - Create store with geminiApiKey, exaApiKey, model, maxParallelism
    - Add localStorage persistence middleware
    - Implement hasRequiredKeys() helper
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_
  - [x] 3.2 Implement Session Store with Zustand
    - Create store with sessions array and CRUD operations
    - Add localStorage persistence middleware
    - Implement session status tracking
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]\* 3.3 Write property test for session store round-trip
    - **Property 11: Session Store Round-Trip**
    - **Validates: Requirements 8.1, 8.3**

- [x] 4. AI Provider and Tools

  - [x] 4.1 Create Google provider factory
    - Implement getGoogleProvider() with dynamic API key
    - Implement getModel() with configurable model ID
    - _Requirements: 7.3, 11.2_
  - [x] 4.2 Create Exa Search tool
    - Implement createExaSearchTool() with dynamic API key
    - Configure searchAndContents with livecrawl: 'always'
    - _Requirements: 3.8, 11.3_
  - [x] 4.3 Create agent system prompts
    - Define PLANNER_SYSTEM_PROMPT
    - Define ADVOCATE_SYSTEM_PROMPT with {option} placeholder
    - Define CROSS_EXAMINER_SYSTEM_PROMPT with {option} placeholder
    - Define REFEREE_SYSTEM_PROMPT
    - _Requirements: 2.7, 3.4, 3.5, 5.4, 5.6_

- [x] 5. Checkpoint - Core Infrastructure

  - Ensure all stores work correctly
  - Verify AI provider connects to Gemini
  - Test Exa Search tool manually

- [x] 6. Planner Agent API Route

  - [x] 6.1 Implement /api/planner route
    - Parse request with Zod validation
    - Use generateText with Output.object for structured plan
    - Handle clarification question generation
    - Return streaming response
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1_
  - [ ]\* 6.2 Write property test for planner output validity
    - **Property 4: Plan Output Validity**
    - **Validates: Requirements 2.1, 2.4, 2.5, 2.6, 2.7, 2.8**
  - [ ]\* 6.3 Write property test for ambiguous query handling
    - **Property 2: Ambiguous Query Handling**
    - **Validates: Requirements 1.2, 2.2**

- [x] 7. Advocate Agent API Route

  - [x] 7.1 Implement /api/advocate route
    - Parse request with plan and option
    - Use streamText with Exa Search tool
    - Format response with citations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2_
  - [ ]\* 7.2 Write property test for advocate output completeness
    - **Property 5: Advocate Output Completeness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

- [x] 8. Cross-Examine Agent API Route

  - [x] 8.1 Implement /api/cross-examine route
    - Parse request with own argument and opponent arguments
    - Use streamText with Exa Search tool for fact-checking
    - Generate challenges and defense
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.3_
  - [ ]\* 8.2 Write property test for cross-exam input validity
    - **Property 6: Cross-Exam Input Validity**
    - **Validates: Requirements 4.1**
  - [ ]\* 8.3 Write property test for cross-exam output completeness
    - **Property 7: Cross-Exam Output Completeness**
    - **Validates: Requirements 4.2, 4.3, 4.5**

- [x] 9. Referee Agent API Route

  - [x] 9.1 Implement /api/referee route
    - Parse request with plan, arguments, and cross-examinations
    - Use streamText with structured output formatting
    - Generate scores, tradeoffs, recommendation, caveats
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.4_
  - [ ]\* 9.2 Write property test for referee input validity
    - **Property 8: Referee Input Validity**
    - **Validates: Requirements 5.1**
  - [ ]\* 9.3 Write property test for referee output completeness
    - **Property 9: Referee Output Completeness**
    - **Validates: Requirements 5.2, 5.4, 5.5, 5.6, 5.7**

- [x] 10. Checkpoint - All API Routes

  - Ensure all routes return valid responses
  - Test error handling for missing API keys
  - Verify streaming works correctly

- [x] 11. Markdown Parser for Custom Keys

  - [x] 11.1 Implement custom key parser
    - Parse \_Table{columns} syntax
    - Parse \_Poll{options} syntax
    - Parse \_Score{axis,scores} syntax
    - Return parsed blocks with type information
    - _Requirements: 6.1_
  - [ ]\* 11.2 Write property test for markdown parsing
    - **Property 10: Markdown Custom Key Parsing**
    - **Validates: Requirements 6.1**

- [x] 12. UI Components - Rendering

  - [x] 12.1 Implement MemoizedMarkdown component
    - Use react-markdown with marked for block parsing
    - Integrate custom key rendering
    - Optimize with React.memo for streaming
    - _Requirements: 6.5, 6.6_
  - [x] 12.2 Implement ComparisonTable component
    - Render styled table from \_Table data
    - Support string, number, boolean column types
    - _Requirements: 6.2_
  - [x] 12.3 Implement ScoreChart component
    - Render visual score comparison from \_Score data
    - Display scores for all options on each axis
    - _Requirements: 6.4_
  - [x] 12.4 Implement PollComponent
    - Render single-select and multi-select polls
    - Include custom text input option
    - Handle answer submission
    - _Requirements: 1.3, 1.4, 1.5, 6.3_

- [x] 13. UI Components - Chat Interface

  - [x] 13.1 Implement ComparisonChat component
    - Manage chat state and phase transitions
    - Use useChat with DefaultChatTransport
    - Orchestrate multi-agent flow
    - _Requirements: 1.1, 1.6, 3.7, 4.6_
  - [x] 13.2 Implement parallel agent execution
    - Execute advocates in parallel based on maxParallelism setting
    - Execute cross-examiners in parallel
    - Collect and merge results
    - _Requirements: 3.7, 4.6, 7.4_
  - [x] 13.3 Implement Settings UI
    - Create settings modal/panel
    - Add API key input fields
    - Add model selector dropdown
    - Add parallelism slider
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_
  - [x] 13.4 Implement Session History sidebar
    - Display list of past comparisons
    - Allow selecting and viewing past sessions
    - Allow deleting sessions
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 14. Error Handling

  - [x] 14.1 Implement API error responses
    - Create APIError type with error codes
    - Add Zod validation error formatting
    - _Requirements: 9.5, 10.1_
  - [x] 14.2 Implement retry logic
    - Create withRetry utility function
    - Configure exponential backoff
    - _Requirements: 10.4_
  - [x] 14.3 Implement graceful degradation
    - Handle Exa Search failures
    - Preserve partial results on error
    - _Requirements: 10.2, 10.5_
  - [x] 14.4 Implement API key validation UI
    - Show error when keys missing
    - Prompt to settings on invalid keys
    - _Requirements: 7.6, 10.3_

- [ ] 15. Checkpoint - Full Application

  - Test complete comparison flow end-to-end
  - Verify all UI components render correctly
  - Test error scenarios

- [ ] 16. Component Tests

  - [ ]\* 16.1 Write tests for PollComponent
    - Test single-select behavior
    - Test multi-select behavior
    - Test custom input
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ]\* 16.2 Write tests for MemoizedMarkdown
    - Test standard markdown rendering
    - Test custom key rendering
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - [ ]\* 16.3 Write tests for Settings UI
    - Test API key input
    - Test persistence
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 17. Integration Tests

  - [ ]\* 17.1 Write integration test for full comparison flow
    - Mock API responses
    - Test Query → Plan → Advocates → Cross-Exam → Referee
    - _Requirements: 1.1, 9.1, 9.2, 9.3, 9.4_
  - [ ]\* 17.2 Write integration test for error recovery
    - Test API key missing scenario
    - Test partial result preservation
    - _Requirements: 10.1, 10.3, 10.5_

- [ ] 18. Final Checkpoint
  - Run all tests
  - Verify all requirements are met
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use `bun test` for running tests
- Use `bun add` for installing packages
