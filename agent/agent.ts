#!/usr/bin/env node
import { startCli } from "./lib/chat.js";

startCli().catch(console.error);