# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build TypeScript to dist/
npm run build

# Run all tests
npm test

# Run a single test file
npx jest tests/tools/contact-tools.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type-check without emitting (lint)
npm run lint

# Start the server (stdio or HTTP depending on env)
npm start

# Development with auto-reload
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `GHL_API_KEY` — GoHighLevel API key (required)
- `GHL_LOCATION_ID` — GHL location/sub-account ID (required)
- `GHL_BASE_URL` — defaults to `https://services.leadconnectorhq.com`
- `MCP_SERVER_PORT` — HTTP server port, defaults to `8000`

## Architecture

This is a **Model Context Protocol (MCP) server** that wraps the GoHighLevel (GHL) CRM API, allowing AI clients (Claude Desktop, ChatGPT) to interact with GHL via tool calls.

### Two server modes

- **`src/server.ts`** — Stdio transport (for Claude Desktop / local MCP clients). Reads/writes over stdin/stdout.
- **`src/http-server.ts`** — HTTP + SSE transport (for ChatGPT web integration). Exposes `/sse`, `/health`, `/tools` endpoints. Port via `MCP_SERVER_PORT`.
- **`server.js`** — Plain Node.js entrypoint that wraps `api/index.js` with an HTTP server; used in cloud deployments (Vercel, Railway, Render).

### Core layers

1. **`src/clients/ghl-api-client.ts`** — Single Axios-based HTTP client for all GHL API calls. All tools receive an instance of this client. Implements the GHL REST API v2021-07-28.

2. **`src/tools/*.ts`** — One file per GHL domain (contacts, conversations, calendar, etc.). Each tool class follows a consistent pattern:
   - `getToolDefinitions()` / `getTools()` — returns MCP `Tool[]` definitions with JSON Schema input descriptions
   - `executeTool(name, args)` / `execute*Tool(name, args)` — dispatches to private methods by tool name
   - Private methods call `this.ghlClient.*` and return plain objects

3. **`src/types/ghl-types.ts`** — All TypeScript types: GHL API request/response shapes (`GHL*`) and MCP parameter types (`MCP*`).

### Tool registration

Both `server.ts` and `http-server.ts` instantiate every tool class and register them identically. Tool routing uses `is*Tool(name)` string-matching helpers that maintain a hardcoded list of tool names per domain. **When adding a new tool, update the tool class AND the corresponding `is*Tool` list in both server files.**

### Tool naming conventions

- Most tools use plain snake_case names: `create_contact`, `search_conversations`
- Tools added later use a `ghl_` prefix: `ghl_get_workflows`, `ghl_create_product`

### Tests

Tests live in `tests/` and use Jest + ts-jest. Mocks are in `tests/mocks/ghl-api-client.mock.ts`. The `tests/setup.ts` file sets mock env vars globally. Tests do **not** hit the real GHL API.

To run a single test:
```bash
npx jest tests/tools/contact-tools.test.ts --verbose
```

### Adding a new tool domain

1. Create `src/tools/my-feature-tools.ts` following the existing class pattern.
2. Add GHL API methods to `src/clients/ghl-api-client.ts`.
3. Add types to `src/types/ghl-types.ts`.
4. Import and instantiate the class in both `src/server.ts` and `src/http-server.ts`.
5. Add an `isMyFeatureTool(name)` helper and wire it into the `CallToolRequestSchema` handler in both server files.
6. Add tests in `tests/tools/my-feature-tools.test.ts`.
