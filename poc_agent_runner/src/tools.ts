import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import simpleGit from "simple-git";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export function createFileSystemTools(localPath: string) {
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
        async ({ relativePath }: any) => {
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
        async ({ relativePath, ignoreDirs }: any) => {
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
        async ({ query, fileExtension }: any) => {
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
        async () => {
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
        async ({ relativePath }: any) => {
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
        async () => {
            const signals = [
                "docker-compose.yml", "Dockerfile", "Terraform", ".env", "appsettings.json",
                "package.json", "pom.xml", ".csproj", "go.mod", "requirements.txt"
            ];
            let found: string[] = [];
            for (const signal of signals) {
                try {
                    const output = execSync(`find . -maxdepth 3 -name "*${signal}*"`, { cwd: localPath, encoding: "utf-8" }).trim();
                    if (output) found.push(...output.split('\n'));
                } catch (e) { }
            }
            return found.length > 0 ? found.join("\n") : "No common infrastructure signals found in root.";
        },
        {
            name: "find_infrastructure_signals",
            description: "Scout tool (Level 1/2). Finds Docker, IaC, and Project Manifests to infer C4 boundaries.",
            schema: z.object({})
        }
    );

    return [readFileTool, listDirTool, searchCodebaseTool, getRepositoryMapTool, getComponentDetailsAstTool, findInfrastructureSignalsTool];
}
