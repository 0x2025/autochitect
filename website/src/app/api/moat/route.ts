import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";

// Utility to match CLI's getRepoId
const getRepoId = (url: string) => url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

const CLI_MOAT_DIR = process.env.NODE_ENV === 'production'
    ? '/app/cli/moat'
    : path.resolve(process.cwd(), "..", "poc_agent_runner", "moat");

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const isCloudMode = !!BUCKET_NAME;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { finding, tech_stack, is_valid, repo_url } = body;

        const repoId = repo_url ? getRepoId(repo_url) : 'global';
        const repoMoatPath = path.join(CLI_MOAT_DIR, `${repoId}.json`);

        if (isCloudMode) {
            console.log(`[Moat API] Mode: Cloud (GCS Sync Enabled)`);
        } else {
            console.log(`[Moat API] Mode: Local (Disk Only)`);
        }

        console.log(`[Moat API] Attempting to save lesson to: ${repoMoatPath}`);

        if (!finding) {
            return NextResponse.json({ error: "Finding data is required" }, { status: 400 });
        }

        // 1. Read existing lessons
        let lessons = [];
        if (fs.existsSync(repoMoatPath)) {
            const data = fs.readFileSync(repoMoatPath, 'utf-8');
            lessons = JSON.parse(data);
        } else {
            console.log(`[Moat API] MOAT file not found, creating new one at ${repoMoatPath}`);
            // Ensure directory exists
            fs.mkdirSync(path.dirname(repoMoatPath), { recursive: true });
        }

        // 2. Create new lesson
        const nextId = `L${(lessons.length + 1).toString().padStart(3, '0')}`;

        // Find existing lesson with same title to avoid duplicates or update them
        const existingIdx = lessons.findIndex((l: any) => l.pattern === finding.title);
        const newLesson = {
            lesson_id: nextId,
            tech_stack: tech_stack || [],
            violation_type: finding.criticality === "CRITICAL" || finding.criticality === "HIGH" ? "SECURITY_RISK" : "PERFORMANCE_BOTTLENECK",
            pattern: finding.title,
            rationale: finding.description + "\n\nRecommendation: " + finding.recommendation,
            human_verdict: is_valid ? "CORRECT" : "INCORRECT",
            // repo_url removed per user request (files are now repo-specific)
        };

        if (existingIdx !== -1) {
            lessons[existingIdx] = { ...lessons[existingIdx], ...newLesson, lesson_id: lessons[existingIdx].lesson_id };
        } else {
            lessons.push(newLesson);
        }

        // 3. Save
        fs.writeFileSync(repoMoatPath, JSON.stringify(lessons, null, 2));

        // 4. Sync to GCS
        if (BUCKET_NAME) {
            try {
                const destination = `moat/${repoId}.json`;
                console.log(`[Moat API] Syncing to gs://${BUCKET_NAME}/${destination}...`);
                await storage.bucket(BUCKET_NAME).upload(repoMoatPath, {
                    destination,
                    contentType: 'application/json'
                });
            } catch (err) {
                console.error("[Moat API] GCS Sync Failed:", err);
            }
        }

        return NextResponse.json({ success: true, lessonId: nextId, updated: existingIdx !== -1 });
    } catch (err) {
        console.error("Failed to save lesson:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
