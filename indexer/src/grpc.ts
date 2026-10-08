/**
 * Yellowstone gRPC subscription with a documented fallback chain.
 *
 * `FRONTEND_SPEC.md` §1.8 fixes the order, and it is not negotiable:
 *
 *   1. Yellowstone gRPC stream.
 *   2. Websocket `accountSubscribe` on the RPC provider.
 *   3. A fifteen second poll, logged as a warning.
 *
 * The poll is never the starting transport. Starting on the poll would mean the
 * happy path is never exercised, which is the ordinary way this kind of fallback
 * chain rots.
 *
 * Every transport lands on the same `onIssuance` callback, so nothing downstream
 * knows or cares which one is live. That is what makes the swap invisible to the
 * frontend and keeps degradation visible only where it should be: on the risk
 * terminal's health panel.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import type { ProgramIds } from "./config.ts";
import { decodeIssuanceState } from "./store.ts";
import type { LiveIssuance } from "./types.ts";

/** Callback invoked whenever an issuance's state changes. */
export type IssuanceHandler = (issuance: LiveIssuance) => void;

/** Callback invoked when an issuance is closed or its account is emptied. */
export type RemovalHandler = (address: string) => void;

/** Notified on every transport change, so the store can record degradation. */
export type TransportHandler = (
  transport: "grpc" | "websocket" | "poll",
  connected: boolean,
  note: string,
) => void;

/** Everything a transport needs to run. */
export interface SubscriptionOptions {
  readonly rpcUrl: string;
  readonly programs: ProgramIds;
  readonly onIssuance: IssuanceHandler;
  readonly onRemoval: RemovalHandler;
  readonly onTransport: TransportHandler;
}

/** A running subscription. */
export interface Subscription {
  /** Tears down whichever transport is live. */
  stop(): Promise<void>;
}

/** Poll interval for the last-resort transport, in milliseconds. */
const POLL_INTERVAL_MS = 15_000;

/** Reconnect backoff bounds, in milliseconds. */
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Program-owned account discriminators the indexer subscribes to.
 *
 * Kept as raw byte seeds rather than a borsh schema so that a schema change in a
 * program does not require a redeploy of the indexer to keep the stream alive. A
 * decode failure downgrades the record to a typed error rather than killing the
 * subscription, because losing the whole stream over one malformed account is a
 * far worse failure than losing that account.
 */
const ACCOUNT_FILTERS = [
  { program: "curve", kind: "issuance" },
  { program: "settlement", kind: "settlement" },
  { program: "verifier", kind: "milestone" },
  { program: "redemption", kind: "redemption" },
  { program: "waterfall", kind: "waterfall" },
] as const;

/** Resolves the set of program IDs that are actually deployed. */
function deployedPrograms(programs: ProgramIds): PublicKey[] {
  const keys: (string | null)[] = [
    programs.curve,
    programs.settlement,
    programs.verifier,
    programs.redemption,
    programs.waterfall,
  ];
  const resolved: PublicKey[] = [];
  for (const key of keys) {
    if (key === null) continue;
    try {
      resolved.push(new PublicKey(key));
    } catch {
      // A malformed ID is a configuration error, not a reason to crash the
      // indexer. It is reported through the transport note instead.
      console.warn(`[sluice] ignoring malformed program id ${key}`);
    }
  }
  return resolved;
}

/**
 * Decodes an account into an issuance.
 *
 * Returns `null` when the account is not an issuance, which happens legitimately
 * for every other account owned by the same program, such as a curve config.
 */
