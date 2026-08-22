# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Weather MCP server

The job-site weather service behind Daily Logs (`server/weather.js`) is also
exposed over MCP so agents outside this app can call it as a tool:

```bash
npm run mcp
```

`.mcp.json` at the repo root registers it for MCP clients that read that file
(Claude Code among them); otherwise point your client at
`node server/mcp.js` over stdio. Tools:

| Tool | Purpose |
| --- | --- |
| `list_jobs` | Job ids, names and addresses — call first to turn a job name into a `jobId`. |
| `get_jobsite_weather` | Conditions at one job site on one day: summary, high/low °F, wind, humidity, precipitation. |
| `get_jobsite_weather_range` | The same, for every day in an inclusive range (capped at 366 days). |

Weather is a pure function of `(jobId, date)`, so the server reads nothing
from the database and holds no state.
