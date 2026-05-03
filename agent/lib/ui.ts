import * as readline from "readline";
import chalk from "chalk";

export interface ExecutionRecord {
  tool: string;
  status: "installed" | "skipped" | "failed";
  detail: string;
}

export function log(msg: string) {
  process.stdout.write(msg + "\n");
}

export function box(title: string, color: (text: string) => string = chalk.cyan) {
  const line = "─".repeat(60);
  const style = (text: string) => color(chalk.bold(text));
  log(`\n${style(`┌${line}┐`)}`);
  log(style(`│  ${title.padEnd(58)}│`));
  log(style(`└${line}┘`));
}

export function timestamp() {
  return new Date().toLocaleTimeString();
}

export function askConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const confirmRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = () =>
      confirmRl.question(chalk.yellow(`${question} (y/n): `), (answer) => {
        const normalized = String(answer || "").trim().toLowerCase();
        if (/^y$/.test(normalized)) {
          confirmRl.close();
          resolve(true);
          return;
        }
        if (/^n$/.test(normalized)) {
          confirmRl.close();
          resolve(false);
          return;
        }
        log(chalk.red("Please enter only 'y' or 'n'."));
        ask();
      });
    ask();
  });
}

export function renderHumanResult(toolName: string, parsed: any): string[] {
  if (typeof parsed !== "object" || parsed === null) return [String(parsed)];
  if (parsed.error) return [`❌ ${toolName}: failed - ${parsed.error}`];
  if (parsed.skipped) return [`⏭️  ${toolName}: skipped - ${parsed.reason || "already installed"}`];

  if (toolName === "verify_databases" && parsed.verifications) {
    const lines: string[] = ["🧪 Database verification results:"];
    const checks = [
      ["MySQL", parsed.verifications.mysql],
      ["PostgreSQL", parsed.verifications.postgresql],
      ["Redis", parsed.verifications.redis],
    ];

    for (const [label, info] of checks) {
      lines.push(info?.success ? `✅ ${label}: available` : `❌ ${label}: unavailable`);
    }

    lines.push(parsed.all_success ? "✅ All database checks passed" : "⚠️  Some database checks failed");
    return lines;
  }

  if (toolName === "check_installed_versions" && Array.isArray(parsed.versions)) {
    const lines: string[] = ["Installed versions report:"];
    const extractVersion = (value: string): string => {
      const text = String(value || "").split("\n")[0].trim();
      const redisMatch = text.match(/v=([0-9]+(?:\.[0-9]+)+)/i);
      if (redisMatch?.[1]) return redisMatch[1];
      const genericMatch = text.match(/\b([0-9]+(?:\.[0-9]+)+)\b/);
      if (genericMatch?.[1]) return genericMatch[1];
      return text || "installed";
    };

    for (const item of parsed.versions) {
      if (!item.installed) {
        lines.push(`${item.tool}: not installed`);
        continue;
      }
      lines.push(`${item.tool}: ${extractVersion(item.output)}`);
    }
    lines.push(`Installed: ${parsed.installed_count}/${parsed.total_checked}`);
    return lines;
  }

  const lines: string[] = [];
  if (parsed.phase && parsed.step) lines.push(`✅ Phase ${parsed.phase}: ${parsed.step} completed`);
  else if (parsed.phase) lines.push(`✅ Phase ${parsed.phase} completed`);
  else lines.push(`✅ ${toolName} completed`);

  if (Array.isArray(parsed.results)) {
    for (const r of parsed.results) {
      const name = r.step || r.app || "step";
      if (r.skipped) lines.push(`⏭️  ${name}: already installed (skipped)`);
      else if (r.success === false) lines.push(`❌ ${name}: failed`);
      else lines.push(`✅ ${name}: done`);
    }
  }
  if (parsed.manual_step) lines.push(`⚠️  Manual step: ${parsed.manual_step}`);
  if (Array.isArray(parsed.phases)) {
    lines.push("📋 Execution plan:");
    for (const p of parsed.phases) lines.push(`- ${p}`);
  }
  return lines;
}
