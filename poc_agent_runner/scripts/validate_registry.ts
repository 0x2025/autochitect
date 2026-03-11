import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

const RegistrySchema = z.array(z.object({
    expert_id: z.string().regex(/^[A-Z_]+_EXPERT$/, "Expert ID must be in UPPER_SNAKE_CASE_EXPERT format"),
    specialties: z.array(z.string()).min(1),
    triggers: z.object({
        file_patterns: z.array(z.string()),
        dependency_match: z.array(z.string())
    }),
    grounding: z.object({
        extensions: z.array(z.string())
    }),
    expert_prompt_ref: z.string().min(20, "Prompt reference must be descriptive (min 20 chars)"),
    tools: z.array(z.string())
}));

function validateRegistry() {
    console.log("🔍 Validating registry.json...");
    const registryPath = path.join(process.cwd(), 'registry.json');

    if (!fs.existsSync(registryPath)) {
        console.error("❌ Error: registry.json not found!");
        process.exit(1);
    }

    try {
        const data = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
        const result = RegistrySchema.safeParse(data);

        if (!result.success) {
            console.error("❌ Registry Validation Failed!");
            console.error(JSON.stringify(result.error.flatten(), null, 2));
            process.exit(1);
        }

        // Check for duplicate Expert IDs
        const ids = data.map((e: any) => e.expert_id);
        const duplicates = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
        if (duplicates.length > 0) {
            console.error(`❌ Error: Duplicate Expert IDs found: ${duplicates.join(', ')}`);
            process.exit(1);
        }

        console.log("✅ Registry is valid and follows Autochitect standards.");
    } catch (e: any) {
        console.error(`❌ Error parsing registry.json: ${e.message}`);
        process.exit(1);
    }
}

validateRegistry();
