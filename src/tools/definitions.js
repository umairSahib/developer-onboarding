export const tools = [
  {
    name: "system_update",
    description: "Phase 1: Update the apt package list on Ubuntu",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "install_mysql",
    description: "Phase 2.1-2.3: Install MySQL server, client, and common packages",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "install_postgresql",
    description: "Phase 2.4: Install PostgreSQL database server",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "install_redis",
    description: "Phase 2.5: Install Redis server",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "verify_databases",
    description: "Phase 3: Verify MySQL, PostgreSQL, and Redis installations by checking versions",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "configure_mysql",
    description: "Phase 4: Guided steps to configure MySQL root user with mysql_native_password",
    inputSchema: {
      type: "object",
      properties: {
        password: {
          type: "string",
          description: "New MySQL root password to set",
        },
      },
      required: ["password"],
    },
  },
  {
    name: "configure_postgresql",
    description: "Phase 5: Guided steps to configure PostgreSQL postgres user password",
    inputSchema: {
      type: "object",
      properties: {
        password: {
          type: "string",
          description: "New PostgreSQL postgres user password",
        },
      },
      required: ["password"],
    },
  },
  {
    name: "install_snap_apps",
    description: "Phase 6: Install Slack, Discord, Sublime Text, VLC, and Zoom via snap",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "install_fuse_for_jetbrains",
    description: "Phase 7: Install fuse dependency required by JetBrains Toolbox",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "jetbrains_toolbox_guide",
    description: "Phase 7: Return guided steps to download and launch JetBrains Toolbox and install IDEs",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "chrome_install_guide",
    description: "Phase 8: Return guided steps to download and install Google Chrome on Ubuntu",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "install_php_versions",
    description: "Phase 9: Install PHP 8.1, 8.2, 8.3 and add the Ondrej PPA repository",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "install_php84_extensions",
    description: "Phase 9.7: Install PHP 8.4 with all required extensions (cli, fpm, xml, bcmath, intl, gd, zip, curl, redis, mbstring, pgsql, sqlite3, etc.)",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "install_nvm_and_node",
    description: "Phase 10: Install curl, download and run NVM install script, then install Node 20.18",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "generate_ssh_key",
    description: "Phase 11.1: Generate RSA 4096-bit SSH key for localpay-staging",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "configure_ssh_host",
    description: "Phase 11.2-11.3: Add GitHub SSH host config and test the connection",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_mode",
    description: "Returns current execution mode: DRY_RUN or REAL",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "show_plan",
    description: "Returns full onboarding phase plan without executing commands",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "check_installed_versions",
    description: "Shows versions of already installed core onboarding tools (MySQL, PostgreSQL, Redis, PHP, Node, npm, git, curl)",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "run_all_phases",
    description: "Execute ALL provisioning phases in order (Phases 1-11). Runs complete developer environment setup.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
];
