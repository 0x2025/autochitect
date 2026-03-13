# Autochitect

Autonomous AI Architect for codebase analysis and C4 reporting.

## Installation

```bash
npm install -g autochitect
```

Or run directly via npx:

```bash
npx autochitect <repo-url>
```

## Setup

Autochitect requires a Google Gemini API Key. Set it in your environment:

```bash
export GOOGLE_API_KEY=your_key_here
```

## Usage

Analyze a repository:

```bash
autochitect https://github.com/user/repo
```

### Options

- `-t, --token <token>`: GitHub Personal Access Token (for private repos).
- `-e, --eval`: Run in local evaluation mode (uses `.test-workspace` directory).
- `-p, --provider <provider>`: LLM Provider (`google-genai`, `google-vertexai`, `anthropic`, `openai`, `ollama`).
- `-m, --model <model>`: Specific LLM model name (e.g., `claude-3-5-sonnet`, `llama3.1`).
- `-v, --version`: Show version number.
- `-h, --help`: Show help.

## Supported Providers

Autochitect will automatically detect your provider based on available environment variables, but you can override it using the `--provider` flag.

| Provider | Environment Variable | Default Model (High) |
|----------|----------------------|----------------------|
| **Gemini (API)** | `GOOGLE_API_KEY` | `gemini-3.1-pro` |
| **Claude** | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet` |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` |
| **Vertex AI** | `GOOGLE_APPLICATION_CREDENTIALS` | `gemini-3.1-pro` |
| **Ollama** | `OLLAMA_HOST` (optional) | `llama3.1` |

## Output

The agent will generate a `report.json` in your current working directory. This file can be loaded into the [Autochitect Web App](https://autochitect.web.app) for review and validation.
