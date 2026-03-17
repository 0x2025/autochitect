# Mermaid Validator Expert (using `gemini-cli`)

This script implements a Mermaid Validator Expert system for `autochitect`. It uses `gemini-cli` to generate a diagram and subsequently acts as an expert parser to validate the output. If the generated diagram has syntax errors, the expert loop automatically feeds those errors back to the generator to attempt a fix, retrying up to `MAX_RETRIES`.

## Requirements

- `gemini-cli` installed and authenticated (`brew install gemini-cli` or `npm -g i gemini-cli` if applicable)
- Node.js environment

## Implementation Highlights

- **`mermaid-expert.js`**: A Node.js wrapper that orchestrates calls to `gemini` in your shell. 
- It has 3 distinct interactions via `gemini-cli`:
  1. **Generate**: Prompts the expert model for an initial Mermaid graph.
  2. **Validate**: Uses `gemini --output-format json` to act as a strict syntax parser returning structural errors.
  3. **Fix**: If validation fails, feeds the original failing code and the JSON errors back to the model to correct them.

## Usage

```bash
# Run the expert script with your diagram requirements
node mermaid-expert.js "Draw a C4 diagram for a web application connecting to a SQL database"
```

The script will output `diagram.mmd` upon successful validation, or `diagram_failed.mmd` if the maximum retries were reached.