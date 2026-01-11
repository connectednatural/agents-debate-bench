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
    { key: "planning", label: "Plan" },
    { key: "advocating", label: "Research" },
    { key: "cross-examining", label: "Debate" },
    { key: "refereeing", label: "Verdict" },
  ];

  const currentIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className="sticky top-0 z-10 bg-[#faf9f7]/80 backdrop-blur-md border-b border-stone-200/50">
      <div className="flex items-center justify-center gap-1 sm:gap-2 px-4 py-3">
        {phases.map((p, index) => (
          <div key={p.key} className="flex items-center">
            <div
              className={`
                flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-mono uppercase tracking-wider transition-all duration-300
                ${
                  index < currentIndex
                    ? "bg-green-100 text-green-700"
                    : index === currentIndex
                    ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500/30"
                    : "bg-stone-100 text-stone-400"
                }
              `}
            >
              {index < currentIndex ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : index === currentIndex ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              ) : null}
              <span className="hidden xs:inline sm:inline">{p.label}</span>
            </div>
            {index < phases.length - 1 && (
              <div
                className={`w-4 sm:w-8 h-0.5 mx-1 transition-colors duration-300 ${
                  index < currentIndex
                    ? "bg-green-400"
                    : "bg-stone-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Message bubble component with improved styling
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

  const phaseConfig: Record<string, { label: string; color: string }> = {
    planning: { label: "Planning", color: "text-sky-600" },
    advocating: { label: "Researching", color: "text-violet-600" },
    "cross-examining": { label: "Cross-Examining", color: "text-amber-600" },
    refereeing: { label: "Final Verdict", color: "text-emerald-600" },
  };

  const config = message.phase ? phaseConfig[message.phase] : null;

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`
          relative max-w-[90%] sm:max-w-[85%] rounded-2xl
          ${
            isUser
              ? "bg-stone-900 text-white shadow-lg"
              : isSystem
              ? "bg-amber-50 border border-amber-200"
              : "bg-white shadow-sm border border-stone-200"
          }
        `}
      >
        {/* Phase badge */}
        {config && !isUser && (
          <div className={`flex items-center gap-1.5 px-4 pt-3 pb-1 ${config.color}`}>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">
              [{config.label}]
            </span>
          </div>
        )}
        
        <div className={`px-4 ${config ? "pt-1 pb-4" : "py-4"}`}>
          <MemoizedMarkdown
            content={message.content}
            id={message.id}
            onPollAnswer={onPollAnswer}
          />
        </div>
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
  const phaseLabels: Record<ChatPhase, { text: string }> = {
    input: { text: "Ready" },
    planning: { text: "Creating comparison plan..." },
    clarifying: { text: "Waiting for your input..." },
    advocating: { text: "Advocates researching..." },
    "cross-examining": { text: "Cross-examining arguments..." },
    refereeing: { text: "Synthesizing final verdict..." },
    complete: { text: "Complete" },
    error: { text: "Error occurred" },
  };

  const config = phaseLabels[phase];

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-stone-100 rounded-xl animate-in fade-in duration-300">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm text-stone-600 font-mono">
        {config.text}
      </span>
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSubmit(query.trim());
      setQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [query]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={`
            w-full px-4 py-3 rounded-2xl border-2 border-stone-200
            bg-white text-sm resize-none font-sans
            focus:outline-none focus:border-amber-500
            transition-colors duration-200
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !query.trim()}
        className={`
          flex items-center justify-center w-12 h-12 rounded-xl font-medium text-sm transition-all duration-200
          ${
            !disabled && query.trim()
              ? "bg-stone-900 text-white hover:bg-amber-700 shadow-lg hover:shadow-amber-500/20 hover:scale-105"
              : "bg-stone-100 text-stone-400 cursor-not-allowed"
          }
        `}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-stone-600">
        <p className="text-sm font-mono uppercase tracking-wider">
          [Clarification Needed]
        </p>
      </div>
      {questions.map((q) => (
        <PollComponent key={q.id} question={q} onAnswer={(answer) => onAnswer(q.id, answer)} />
      ))}
    </div>
  );
});

/**
 * Error display component with API key validation support
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
  const isApiKeyError = errorCode === "API_KEY_MISSING" || errorCode === "API_KEY_INVALID";

  return (
    <div className="p-5 bg-red-50 border border-red-200 rounded-2xl animate-in fade-in duration-300">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-700">{errorMessage}</p>
          {errorDetails && (
            <p className="text-sm text-red-600 mt-1">{errorDetails}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {isApiKeyError && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Open Settings
              </button>
            )}
            {isRetryable && onRetry && !isApiKeyError && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
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
 * Welcome screen component
 */
const WelcomeScreen = memo(function WelcomeScreen() {
  const examples = [
    "React vs Vue vs Svelte for a new SaaS product",
    "PostgreSQL vs MongoDB for an e-commerce platform",
    "AWS Lambda vs Google Cloud Functions vs Azure Functions",
    "Next.js vs Remix vs Astro for a marketing site",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in duration-500">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
          </svg>
        </div>
        <h2 className="text-3xl font-serif text-stone-900 mb-3">
          Tech Referee
        </h2>
        <p className="text-stone-600 mb-8 leading-relaxed">
          Compare technologies with AI-powered debate. Each option gets an advocate who researches and argues for it, 
          then they cross-examine each other, and a referee delivers the final verdict.
        </p>
        
        <div className="text-left">
          <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">
            [ Try Asking ]
          </p>
          <div className="space-y-2">
            {examples.map((example, i) => (
              <div
                key={i}
                className="px-4 py-3 bg-white rounded-xl text-sm text-stone-600 border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 transition-colors cursor-default"
              >
                "{example}"
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});


/**
 * ComparisonChat Component
 * 
 * Main chat interface managing the comparison flow through all phases
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
  
  // Comparison state
  const [plan, setPlan] = useState<ComparisonPlan | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string | string[]>>({});
  const [advocateResponses, setAdvocateResponses] = useState<AdvocateResponse[]>([]);
  const [crossExamResponses, setCrossExamResponses] = useState<CrossExamineResponse[]>([]);
  const [refereeResponse, setRefereeResponse] = useState<RefereeResponse | null>(null);

  // Refs for smart scrolling
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userHasScrolledRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // Smart scroll - only auto-scroll if user is near bottom
  const scrollToBottom = useCallback((force = false) => {
    if (!messagesContainerRef.current || !messagesEndRef.current) return;
    
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    if (force || isNearBottom || !userHasScrolledRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  // Track user scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // User scrolled up
    if (scrollTop < lastScrollTopRef.current) {
      userHasScrolledRef.current = true;
    }
    
    // User scrolled to bottom
    if (scrollHeight - scrollTop - clientHeight < 50) {
      userHasScrolledRef.current = false;
    }
    
    lastScrollTopRef.current = scrollTop;
  }, []);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
        
        if (session.plan) setPlan(session.plan);
        if (session.arguments) setAdvocateResponses(session.arguments);
        if (session.crossExaminations) setCrossExamResponses(session.crossExaminations);
        if (session.result) setRefereeResponse(session.result);
        
        if (session.status === "complete") {
          setPhase("complete");
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

  const addMessage = useCallback((message: Omit<ChatMessage, "id">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setMessages((prev) => [...prev, newMessage]);
    userHasScrolledRef.current = false; // Reset scroll tracking on new message
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    );
  }, []);

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
    
    if (sessionId) {
      const { markSessionError } = useSessionStore.getState();
      markSessionError(sessionId, apiError.error);
    }
  }, [sessionId]);

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
        await runAdvocates(data.plan);
      }
    } catch (err) {
      handleError(err, "Planner");
    } finally {
      setIsLoading(false);
    }
  }, [geminiApiKey, exaApiKey, sessionId, addMessage, updateSession, handleError]);

  const runAdvocates = useCallback(async (comparisonPlan: ComparisonPlan) => {
    setPhase("advocating");
    setIsLoading(true);
    
    if (sessionId) {
      updateSession(sessionId, { status: "advocating" });
    }

    const responses: AdvocateResponse[] = [];
    const options = comparisonPlan.options;

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
              scrollToBottom();
            }
          }

          const advocateResponse: AdvocateResponse = {
            option,
            argument: fullContent,
            sources: [],
            weaknesses: [],
          };

          responses.push(advocateResponse);
          return advocateResponse;
        } catch (err) {
          console.error(`Advocate error for ${option}:`, err);
          updateMessage(msgId, `⚠️ Error researching ${option}: ${err instanceof Error ? err.message : "Unknown error"}`);
          
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

    await runCrossExaminers(comparisonPlan, responses);
  }, [sessionId, maxParallelism, geminiApiKey, exaApiKey, addMessage, updateMessage, updateSession, scrollToBottom]);

  const runCrossExaminers = useCallback(async (
    comparisonPlan: ComparisonPlan,
    advocateArgs: AdvocateResponse[]
  ) => {
    setPhase("cross-examining");
    
    if (sessionId) {
      updateSession(sessionId, { status: "cross-examining" });
    }

    const responses: CrossExamineResponse[] = [];

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
              scrollToBottom();
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

    await runReferee(comparisonPlan, advocateArgs, responses);
  }, [sessionId, maxParallelism, geminiApiKey, exaApiKey, addMessage, updateMessage, updateSession, scrollToBottom]);

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
          scrollToBottom();
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
  }, [sessionId, geminiApiKey, exaApiKey, addMessage, updateMessage, updateSession, handleError, scrollToBottom]);

  const handleQuerySubmit = useCallback(async (query: string) => {
    const newSessionId = createSession(query);
    setSessionId(newSessionId);
    setCurrentSession(newSessionId);
    
    setMessages([]);
    setPlan(null);
    setClarifications([]);
    setClarificationAnswers({});
    setAdvocateResponses([]);
    setCrossExamResponses([]);
    setRefereeResponse(null);
    setError(null);
    userHasScrolledRef.current = false;

    addMessage({ role: "user", content: query });
    await callPlanner(query);
  }, [createSession, setCurrentSession, addMessage, callPlanner]);

  const handleClarificationAnswer = useCallback(async (questionId: string, answer: string | string[]) => {
    const newAnswers = { ...clarificationAnswers, [questionId]: answer };
    setClarificationAnswers(newAnswers);

    const allAnswered = clarifications.every((q) => newAnswers[q.id] !== undefined);
    
    if (allAnswered) {
      const session = sessionId ? getSession(sessionId) : null;
      const query = session?.query || messages.find((m) => m.role === "user")?.content || "";
      await callPlanner(query, newAnswers);
    }
  }, [clarificationAnswers, clarifications, sessionId, getSession, messages, callPlanner]);

  const handleRetry = useCallback(() => {
    const session = sessionId ? getSession(sessionId) : null;
    if (session) {
      setError(null);
      handleQuerySubmit(session.query);
    }
  }, [sessionId, getSession, handleQuerySubmit]);

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
    userHasScrolledRef.current = false;
  }, [setCurrentSession]);

  const hasApiKeys = geminiApiKey || process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY;

  return (
    <div className="flex flex-col h-full">
      {/* Phase indicator */}
      {phase !== "input" && phase !== "error" && (
        <PhaseIndicator phase={phase} />
      )}

      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Welcome message */}
          {messages.length === 0 && phase === "input" && <WelcomeScreen />}

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
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-stone-200 bg-[#faf9f7]/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto p-4">
          {!hasApiKeys && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span className="text-sm text-amber-700 font-medium">
                    Configure your API keys to start comparing
                  </span>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Settings
                  </button>
                )}
              </div>
            </div>
          )}
          
          {phase === "complete" ? (
            <button
              onClick={handleNewComparison}
              className="w-full px-4 py-4 bg-stone-900 text-white rounded-xl font-mono text-sm uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg hover:shadow-amber-500/20"
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
                  : "Compare technologies... (e.g., 'React vs Vue vs Angular')"
              }
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default ComparisonChat;
