import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { Storage } from '@google-cloud/storage';
import { createGraph } from "./graph";
import { setMaxListeners } from "events";
import { syncFromGcs, isCloudMode } from "./gcs";

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
    model?: string,
    outputPath?: string
}) {
    if (!options.repoUrl) {
        throw new Error("Target Repository URL is required. Hint: Pass it as the first argument or set TARGET_REPO_URL.");
    }

    // Initialize/Sync Knowledge Base from Cloud Storage
    await syncFromGcs();

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
    console.log(`Storage: ${isCloudMode() ? "Cloud (GCS Enabled)" : "Disk Only"}`);
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
        const outDirs = options.outputPath ? [path.dirname(options.outputPath), "/app/output", process.cwd()] : ["/app/output", process.cwd()];
        let savedPath: string | null = null;

        for (const dir of outDirs) {
            if (fs.existsSync(dir) || (dir === path.dirname(options.outputPath || ""))) {
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const outPath = options.outputPath && dir === path.dirname(options.outputPath) ? options.outputPath : path.join(dir, "report.json");
                try {
                    console.log(`Attempting to save report to: ${outPath}...`);
                    fs.writeFileSync(outPath, JSON.stringify(result.structuredAnalysisResult, null, 2));
                    console.log(`SUCCESS: Structured report saved to ${outPath}`);
                    savedPath = outPath;
                    break;
                } catch (err: any) {
                    console.warn(`[Warning] Failed to save to ${outPath}: ${err.message}`);
                }
            }
        }

        if (!savedPath) {
            console.error("FATAL: Could not save structured report to ANY configured directory.");
        } else if (isCloudMode()) {
            try {
                const storage = new Storage();
                const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);
                const repoId = options.repoUrl.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                
                console.log(`[GCS] Uploading report from ${savedPath} to gs://${process.env.GCS_BUCKET_NAME}/${repoId}.json...`);
                await bucket.upload(savedPath, {
                    destination: `${repoId}.json`,
                    contentType: 'application/json',
                });
                console.log(`[GCS] SUCCESS: Report uploaded.`);
            } catch (err: any) {
                console.error(`[GCS] Upload Failed: ${err.message}`);
            }
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
