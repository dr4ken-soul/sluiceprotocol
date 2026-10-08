# Deploy

The indexer is a long-lived Node process. It holds a websocket subscription open,
serves the API the frontend reads, and must not be a serverless function.

`railway.json` already carries the build command, start command, healthcheck path
and restart policy. This file covers the decisions behind them and the variables
that must be set.

## Why not a serverless or free tier

A serverless function cannot hold a subscription. It starts for a request and is
torn down after, so the stream dies between invocations.

Render's free web service is not suitable either, for a reason worth stating
precisely because it is easy to assume otherwise. Free instances spin down after
15 minutes without inbound traffic, and Render's own documentation counts inbound
traffic as HTTP requests *and* WebSocket messages. An indexer's traffic is
overwhelmingly outbound: it subscribes to Solana and pushes updates to connected
browsers. The only inbound request is the occasional health check from an uptime
monitor. So a free instance would spin down roughly every fifteen minutes and take
about a minute to come back, during which it misses account updates. Free
instances also cannot hold a persistent disk and cannot receive private network
traffic.

Railway's $5 monthly credit covers a small always-on service, which is what this
needs. It is the cheaper correct answer, not the compromise.

## Node version

The floor is **22.7**, declared in `package.json` engines. It is required, not
preferred. `npm start` runs the TypeScript sources directly through
`--experimental-strip-types`, which landed in Node 22.6, and `tsconfig.json` sets
`rewriteRelativeImportExtensions`, which landed in 22.7. A host that resolved an
older range would install Node 20 and the start command would exit immediately.

## Deploy

```bash
cd indexer
railway login          # if not already authenticated
railway init           # creates the project from this directory
railway up
```

`railway up` uploads the working tree. `.gitignore` already excludes `node_modules`
and `.env`, and no `.env` exists in this directory, so no local secret is uploaded.
The Helius key goes in as a Railway variable, set below or in the dashboard.

## Variables

Set these in the Railway dashboard. `railway.json` is committed, so a value placed
in it would be published.

| Variable | Required | Notes |
|---|---|---|
| `RPC_URL` | yes | Keyed provider endpoint, server-only. The Helius free tier is sufficient; see `.env.example` for what was measured. |
| `PORT` | no | Injected by Railway. Defaults to `8787`. |
| `NEXT_PUBLIC_INDEXER_URL` | no | Set on **Vercel**, not here. The browser needs it. |
| `GRPC_ENDPOINT` | no | Leave blank below Helius Business ($499/mo). See `.env.example`. |
| `GRPC_TOKEN` | no | Provider token, only if `GRPC_ENDPOINT` is set. |
| `NEXT_PUBLIC_*_PROGRAM_ID` | yes, 8 of them | From the `anchor deploy` output. |
| `NEXT_PUBLIC_DEMO_MODE` | no | `true` until real issuances exist, then `false`. |

`RPC_URL` is deliberately not the `NEXT_PUBLIC_` variable. Next.js inlines anything
with that prefix into the browser bundle, so a keyed provider URL placed there
publishes the key to every visitor. The indexer reads the server-only name first
and only falls back to the public one, which stays keyless.

## Until the programmes are deployed

The eight `NEXT_PUBLIC_*_PROGRAM_ID` values cannot be set yet. The indexer handles
that state explicitly rather than pretending to have data: it serves the seeded
fixture with `isDemo: true`, which the frontend renders with a visible DEMO tag,
and `/api/health` reports `programsDeployed: false`. No figure is presented as
live that is not.

## Verify it is alive

```bash
curl https://<your-domain>/api/health
```

The response carries the transport actually in use, which is the honest answer to
"is this actually streaming?" rather than an assumption:

- `grpc` — Yellowstone gRPC, lowest latency
- `websocket` — `accountSubscribe`, the normal setting below Business tier
- `poll` — no program IDs configured, or the socket stopped carrying traffic

It reports `rpcHost` rather than the full URL, so a credential in the RPC URL is
never echoed on a public, cross-origin-readable route.

Then point the frontend at it:

```bash
cd ../web
vercel env add NEXT_PUBLIC_INDEXER_URL production --value https://<your-domain> --yes --force
vercel --prod --yes
```

The metrics section on the landing page stops reporting the unconfigured reason
and starts reporting figures at that point.
