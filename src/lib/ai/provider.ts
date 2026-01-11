/**
 * Google AI Provider Factory
 * Creates Google Generative AI provider with dynamic API key support
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getGoogleProvider(apiKey?: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export function getModel(
  apiKey?: string,
  modelId: string = "gemini-3-flash-preview"
) {
  const google = getGoogleProvider(apiKey);
  return google(modelId);
}
