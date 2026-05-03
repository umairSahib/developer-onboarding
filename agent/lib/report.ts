import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { ExecutionRecord } from "./ui.js";

interface SummaryPayload {
  generated_at: string;
  totals: {
    installed: number;
    skipped: number;
    failed: number;
  };
  records: ExecutionRecord[];
  agent_results: string[];
}

function timestampForFile(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function buildText(payload: SummaryPayload): string {
  const lines = ["ONBOARDING REPORT", "", `Generated at: ${payload.generated_at}`, ""];

  lines.push("SUMMARY");
  lines.push(`Installed: ${payload.totals.installed}`);
  lines.push(`Skipped: ${payload.totals.skipped}`);
  lines.push(`Failed: ${payload.totals.failed}`);
  lines.push("");

  lines.push("TOOLS");

  for (const item of payload.records) {
    lines.push(`- ${item.tool}: ${item.status}${item.detail ? ` (${item.detail})` : ""}`);
  }

  if (payload.agent_results.length > 0) {
    lines.push("", "RESULTS");
    for (const line of payload.agent_results) {
      const clean = line
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) continue;
      if (clean.toLowerCase().includes("execution plan")) continue;
      lines.push(`- ${clean.slice(0, 140)}`);
    }
  }

  return lines.join("\n");
}

export async function exportOnboardingSummary(records: ExecutionRecord[], agentResults: string[] = []) {
  const now = new Date();
  const stamp = timestampForFile(now);
  const reportsDir = path.resolve(process.cwd(), "reports");
  await mkdir(reportsDir, { recursive: true });

  const installed = records.filter((r) => r.status === "installed").length;
  const skipped = records.filter((r) => r.status === "skipped").length;
  const failed = records.filter((r) => r.status === "failed").length;

  const payload: SummaryPayload = {
    generated_at: now.toISOString(),
    totals: { installed, skipped, failed },
    records,
    agent_results: agentResults,
  };

  const baseName = `onboarding-summary-${stamp}`;
  const txtPath = path.join(reportsDir, `${baseName}.txt`);

  const txt = buildText(payload);
  await writeFile(txtPath, txt, "utf8");

  return { txtPath };
}
