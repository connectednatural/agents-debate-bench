/**
 * Human-in-the-Loop Utilities
 * Handles tool confirmation workflows for user interaction
 */
import {
  UIMessage,
  UIMessageStreamWriter,
  isStaticToolUIPart,
  getStaticToolName,
  convertToModelMessages,
  ToolSet,
  ToolExecutionOptions,
} from "ai";
import { APPROVAL } from "./tools";

/**
 * Extended UIMessage type for human-in-the-loop workflows
 */
export type HumanInTheLoopUIMessage = UIMessage;

/**
 * Check if a tool name is valid for the given execute functions
 */
function isValidToolName<T extends Record<string, unknown>>(
  toolName: string,
  executeFunctions: T
): toolName is keyof T & string {
  return toolName in executeFunctions;
}

/**
 * Process tool calls that require human confirmation
 * Handles approval/denial states and executes tools when approved
 */
export async function processToolCalls<Tools extends ToolSet>(
  {
    writer,
    messages,
  }: {
    tools: Tools;
    writer: UIMessageStreamWriter;
    messages: HumanInTheLoopUIMessage[];
  },
  executeFunctions: Record<
    string,
    (
      args: Record<string, unknown>,
      context: ToolExecutionOptions
    ) => Promise<unknown>
  >
): Promise<HumanInTheLoopUIMessage[]> {
  const lastMessage = messages[messages.length - 1];
  const parts = lastMessage.parts;
  if (!parts) return messages;

  const processedParts = await Promise.all(
    parts.map(async (part) => {
      if (!isStaticToolUIPart(part)) return part;

      const toolName = getStaticToolName(part);

      if (
        !(toolName in executeFunctions) ||
        part.state !== "output-available"
      ) {
        return part;
      }

      let result: unknown;

      if (part.output === APPROVAL.YES) {
        if (
          !isValidToolName(toolName, executeFunctions) ||
          part.state !== "output-available"
        ) {
          return part;
        }

        const toolInstance = executeFunctions[toolName];
        if (toolInstance) {
          result = await toolInstance(part.input as Record<string, unknown>, {
            messages: await convertToModelMessages(messages),
            toolCallId: part.toolCallId,
          });
        } else {
          result = "Error: No execute function found on tool";
        }
      } else if (part.output === APPROVAL.NO) {
        result = "Error: User denied access to tool execution";
      } else {
        return part;
      }

      writer.write({
        type: "tool-output-available",
        toolCallId: part.toolCallId,
        output: result,
      });

      return {
        ...part,
        output: result,
      };
    })
  );

  return [...messages.slice(0, -1), { ...lastMessage, parts: processedParts }];
}

/**
 * Check if any messages have pending tool confirmations
 */
export function hasPendingToolConfirmation(
  messages: HumanInTheLoopUIMessage[],
  toolsRequiringConfirmation: string[]
): boolean {
  return messages.some((m) =>
    m.parts?.some(
      (part) =>
        isStaticToolUIPart(part) &&
        part.state === "input-available" &&
        toolsRequiringConfirmation.includes(getStaticToolName(part))
    )
  );
}

/**
 * Get all pending tool confirmations from messages
 */
export function getPendingToolConfirmations(
  messages: HumanInTheLoopUIMessage[],
  toolsRequiringConfirmation: string[]
): Array<{
  messageId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
}> {
  const pending: Array<{
    messageId: string;
    toolCallId: string;
    toolName: string;
    input: unknown;
  }> = [];

  for (const message of messages) {
    if (!message.parts) continue;

    for (const part of message.parts) {
      if (
        isStaticToolUIPart(part) &&
        part.state === "input-available" &&
        toolsRequiringConfirmation.includes(getStaticToolName(part))
      ) {
        pending.push({
          messageId: message.id,
          toolCallId: part.toolCallId,
          toolName: getStaticToolName(part),
          input: part.input,
        });
      }
    }
  }

  return pending;
}
