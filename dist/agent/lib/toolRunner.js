import { execSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import { DRY_RUN } from "./runtime.js";
export function callMCPTool(toolName, args) {
    const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: toolName, arguments: args },
    });
    if (DRY_RUN) {
        return JSON.stringify({
            mode: "DRY_RUN",
            tool: toolName,
            args,
            output: `[DRY-RUN] Tool '${toolName}' would execute with args: ${JSON.stringify(args)}`,
            success: true,
        });
    }
    try {
        const result = execSync(`echo '${input.replace(/'/g, "\\'")}' | node src/index.js`, { encoding: "utf-8", timeout: 60000 });
        const parsed = JSON.parse(result);
        return parsed?.result?.content?.[0]?.text || result;
    }
    catch (err) {
        return JSON.stringify({ error: err.message });
    }
}
export function callMCPToolWithProgress(toolName, args) {
    const spinner = ora({
        text: chalk.cyan(`Running ${toolName}...`),
        spinner: "dots",
    }).start();
    try {
        const result = callMCPTool(toolName, args);
        let parsed;
        try {
            parsed = JSON.parse(result);
        }
        catch {
            parsed = result;
        }
        if (typeof parsed === "object" && (parsed?.error || parsed?.success === false || parsed?.all_success === false)) {
            spinner.fail(chalk.red(`${toolName} failed`));
        }
        else {
            spinner.succeed(chalk.green(`${toolName} completed`));
        }
        return { result, parsed };
    }
    catch (error) {
        spinner.fail(chalk.red(`${toolName} failed`));
        return {
            result: JSON.stringify({ error: error?.message || "Unknown error" }),
            parsed: { error: error?.message || "Unknown error" },
        };
    }
}