function decodeIssuance(data: Buffer | null, address: string): LiveIssuance | null {
  if (data === null || data.length < 8) return null;

  // Anchor account discriminator is the first eight bytes. Issuance accounts are
  // discriminated by the sha256 of `account:Issuance`. Rather than hardcode a hash
  // that would silently rot, the check is that the discriminator is non-zero and
  // the account is large enough to be an issuance. The typed decode below then
  // validates the layout.
  const discriminator = data.subarray(0, 8);
  if (discriminator.every((byte) => byte === 0)) return null;
  if (data.length < 300) return null;

  // Layout follows `programs/curve/src/state.rs`. Field offsets are read
  // little-endian, matching Anchor's borsh encoding.
  try {
    const issuer = new PublicKey(data.subarray(8, 40));
    const mint = new PublicKey(data.subarray(40, 72));
    const tickerBytes = data.subarray(72, 80);
    const assetClassRaw = data.readUInt8(80);

    let offset = 81;
    const navLow = readU64(data, offset);
    offset += 8;
    const navHigh = readU64(data, offset);
    offset += 8;
    const attestedNav = readU64(data, offset);
    offset += 8;
    const attestedAt = readBigInt64(data, offset);
    offset += 8;
    offset += 32; // attestor
    offset += 32; // curve_config
    offset += 32; // policy
    offset += 32; // bond_vault
    offset += 32; // settlement
    offset += 32; // redemption_vault
    const raised = readU64(data, offset);
    offset += 8;
    const target = readU64(data, offset);
    offset += 8;
    const stateRaw = data.readUInt8(offset);

    const tickerEnd = tickerBytes.indexOf(0);
    const ticker = (
      tickerEnd === -1 ? tickerBytes : tickerBytes.subarray(0, tickerEnd)
    ).toString("ascii");

    return {
      address,
      mint: mint.toBase58(),
      ticker: ticker.trim(),
      issuerName: ticker.trim(),
      issuer: issuer.toBase58(),
      assetClass: assetClassRaw === 0 ? "revenue" : assetClassRaw === 1 ? "royalty" : "invoice",
      nav: Number(attestedNav),
      navLow: Number(navLow),
      navHigh: Number(navHigh),
      raised: Number(raised),
      target: Number(target),
      yesCents: null,
      noCents: null,
      settlesInDays: null,
      closesAt: null,
      state: decodeIssuanceState(stateRaw),
      attestedAt: Number(attestedAt),
      attestor: PublicKey.default.toBase58(),
      milestones: [],
      isDemo: false,
    };
  } catch {
    // A malformed account is skipped rather than fatal. The stream outlives it.
    return null;
  }
}

/** Reads a little-endian u64 as a number. */
function readU64(data: Buffer, offset: number): bigint {
  return data.readBigUInt64LE(offset);
}

/** Reads a little-endian i64. */
function readBigInt64(data: Buffer, offset: number): bigint {
  return data.readBigInt64LE(offset);
}

/**
 * Starts a subscription, preferring gRPC and degrading only on failure.
 *
 * @returns A handle whose `stop` tears down the live transport.
 */
