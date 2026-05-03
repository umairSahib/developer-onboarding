import { execSync } from "child_process";
import { DRY_RUN } from "../config.js";

export function execute(command) {
  if (DRY_RUN) {
    return {
      success: true,
      output: `[DRY-RUN] Would execute: ${command}`,
    };
  }

  try {
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
    });
    return { success: true, output: output.trim() || "Command completed successfully." };
  } catch (err) {
    return {
      success: false,
      output: err.stderr?.toString() || err.message || "Unknown error",
    };
  }
}

export function commandSucceeds(command) {
  try {
    execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
    });
    return true;
  } catch {
    return false;
  }
}

export function isSnapInstalled(name) {
  return commandSucceeds(`snap list ${name}`);
}

export function escapeSqlLiteral(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
}
