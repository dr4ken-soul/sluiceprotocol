/**
 * The Panta prediction-market client.
 *
 * `APP_BLUEPRINT.md` §7 and `BUILD_GUIDE.md` step 1.4 make Panta the default
 * resolver for a milestone market: one binary YES/NO question per tranche, priced by
 * the market, resolved by the market. `MARKETING.md` records that Panta's first
 * judging criterion is API integration depth and that trade attribution must be
 * wired, not merely market creation and trading.
 *
 * This is that integration. Four capabilities, matching the four the protocol
 * actually needs, and nothing speculative:
 *
 *   1. `quoteCreate`, `buildCreate`, `registerCreate` — open the milestone market.
 *   2. `fetchMarket` — read YES/NO prices and the resolved outcome.
 *   3. `reportTrade` — attribute a trade. Required by the checklist, and the only
 *      route by which Sluice earns creator fees on its own markets.
 *   4. `quoteBuy`, `buildBuy`, `submitBuy` — buy a primary share.
 *
 * **Custody model.** Panta never holds keys and never broadcasts. It cooks an
 * unsigned transaction, the user's wallet signs it, Sluice broadcasts on its own
 * RPC and reports the signature back. That is why every build method here returns
 * bytes for a caller to sign rather than sending a transaction itself.
 *
 * **Everything is fail-open toward the internal market.** A milestone that cannot
 * be opened or read falls back to the internal resolver, which is the behaviour
 * `APP_BLUEPRINT.md` §7 specifies: an external market can be thin, and the
 * fallback is what stops a thin market from deciding the fate of a tranche. A Panta
 * outage therefore degrades the product rather than breaking it.
 */

/** Base URL of the Panta API. Documented as the only host. */
export const PANTA_BASE_URL = "https://live-api.panta.market/api/v1";

/** Categories Panta accepts. Anything else is rejected by quote. */
const PANTA_CATEGORIES = [
  "sports",
  "crypto",
  "politics",
  "entertainment",
  "finance",
  "science",
  "world",
  "other",
] as const;

export type PantaCategory = (typeof PANTA_CATEGORIES)[number];

/** Options for the client. */
export interface PantaOptions {
  /** `pk_test_…` or `pk_live_…`. Absent means the integration is unconfigured. */
  readonly apiKey: string | undefined;
  /** Injectable for tests. Defaults to the global fetch. */
  readonly fetchImpl?: typeof fetch;
}

/** A milestone question, translated into Panta's create-market shape. */
export interface MilestoneMarketRequest {
  /** The wallet that pays the creation fee and signs. Base58. */
  readonly wallet: string;
  /** The binary question, in the issuer's words. Max 512 characters. */
  readonly question: string;
  /** Machine-checkable criteria. Max 2048 characters. */
  readonly resolutionRule: string;
  /** Where the answer is looked up. Between one and twenty URLs. */
  readonly sourcesOfTruth: readonly string[];
  /** Unix seconds. Must be at least an hour ahead on a standard market. */
  readonly startTime: number;
  /** Unix seconds, after `startTime`. */
  readonly endTime: number;
  /** Unix seconds, after `endTime`. This is when the market resolves. */
  readonly resolutionTime: number;
  /** Publicly reachable 1024x1024 image. Required by the catalog, never on chain. */
  readonly imageUrl: string;
  /** Defaults to `other`, which is what an RWA milestone is. */
  readonly category?: PantaCategory;
  /** Catalog description. */
  readonly description?: string;
}

/** The session Panta reserves during a quote. */
export interface CreateQuote {
  readonly createId: string;
  readonly expectedEventPda: string;
  /** Total fee in USDC base units. */
  readonly paymentUsdc: string;
  readonly liquidityInjectionUsdc: string;
  readonly platformRevenueUsdc: string;
  /** ISO-8601. Sessions last about five minutes. */
  readonly expiresAt: string;
}

/** An unsigned transaction plus the blockhash it was built against. */
export interface BuiltTransaction {
  /** Base64 `VersionedTransaction`. The caller signs this. */
  readonly transaction: string;
  readonly blockhash: string;
}

/** A market as Panta reports it. */
export interface PantaMarket {
  readonly marketId: string;
  readonly question?: string;
  readonly title?: string;
  readonly description?: string;
  readonly phase: string;
  readonly marketType: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly resolutionTime: number;
  readonly resolved: boolean;
  readonly status: string;
  /** Decimal strings in 0..1. Null until the market is live. */
  readonly yesPrice: string | null;
  readonly noPrice: string | null;
  readonly volumeUsdc?: string;
}

