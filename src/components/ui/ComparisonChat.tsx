"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/lib/stores/session";
import { useSettingsStore } from "@/lib/stores/settings";
import { MemoizedMarkdown } from "./MemoizedMarkdown";
import { PollComponent } from "./PollComponent";
import type {
  ComparisonPlan,
  ClarificationQuestion,
  AdvocateResponse,
  CrossExamineResponse,
  RefereeResponse,
  APIError,
} from "@/lib/types";

export type ChatPhase =
  | "input"
  | "planning"
  | "clarifying"
  | "advocating"
  | "cross-examining"
  | "refereeing"
  | "complete"
  | "error";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  phase?: ChatPhase;
  data?: unknown;
}

export interface ComparisonChatProps {
  sessionId?: string;
  onPhaseChange?: (phase: ChatPhase) => void;
  onOpenSettings?: () => void;
}

/**
 * Phase indicator component showing current progress
 */
const PhaseIndicator = memo(function PhaseIndicator({
  phase,
}: {
  phase: ChatPhase;
}) {
  const phases: { key: ChatPhase; label: string }[] = [
    { key: "planning", label: "Planning" },
    { key: "advocating", label: "Advocating" },
    { key: "cross-examining", label: "Cross-Examining" },
    { key: "refereeing", label: "Refereeing" },
  ];

  const currentIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg mb-4">
      {phases.map((p, index) => (
        <div key={p.key} className="flex items-center">
          <div
            className={`
              flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
              ${
                index < currentIndex
                  ? "bg-green-500 text-white"
                  : index === currentIndex
                  ? "bg-blue-500 text-white animate-pulse"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
              }
            `}
          >
            {index < currentIndex ? "✓" : index + 1}
          </div>
          <span
            className={`ml-2 text-sm ${
              index <= currentIndex
                ? "text-zinc-800 dark:text-zinc-200"
                : "text-zinc-400"
            }`}
          >
            {p.label}
          </span>
          {index < phases.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-2 ${
                index < currentIndex
                  ? "bg-green-500"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * Message bubble component
 */
const MessageBubble = memo(function MessageBubble({
  message,
  onPollAnswer,
}: {
  message: ChatMessage;
  onPollAnswer?: (questionId: string, answer: string | string[]) => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3
          ${
            isUser
              ? "bg-blue-500 text-white"
              : isSystem
              ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              : "bg-zinc-100 dark:bg-zinc-800"
          }
        `}
      >
        {message.phase && !isUser && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide">
            {message.phase}
          </div>
        )}
        <MemoizedMarkdown
          content={message.content}
          id={message.id}
          onPollAnswer={onPollAnswer}
        />
      </div>
    </div>
  );
});


/**
 * Loading indicator for streaming responses
 */
const StreamingIndicator = memo(function StreamingIndicator({
  phase,
}: {
  phase: ChatPhase;
}) {
  const phaseLabels: Record<ChatPhase, string> = {
    input: "Ready",
    planning: "Planning comparison...",
    clarifying: "Waiting for your input...",
    advocating: "Advocates researching...",
    "cross-examining": "Cross-examining arguments...",
    refereeing: "Synthesizing results...",
    complete: "Complete",
    error: "Error occurred",
  };

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span>{phaseLabels[phase]}</span>
    </div>
  );
});

/**
 * Input form for user queries
 */
const QueryInput = memo(function QueryInput({
  onSubmit,
  disabled,
  placeholder = "Compare technologies... (e.g., 'React vs Vue vs Angular for a startup')",
}: {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSubmit(query.trim());
      setQuery("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700
          bg-white dark:bg-zinc-900 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      />
      <button
        type="submit"
        disabled={disabled || !query.trim()}
        className={`
          px-6 py-3 rounded-xl font-medium text-sm transition-colors
          ${
            !disabled && query.trim()
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
          }
        `}
      >
        Compare
      </button>
    </form>
  );
});

/**
 * Clarification questions display
 */
const ClarificationSection = memo(function ClarificationSection({
  questions,
  onAnswer,
}: {
  questions: ClarificationQuestion[];
  onAnswer: (questionId: string, answer: string | string[]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        I need a bit more information to create a good comparison:
      </p>
      {questions.map((q) => (
        <PollComponent key={q.id} question={q} onAnswer={(answer) => onAnswer(q.id, answer)} />
      ))}
    </div>
  );
});

/**
 * Error display component with API key validation support
 * Requirements: 7.6, 10.1, 10.3
 */
const ErrorDisplay = memo(function ErrorDisplay({
  error,
  onRetry,
  onOpenSettings,
}: {
  error: APIError | string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}) {
  const errorMessage = typeof error === "string" ? error : error.error;
  const errorDetails = typeof error === "string" ? undefined : error.details;
  const errorCode = typeof error === "string" ? undefined : error.code;
  const isRetryable = typeof error === "string" ? true : error.retryable;
  
  // Check if this is an API key related error
  const isApiKeyError = errorCode === "API_KEY_MISSING" || errorCode === "API_KEY_INVALID";

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-xl">⚠️</span>
        <div className="flex-1">
          <p className="font-medium text-red-700 dark:text-red-300">{errorMessage}</p>
          {errorDetails && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorDetails}</p>
          )}
          <div className="flex gap-2 mt-3">
            {isApiKeyError && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Open Settings
              </button>
            )}
            {isRetryable && onRetry && !isApiKeyError && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


/**
 * ComparisonChat Component
 * 
 * Main chat interface managing the comparison flow through all phases:
 * 1. Input - User submits comparison query
 * 2. Planning - Planner agent creates comparison plan
 * 3. Clarifying - Optional clarification questions
 * 4. Advocating - Advocate agents research and argue for each option
 * 5. Cross-examining - Advocates challenge opponent arguments
 * 6. Refereeing - Referee synthesizes final recommendation
 * 7. Complete - Results displayed
 * 
 * Requirements: 1.1, 1.6, 3.7, 4.6
 */
export const ComparisonChat = memo(function ComparisonChat({
  sessionId: initialSessionId,
  onPhaseChange,
  onOpenSettings,
}: ComparisonChatProps) {
  // Stores
  const { geminiApiKey, exaApiKey, maxParallelism } = useSettingsStore();
  const { createSession, updateSession, getSession, setCurrentSession } = useSessionStore();

  // Local state
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [phase, setPhase] = useState<ChatPhase>("input");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  
  // Comparison state
  const [plan, setPlan] = useState<ComparisonPlan | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string | string[]>>({});
  const [advocateResponses, setAdvocateResponses] = useState<AdvocateResponse[]>([]);
  const [crossExamResponses, setCrossExamResponses] = useState<CrossExamineResponse[]>([]);
  const [refereeResponse, setRefereeResponse] = useState<RefereeResponse | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // Load existing session if provided
  useEffect(() => {
    if (initialSessionId) {
      const session = getSession(initialSessionId);
      if (session) {
        setSessionId(initialSessionId);
        setCurrentSession(initialSessionId);
        
        // Restore session state
        if (session.plan) setPlan(session.plan);
        if (session.arguments) setAdvocateResponses(session.arguments);
        if (session.crossExaminations) setCrossExamResponses(session.crossExaminations);
        if (session.result) setRefereeResponse(session.result);
        
        // Set phase based on session status
        if (session.status === "complete") {
          setPhase("complete");
          // Reconstruct messages from session data
          const reconstructedMessages: ChatMessage[] = [
            { id: "user-query", role: "user", content: session.query },
          ];
          if (session.result) {
            reconstructedMessages.push({
              id: "referee-result",
              role: "assistant",
              content: session.result.summary,
              phase: "refereeing",
            });
          }
          setMessages(reconstructedMessages);
        } else if (session.status === "error") {
          setPhase("error");
          setError(session.error || "Unknown error");
        }
      }
    }
  }, [initialSessionId, getSession, setCurrentSession]);

  /**
   * Add a message to the chat
   */
  const addMessage = useCallback((message: Omit<ChatMessage, "id">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  /**
   * Update a message by ID
   */
  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    );
  }, []);

  /**
   * Handle API errors
   */
  const handleError = useCallback((err: unknown, context: string) => {
    console.error(`${context} error:`, err);
    
    let apiError: APIError;
    if (err && typeof err === "object" && "code" in err) {
      apiError = err as APIError;
    } else {
      apiError = {
        error: err instanceof Error ? err.message : "Unknown error",
        code: "AGENT_FAILED",
        details: context,
        retryable: true,
      };
    }
    
    setError(apiError);
    setPhase("error");
    setIsLoading(false);
    
    // Use markSessionError to preserve partial results (Requirement 10.5)
    if (sessionId) {
      const { markSessionError } = useSessionStore.getState();
      markSessionError(sessionId, apiError.error);
    }
  }, [sessionId]);

  /**
   * Call planner API
   */
  const callPlanner = useCallback(async (query: string, clarificationAnswers?: Record<string, string | string[]>) => {
    setPhase("planning");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          clarifications: clarificationAnswers,
          apiKey: geminiApiKey || undefined,
          exaApiKey: exaApiKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data as APIError;
      }

      // Check if clarifications are needed
      if (data.clarifications && data.clarifications.length > 0) {
        setClarifications(data.clarifications);
        setPhase("clarifying");
        addMessage({
          role: "assistant",
          content: "I need some clarification to create a better comparison.",
          phase: "clarifying",
        });
      } else if (data.plan) {
        setPlan(data.plan);
        if (sessionId) {
          updateSession(sessionId, { plan: data.plan, status: "advocating" });
        }
        addMessage({
          role: "assistant",
          content: `Great! I'll compare **${data.plan.options.join("**, **")}** across ${data.plan.axes.length} dimensions. Starting the debate...`,
          phase: "planning",
        });
        // Proceed to advocacy phase
        await runAdvocates(data.plan);
      }
    } catch (err) {
      handleError(err, "Planner");
    } finally {
      setIsLoading(false);
    }
  }, [geminiApiKey, exaApiKey, sessionId, addMessage, updateSession, handleError]);


  /**
   * Run advocate agents in parallel
   */
  const runAdvocates = useCallback(async (comparisonPlan: ComparisonPlan) => {
    setPhase("advocating");
    setIsLoading(true);
    
    if (sessionId) {
      updateSession(sessionId, { status: "advocating" });
    }

    const responses: AdvocateResponse[] = [];
    const options = comparisonPlan.options;

    // Execute advocates in parallel batches based on maxParallelism
    for (let i = 0; i < options.length; i += maxParallelism) {
      const batch = options.slice(i, i + maxParallelism);
      
      const batchPromises = batch.map(async (option) => {
        const msgId = addMessage({
          role: "assistant",
          content: `🔍 Researching **${option}**...`,
          phase: "advocating",
        });

        try {
          const response = await fetch("/api/advocate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              option,
              plan: comparisonPlan,
              sessionId: sessionId || "temp",
              apiKey: geminiApiKey || undefined,
              exaApiKey: exaApiKey || undefined,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw errorData as APIError;
          }

          // Stream the response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;
              updateMessage(msgId, `## Advocate for ${option}\n\n${fullContent}`);
            }
          }

          const advocateResponse: AdvocateResponse = {
            option,
            argument: fullContent,
            sources: [], // Sources are embedded in the markdown
            weaknesses: [],
          };

          responses.push(advocateResponse);
          return advocateResponse;
        } catch (err) {
          console.error(`Advocate error for ${option}:`, err);
          updateMessage(msgId, `⚠️ Error researching ${option}: ${err instanceof Error ? err.message : "Unknown error"}`);
          
          // Return partial response
          const partialResponse: AdvocateResponse = {
            option,
            argument: `Error: Could not complete research for ${option}`,
            sources: [],
            weaknesses: [],
            error: err instanceof Error ? err.message : "Unknown error",
          };
          responses.push(partialResponse);
          return partialResponse;
        }
      });

      await Promise.all(batchPromises);
    }

    setAdvocateResponses(responses);
    
    if (sessionId) {
      updateSession(sessionId, { arguments: responses });
    }

    // Proceed to cross-examination
    await runCrossExaminers(comparisonPlan, responses);
  }, [sessionId, maxParallelism, geminiApiKey, exaApiKey, addMessage, updateMessage, updateSession]);

  /**
   * Run cross-examiner agents in parallel
   */
  const runCrossExaminers = useCallback(async (
    comparisonPlan: ComparisonPlan,
    advocateArgs: AdvocateResponse[]
  ) => {
    setPhase("cross-examining");
    
    if (sessionId) {
      updateSession(sessionId, { status: "cross-examining" });
    }

    const responses: CrossExamineResponse[] = [];

    // Execute cross-examiners in parallel batches
    for (let i = 0; i < advocateArgs.length; i += maxParallelism) {
      const batch = advocateArgs.slice(i, i + maxParallelism);
      
      const batchPromises = batch.map(async (ownArg) => {
        const opponentArgs = advocateArgs.filter((a) => a.option !== ownArg.option);
        
        const msgId = addMessage({
          role: "assistant",
          content: `⚔️ **${ownArg.option}** advocate is cross-examining opponents...`,
          phase: "cross-examining",
        });

        try {
          const response = await fetch("/api/cross-examine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              option: ownArg.option,
              ownArgument: ownArg,
              opponentArguments: opponentArgs,
              plan: comparisonPlan,
              sessionId: sessionId || "temp",
              apiKey: geminiApiKey || undefined,
              exaApiKey: exaApiKey || undefined,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw errorData as APIError;
          }

          // Stream the response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;
              updateMessage(msgId, `## Cross-Examination by ${ownArg.option}\n\n${fullContent}`);
            }
          }

          const crossExamResponse: CrossExamineResponse = {
            option: ownArg.option,
            challenges: [],
            defense: fullContent,
          };

          responses.push(crossExamResponse);
          return crossExamResponse;
        } catch (err) {
          console.error(`Cross-examine error for ${ownArg.option}:`, err);
          updateMessage(msgId, `⚠️ Error in cross-examination for ${ownArg.option}`);
          
          const partialResponse: CrossExamineResponse = {
            option: ownArg.option,
            challenges: [],
            defense: `Error: Could not complete cross-examination`,
            error: err instanceof Error ? err.message : "Unknown error",
          };
          responses.push(partialResponse);
          return partialResponse;
        }
      });

      await Promise.all(batchPromises);
    }

    setCrossExamResponses(responses);
    
    if (sessionId) {
      updateSession(sessionId, { crossExaminations: responses });
    }

    // Proceed to referee
    await runReferee(comparisonPlan, advocateArgs, responses);
  }, [sessionId, maxParallelism, geminiApiKey, exaApiKey, addMessage, updateMessage, updateSession]);


  /**
   * Run referee agent
   */
  const runReferee = useCallback(async (
    comparisonPlan: ComparisonPlan,
    advocateArgs: AdvocateResponse[],
    crossExams: CrossExamineResponse[]
  ) => {
    setPhase("refereeing");
    
    if (sessionId) {
      updateSession(sessionId, { status: "refereeing" });
    }

    const msgId = addMessage({
      role: "assistant",
      content: "🏆 The referee is synthesizing all arguments...",
      phase: "refereeing",
    });

    try {
      const response = await fetch("/api/referee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: comparisonPlan,
          arguments: advocateArgs,
          crossExaminations: crossExams,
          sessionId: sessionId || "temp",
          apiKey: geminiApiKey || undefined,
          exaApiKey: exaApiKey || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData as APIError;
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          updateMessage(msgId, `## Final Verdict\n\n${fullContent}`);
        }
      }

      const result: RefereeResponse = {
        summary: fullContent,
        scores: [],
        tradeoffs: [],
        recommendation: {
          option: comparisonPlan.options[0],
          reasoning: "See summary above",
          confidence: "medium",
        },
        caveats: [],
      };

      setRefereeResponse(result);
      setPhase("complete");
      
      if (sessionId) {
        updateSession(sessionId, { result, status: "complete" });
      }
    } catch (err) {
      handleError(err, "Referee");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, geminiApiKey, exaApiKey, addMessage, updateMessage, updateSession, handleError]);

  /**
   * Handle initial query submission
   */
  const handleQuerySubmit = useCallback(async (query: string) => {
    // Create new session
    const newSessionId = createSession(query);
    setSessionId(newSessionId);
    setCurrentSession(newSessionId);
    
    // Reset state
    setMessages([]);
    setPlan(null);
    setClarifications([]);
    setClarificationAnswers({});
    setAdvocateResponses([]);
    setCrossExamResponses([]);
    setRefereeResponse(null);
    setError(null);

    // Add user message
    addMessage({ role: "user", content: query });

    // Start planning
    await callPlanner(query);
  }, [createSession, setCurrentSession, addMessage, callPlanner]);

  /**
   * Handle clarification answer
   */
  const handleClarificationAnswer = useCallback(async (questionId: string, answer: string | string[]) => {
    const newAnswers = { ...clarificationAnswers, [questionId]: answer };
    setClarificationAnswers(newAnswers);

    // Check if all questions are answered
    const allAnswered = clarifications.every((q) => newAnswers[q.id] !== undefined);
    
    if (allAnswered) {
      // Get the original query from the session
      const session = sessionId ? getSession(sessionId) : null;
      const query = session?.query || messages.find((m) => m.role === "user")?.content || "";
      
      // Re-run planner with clarifications
      await callPlanner(query, newAnswers);
    }
  }, [clarificationAnswers, clarifications, sessionId, getSession, messages, callPlanner]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    const session = sessionId ? getSession(sessionId) : null;
    if (session) {
      setError(null);
      handleQuerySubmit(session.query);
    }
  }, [sessionId, getSession, handleQuerySubmit]);

  /**
   * Start a new comparison
   */
  const handleNewComparison = useCallback(() => {
    setSessionId(null);
    setCurrentSession(null);
    setPhase("input");
    setMessages([]);
    setPlan(null);
    setClarifications([]);
    setClarificationAnswers({});
    setAdvocateResponses([]);
    setCrossExamResponses([]);
    setRefereeResponse(null);
    setError(null);
    setIsLoading(false);
  }, [setCurrentSession]);

  // Check if API keys are configured
  const hasApiKeys = geminiApiKey || process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY;

  return (
    <div className="flex flex-col h-full">
      {/* Phase indicator */}
      {phase !== "input" && phase !== "error" && (
        <PhaseIndicator phase={phase} />
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && phase === "input" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">
              Tech Referee
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Compare technologies with AI-powered debate. Each option gets an advocate,
              they cross-examine each other, and a referee delivers the verdict.
            </p>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onPollAnswer={handleClarificationAnswer}
          />
        ))}

        {/* Clarification questions */}
        {phase === "clarifying" && clarifications.length > 0 && (
          <ClarificationSection
            questions={clarifications}
            onAnswer={handleClarificationAnswer}
          />
        )}

        {/* Loading indicator */}
        {isLoading && <StreamingIndicator phase={phase} />}

        {/* Error display */}
        {error && <ErrorDisplay error={error} onRetry={handleRetry} onOpenSettings={onOpenSettings} />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 p-4">
        {!hasApiKeys && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-700 dark:text-amber-300">
                ⚠️ Please configure your API keys to start comparing.
              </span>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="ml-3 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                >
                  Open Settings
                </button>
              )}
            </div>
          </div>
        )}
        
        {phase === "complete" ? (
          <button
            onClick={handleNewComparison}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Start New Comparison
          </button>
        ) : (
          <QueryInput
            onSubmit={handleQuerySubmit}
            disabled={isLoading || !hasApiKeys || phase === "clarifying"}
            placeholder={
              phase === "clarifying"
                ? "Please answer the questions above..."
                : "Compare technologies... (e.g., 'React vs Vue vs Angular for a startup')"
            }
          />
        )}
      </div>
    </div>
  );
});

export default ComparisonChat;