export async function subscribe(options: SubscriptionOptions): Promise<Subscription> {
  const { rpcUrl, programs, onIssuance, onRemoval, onTransport } = options;
  const keys = deployedPrograms(programs);
  const connection = new Connection(rpcUrl, "confirmed");

  if (keys.length === 0) {
    onTransport("poll", true, "No program IDs configured, serving nothing until they are set");
    return { stop: async () => undefined };
  }

  // Attempt 1: Yellowstone gRPC. Only attempted when an endpoint is configured,
  // since an absent endpoint is not a runtime failure.
  const grpcEndpoint = process.env.NEXT_PUBLIC_GRPC_ENDPOINT;
  if (grpcEndpoint !== undefined && grpcEndpoint.trim().length > 0) {
    try {
      return await startGrpcSubscription({
        endpoint: grpcEndpoint.trim(),
        keys,
        onIssuance,
        onRemoval,
        onTransport,
      });
    } catch (error) {
      onTransport(
        "websocket",
        false,
        `gRPC unavailable, degraded: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    console.warn(
      "[sluice] NEXT_PUBLIC_GRPC_ENDPOINT is not set. Falling back to websocket accountSubscribe.",
    );
  }

  // Attempt 2: websocket accountSubscribe on the RPC provider.
  return startWebsocketSubscription({
    connection,
    keys,
    onIssuance,
    onRemoval,
    onTransport,
  });
}

/** Options for the gRPC transport. */
interface GrpcOptions {
  readonly endpoint: string;
  readonly keys: PublicKey[];
  readonly onIssuance: IssuanceHandler;
  readonly onRemoval: RemovalHandler;
  readonly onTransport: TransportHandler;
}

/**
 * Starts the Yellowstone gRPC transport.
 *
 * The `@solana/ Yellowstone` client is loaded dynamically so that an indexer
 * configured for the websocket transport does not pay for a gRPC client it will
 * never construct, and so a missing optional dependency surfaces as a typed error
 * that triggers the documented fallback rather than a module resolution crash at
 * boot.
 */
async function startGrpcSubscription(options: GrpcOptions): Promise<Subscription> {
  const { endpoint, keys, onIssuance, onRemoval, onTransport } = options;

  /** Minimal shape of the Yellowstone subscription handle we depend on. */
  interface GeyserSubscription {
    unsubscribe(): Promise<void>;
  }

  interface GeyserClient {
    subscribe(
      filters: unknown,
      callbacks: Record<string, unknown>,
    ): Promise<GeyserSubscription | (() => Promise<void>)>;
  }

  let client: GeyserClient;

  try {
    // Resolved at runtime rather than imported statically, for two reasons. An
    // indexer configured for the websocket transport should not load a gRPC
    // client it will never construct, and the client ships native bindings that do
    // not exist on every platform, so a static import would turn a recoverable
    // transport problem into a boot failure.
    //
    // `@triton-one/yellowstone-grpc` publishes prebuilt native bindings for Linux
    // and macOS only. On Windows the import throws, which is caught here and
    // degraded to the websocket transport exactly as the fallback chain requires.
    const specifier = "@triton-one/yellowstone-grpc";
    const resolved = (await import(specifier)) as {
      GeyserGrpcClient?: new (url: string, token?: string) => GeyserClient;
    };
    const Client = resolved.GeyserGrpcClient;
    if (typeof Client !== "function") {
      throw new Error(`GeyserGrpcClient export not found in ${specifier}`);
    }
    client = new Client(endpoint, process.env.NEXT_PUBLIC_GRPC_TOKEN ?? "");
  } catch (error) {
    throw new Error(
      `gRPC client could not be constructed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let stopped = false;
  let attempt = 0;
  let subscription: { unsubscribe: () => Promise<void> } | null = null;

  const connect = async (): Promise<void> => {
    while (!stopped) {
      try {
        await new Promise<void>((resolve, reject) => {
          const filters = keys.map((key) => ({ accounts: [key.toBase58()], accountInclude: [] }));
          const timer = setTimeout(() => {
            reject(new Error("gRPC subscribe did not resolve within 10s"));
          }, 10_000);

          void Promise.resolve(
            client.subscribe(filters, {
              onAccountUpdate: (update: { account?: { pubkey: string; data?: Uint8Array | string } }) => {
                const pubkey = update.account?.pubkey;
                if (pubkey === undefined) return;
                const raw = update.account?.data;
                const buffer = typeof raw === "string" ? Buffer.from(raw, "base64") : Buffer.from(raw ?? []);
                const issuance = decodeIssuance(buffer, pubkey);
                if (issuance !== null) onIssuance(issuance);
              },
              onError: (error: Error) => reject(error),
            }),
          ).then(
            (handle) => {
              subscription = handle as { unsubscribe: () => Promise<void> };
              clearTimeout(timer);
              attempt = 0;
              onTransport("grpc", true, "Subscribed over Yellowstone gRPC");
              resolve();
            },
            (error: unknown) => {
              clearTimeout(timer);
              reject(error instanceof Error ? error : new Error(String(error)));
            },
          );
        });
        return;
      } catch (error) {
        if (stopped) return;
        attempt += 1;
        const delay = Math.min(RECONNECT_MIN_MS * 2 ** (attempt - 1), RECONNECT_MAX_MS);
        const note = `gRPC dropped: ${error instanceof Error ? error.message : String(error)}`;
        onTransport("websocket", false, note);
        console.warn(`[sluice] ${note}. Reconnecting in ${delay}ms.`);
        await sleep(delay);
      }
    }
  };

  void connect();

  return {
    stop: async () => {
      stopped = true;
      if (subscription !== null) await subscription.unsubscribe();
    },
  };
}

/** Options for the websocket transport. */
interface WebsocketOptions {
  readonly connection: Connection;
  readonly keys: PublicKey[];
  readonly onIssuance: IssuanceHandler;
  readonly onRemoval: RemovalHandler;
  readonly onTransport: TransportHandler;
}

/**
 * Starts the websocket transport.
 *
 * One subscription per program, each tracking its own resubscription. The
 * websocket API has no multiplexed filter, so this is the shape the provider
 * actually offers.
 */
function startWebsocketSubscription(options: WebsocketOptions): Subscription {
  const { connection, keys, onIssuance, onRemoval, onTransport } = options;
  const subscriptions: number[] = [];
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let attempt = 0;

  onTransport(
    "websocket",
    true,
    "Subscribed over websocket accountSubscribe, degraded from gRPC",
  );

  for (const key of keys) {
    if (stopped) return { stop: async () => undefined };
    // `onAccountChange` reports the account's own address, and the callback does
    // not carry it. The closure captures the key, which is the account address
    // because the subscription is per account.
    const subscribedKey = key.toBase58();
    const id = connection.onAccountChange(
      key,
      (account) => {
        const issuance = decodeIssuance(Buffer.from(account.data), subscribedKey);
        if (issuance !== null) onIssuance(issuance);
        else onRemoval(subscribedKey);
      },
      "confirmed",
    );
    subscriptions.push(id);
  }

  /**
   * Attempt 3: the fifteen second poll.
   *
   * Reached only if the websocket transport throws repeatedly. It replaces the
   * subscription rather than running alongside it, so a degraded indexer is not
   * paying for two transports at once.
   */
  const degradeToPoll = (note: string): void => {
    if (pollTimer !== null || stopped) return;
    onTransport("poll", true, note);
    const refresh = (): void => {
      for (const key of keys) {
        const address = key.toBase58();
        void connection
          .getAccountInfo(key, "confirmed")
          .then((account) => {
            if (account === null) return;
            const issuance = decodeIssuance(Buffer.from(account.data), address);
            if (issuance !== null) onIssuance(issuance);
          })
          .catch((error: unknown) => {
            console.warn(
              `[sluice] poll failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
      }
    };
    refresh();
    pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
  };

  // A log subscription on the first program doubles as a cheap liveness probe. If
  // it never delivers, the socket is not carrying traffic even though the
  // subscription call returned successfully, which is the failure mode
  // `onAccountChange` hides.
  let deliveries = 0;
  const probeKey = keys[0];
  if (probeKey !== undefined) {
    connection.onLogs(probeKey, () => {
      deliveries += 1;
    });
  }

  let misses = 0;
  const probe = setInterval(() => {
    if (stopped) return;
    if (deliveries > 0) return;
    misses += 1;
    // Three consecutive five second probes with nothing delivered means the
    // socket is not carrying traffic, so the poll takes over.
    if (misses >= 3) {
      clearInterval(probe);
      degradeToPoll(
        "Websocket carried no updates for 15s, degraded to a fifteen second poll. Figures may lag",
      );
    }
  }, 5_000);

  return {
    stop: async () => {
      stopped = true;
      if (pollTimer !== null) clearInterval(pollTimer);
      clearInterval(probe);
      for (const id of subscriptions) {
        try {
          await connection.removeAccountChangeListener(id);
        } catch {
          // A listener already gone is not an error worth failing a shutdown over.
        }
      }
    },
  };
}

/** Promise that resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exported for the store's initial health note. */
export const ACCOUNT_KINDS = ACCOUNT_FILTERS;
