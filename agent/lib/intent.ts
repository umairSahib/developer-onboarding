export function inferDefaultArgs(toolName: string): Record<string, unknown> {
  if (toolName === "configure_mysql" || toolName === "configure_postgresql") {
    return { password: "password" };
  }
  return {};
}

function normalizeInput(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasToken(tokens: string[], ...words: string[]): boolean {
  return words.some((w) => tokens.includes(w));
}

export function detectDirectToolIntent(input: string): string | null {
  const n = normalizeInput(input);
  const tokens = n.split(" ").filter(Boolean);
  if (hasToken(tokens, "version", "versions") && hasToken(tokens, "check", "verify", "show", "run")) return "check_installed_versions";
  if (hasToken(tokens, "install", "setup") && hasToken(tokens, "all")) return "run_all_phases";
  if (n.includes("show plan") || n === "plan") return "show_plan";
  if (hasToken(tokens, "install", "setup") && hasToken(tokens, "mysql")) return "install_mysql";
  if (hasToken(tokens, "install", "setup") && hasToken(tokens, "node", "nvm")) return "install_nvm_and_node";
  if (hasToken(tokens, "install", "setup") && hasToken(tokens, "php")) return "install_php_versions";
  if (hasToken(tokens, "install", "setup") && hasToken(tokens, "redis")) return "install_redis";
  if (hasToken(tokens, "install", "setup") && hasToken(tokens, "postgres", "postgresql")) return "install_postgresql";
  if (hasToken(tokens, "verify") && hasToken(tokens, "database", "databases")) return "verify_databases";
  if (hasToken(tokens, "setup") && hasToken(tokens, "ssh")) return "generate_ssh_key";
  return null;
}
