#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const MAX_RETRIES = 3;

function callGemini(prompt, isJson = false) {
    const formatFlag = isJson ? '--output-format json' : '';
    // Escape prompt properly for bash:
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    const cmd = `gemini ${formatFlag} "${escapedPrompt}"`;
    try {
        const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
        return isJson ? JSON.parse(output) : output.trim();
    } catch (error) {
        console.error("Gemini CLI execution failed:", error.message);
        if (error.stdout) console.log("stdout:", error.stdout.toString());
        if (error.stderr) console.error("stderr:", error.stderr.toString());
        return null;
    }
}

function generateMermaid(requirements) {
    const prompt = `
You are a Mermaid Diagram Expert.
Generate a valid Mermaid.js diagram based on these requirements:
${requirements}

Return ONLY the raw Mermaid code block. Do NOT include any markdown formatting like \`\`\`mermaid or \`\`\`. Do not include explanations. Just the code.
    `.trim();
    return callGemini(prompt, false);
}

function validateMermaid(mermaidCode) {
    const prompt = `
You are a strict Mermaid parser. Validate the following Mermaid code for syntax and logical errors.
Output ONLY valid JSON matching this structure exactly, with no markdown wrappers or additional text:
{
  "valid": boolean,
  "errors": ["list of errors if any"],
  "suggestions": ["how to fix the errors"]
}

Mermaid Code:
${mermaidCode}
    `.trim();
    return callGemini(prompt, true);
}

function fixMermaid(mermaidCode, validationResult) {
    const prompt = `
You are a Mermaid Diagram Expert.
The following Mermaid code failed validation.

Original Code:
${mermaidCode}

Validation Errors:
${JSON.stringify(validationResult.errors, null, 2)}

Suggestions:
${JSON.stringify(validationResult.suggestions, null, 2)}

Please fix the errors and provide the corrected Mermaid code.
Return ONLY the raw Mermaid code block. Do NOT include any markdown formatting like \`\`\`mermaid or \`\`\`. Do not include explanations. Just the code.
    `.trim();
    return callGemini(prompt, false);
}

async function runExpertLoop(requirements) {
    console.log("-----------------------------------------");
    console.log("🧜 Mermaid Expert System (powered by gemini-cli)");
    console.log("-----------------------------------------\n");

    console.log("Step 1: Generating initial diagram...");
    let currentDiagram = generateMermaid(requirements);

    if (!currentDiagram) {
        console.error("Failed to generate initial diagram.");
        process.exit(1);
    }

    console.log("\n--- Initial Diagram ---\n" + currentDiagram + "\n-----------------------\n");

    let attempt = 1;
    let isValid = false;

    while (attempt <= MAX_RETRIES) {
        console.log(`Step 2 (Attempt ${attempt}): Validating diagram...`);
        const validation = validateMermaid(currentDiagram);

        if (!validation) {
            console.error("Failed to execute validation tool.");
            break;
        }

        if (validation.valid) {
            console.log("✅ Validation Passed! The diagram is valid.");
            isValid = true;
            break;
        } else {
            console.log("❌ Validation Failed.");
            console.log("Errors:", validation.errors);
            console.log("Suggestions:", validation.suggestions);
            
            if (attempt === MAX_RETRIES) {
                console.log("\nReached maximum retries. Giving up.");
                break;
            }

            console.log(`\nStep 3 (Attempt ${attempt}): Asking expert to fix the diagram...`);
            currentDiagram = fixMermaid(currentDiagram, validation);
            console.log("\n--- Fixed Diagram ---\n" + currentDiagram + "\n---------------------\n");
            
            attempt++;
        }
    }

    if (isValid) {
        fs.writeFileSync('diagram.mmd', currentDiagram, 'utf-8');
        console.log("\n🎉 Final valid diagram saved to 'diagram.mmd'!");
    } else {
        fs.writeFileSync('diagram_failed.mmd', currentDiagram, 'utf-8');
        console.log("\n⚠️ Saved the final invalid diagram to 'diagram_failed.mmd' for manual review.");
        process.exit(1);
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: node mermaid-expert.js \"<diagram requirements>\"");
    process.exit(1);
}

const req = args[0];
runExpertLoop(req);
