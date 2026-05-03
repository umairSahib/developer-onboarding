import * as readline from "readline";
import chalk from "chalk";
import OpenAI from "openai";
import { client, DRY_RUN, functions, MODEL, OLLAMA_BASE_URL, PROVIDER, RUN_ALL_PHASE_TOOLS, SYSTEM_PROMPT } from "./runtime.js";
import { detectDirectToolIntent, inferDefaultArgs } from "./intent.js";
import { callMCPToolWithProgress } from "./toolRunner.js";
import { askConfirmation, box, ExecutionRecord, log, renderHumanResult, timestamp } from "./ui.js";
import { exportOnboardingSummary } from "./report.js";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
  name?: string;
}

const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

export async function chat(userMessage: string): Promise<void> {
  messages.push({ role: "user", content: userMessage });
  const executionReport: ExecutionRecord[] = [];
  const agentResultLines: string[] = [];
  const directTool = detectDirectToolIntent(userMessage);

  log(`\n${chalk.gray("─".repeat(60))}`);

  if (directTool) {
    log(chalk.gray(`Direct intent matched: ${directTool}`));
    const approved = await askConfirmation(`Proceed with next step "${directTool}"?`);
    if (!approved) {
      log(chalk.yellow(`⏭️  Skipped: ${directTool}`));
      return;
    }

    if (directTool === "run_all_phases") {
      log(`\n${chalk.yellow.bold("📦 Expanding run_all_phases into interactive steps")}`);
      for (const phaseTool of RUN_ALL_PHASE_TOOLS) {
        const phaseApproved = await askConfirmation(`Proceed with next step "${phaseTool}"?`);
        if (!phaseApproved) {
          log(chalk.yellow(`⏭️  Skipped: ${phaseTool}`));
          continue;
        }
        const phaseArgs = inferDefaultArgs(phaseTool);
        const { result: phaseResult } = callMCPToolWithProgress(phaseTool, phaseArgs);
        log(chalk.blue(`📦 Result (${phaseTool}):`));
        let parsedPhase: any;
        try { parsedPhase = JSON.parse(phaseResult); } catch { parsedPhase = phaseResult; }
        const humanLines = renderHumanResult(phaseTool, parsedPhase);
        for (const line of humanLines) {
          log(`   ${chalk.gray(line)}`);
        }
        agentResultLines.push(...humanLines);
      }
      return;
    }

    const directArgs = inferDefaultArgs(directTool);
    const { result, parsed } = callMCPToolWithProgress(directTool, directArgs);
    log(chalk.blue(`[${timestamp()}] 📦 Result:`));
    let parsedDirect: any;
    try { parsedDirect = JSON.parse(result); } catch { parsedDirect = result; }
    const directLines = renderHumanResult(directTool, parsedDirect);
    for (const line of directLines) {
      log(`   ${chalk.gray(line)}`);
    }
    agentResultLines.push(...directLines);
    const serialized = typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed);
    if (typeof parsed === "object" && (parsed?.error || parsed?.success === false || parsed?.all_success === false)) {
      executionReport.push({ tool: directTool, status: "failed", detail: parsed?.error || "Tool reported failure" });
    } else if (serialized.includes('"skipped":true') || serialized.includes("[SKIP]")) {
      executionReport.push({ tool: directTool, status: "skipped", detail: "Already installed or intentionally skipped" });
    } else {
      executionReport.push({ tool: directTool, status: "installed", detail: "Executed successfully" });
    }
    try {
      const exported = await exportOnboardingSummary(executionReport, agentResultLines);
      log(chalk.cyan("\nSummary exported:"));
      log(`  • TXT:  ${exported.txtPath}`);
    } catch (error: any) {
      log(chalk.red(`Could not export summary files: ${error.message}`));
    }
    return;
  }

  let iteration = 0;
  const MAX_ITERATIONS = 20;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools: functions,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;
    messages.push({
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls,
    });

    if (!message.tool_calls || message.tool_calls.length === 0) {
      log(`\n${chalk.green.bold("🤖 Agent:")}`);
      log(message.content || "");
      break;
    }

    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments || "{}");

      if (fnName === "run_all_phases") {
        log(`\n${chalk.yellow.bold("📦 Expanding run_all_phases into interactive steps")}`);
        for (const phaseTool of RUN_ALL_PHASE_TOOLS) {
          const approved = await askConfirmation(`Proceed with next step "${phaseTool}"?`);
          if (!approved) {
            log(chalk.yellow(`⏭️  Skipped: ${phaseTool}`));
            executionReport.push({
              tool: phaseTool,
              status: "skipped",
              detail: "Skipped by developer confirmation",
            });
            continue;
          }

          const phaseArgs = inferDefaultArgs(phaseTool);
          log(`\n${chalk.yellow.bold(`⚡ Calling Tool: ${phaseTool}`)}`);
          if (Object.keys(phaseArgs).length > 0) {
            log(chalk.gray(`   Args: ${JSON.stringify(phaseArgs)}`));
          }

          const { parsed: parsedPhase } = callMCPToolWithProgress(phaseTool, phaseArgs);

          const serializedPhase = typeof parsedPhase === "object" ? JSON.stringify(parsedPhase) : String(parsedPhase);
          if (typeof parsedPhase === "object" && (parsedPhase?.error || parsedPhase?.success === false)) {
            executionReport.push({
              tool: phaseTool,
              status: "failed",
              detail: parsedPhase?.error || "Tool reported failure",
            });
          } else if (serializedPhase.includes('"skipped":true') || serializedPhase.includes("[SKIP]")) {
            executionReport.push({
              tool: phaseTool,
              status: "skipped",
              detail: "Already installed or intentionally skipped",
            });
          } else {
            executionReport.push({
              tool: phaseTool,
              status: "installed",
              detail: "Executed successfully",
            });
          }

          log(chalk.blue(`[${timestamp()}] 📦 Result:`));
          const humanLines = renderHumanResult(phaseTool, parsedPhase);
          for (const line of humanLines) {
            log(`   ${chalk.gray(line)}`);
          }
          agentResultLines.push(...humanLines);
        }

        const synthetic = JSON.stringify({
          expanded: true,
          source: "run_all_phases",
          executed_tools: RUN_ALL_PHASE_TOOLS,
        });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: fnName,
          content: synthetic,
        });
        continue;
      }

      const approved = await askConfirmation(`Proceed with next step "${fnName}"?`);
      if (!approved) {
        const skipped = JSON.stringify({
          skipped: true,
          tool: fnName,
          reason: "Skipped by developer confirmation",
        });
        log(chalk.yellow(`⏭️  Skipped: ${fnName}`));
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: fnName,
          content: skipped,
        });
        executionReport.push({
          tool: fnName,
          status: "skipped",
          detail: "Skipped by developer confirmation",
        });
        continue;
      }

      log(`\n${chalk.yellow.bold(`⚡ Calling Tool: ${fnName}`)}`);
      if (Object.keys(fnArgs).length > 0) {
        log(chalk.gray(`   Args: ${JSON.stringify(fnArgs)}`));
      }

      const { result, parsed } = callMCPToolWithProgress(fnName, fnArgs);

      const serialized = typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed);
      if (typeof parsed === "object" && (parsed?.error || parsed?.success === false)) {
        executionReport.push({
          tool: fnName,
          status: "failed",
          detail: parsed?.error || "Tool reported failure",
        });
      } else if (serialized.includes('"skipped":true') || serialized.includes("[SKIP]")) {
        executionReport.push({
          tool: fnName,
          status: "skipped",
          detail: "Already installed or intentionally skipped",
        });
      } else {
        executionReport.push({
          tool: fnName,
          status: "installed",
          detail: "Executed successfully",
        });
      }

      log(chalk.blue(`[${timestamp()}] 📦 Result:`));
      const humanLines = renderHumanResult(fnName, parsed);
      for (const line of humanLines) {
        log(`   ${chalk.gray(line)}`);
      }
      agentResultLines.push(...humanLines);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: fnName,
        content: result,
      });
    }
  }

  if (executionReport.length > 0) {
    const installed = executionReport.filter((r) => r.status === "installed");
    const skipped = executionReport.filter((r) => r.status === "skipped");
    const failed = executionReport.filter((r) => r.status === "failed");

    box("📋 Onboarding Summary", failed.length > 0 ? chalk.yellow : chalk.green);
    log(chalk.green(`Installed (${installed.length})`));
    installed.forEach((r) => log(`  • ${r.tool}`));

    log(chalk.cyan(`Skipped (${skipped.length})`));
    skipped.forEach((r) => log(`  • ${r.tool} — ${r.detail}`));

    log(chalk.red(`Failed (${failed.length})`));
    failed.forEach((r) => log(`  • ${r.tool} — ${r.detail}`));

    try {
      const exported = await exportOnboardingSummary(executionReport, agentResultLines);
      log(chalk.cyan("\nSummary exported:"));
      log(`  • TXT:  ${exported.txtPath}`);
    } catch (error: any) {
      log(chalk.red(`Could not export summary files: ${error.message}`));
    }
  }
}

