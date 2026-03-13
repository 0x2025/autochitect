import { TokenUsage } from "./config";

interface ModelPricing {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
}

const PRICING: Record<string, ModelPricing> = {
    // Gemini
    "gemini-3.1-pro-preview": { input: 1.25, output: 3.75 },
    "gemini-2.5-flash": { input: 0.10, output: 0.40 },
    "gemini-1.5-pro": { input: 1.25, output: 3.75 },
    "gemini-1.5-flash": { input: 0.075, output: 0.30 },
    
    // Anthropic
    "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
    "claude-3-5-haiku-20241022": { input: 0.25, output: 1.25 },
    
    // OpenAI
    "gpt-4o": { input: 5.00, output: 15.00 },
    "gpt-4o-mini": { input: 0.15, output: 0.60 },

    // Default for unknown models
    "default": { input: 1.00, output: 4.00 }
};

/**
 * Calculates the estimated cost of LLM usage.
 */
export function calculateCost(usage: TokenUsage, model?: string): number {
    const pricing = PRICING[model || "default"] || PRICING["default"];
    const inputCost = (usage.input_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.output_tokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
}

/**
 * Formats the usage data for logging.
 */
export function formatUsageSummary(usage: TokenUsage, model?: string): string {
    const cost = calculateCost(usage, model);
    return `
=== RESOURCE USAGE SUMMARY ===
Input Tokens:  ${usage.input_tokens.toLocaleString()}
Output Tokens: ${usage.output_tokens.toLocaleString()}
Total Tokens:  ${usage.total_tokens.toLocaleString()}
Estimated Cost: $${cost.toFixed(4)} (Model: ${model || "Default Pricing"})
==============================
`;
}
