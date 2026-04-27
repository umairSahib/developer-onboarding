# Developer Onboarding Agent (MCP + LLM)

This project automates Ubuntu developer onboarding with:

- an MCP server (`src/index.js`) that exposes provisioning tools
- an interactive CLI agent (`agent/agent.ts`) that uses an LLM to call those tools
- support for both `OpenAI` and `Ollama` providers
- safe execution modes (`DRY_RUN=true|false`)
- skip logic for already installed components
- user confirmation before each installation step

## Stack

- Runtime: `Node.js`
- Languages: `TypeScript` (agent), `JavaScript ESM` (MCP server)
- MCP SDK: `@modelcontextprotocol/sdk`
- LLM SDK: `openai` (also used for Ollama OpenAI-compatible endpoint)
- CLI: `readline`
- System execution: `child_process.execSync`
- TS runner: `tsx`

## Project Structure

- `src/index.js`  
  MCP server and onboarding tool execution engine.
- `agent/agent.ts`  
  Interactive agent, tool-calling loop, confirmations, summary output.
- `.env.example`  
  Environment variable template.

## Setup

```bash
npm install
```

## Environment Variables

Use `.env.example` as reference.

Key variables:

- `LLM_PROVIDER=openai|ollama`
- `LLM_MODEL=<model-name>`
- `DRY_RUN=true|false`
- `OPENAI_API_KEY=<required only for openai provider>`
- `OLLAMA_BASE_URL=http://127.0.0.1:11434/v1`
- `OLLAMA_MODEL=llama3.1`

## Run

Start MCP server:

```bash
npm start
```

Start interactive agent:

```bash
npm run agent
```

## Modes

- `DRY_RUN=true`  
  Simulates commands (no real system changes).
- `DRY_RUN=false`  
  Executes real install/configuration commands.

## Core Commands in Agent

- `show plan`
- `install all`
- `install mysql`
- `install php`
- `install node`
- `setup ssh`
- `verify databases`
- `exit`

## Important Behaviors Implemented

- **Direct intent matching**  
  Common user phrases map to tools directly.
- **Strict confirmation**  
  Every step asks `(y/n)` and accepts only exact `y` or `n`.
- **Run-all interactive expansion**  
  `install all` expands to phase-by-phase prompts.
- **Skip already installed**  
  MySQL/PostgreSQL/Redis/snap apps/PHP versions/curl/nvm checks.
- **Readable output**  
  Human-readable status lines instead of raw JSON blobs.
- **Summary report**  
  End summary shows installed/skipped/failed items.

## Notes

- Some steps are intentionally guided/manual (for example JetBrains/Chrome flows, terminal restart for `nvm` usage).
- `install_nvm_and_node` checks if Node is already available and reports status clearly.
- For real execution, your user must have proper `sudo` permissions.
# developer-onboarding
