# Deploy

The indexer is a long-lived Node process. It holds a websocket subscription open,
serves the API the frontend reads, and must not be a serverless function.

## Why not a serverless or free tier

A serverless function cannot hold a subscription. It is started for a request and
torn down after, so the stream dies between invocations.

Render's free web service is not suitable either, for a reason worth stating
precisely because it is easy to assume otherwise. Free instances spin down after
15 minutes without inbound traffic, and their own documentation counts inbound
traffic as HTTP requests *and* WebSocket messages. An indexer's traffic is
overwhelmingly outbound: it subscribes to Solana and pushes updates to connected
browsers. The one request it receives is the occasional health check from an
uptime monitor. So a free instance would spin down roughly every fifteen minutes
and take a minute to come back, during which it misses account updates. Free
instances also cannot hold a persistent disk, and cannot receive private network
traffic.

Railway's $5 monthly credit covers a small always-on service, which is what this
needs. It is the cheaper correct answer, not the compromise.

## Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then set the variables in the Railway dashboard. `RPC_URL` is required; everything
else has a documented default.

| Variable | Required | Notes |
|---|---|---|
| `RPC_URL` | yes | Keyed provider endpoint, server-only. See `.env.example`. |
| `PORT` | no | Railway injects this. Defaults to 8787 locally. |
| `NEXT_PUBLIC_INDEXER_URL` | no | Set on **Vercel**, not here. The browser needs it. |
| `GRPC_ENDPOINT` | no | Leave blank below Business tier. See `.env.example`. |
| `GRPC_TOKEN` | no | Provider token, if gRPC is configured. |
| `NEXT_PUBLIC_*_PROGRAM_ID` | yes, 8 of them | From the `anchor deploy` output. |
| `NEXT_PUBLIC_DEMO_MODE` | no | `false` once real issuances exist. |

## Verify it is alive

```bash
curl https://<your-domain>/api/health
```

The response carries the transport actually in use, which is the honest answer to
"is this actually streaming?" rather than an assumption:

- `grpc` — Yellowstone gRPC, lowest latency
- `websocket` — accountSubscribe, the normal setting below Business tier
- `poll` — no program IDs configured, or no transport available

Then point the frontend at it:

```bash
cd web
vercel env add NEXT_PUBLIC_INDEXER_URL production --value https://<your-domain> --yes --force
vercel --prod --yes
```

The metrics section on the landing page stops reporting the unconfigured reason
and starts reporting live figures at that point.
