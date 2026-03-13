import { tool } from "@langchain/core/tools";
import { z } from "zod";
import simpleGit from "simple-git";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { StructuredToolInterface } from "@langchain/core/tools";

export function createFileSystemTools(localPath: string): StructuredToolInterface[] {
    const resolvePath = (relativePath: string): string | null => {
        const fullPath = path.join(localPath, relativePath);
        if (fs.existsSync(fullPath)) return fullPath;

        // Smart Resolve: If path not found, try to find it in the codebase
        try {
            const fileName = path.basename(relativePath);
            const output = execSync(`find . -name "${fileName}"`, { cwd: localPath, encoding: "utf-8" }).trim();
            if (output) {
                const firstMatch = output.split('\n')[0].replace(/^\.\//, '');
                console.log(`[Tool: Resolve] Redirected ${relativePath} -> ${firstMatch}`);
                return path.join(localPath, firstMatch);
            }
        } catch (e) { }
        return null;
    };

    const readFileTool = tool(
        async ({ relativePath }: { relativePath: string }): Promise<string> => {
            const fullPath = resolvePath(relativePath);
            if (!fullPath || !fullPath.startsWith(localPath)) return `File not found: ${relativePath}`;
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                return fs.readFileSync(fullPath, "utf-8").slice(0, 15000);
            }
            return `File not found: ${relativePath}`;
        },
        {
            name: "read_file",
            description: "Read the content of a file to extract dependencies or analyze source code syntax.",
            schema: z.object({ relativePath: z.string().describe("Relative path from repo root") })
        }
    );

    const listDirTool = tool(
        async ({ relativePath, ignoreDirs }: { relativePath: string; ignoreDirs?: string[] }): Promise<string> => {
            const fullPath = resolvePath(relativePath === "." ? "" : relativePath);
            if (!fullPath || !fullPath.startsWith(localPath)) return `Directory not found: ${relativePath}`;
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                const files = fs.readdirSync(fullPath);
                let cleanFiles = files.filter(f => f !== ".git");
                if (ignoreDirs && Array.isArray(ignoreDirs)) {
                    cleanFiles = cleanFiles.filter(f => !ignoreDirs.includes(f));
                }
                return cleanFiles.join("\n");
            }
            return `Directory not found: ${relativePath}`;
        },
        {
            name: "list_directory",
            description: "List the contents of a directory. IMPORTANT: For massive directories like dependency vendors, ALWAYS provide an ignoreDirs array based on the framework (e.g., ['node_modules', 'venv', 'target']).",
            schema: z.object({
                relativePath: z.string().describe("Relative path (use '.' for root)"),
                ignoreDirs: z.array(z.string()).optional().describe("Array of framework-specific directories to explicitly ignore")
            })
        }
    );

    const searchCodebaseTool = tool(
        async ({ query, fileExtension }: { query: string; fileExtension?: string }): Promise<string> => {
            try {
                const extFilter = fileExtension ? `-- "*.${fileExtension.replace(/^\./, '')}"` : "";
                const cmd = `git grep -i -I -n "${query}" ${extFilter}`;
                const output = execSync(cmd, { cwd: localPath, encoding: "utf-8" }).trim();
                const lines = output.split('\n');
                if (lines.length > 50) {
                    return lines.slice(0, 50).join("\n") + "\n\n... (results truncated for context limits - refine your query)";
                }
                return output;
            } catch (err: any) {
                if (err.status === 1) return `No matches found for '${query}'.`;
                return `Search error: ${err.message}`;
            }
        },
        {
            name: "search_codebase",
            description: "Search the entire codebase for a specific string, class name, or reference (like grep).",
            schema: z.object({
                query: z.string().describe("The exact text to search for"),
                fileExtension: z.string().optional().describe("Optional file extension")
            })
        }
    );

    const getRepositoryMapTool = tool(
        async (): Promise<string> => {
            try {
                const output = execSync("git ls-files", { cwd: localPath, encoding: "utf-8" }).trim();
                const lines = output.split('\n');
                if (lines.length > 500) {
                    return lines.slice(0, 500).join("\n") + "\n\n... (truncated)";
                }
                return output;
            } catch (err: any) {
                return `Map error: ${err.message}`;
            }
        },
        {
            name: "get_repository_map",
            description: "Get a complete flat list of all tracked files in the repository.",
            schema: z.object({})
        }
    );

    const getComponentDetailsAstTool = tool(
        async ({ relativePath }: { relativePath: string }): Promise<string> => {
            const fullPath = resolvePath(relativePath);
            if (!fullPath || !fs.existsSync(fullPath)) return `File not found: ${relativePath}`;
            try {
                const Parser = require("tree-sitter");
                const parser = new Parser();
                let language;
                let queries: string[] = [];

                if (relativePath.endsWith(".ts") || relativePath.endsWith(".tsx")) {
                    language = require("tree-sitter-typescript").typescript;
                    queries = [
                        "(import_statement) @dependency",
                        "(namespace_definition name: (identifier) @boundary)",
                        "(class_declaration name: (identifier) @class.name)",
                        "(property_signature name: (property_identifier) @attribute.name)",
                        "(public_field_definition name: (property_identifier) @attribute.name)",
                        "(method_definition name: (property_identifier) @method.name)",
                        "(function_declaration name: (identifier) @method.name)"
                    ];
                } else if (relativePath.endsWith(".java")) {
                    language = require("tree-sitter-java");
                    queries = [
                        "(package_declaration) @boundary",
                        "(import_declaration) @dependency",
                        "(class_declaration name: (identifier) @class.name)",
                        "(field_declaration declarator: (variable_declarator name: (identifier) @attribute.name))",
                        "(method_declaration name: (identifier) @method.name)"
                    ];
                } else if (relativePath.endsWith(".cs")) {
                    language = require("tree-sitter-c-sharp");
                    queries = [
                        "(using_directive) @dependency",
                        "(namespace_declaration name: (_) @boundary)",
                        "(class_declaration name: (identifier) @class.name)",
                        "(field_declaration declarator: (variable_declarator (identifier) @attribute.name))",
                        "(property_declaration (identifier) @attribute.name)",
                        "(method_declaration (identifier) @method.name)"
                    ];
                } else {
                    return "Unsupported AST language for deep structural analysis.";
                }

                parser.setLanguage(language);
                const tree = parser.parse(fs.readFileSync(fullPath, "utf-8"));
                const query = new Parser.Query(language, queries.join(" "));
                const captures = query.captures(tree.rootNode);

                let output = captures.map((c: any) => {
                    const type = c.name.split('.')[0] || c.name;
                    return `[${type}] ${c.node.text.split('\n')[0].trim()}`;
                });

                return output.slice(0, 300).join("\n");
            } catch (err: any) {
                return `AST Error: ${err.message}`;
            }
        },
        {
            name: "get_component_details_ast",
            description: "Deep structural analysis (Level 3/4). Extracts Boundary (Namespace), Dependencies (Imports), Attributes, and Methods.",
            schema: z.object({ relativePath: z.string() })
        }
    );

    const findInfrastructureSignalsTool = tool(
        async ({ query, type }: { query?: string; type?: "files" | "content" | "both" }): Promise<string> => {
            try {
                const signals: string[] = [];
                const searchType = type || "both";

                // 1. Dynamic File Search (if query or "files"/"both" is specified)
                if (searchType === "files" || searchType === "both") {
                    const filePattern = query || "Dockerfile,docker-compose,terraform,k8s,package.json,pom.xml,appsettings,web.config,.env";
                    const patterns = filePattern.split(',').map(p => p.trim());
                    
                    for (const pattern of patterns) {
                        try {
                            // Find files matching the pattern (max depth 3 for performance)
                            const output = execSync(`find . -maxdepth 3 -name "*${pattern}*"`, { cwd: localPath, encoding: "utf-8" }).trim();
                            if (output) {
                                signals.push(`[Files Found] Pattern '${pattern}':\n${output.split('\n').slice(0, 5).join('\n')}`);
                            }
                        } catch (e) { }
                    }
                }

                // 2. Dynamic Content Search (if query or "content"/"both" is specified)
                if (searchType === "content" || searchType === "both") {
                    const contentQuery = query || "aws,azure,google,gcp,stripe,redis,mongodb,postgres,sql,amqp,kafka";
                    const patterns = contentQuery.split(',').map(p => p.trim());
                    
                    // Focus grep on common config files to avoid noise
                    const configFiles = ["appsettings.json", "web.config", ".env", "package.json", "pom.xml", "go.mod", "requirements.txt"];
                    const existingConfigs = configFiles.filter(f => fs.existsSync(path.join(localPath, f)));

                    for (const pattern of patterns) {
                        try {
                            const cmd = `grep -li "${pattern}" ${existingConfigs.join(' ')}`;
                            if (existingConfigs.length > 0) {
                                const output = execSync(cmd, { cwd: localPath, encoding: "utf-8" }).trim();
                                if (output) {
                                    signals.push(`[Content Match] '${pattern}' found in:\n${output}`);
                                }
                            }
                        } catch (e) { }
                    }
                }

                if (signals.length === 0) return `No infrastructure signals found for query: ${query || 'default'}`;
                return signals.join("\n\n");
            } catch (err: any) {
                return `Infrastructure Scan Error: ${err.message}`;
            }
        },
        {
            name: "find_infrastructure_signals",
            description: "Autonomously scans the codebase for infrastructure markers. Can search for file patterns or content patterns within configuration files. Leave query empty for default broad scan.",
            schema: z.object({
                query: z.string().optional().describe("Comma-separated list of file/content patterns to hunt for (e.g. 'aws,s3,bucket')."),
                type: z.enum(["files", "content", "both"]).optional().describe("Whether to search for filenames, file content, or both.")
            })
        }
    );

    const validateMermaidTool = tool(
        async ({ diagram }: { diagram: string }): Promise<string> => {
            const validatorScript = `
import { JSDOM } from 'jsdom';

// Setup Mock DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mermaid"></div></body></html>', {
  url: 'http://localhost',
});

// Polyfill globals for Mermaid
Object.defineProperties(global, {
  window: { value: dom.window, writable: true, configurable: true },
  document: { value: dom.window.document, writable: true, configurable: true },
  navigator: { value: dom.window.navigator, writable: true, configurable: true },
});

// Import mermaid AFTER mocking globals
import mermaid from 'mermaid';

// Mermaid initialization
mermaid.initialize({
  startOnLoad: false,
});

async function run() {
  try {
    const input = fs.readFileSync(0, 'utf-8');
    await mermaid.parse(input, { suppressErrors: false });
    process.stdout.write('OK');
    process.exit(0);
  } catch (err) {
    process.stderr.write(err.message || String(err));
    process.exit(1);
  }
}
import fs from 'fs';
run();
`;
            const scriptPath = path.join("/tmp", `mermaid-val-${Math.random().toString(36).substr(2, 9)}.mjs`);
            fs.writeFileSync(scriptPath, validatorScript);

            try {
                execSync(`node ${scriptPath}`, {
                    input: diagram,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: localPath // Run in localPath to ensure node_modules resolution if needed, though we use global-ish imports
                });
                return "OK: Mermaid syntax is valid.";
            } catch (err: any) {
                const errorOutput = err.stderr?.toString() || err.message;
                return `ERROR: Mermaid syntax is invalid. ${errorOutput}`;
            } finally {
                if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
            }
        },
        {
            name: "validate_mermaid",
            description: "Validate Mermaid diagram syntax using the real Mermaid parser. Returns 'OK' or an error message.",
            schema: z.object({ diagram: z.string().describe("The Mermaid diagram string (without ```mermaid wrappers)") })
        }
    );

    return [readFileTool, listDirTool, searchCodebaseTool, getRepositoryMapTool, getComponentDetailsAstTool, findInfrastructureSignalsTool, validateMermaidTool];
}
