# Autochitect Expert Extensibility Guide

This document explains how to add new domain specialists to the Autochitect agent.

## 1. The Expert Registry (`registry.json`)

The registry is the source of truth for all experts. Each entry must follow this schema:

| Field | Description |
|-------|-------------|
| `expert_id` | Unique ID (e.g., `PYTHON_EXPERT`). Must end in `_EXPERT`. |
| `specialties` | Keywords used by the Semantic Router to dispatch the expert. |
| `triggers` | `file_patterns` and `dependency_match` for exact matching. |
| `grounding` | File extensions the expert is allowed to cite as evidence. |
| `expert_prompt_ref` | The specialized instruction for the expert. |

### Example Entry
```json
{
    "expert_id": "GO_EXPERT",
    "specialties": ["Golang", "Concurrency", "Goroutines", "Interfaces"],
    "triggers": {
        "file_patterns": [".go", "go.mod"],
        "dependency_match": ["github.com/gin-gonic"]
    },
    "grounding": { "extensions": [".go", ".mod", ".sum"] },
    "expert_prompt_ref": "Elite Go Architect. Focus on goroutine safety and interface-based decoupling.",
    "tools": ["read_file", "search_codebase", "get_component_details_ast"]
}
```

## 2. Validation

Before committing changes to the registry, run the validation script:

```bash
npm run validate:registry
```

The CI pipeline will automatically reject any PR with a malformed `registry.json`.

## 3. Grounding Rules

To prevent hallucinations, every expert report is validated against the physical codebase.
- Experts MUST cite file paths that exist in the repo.
- If an expert cites a non-existent file, the audit is aborted for that expert.

## 4. Best Practices

1. **Keep Prompts Actionable:** Tell the expert EXACTLY which files to prioritize (e.g., "MANDATORY: You MUST read the 'Dockerfile'").
2. **Standardize Verdicts:** Use institutional policies from the Moat (`moat/lessons_learned.json`) to drive standardized findings.
3. **Synergy:** Design experts to work together. The `LEAD_ARCHITECT_EXPERT` will synthesize and resolve contradictions.
