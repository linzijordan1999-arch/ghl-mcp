# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A GoHighLevel (GHL) MCP (Model Context Protocol) server that exposes 253+ GHL API operations as MCP tools. It runs in two modes:
- **stdio** (`src/server.ts`): for Claude Desktop, communicates over stdin/stdout
- **HTTP/SSE** (`src/http-server.ts` + `api/index.js`): for web deployments (Render, Vercel, Railway), exposes `/sse` and `/health` endpoints

The `server.js` entry point starts an HTTP server using `api/index.js` as the request handler. This loads compiled tools from `dist/tools/` at runtime.

## Commands

```bash
npm run build          # Compile TypeScript → dist/
npm run lint           # Type-check without emitting (tsc --noEmit)
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report (70% threshold enforced)
npm start              # Run server.js (HTTP mode, requires dist/ to exist)
npm run dev            # nodemon server.js (auto-restart)
npm run start:dist     # Run compiled dist/server.js (stdio mode)
```

To run a single test file:
```bash
npx jest tests/tools/contact-tools.test.ts
```

## Environment Variables

Required in `.env` (copy from `.env.example`):
```
GHL_API_KEY=pit-...
GHL_LOCATION_ID=...
GHL_BASE_URL=https://services.leadconnectorhq.com
PORT=10000
```

`GHL_API_VERSION` is hardcoded to `2021-07-28` in both server files — do not move it to env.

## Architecture

### Dual-server design

There are two independent but nearly identical server implementations:

1. **`src/server.ts`** — MCP stdio server using `@modelcontextprotocol/sdk` `StdioServerTransport`. For Claude Desktop.
2. **`src/http-server.ts`** — MCP HTTP/SSE server using `SSEServerTransport` + Express. For web deployments.
3. **`api/index.js`** — Plain Node.js HTTP handler (no TypeScript, no MCP SDK). Loads tools dynamically from `dist/tools/*.js`. Used by `server.js` for production HTTP deployments.

The `api/index.js` file has a different tool-loading mechanism — it expects each compiled tool module to export `{ tool, handler }`. The TypeScript tools export classes instead, so most routing actually happens in the class-based servers.

### Tool module pattern

Every tool module in `src/tools/` exports a class (e.g., `ContactTools`, `BlogTools`) that:
- Takes a `GHLApiClient` instance in its constructor
- Exposes `getToolDefinitions()` (or `getTools()`) returning `Tool[]` with JSON Schema `inputSchema`
- Exposes `executeTool(name, args)` (or a named execute method) that dispatches to private methods

**Inconsistency to be aware of**: some tool classes use `getToolDefinitions()` + `executeTool()`, while newer ones (associations, custom field V2, workflows, surveys, store, products, payments, invoices) use `getTools()` + a custom execute method name (`executeAssociationTool`, `handleToolCall`, etc.). Both `src/server.ts` and `src/http-server.ts` call both patterns explicitly.

### Tool routing

Both server classes maintain parallel hardcoded `is*Tool(name)` methods that check tool names against arrays. When adding a new tool:
1. Add the tool name to the relevant `is*Tool()` method in **both** `src/server.ts` and `src/http-server.ts`
2. Add the `executeTool` call branch in both `CallToolRequestSchema` handlers

### GHLApiClient

`src/clients/ghl-api-client.ts` is the sole HTTP client — a thin wrapper around `axios` that attaches `Authorization`, `Version`, and `Content-Type` headers to every request. All tool classes receive it via constructor injection.

### Types

All GHL API request/response types live in `src/types/ghl-types.ts`. MCP parameter types (prefixed `MCP*`) are also defined there.

## Testing

Tests live in `tests/` and mirror the `src/` structure. The mock client in `tests/mocks/ghl-api-client.mock.ts` (`MockGHLApiClient`) is passed as `any` to tool constructors — it only mocks the subset of methods each test needs.

`tests/setup.ts` sets required env vars globally — no `.env` file needed for tests.

Coverage threshold is 70% across branches/functions/lines/statements (`jest.config.js`).

## Deployment

- **Render**: `render.yaml` config; build = `npm install && npm run build`, start = `node server.js`
- **Docker**: `Dockerfile` builds then prunes devDeps, runs `npm start` on port 8000
- **Vercel**: `vercel.json` routes all traffic to `api/index.js`
- **Railway**: `railway.json` + `Procfile`

The compiled `dist/` directory must exist before `server.js` can serve tools — always run `npm run build` before `npm start`.
