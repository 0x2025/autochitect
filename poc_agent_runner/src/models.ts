import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type LLMProvider = "google-genai" | "google-vertexai" | "anthropic" | "openai" | "ollama";

export interface LLMOptions {
    provider?: LLMProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    region?: string;
    baseUrl?: string;
}

/**
 * Detect the best available provider based on environment variables.
 */
function detectProvider(): LLMProvider {
    if (process.env.GOOGLE_API_KEY) return "google-genai";
    if (process.env.ANTHROPIC_API_KEY) return "anthropic";
    if (process.env.OPENAI_API_KEY) return "openai";
    if (process.env.OLLAMA_HOST) return "ollama";
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.CLOUD_SDK_CONFIG) return "google-vertexai";

    throw new Error(`No LLM provider detected. 
    
Hint: Set one of the following environment variables:
  - GOOGLE_API_KEY (for Gemini)
  - ANTHROPIC_API_KEY (for Claude)
  - OPENAI_API_KEY (for OpenAI)
  - OLLAMA_HOST (for local Ollama)
  
Or specify a provider and model explicitly via CLI flags:
  --provider <google-genai|anthropic|openai|ollama> --model <model-name>`);
}

/**
 * Factory for creating LLM instances based on task and environment.
 */
export function createLLM(task: "HIGH" | "LOW", options: LLMOptions = {}): BaseChatModel {
    const provider = options.provider || detectProvider();
    const temperature = options.temperature ?? (task === "HIGH" ? 0.1 : 0.2);

    switch (provider) {
        case "google-genai":
            return new ChatGoogleGenerativeAI({
                model: options.model || (task === "HIGH" ? "gemini-2.0-flash" : "gemini-2.0-flash"),
                temperature,
                apiKey: options.apiKey || process.env.GOOGLE_API_KEY
            });

        case "anthropic":
            return new ChatAnthropic({
                model: options.model || (task === "HIGH" ? "claude-3-5-sonnet-20241022" : "claude-3-5-haiku-20241022"),
                temperature,
                apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY
            });

        case "openai":
            return new ChatOpenAI({
                model: options.model || (task === "HIGH" ? "gpt-4o" : "gpt-4o-mini"),
                temperature,
                apiKey: options.apiKey || process.env.OPENAI_API_KEY
            });

        case "google-vertexai":
            return new ChatVertexAI({
                model: options.model || (task === "HIGH" ? "gemini-1.5-pro" : "gemini-1.5-flash"),
                temperature,
                location: options.region || "us-central1"
            });

        case "ollama":
            return new ChatOllama({
                model: options.model || (task === "HIGH" ? "llama3.1" : "llama3.2"),
                temperature,
                baseUrl: options.baseUrl || process.env.OLLAMA_HOST || "http://localhost:11434"
            });

        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}
