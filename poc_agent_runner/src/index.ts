import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { createGraph } from "./graph";
import { setMaxListeners } from "events";

dotenv.config();
// Prevent MaxListenersExceededWarning during complex agent loops
setMaxListeners(50);

/**
 * Core Agent Execution Logic
 */
export async function runAgent(options: {
    repoUrl: string,
    isTest?: boolean,
    token?: string | null,
    discoveryResult?: string,
    discoveredLanguages?: string[],
    provider?: string,
    model?: string
}) {
    if (!options.repoUrl) {
        throw new Error("Target Repository URL is required. Hint: Pass it as the first argument or set TARGET_REPO_URL.");
    }

    const isTest = options.isTest || false;
    const app = createGraph(isTest);

    const initialState = {
        repoUrl: options.repoUrl,
        token: options.token || process.env.GITHUB_TOKEN || null,
        localPath: isTest ? path.join(process.cwd(), ".test-workspace") : "",
        discoveryResult: options.discoveryResult || "",
        discoveredLanguages: options.discoveredLanguages || (isTest ? ["c#", ".net", "abp"] : []),
        expertReports: [],
        analysisResult: "",
        provider: options.provider || undefined,
        model: options.model || undefined
    };

    console.log("=========================================");
    console.log(`Starting Autochitect Agent...`);
    console.log(`Build: 2026-03-11T07:46:14Z (v1.1.0)`);
    console.log(`Mode: ${isTest ? "LOCAL EVAL" : "REMOTE CLONE"}`);
    console.log("=========================================\n");

    const result = await app.invoke(initialState, {
        configurable: { thread_id: "autochitect_session" },
        recursionLimit: 50
    });

    console.log("\n=========================================");
    console.log("AUDIT SUMMARY:");
    console.log("=========================================\n");
    console.log(result.analysisResult);
    console.log("\n=========================================");

    if (result.structuredAnalysisResult) {
        const outDirs = ["/app/output", process.cwd()];
        let saved = false;

        for (const dir of outDirs) {
            if (fs.existsSync(dir)) {
                const outPath = path.join(dir, "report.json");
                try {
                    console.log(`Attempting to save report to: ${outPath}...`);
                    fs.writeFileSync(outPath, JSON.stringify(result.structuredAnalysisResult, null, 2));
                    console.log(`SUCCESS: Structured report saved to ${outPath}`);
                    saved = true;
                    break;
                } catch (err: any) {
                    console.warn(`[Warning] Failed to save to ${outPath}: ${err.message}`);
                }
            }
        }

        if (!saved) {
            console.error("FATAL: Could not save structured report to ANY configured directory.");
        }
    }

    return result;
}

async function main() {
    // Priority: CLI Argument > Environment Variable
    const repo = process.argv[2] || process.env.TARGET_REPO_URL;

    if (!repo) {
        console.error("FATAL: Target Repository URL or local path is required.");
        console.log("Usage: autochitect <repo-url-or-local-path>");
        process.exit(1);
    }

    // Don't fail here for GOOGLE_API_KEY; let the detectProvider() in models.ts handle it
    // This allows users to use other providers (Anthropic, OpenAI, etc.) via CLI flags or env vars.

    const isTest = process.argv.includes("--test-eval");

    try {
        await runAgent({ repoUrl: repo, isTest });
    } catch (err) {
        console.error("\nExecution Fault:", err);
    }
}

const isMain = process.argv[1] && (
    process.argv[1].endsWith('index.ts') ||
    process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('autochitect')
);

if (isMain && !process.argv.some(arg => arg.includes('cli.ts') || arg.includes('cli.js'))) {
    main().catch(console.error);
}