export async function startCli() {
  box(
    `🚀 Provisioning Agent  |  Mode: ${DRY_RUN ? "DRY_RUN ✅" : "REAL ⚠️ "}`,
    DRY_RUN ? chalk.green : chalk.yellow,
  );

  log(`\n${chalk.white(`Provider: ${PROVIDER.toUpperCase()} | Model: ${MODEL}`)}`);
  if (PROVIDER === "ollama") {
    log(chalk.gray(`Ollama base URL: ${OLLAMA_BASE_URL}`));
  }
  log(chalk.gray(`Mode: ${DRY_RUN ? "DRY_RUN=true (safe)" : "DRY_RUN=false (real execution)"}`));
  log(`\n${chalk.cyan("Commands you can use:")}`);
  log(`  • ${chalk.white("install all")}          → Full environment setup`);
  log(`  • ${chalk.white("install mysql")}         → Install & verify MySQL`);
  log(`  • ${chalk.white("install php")}           → Install all PHP versions`);
  log(`  • ${chalk.white("install node")}          → Install NVM + Node.js`);
  log(`  • ${chalk.white("setup ssh")}             → Generate SSH keys`);
  log(`  • ${chalk.white("verify databases")}      → Run all version checks`);
  log(`  • ${chalk.white("check versions")}        → Show installed tool versions`);
  log(`  • ${chalk.white("show plan")}             → Display full provisioning plan`);
  log(`  • ${chalk.white("exit")}                  → Quit`);
  log(`\n${chalk.gray("─".repeat(60))}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(`\n${chalk.magenta.bold("You > ")}`, async (input) => {
      const trimmed = input.trim();
      if (!trimmed) return prompt();
      if (trimmed.toLowerCase() === "exit") {
        log(`\n${chalk.cyan("👋 Goodbye!")}\n`);
        rl.close();
        process.exit(0);
      }
      try {
        await chat(trimmed);
      } catch (err: any) {
        log(`\n${chalk.red(`❌ Error: ${err.message}`)}`);
      }
      prompt();
    });
  };

  prompt();
}
