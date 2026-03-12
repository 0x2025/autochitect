import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Path to the lessons learned in the CLI folder
const CLI_MOAT_PATH = process.env.NODE_ENV === 'production'
    ? '/app/cli/moat/lessons_learned.json'
    : path.resolve(process.cwd(), "..", "poc_agent_runner", "moat", "lessons_learned.json");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { finding, tech_stack, is_valid } = body;

        console.log(`[Moat API] Attempting to save lesson to: ${CLI_MOAT_PATH}`);

        if (!finding) {
            return NextResponse.json({ error: "Finding data is required" }, { status: 400 });
        }

        // 1. Read existing lessons
        let lessons = [];
        if (fs.existsSync(CLI_MOAT_PATH)) {
            const data = fs.readFileSync(CLI_MOAT_PATH, 'utf-8');
            lessons = JSON.parse(data);
        } else {
            console.log(`[Moat API] MOAT file not found, creating new one at ${CLI_MOAT_PATH}`);
            // Ensure directory exists
            fs.mkdirSync(path.dirname(CLI_MOAT_PATH), { recursive: true });
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
            human_verdict: is_valid ? "CORRECT" : "INCORRECT"
        };

        if (existingIdx !== -1) {
            lessons[existingIdx] = { ...lessons[existingIdx], ...newLesson, lesson_id: lessons[existingIdx].lesson_id };
        } else {
            lessons.push(newLesson);
        }

        // 3. Save
        fs.writeFileSync(CLI_MOAT_PATH, JSON.stringify(lessons, null, 2));

        return NextResponse.json({ success: true, lessonId: nextId, updated: existingIdx !== -1 });
    } catch (err) {
        console.error("Failed to save lesson:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