/** Which side of a market a trade was on. */
export type PantaSide = "yes" | "no";

/** A primary-share buy, quoted then built. */
export interface BuyRequest {
  readonly wallet: string;
  readonly marketId: string;
  readonly side: PantaSide;
  /** Human-readable decimal string, e.g. `"20.00"`. */
  readonly amountUsdc: string;
  /** Client reference, echoed into attribution. */
  readonly clientOrderId?: string;
}

/**
 * Why a call failed, in enough detail to be actionable.
 *
 * The two extra fields are declared as class properties and assigned in the body
 * rather than written as constructor parameter properties. Parameter properties are
 * a TypeScript-only transform that `node --experimental-strip-types` cannot apply,
 * because stripping types deliberately performs no emit, and the feature requires
 * emit to generate the field. `npm start` runs these sources directly, so the
 * parameter-property form compiles under `tsc --noEmit` and then crashes the process
 * at boot with ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX.
 *
 * Found by booting the service rather than by typechecking it, which cannot see a
 * syntax restriction that only exists in the runtime's stripping path. The same
 * restriction applies to any parameter using `private`, `protected` or an
 * accessibility modifier, so nothing in this package may use them.
 */
export class PantaError extends Error {
  /** Panta's machine-readable code, such as `TX_MISMATCH`. */
  readonly code: string;
  /** HTTP status, or 0 when the request never left the process. */
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "PantaError";
    this.code = code;
    this.status = status;
  }
}

/**
 * A thin, typed Panta client.
 *
 * Every method rejects with a `PantaError` rather than returning a partial result,
 * so a caller cannot mistake a failure for a thin market. The distinction matters:
 * a thin market should fall back to the internal resolver, and so should an outage,
 * but they are different events and the health surface reports them differently.
 */
export class PantaClient {
  readonly #apiKey: string | undefined;
  readonly #fetch: typeof fetch;

  constructor(options: PantaOptions) {
    this.#apiKey = options.apiKey;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  /** Whether an API key is present. Absent means the integration is off. */
  get configured(): boolean {
    return this.#apiKey !== undefined && this.#apiKey.length > 0;
  }

  /**
   * Issues a request and parses the body.
   *
   * Trailing slashes are required by Panta's router and are not optional
   * decoration, so every path passed here is already slashed.
   */
  async #request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    if (this.#apiKey === undefined) {
      throw new PantaError("Panta is not configured", "UNCONFIGURED", 0);
    }

    const response = await this.#fetch(`${PANTA_BASE_URL}${path}`, {
      method,
      headers: {
        "x-api-key": this.#apiKey,
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const text = await response.text();

    if (!response.ok) {
      // Panta returns a machine-readable `code` on every failure. Surfacing it
      // rather than the prose message is what lets the caller distinguish a thin
      // market from a malformed request from an outage.
      let code = `HTTP_${response.status}`;
      let message = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as { code?: string; message?: string };
        if (parsed.code !== undefined) code = parsed.code;
        if (parsed.message !== undefined) message = parsed.message;
      } catch {
        // A non-JSON body is left as the truncated text above.
      }
      throw new PantaError(message, code, response.status);
    }

