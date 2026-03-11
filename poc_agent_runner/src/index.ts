import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { createGraph } from "./graph";

dotenv.config();

async function main() {
    const repo = process.env.TARGET_REPO_URL;
    if (!repo || !process.env.GOOGLE_API_KEY) {
        console.error("FATAL: Environment variables TARGET_REPO_URL & GOOGLE_API_KEY mandatory.");
        process.exit(1);
    }

    const isTest = process.argv.includes("--test-eval");
    const app = createGraph(isTest);

    const initialState = {
        repoUrl: repo,
        token: process.env.GITHUB_TOKEN || null,
        localPath: isTest ? path.join(process.cwd(), ".test-workspace") : "",
        discoveryResult: "",
        discoveredLanguages: isTest ? ["c#", ".net", "abp"] : [],
        expertReports: [],
        analysisResult: "",
    };

    console.log("=========================================");
    console.log(`Starting Phase 0 POC Runner...`);
    console.log(`Mode: ${isTest ? "LOCAL EVAL" : "REMOTE CLONE"}`);
    console.log("=========================================\n");

    try {
        const result = await app.invoke(initialState, {
            configurable: { thread_id: "poc_session_1" },
            recursionLimit: 50
        });

        console.log("\n=========================================");
        console.log("AUDIT SUMMARY:");
        console.log("=========================================\n");
        console.log(result.analysisResult);
        console.log("\n=========================================");
    } catch (err) {
        console.error("\nExecution Fault:", err);
    }
}

main().catch(console.error);
