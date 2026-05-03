import { DRY_RUN } from "../config.js";
import { commandSucceeds, escapeSqlLiteral, execute, isSnapInstalled } from "../utils/command.js";

export function handleTool(name, args = {}) {
  switch (name) {
    case "get_mode":
      return JSON.stringify({
        mode: DRY_RUN ? "DRY_RUN" : "REAL",
        note: DRY_RUN
          ? "Set DRY_RUN=false to execute real commands"
          : "REAL mode - commands execute on system",
      });

    case "show_plan":
      return JSON.stringify({
        type: "plan",
        phases: [
          "Phase 1: system_update",
          "Phase 2: install_mysql, install_postgresql, install_redis",
          "Phase 3: verify_databases",
          "Phase 4: configure_mysql",
          "Phase 5: configure_postgresql",
          "Phase 6: install_snap_apps",
          "Phase 7: install_fuse_for_jetbrains, jetbrains_toolbox_guide",
          "Phase 8: chrome_install_guide",
          "Phase 9: install_php_versions, install_php84_extensions",
          "Phase 10: install_nvm_and_node",
          "Phase 11: generate_ssh_key, configure_ssh_host",
        ],
      });

    case "check_installed_versions": {
      const checks = [
        { name: "mysql", command: "mysql --version" },
        { name: "postgresql", command: "psql --version" },
        { name: "redis", command: "redis-server --version" },
        { name: "php", command: "php -v" },
        { name: "node", command: "node --version" },
        { name: "npm", command: "npm --version" },
        { name: "git", command: "git --version" },
        { name: "curl", command: "curl --version" },
      ];

      const versions = checks.map((item) => {
        if (!commandSucceeds(item.command)) {
          return {
            tool: item.name,
            command: item.command,
            installed: false,
            success: false,
            output: "Not installed",
          };
        }
        const result = execute(item.command);
        return {
          tool: item.name,
          command: item.command,
          installed: true,
          ...result,
        };
      });

      return JSON.stringify({
        type: "installed_versions",
        total_checked: checks.length,
        installed_count: versions.filter((v) => v.installed).length,
        versions,
      });
    }

    case "system_update": {
      const r = execute("sudo apt update");
      return JSON.stringify({ phase: 1, step: "system_update", ...r });
    }

    case "install_mysql": {
      if (commandSucceeds("mysql --version")) {
        return JSON.stringify({
          phase: 2,
          step: "mysql",
          skipped: true,
          reason: "MySQL already installed",
        });
      }
      const steps = [
        execute("sudo apt install mysql-server -y"),
        execute("sudo apt install mysql-client -y"),
        execute("sudo apt install mysql-common -y"),
      ];
      const verify = execute("mysql --version");
      return JSON.stringify({
        phase: 2,
        step: "mysql",
        steps: ["mysql-server", "mysql-client", "mysql-common"],
        results: steps,
        verification: { command: "mysql --version", ...verify },
        success: steps.every((s) => s.success) && verify.success,
      });
    }

    case "install_postgresql": {
      if (commandSucceeds("psql --version")) {
        return JSON.stringify({
          phase: 2,
          step: "postgresql",
          skipped: true,
          reason: "PostgreSQL already installed",
        });
      }
      const r = execute("sudo apt install postgresql -y");
      const verify = execute("psql --version");
      return JSON.stringify({
        phase: 2,
        step: "postgresql",
        ...r,
        verification: { command: "psql --version", ...verify },
        success: r.success && verify.success,
      });
    }

    case "install_redis": {
      if (commandSucceeds("redis-server --version")) {
        return JSON.stringify({
          phase: 2,
          step: "redis-server",
          skipped: true,
          reason: "Redis already installed",
        });
      }
      const r = execute("sudo apt install redis-server -y");
      const verify = execute("redis-server --version");
      return JSON.stringify({
        phase: 2,
        step: "redis-server",
        ...r,
        verification: { command: "redis-server --version", ...verify },
        success: r.success && verify.success,
      });
    }

    case "verify_databases": {
      const mysql = execute("mysql --version");
      const psql = execute("psql --version");
      const redis = execute("redis-server --version");
      return JSON.stringify({
        phase: 3,
        verifications: {
          mysql: { command: "mysql --version", ...mysql },
          postgresql: { command: "psql --version", ...psql },
          redis: { command: "redis-server --version", ...redis },
        },
        all_success: mysql.success && psql.success && redis.success,
      });
    }

    case "configure_mysql": {
      const password = args.password || "password";
      const safePassword = escapeSqlLiteral(password);
      if (DRY_RUN) {
        return JSON.stringify({
          phase: 4,
          mode: "DRY_RUN",
          guided_steps: [
            "Run: sudo mysql",
            "Run: show databases;",
            "Run: select user, host from mysql.user;",
            `Run: alter user 'root'@'localhost' identified with mysql_native_password by '${safePassword}';`,
            "Press Ctrl+D to exit",
            `Run: mysql -u root -p  (enter: ${safePassword})`,
          ],
        });
      }
      const r = execute(
        `sudo mysql -e "alter user 'root'@'localhost' identified with mysql_native_password by '${safePassword}';"`,
      );
      return JSON.stringify({ phase: 4, step: "mysql_password_set", ...r });
    }

    case "configure_postgresql": {
      const password = args.password || "password";
      const safePassword = escapeSqlLiteral(password);
      if (DRY_RUN) {
        return JSON.stringify({
          phase: 5,
          mode: "DRY_RUN",
          guided_steps: [
            "Run: sudo -i -u postgres",
            "Run: psql",
            "Run: \\du",
            "Run: \\l",
            `Run: alter user postgres with password '${safePassword}';`,
            "Press Ctrl+D twice to exit",
          ],
        });
      }
      const r = execute(
        `sudo -u postgres psql -c "alter user postgres with password '${safePassword}';"`,
      );
      return JSON.stringify({ phase: 5, step: "postgres_password_set", ...r });
    }

    case "install_snap_apps": {
      const apps = [
        { name: "slack", cmd: "sudo snap install slack" },
        { name: "discord", cmd: "sudo snap install discord" },
        { name: "sublime-text", cmd: "sudo snap install sublime-text --classic" },
        { name: "vlc", cmd: "sudo snap install vlc" },
        { name: "zoom", cmd: "sudo snap install zoom-client" },
      ];
      const results = apps.map((app) => {
        if (isSnapInstalled(app.name)) {
          return {
            app: app.name,
            skipped: true,
            success: true,
            output: `[SKIP] ${app.name} already installed`,
          };
        }
        return { app: app.name, ...execute(app.cmd) };
      });
      return JSON.stringify({ phase: 6, results });
    }

    case "install_fuse_for_jetbrains": {
      const r1 = execute("sudo apt update");
      const r2 = execute("sudo apt install fuse -y");
      const r3 = execute("fusermount --version");
      return JSON.stringify({ phase: 7, steps: ["apt update", "install fuse", "verify fuse"], results: [r1, r2, r3] });
    }

    case "jetbrains_toolbox_guide":
      return JSON.stringify({
        phase: 7,
        type: "guided_setup",
        steps: [
          "1. Open: https://www.jetbrains.com/toolbox-app/",
          "2. Download the JetBrains Toolbox archive",
          "3. Run: cd ~/Downloads",
          "4. Right-click the file -> Extract Here",
          "5. Run: cd ~/Downloads/jetbrains-toolbox-x.x.x.xxxxx/ (use exact folder name)",
          "6. Run: ./jetbrains-toolbox",
          "7. Wait for the window, check Agree, press Start",
          "8. Install: PhpStorm, WebStorm, DataGrip from the UI",
        ],
      });

    case "chrome_install_guide":
      return JSON.stringify({
        phase: 8,
        type: "guided_setup",
        steps: [
          "1. Open: https://www.google.com/chrome/",
          "2. Select: 64 bit .deb (For Debian/Ubuntu)",
          "3. Press Accept and Install",
          "4. Run: cd ~/Downloads/",
          "5. Right-click google-chrome-stable -> Open with Other Application",
          "6. Choose Software Install -> Press Install -> Enter password",
          "7. Press Windows key -> type 'chrome' to verify",
        ],
      });

    case "install_php_versions": {
      const cmds = [
        { step: "install_properties", cmd: "sudo apt install software-properties-common" },
        { step: "add_ppa", cmd: "sudo add-apt-repository ppa:ondrej/php -y" },
        { step: "apt_update", cmd: "sudo apt-get update" },
        { step: "php81", cmd: "sudo apt install php8.1 -y" },
        { step: "php82", cmd: "sudo apt install php8.2 -y" },
        { step: "php83", cmd: "sudo apt install php8.3 -y" },
      ];
      const results = cmds.map((c) => {
        if (c.step === "php81" && commandSucceeds("php8.1 -v")) {
          return { step: c.step, skipped: true, success: true, output: "[SKIP] php8.1 already installed" };
        }
        if (c.step === "php82" && commandSucceeds("php8.2 -v")) {
          return { step: c.step, skipped: true, success: true, output: "[SKIP] php8.2 already installed" };
        }
        if (c.step === "php83" && commandSucceeds("php8.3 -v")) {
          return { step: c.step, skipped: true, success: true, output: "[SKIP] php8.3 already installed" };
        }
        return { step: c.step, ...execute(c.cmd) };
      });
      const verify = [
        { version: "8.1", success: commandSucceeds("php8.1 -v") },
        { version: "8.2", success: commandSucceeds("php8.2 -v") },
        { version: "8.3", success: commandSucceeds("php8.3 -v") },
      ];
      return JSON.stringify({
        phase: 9,
        note: "To switch PHP version: sudo update-alternatives --config php",
        results,
        verification: verify,
        success: results.every((r) => r.success !== false) && verify.every((v) => v.success),
      });
    }

    case "install_php84_extensions": {
      const cmd = [
        "sudo apt-get update && sudo apt-get install -y",
        "php8.4-cli php8.4-common php8.4-fpm php8.4-dev",
        "php8.4-xml php8.4-bcmath php8.4-intl php8.4-xmlrpc",
        "php8.4-gd php8.4-zip php8.4-curl php8.4-redis",
        "php8.4-http php8.4-mbstring php8.4-pgsql",
        "php8.4-uuid php8.4-mcrypt php8.4-sqlite3",
      ].join(" ");
      const r = execute(cmd);
      const verify = execute("php8.4 -v");
      return JSON.stringify({
        phase: 9,
        step: "php84_extensions",
        ...r,
        verification: { command: "php8.4 -v", ...verify },
        success: r.success && verify.success,
      });
    }

    case "install_nvm_and_node": {
      const r1 = commandSucceeds("curl --version")
        ? { skipped: true, success: true, output: "[SKIP] curl already installed" }
        : execute("sudo apt install curl -y");
      const r2 = commandSucceeds('test -s "$HOME/.nvm/nvm.sh"')
        ? { skipped: true, success: true, output: "[SKIP] nvm already installed" }
        : execute("curl -o- https://raw.githubusercontent.com/nvm-sh/0.35.3/install.sh | bash");
      const nodeAvailable = commandSucceeds("node --version");
      const r3 = nodeAvailable
        ? { skipped: true, success: true, output: "[SKIP] node already installed" }
        : { skipped: false, success: false, output: "Node not found yet. Run manual step: nvm install 20.18" };
      return JSON.stringify({
        phase: 10,
        results: [
          { step: "install_curl", ...r1 },
          { step: "install_nvm", ...r2 },
          { step: "check_node", ...r3 },
        ],
        success: r1.success && r2.success && r3.success,
        manual_step: "Close terminal, reopen, then run: nvm install 20.18",
        node_install_cmd: "nvm install 20.18",
      });
    }

    case "generate_ssh_key": {
      const r = execute(
        'ssh-keygen -t rsa -b 4096 -f ~/.ssh/localpay-staging-api -C "localpay staging key" -N ""',
      );
      return JSON.stringify({ phase: 11, step: "ssh_keygen", ...r });
    }

    case "configure_ssh_host": {
      const configBlock = [
        "Host github-local-api-staging",
        "  HostName github.com",
        "  User git",
        "  IdentityFile ~/.ssh/localpay-staging-api",
      ].join("\n");

      if (DRY_RUN) {
        return JSON.stringify({
          phase: 11,
          mode: "DRY_RUN",
          config_block: configBlock,
          steps: [
            "Add the following to ~/.ssh/config:",
            configBlock,
            "Then run: ssh -T git@github-local-api-staging",
          ],
        });
      }

      const r1 = execute(`echo "\n${configBlock}" >> ~/.ssh/config`);
      const r2 = execute("ssh -T git@github-local-api-staging");
      return JSON.stringify({
        phase: 11,
        results: [
          { step: "write_ssh_config", ...r1 },
          { step: "test_ssh_connection", ...r2 },
        ],
      });
    }

    case "run_all_phases": {
      const allTools = [
        "system_update",
        "install_mysql",
        "install_postgresql",
        "install_redis",
        "verify_databases",
        "install_snap_apps",
        "install_fuse_for_jetbrains",
        "install_php_versions",
        "install_php84_extensions",
        "install_nvm_and_node",
        "generate_ssh_key",
      ];

      const summary = allTools.map((toolName) => {
        try {
          const result = JSON.parse(handleTool(toolName, {}));
          const toolSuccess =
            result?.success === false
              ? false
              : result?.all_success === false
                ? false
                : Array.isArray(result?.results)
                  ? result.results.every((r) => r.success !== false)
                  : true;
          return { tool: toolName, status: toolSuccess ? "completed" : "failed", success: toolSuccess, result };
        } catch (e) {
          return { tool: toolName, status: "error", success: false, error: String(e) };
        }
      });

      const failedTools = summary.filter((s) => !s.success).map((s) => s.tool);
      return JSON.stringify({
        type: "full_provisioning_complete",
        mode: DRY_RUN ? "DRY_RUN" : "REAL",
        total_tools_run: allTools.length,
        overall_success: failedTools.length === 0,
        failed_tools: failedTools,
        summary,
        guided_manual_steps: [
          "Phase 4: Configure MySQL password manually (use configure_mysql tool)",
          "Phase 5: Configure PostgreSQL password manually (use configure_postgresql tool)",
          "Phase 7: Install JetBrains Toolbox manually (use jetbrains_toolbox_guide tool)",
          "Phase 8: Install Chrome manually (use chrome_install_guide tool)",
          "Phase 10: After NVM install, restart terminal then run: nvm install 20.18",
          "Phase 11: Add SSH host config and test (use configure_ssh_host tool)",
        ],
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
