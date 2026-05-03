import OpenAI from "openai";

export const DRY_RUN = process.env.DRY_RUN !== "false";
export const PROVIDER = (process.env.LLM_PROVIDER || "ollama").toLowerCase();
export const MODEL =
  process.env.LLM_MODEL ||
  (PROVIDER === "ollama" ? process.env.OLLAMA_MODEL || "llama3.1" : "gpt-4o");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";

if (PROVIDER !== "openai" && PROVIDER !== "ollama") {
  console.error("Invalid LLM_PROVIDER. Use 'openai' or 'ollama'.");
  process.exit(1);
}

if (PROVIDER === "openai" && !OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set.");
  process.exit(1);
}

export const client =
  PROVIDER === "ollama"
    ? new OpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "ollama",
        baseURL: OLLAMA_BASE_URL,
      })
    : new OpenAI({ apiKey: OPENAI_API_KEY });

export const functions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: "function", function: { name: "system_update", description: "Phase 1: Run sudo apt update to refresh package list", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "install_mysql", description: "Phase 2: Install MySQL server, client, and common packages", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "install_postgresql", description: "Phase 2: Install PostgreSQL database server", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "install_redis", description: "Phase 2: Install Redis server", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "verify_databases", description: "Phase 3: Verify MySQL, PostgreSQL, and Redis are installed correctly", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "configure_mysql", description: "Phase 4: Configure MySQL root user password", parameters: { type: "object", properties: { password: { type: "string", description: "New MySQL root password" } }, required: ["password"] } } },
  { type: "function", function: { name: "configure_postgresql", description: "Phase 5: Configure PostgreSQL postgres user password", parameters: { type: "object", properties: { password: { type: "string", description: "New PostgreSQL password" } }, required: ["password"] } } },
  { type: "function", function: { name: "install_snap_apps", description: "Phase 6: Install Slack, Discord, Sublime Text, VLC, and Zoom", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "install_fuse_for_jetbrains", description: "Phase 7: Install fuse dependency for JetBrains Toolbox", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "jetbrains_toolbox_guide", description: "Phase 7: Get guided steps to install JetBrains Toolbox and IDEs", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "chrome_install_guide", description: "Phase 8: Get guided steps to install Google Chrome", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "install_php_versions", description: "Phase 9: Install PHP 8.1, 8.2, 8.3 with PPA", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "install_php84_extensions", description: "Phase 9: Install PHP 8.4 with all extensions", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "install_nvm_and_node", description: "Phase 10: Install NVM and Node.js 20.18", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "generate_ssh_key", description: "Phase 11: Generate RSA 4096-bit SSH key for localpay-staging", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "configure_ssh_host", description: "Phase 11: Add GitHub SSH host config and test connection", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "show_plan", description: "Show full onboarding execution plan without running installs", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "check_installed_versions", description: "Show versions for already installed core tools (mysql, postgresql, redis, php, node, npm, git, curl)", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "run_all_phases", description: "Execute ALL provisioning phases 1-11 in order for complete dev environment setup", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function", function: { name: "get_mode", description: "Get the current execution mode (DRY_RUN or REAL)", parameters: { type: "object", properties: {}, required: [] } } },
];

export const SYSTEM_PROMPT = `You are a Provisioning Agent responsible for setting up a complete developer environment on Ubuntu Linux.

RULES:
1. You ONLY use the provided tools — never invent commands
2. You ALWAYS show a plan before executing
3. You execute tools in the correct order (dependencies first)
4. After each phase, summarize what was done
5. For guided steps (JetBrains, Chrome), return the steps clearly formatted
6. Current mode: ${DRY_RUN ? "DRY_RUN (safe - no real execution)" : "REAL (commands execute on system)"}

TOOL ORDER (when running all):
Phase 1 → system_update
Phase 2 → install_mysql, install_postgresql, install_redis
Phase 3 → verify_databases
Phase 4 → configure_mysql (needs password)
Phase 5 → configure_postgresql (needs password)
Phase 6 → install_snap_apps
Phase 7 → install_fuse_for_jetbrains, jetbrains_toolbox_guide
Phase 8 → chrome_install_guide
Phase 9 → install_php_versions, install_php84_extensions
Phase 10 → install_nvm_and_node
Phase 11 → generate_ssh_key, configure_ssh_host

Always be precise, safe, and deterministic.`;

export const RUN_ALL_PHASE_TOOLS = [
  "system_update",
  "install_mysql",
  "install_postgresql",
  "install_redis",
  "verify_databases",
  "configure_mysql",
  "configure_postgresql",
  "install_snap_apps",
  "install_fuse_for_jetbrains",
  "jetbrains_toolbox_guide",
  "chrome_install_guide",
  "install_php_versions",
  "install_php84_extensions",
  "install_nvm_and_node",
  "generate_ssh_key",
  "configure_ssh_host",
];
