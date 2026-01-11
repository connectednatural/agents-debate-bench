/**
 * Parallel Executor Utility
 * Executes async tasks in parallel with configurable concurrency
 * Requirements: 3.7, 4.6, 7.4
 */

export interface ParallelExecutorOptions<T, R> {
  items: T[];
  maxParallelism: number;
  executor: (item: T, index: number) => Promise<R>;
  onItemStart?: (item: T, index: number) => void;
  onItemComplete?: (item: T, result: R, index: number) => void;
  onItemError?: (item: T, error: Error, index: number) => void;
}

export interface ParallelExecutorResult<R> {
  results: R[];
  errors: Array<{ index: number; error: Error }>;
  successful: number;
  failed: number;
}

/**
 * Execute tasks in parallel with controlled concurrency
 * 
 * @example
 * const results = await executeInParallel({
 *   items: ['React', 'Vue', 'Angular'],
 *   maxParallelism: 2,
 *   executor: async (option) => {
 *     const response = await fetch(`/api/advocate`, {
 *       method: 'POST',
 *       body: JSON.stringify({ option })
 *     });
 *     return response.json();
 *   }
 * });
 */
export async function executeInParallel<T, R>(
  options: ParallelExecutorOptions<T, R>
): Promise<ParallelExecutorResult<R>> {
  const { items, maxParallelism, executor, onItemStart, onItemComplete, onItemError } = options;
  
  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];
  let successful = 0;
  let failed = 0;

  // Process items in batches
  for (let i = 0; i < items.length; i += maxParallelism) {
    const batch = items.slice(i, i + maxParallelism);
    const batchStartIndex = i;

    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      
      onItemStart?.(item, globalIndex);

      try {
        const result = await executor(item, globalIndex);
        results[globalIndex] = result;
        successful++;
        onItemComplete?.(item, result, globalIndex);
        return { success: true as const, result, index: globalIndex };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push({ index: globalIndex, error });
        failed++;
        onItemError?.(item, error, globalIndex);
        return { success: false as const, error, index: globalIndex };
      }
    });

    await Promise.all(batchPromises);
  }

  return { results, errors, successful, failed };
}

/**
 * Execute advocate agents in parallel
 */
export interface AdvocateExecutorParams {
  options: string[];
  plan: unknown;
  sessionId: string;
  apiKey?: string;
  exaApiKey?: string;
  maxParallelism: number;
  onProgress?: (option: string, content: string) => void;
}

export async function executeAdvocatesInParallel(
  params: AdvocateExecutorParams
): Promise<ParallelExecutorResult<{ option: string; content: string }>> {
  const { options, plan, sessionId, apiKey, exaApiKey, maxParallelism, onProgress } = params;

  return executeInParallel({
    items: options,
    maxParallelism,
    executor: async (option) => {
      const response = await fetch("/api/advocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          option,
          plan,
          sessionId,
          apiKey,
          exaApiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Advocate request failed");
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
          onProgress?.(option, fullContent);
        }
      }

      return { option, content: fullContent };
    },
  });
}

/**
 * Execute cross-examiner agents in parallel
 */
export interface CrossExaminerExecutorParams {
  advocateResponses: Array<{ option: string; argument: string; sources: unknown[]; weaknesses: string[] }>;
  plan: unknown;
  sessionId: string;
  apiKey?: string;
  exaApiKey?: string;
  maxParallelism: number;
  onProgress?: (option: string, content: string) => void;
}

export async function executeCrossExaminersInParallel(
  params: CrossExaminerExecutorParams
): Promise<ParallelExecutorResult<{ option: string; content: string }>> {
  const { advocateResponses, plan, sessionId, apiKey, exaApiKey, maxParallelism, onProgress } = params;

  return executeInParallel({
    items: advocateResponses,
    maxParallelism,
    executor: async (ownArg) => {
      const opponentArgs = advocateResponses.filter((a) => a.option !== ownArg.option);

      const response = await fetch("/api/cross-examine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          option: ownArg.option,
          ownArgument: ownArg,
          opponentArguments: opponentArgs,
          plan,
          sessionId,
          apiKey,
          exaApiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Cross-examine request failed");
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
          onProgress?.(ownArg.option, fullContent);
        }
      }

      return { option: ownArg.option, content: fullContent };
    },
  });
}
