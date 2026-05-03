import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DRY_RUN, SERVER_INFO } from "./config.js";
import { tools } from "./tools/definitions.js";
import { handleTool } from "./tools/handlers.js";

export async function startServer() {
  const server = new Server(
    SERVER_INFO,
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = handleTool(name, args || {});
    return {
      content: [{ type: "text", text: result }],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Provisioning MCP Server running | Mode: ${DRY_RUN ? "DRY_RUN" : "REAL"}`);
}