    return JSON.parse(text) as T;
  }

  /**
   * Validates the request locally before spending a round trip.
   *
   * Panta rejects these too, but a local check gives a precise field name instead
   * of an opaque 400, and it means a malformed milestone never reaches the API.
   */
  #assertValid(request: MilestoneMarketRequest): void {
    if (request.question.trim().length === 0 || request.question.length > 512) {
      throw new PantaError("question must be 1 to 512 characters", "INVALID_MARKET_PARAMS", 400);
    }
    if (request.resolutionRule.trim().length === 0 || request.resolutionRule.length > 2048) {
      throw new PantaError(
        "resolutionRule must be 1 to 2048 characters",
        "INVALID_MARKET_PARAMS",
        400,
      );
    }
    if (request.sourcesOfTruth.length === 0 || request.sourcesOfTruth.length > 20) {
      throw new PantaError(
        "sourcesOfTruth must hold 1 to 20 entries",
        "INVALID_MARKET_PARAMS",
        400,
      );
    }
    for (const source of request.sourcesOfTruth) {
      if (!/^https?:\/\//.test(source)) {
        throw new PantaError(
          `sourcesOfTruth entry is not a public URL: ${source}`,
          "INVALID_MARKET_PARAMS",
          400,
        );
      }
    }
    if (!/^https?:\/\//.test(request.imageUrl)) {
      throw new PantaError(
        "imageUrl must be a public http or https URL",
        "INVALID_MARKET_PARAMS",
        400,
      );
    }
    if (!(request.startTime < request.endTime && request.endTime <= request.resolutionTime)) {
      throw new PantaError(
        "timestamps must satisfy startTime < endTime <= resolutionTime",
        "INVALID_MARKET_PARAMS",
        400,
      );
    }
  }

  /** Quotes the creation fee and reserves a session. */
  async quoteCreate(request: MilestoneMarketRequest): Promise<CreateQuote> {
    this.#assertValid(request);
    return this.#request<CreateQuote>("POST", "/markets/create/quote/", {
      wallet: request.wallet,
      question: request.question,
      resolutionRule: request.resolutionRule,
      sourcesOfTruth: [...request.sourcesOfTruth],
      category: request.category ?? "other",
      startTime: request.startTime,
      endTime: request.endTime,
      resolutionTime: request.resolutionTime,
      imageUrl: request.imageUrl,
      title: request.question,
      description: request.description ?? request.question,
      marketType: "standard",
      region: "Global",
    });
  }

  /**
   * Builds the unsigned create transaction.
   *
   * The session is valid for about five minutes but the blockhash for about a
   * minute, so this is called immediately after the quote rather than held.
   */
  async buildCreate(createId: string, wallet: string): Promise<BuiltTransaction> {
    return this.#request<BuiltTransaction>("POST", "/markets/create/build/", {
      createId,
      wallet,
    });
  }

  /**
   * Registers a broadcast create.
   *
   * Called only after the wallet has signed and Sluice has broadcast, which is what
   * lets Panta verify the on-chain transaction rather than take the claim on trust.
   */
  async registerCreate(
    createId: string,
    expectedEventPda: string,
    signature: string,
    wallet: string,
  ): Promise<{ marketId: string }> {
    return this.#request<{ marketId: string }>("POST", "/markets/register/", {
      createId,
      expectedEventPda,
      signature,
      wallet,
    });
  }

  /** Reads one market, including spot prices and resolution state. */
  async fetchMarket(marketId: string): Promise<PantaMarket> {
    return this.#request<PantaMarket>("GET", `/markets/${marketId}/`);
  }

  /** Quotes a primary-share fill on the bonding curve. */
  async quoteBuy(request: BuyRequest): Promise<{ quoteId: string; [key: string]: unknown }> {
    return this.#request("POST", "/orders/quote/", {
      wallet: request.wallet,
      marketId: request.marketId,
      side: request.side,
      amountUsdc: request.amountUsdc,
      ...(request.clientOrderId === undefined ? {} : { clientOrderId: request.clientOrderId }),
    });
  }

  /** Builds the unsigned buy instructions. */
  async buildBuy(quoteId: string, wallet: string): Promise<BuiltTransaction> {
    return this.#request<BuiltTransaction>("POST", "/orders/build/", { quoteId, wallet });
  }

  /**
   * Reports a broadcast buy so Panta can attribute it.
   *
   * Idempotent on the signature, so a retry after a timeout is safe rather than a
   * double count. That property is what makes it acceptable to call from a
   * best-effort path.
   */
  async submitBuy(
    signature: string,
    request: BuyRequest,
    quoteId?: string,
    userId?: string,
  ): Promise<{ status: string; kind: string; side: string }> {
    return this.#request("POST", "/orders/submit/", {
      signature,
      wallet: request.wallet,
      marketId: request.marketId,
      side: request.side,
      ...(quoteId === undefined ? {} : { quoteId }),
      ...(request.clientOrderId === undefined ? {} : { clientOrderId: request.clientOrderId }),
      ...(userId === undefined ? {} : { userId }),
    });
  }

  /**
   * Attributes a trade. The endpoint the checklist calls for explicitly.
   *
   * Fail-closed on Panta's side: the transaction must be `primary_order_usdc` or
   * `claim_win_usdc`, so this can only ever attribute a real trade and never
   * invent one. Creator-fee claims are rejected with `TX_MISMATCH` by design, since
   * a fee withdrawal is not a trade.
   */
  async reportTrade(input: {
    signature: string;
    wallet: string;
    marketId: string;
    quoteId?: string;
    clientOrderId?: string;
    userId?: string;
  }): Promise<{ status: string; kind: string; side: string | null }> {
    return this.#request("POST", "/trades/", {
      signature: input.signature,
      wallet: input.wallet,
      marketId: input.marketId,
      ...(input.quoteId === undefined ? {} : { quoteId: input.quoteId }),
      ...(input.clientOrderId === undefined ? {} : { clientOrderId: input.clientOrderId }),
      ...(input.userId === undefined ? {} : { userId: input.userId }),
    });
  }
}
