import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createGraph } from '../src/graph';

dotenv.config();

async function runEval() {
    console.log("=========================================");
    console.log("Autochitect Regression Evaluation Suite");
    console.log("=========================================\n");

    const testCases = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'test_cases.json'), 'utf-8'));
    const app = createGraph(true); // Run in test mode (local workspace)

    for (const testCase of testCases) {
        console.log(`[Eval] Running Audit for: ${testCase.repo_url}`);

        const initialState = {
            repoUrl: testCase.repo_url,
            localPath: path.join(process.cwd(), ".test-workspace"),
            discoveryResult: "",
            discoveredLanguages: ["c#", ".net", "dockerfile"],
            expertReports: [],
            analysisResult: "",
        };

        try {
            const result = await app.invoke(initialState, {
                configurable: { thread_id: `eval_${Date.now()}` },
                recursionLimit: 50
            });

            console.log("\n[Eval] Audit Complete. Verifying Reasoning Findings...");
            console.log("\n====== FULL REPORT START ======");
            console.log(result.analysisResult);
            console.log("====== FULL REPORT END =======\n");

            let passed = true;
            const reportLower = result.analysisResult.toLowerCase();
            for (const expected of testCase.expected_findings) {
                const found = reportLower.includes(expected.toLowerCase());
                if (found) {
                    console.log(`  ✅ Found: "${expected}"`);
                } else {
                    console.log(`  ❌ MISSING: "${expected}"`);
                    console.log(`     (Diagnostic: Keyword "${expected.toLowerCase()}" not found in report of length ${reportLower.length})`);
                    passed = false;
                }
            }

            if (passed) {
                console.log("\n[VERDICT] PASS: Agent maintained architectural reasoning depth.");
            } else {
                console.log("\n[VERDICT] FAIL: Agent regression detected in reasoning.");
                process.exit(1);
            }

        } catch (err) {
            console.error("\n[Eval] Runtime Error:", err);
            process.exit(1);
        }
    }
}

runEval().catch(console.error);
