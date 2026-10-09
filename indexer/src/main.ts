/**
 * The indexer entry point.
 *
 * Starts the public API and the account subscription, in that order, so the API is
 * answering before the first account update arrives. A terminal that 502s for the
 * first few seconds of a demo is worse than one that answers with an explicit
 * "awaiting first account update".
 */

import cors from "@fastify/cors";
import Fastify from "fastify";
import { pantaConfigured } from "./adjudication.ts";
import { registerRoutes } from "./api/routes.ts";
import { loadConfig, programsDeployed } from "./config.ts";
import { subscribe } from "./grpc.ts";
import { IndexerStore } from "./store.ts";

/** Boots the service. */
async function main(): Promise<void> {
  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig();
  } catch (error) {
    // A missing RPC URL is fatal and is reported as such rather than leaving a
    // process running that answers every request with empty state.
    console.error(`[sluice] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
    return;
  }

  const store = new IndexerStore();
  const app = Fastify({ logger: false });

  // The public risk terminal is meant to be embeddable, so cross-origin reads are
  // allowed. There is no cookie or credential in play, so there is nothing for a
  // permissive origin to steal.
  await app.register(cors, { origin: true });

  registerRoutes(app, config, store);

  await app.listen({ port: config.port, host: config.host });

  const deployed = programsDeployed(config);
  console.log(`[sluice] api listening on ${config.host}:${config.port}`);
  console.log(`[sluice] cluster ${config.network}, demo mode ${config.demoMode}`);

  /*
   * The external resolver's availability is reported at boot rather than discovered
   * at the first milestone.
   *
   * `APP_BLUEPRINT.md` §7 specifies an internal market as the fallback when Panta
   * cannot be trusted, so an unconfigured resolver is a degraded mode rather than a
   * failure and the indexer boots either way. Saying so once, here, means an
   * operator can tell the difference between "no milestones yet" and "milestones
   * will all resolve through the fallback" without reading logs from a demo.
   */
  console.log(
    pantaConfigured(config)
      ? `[sluice] panta resolver configured, wallet ${config.panta.marketWallet ?? "UNSET"}`
      : "[sluice] PANTA_API_KEY is not set. Milestones resolve through the verifier " +
          "and then default to no, which is the documented fallback.",
  );
  if (pantaConfigured(config) && config.panta.marketWallet === null) {
    console.warn(
      "[sluice] PANTA_API_KEY is set but PANTA_MARKET_WALLET is not. " +
        "Markets cannot be opened or fees paid without a wallet.",
    );
  }

  if (!deployed) {
    // Named explicitly, because an indexer pointed at nothing and an indexer
    // watching a cluster with no issuances on it look identical from outside.
    console.warn(
      "[sluice] not every programme ID is set, so the indexer cannot read programme accounts. " +
        "It will serve the seeded fixture when demo mode is on and nothing else. " +
        "Set the NEXT_PUBLIC_*_PROGRAM_ID variables once the programmes are deployed.",
    );
  }

  const subscription = await subscribe({
    rpcUrl: config.rpcUrl,
    programs: config.programs,
    onIssuance: (issuance) => {
      store.putIssuance(issuance);
      store.recordUpdate();
    },
    onRemoval: (address) => {
      store.removeIssuance(address);
      store.recordUpdate();
    },
    onTransport: (transport, connected, note) => store.setTransport(transport, connected, note),
  });

  // Graceful shutdown, so a deploy does not leave a half-closed subscription behind.
  const shutdown = async (): Promise<void> => {
    console.log("[sluice] shutting down");
    await subscription.stop();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
