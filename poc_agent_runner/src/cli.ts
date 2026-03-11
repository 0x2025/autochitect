#!/usr/bin/env node
import { Command } from "commander";
import { runAgent } from "./index";
import * as dotenv from "dotenv";

dotenv.config();

const program = new Command();

program
    .name("autochitect")
    .description("Autonomous AI Architect for codebase analysis")
    .version("1.1.0");

program
    .argument("[repo-url]", "Repository URL to analyze")
    .option("-t, --token <token>", "GitHub Personal Access Token")
    .option("-e, --eval", "Run in local evaluation mode (uses .test-workspace)", false)
    .option("-p, --provider <provider>", "LLM Provider (google-genai, google-vertexai, anthropic, openai, ollama)")
    .option("-m, --model <model>", "Specific LLM model name")
    .action(async (repoUrl, options) => {
        // Show help if no arguments provided
        if (!repoUrl && !process.env.TARGET_REPO_URL) {
            console.error("\n❌ Error: No repository URL provided.");
            console.log("\nUsage Hint:");
            console.log("  $ autochitect https://github.com/user/repo\n");
            program.help();
            return;
        }

        try {
            await runAgent({
                repoUrl: repoUrl || process.env.TARGET_REPO_URL || "",
                isTest: options.eval,
                token: options.token,
                provider: options.provider,
                model: options.model
            });
        } catch (err: any) {
            console.error("\n❌ Execution Error:", err.message);
            process.exit(1);
        }
    });

program
    .addHelpText('after', `
Example call:
  $ autochitect https://github.com/user/repo
  $ autochitect ./my-local-project
  $ autochitect https://github.com/user/repo --provider anthropic --model claude-3-5-sonnet
  $ autochitect https://github.com/user/repo --provider ollama --model llama3.1

Environment Variables:
  GOOGLE_API_KEY      For google-genai (default)
  ANTHROPIC_API_KEY   For anthropic
  OPENAI_API_KEY      For openai
  OLLAMA_HOST         For ollama (defaults to http://localhost:11434)
  GITHUB_TOKEN        Optional for private repositories

Heuristic Detection:
  Autochitect automatically detects your LLM provider by checking for these 
  environment variables in the order listed above. It defaults to Google Gemini
  if no other keys are found but falls back to whichever is configured.

For more information, visit: https://github.com/sangcungoc/autochitect
    `);

program.parse(process.argv);
