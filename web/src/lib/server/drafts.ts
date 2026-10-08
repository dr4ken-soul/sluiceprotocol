/**
 * Server-side draft storage.
 *
 * Two adapters, chosen by environment:
 *
 * - **Supabase Postgres.** The production path. Requires `SUPABASE_URL` and
 *   `SUPABASE_SERVICE_ROLE_KEY`, plus the migration in `supabase/migrations`.
 * - **Filesystem.** Local development. Requires `SLUICE_DRAFT_DIR` to be a writable
 *   directory, which a read-only serverless filesystem is not.
 *
 * Both are server-side. Neither is browser storage. The distinction matters because
 * the whole point of routing drafts to a server is that they survive a cleared
 * browser and follow the user to another device, which localStorage cannot do.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/** A draft record as stored. */
export interface StoredDraft {
  /** The owning user id. */
  userId: string;
  /** Unix milliseconds of the last write. */
  updatedAt: number;
  /** The draft payload, stored verbatim. */
  data: unknown;
}

/** The storage interface both adapters implement. */
export interface DraftStore {
  read(userId: string): Promise<unknown | null>;
  write(userId: string, data: unknown): Promise<void>;
  remove(userId: string): Promise<void>;
}

/**
 * Supabase-backed store.
 *
 * Uses the REST endpoint rather than a client library, because the service role key
 * must never reach the browser and a thin fetch makes that boundary obvious. The
 * table is created by `supabase/migrations/0001_drafts.sql`.
 */
class SupabaseDraftStore implements DraftStore {
  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
  ) {}

  async read(userId: string): Promise<unknown | null> {
    const response = await this.query(
      `select=data from issuance_drafts where user_id=$1 limit 1`,
      [userId],
    );
    const rows = response as Array<{ data: unknown }>;
    const first = rows[0];
    return first === undefined ? null : first.data;
  }

  async write(userId: string, data: unknown): Promise<void> {
    // Upsert, so a second write from the same user replaces rather than duplicating.
    await this.query(
      `insert into issuance_drafts (user_id, data, updated_at) values ($1, $2::jsonb, $3)
       on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at`,
      [userId, JSON.stringify(data), Date.now()],
    );
  }

  async remove(userId: string): Promise<void> {
    await this.query(`delete from issuance_drafts where user_id=$1`, [userId]);
  }

  /** Issues a PostgREST query and returns the rows. */
  private async query(sql: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(`${this.url}/rest/v1/rpc/draft_query`, {
      method: "POST",
      headers: {
        apikey: this.serviceKey,
        authorization: `Bearer ${this.serviceKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: sql, params }),
    });

    if (!response.ok) {
      throw new Error(
        `Draft store returned ${response.status}. Apply supabase/migrations/0001_drafts.sql before using it.`,
      );
    }
    return response.json();
  }
}

/** Filesystem-backed store, for local development only. */
class FileDraftStore implements DraftStore {
  constructor(private readonly directory: string) {}

  async read(userId: string): Promise<unknown | null> {
    try {
      const raw = await fs.readFile(this.fileFor(userId), "utf8");
      const parsed = JSON.parse(raw) as StoredDraft;
      return parsed.data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async write(userId: string, data: unknown): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });
    const record: StoredDraft = { userId, updatedAt: Date.now(), data };
    // Written to a temporary file and renamed, so an interrupted write cannot leave a
    // truncated draft behind.
    const target = this.fileFor(userId);
    const temporary = `${target}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(record), "utf8");
    await fs.rename(temporary, target);
  }

  async remove(userId: string): Promise<void> {
    try {
      await fs.unlink(this.fileFor(userId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  /**
   * The path for a user id.
   *
   * The id is hashed rather than used verbatim, because a user id reaching a
   * filesystem path unsanitised is a directory traversal waiting to happen.
   */
  private fileFor(userId: string): string {
    const safe = createHash("sha256").update(userId).digest("hex");
    return path.join(this.directory, `${safe}.json`);
  }
}

/**
 * Rejects rather than falls back when nothing is configured.
 *
 * A silent fallback to an in-memory store would make drafts appear to save and then
 * vanish on the next request, which is worse than failing: the user believes their
 * long form is safe when it is not.
 */
class UnconfiguredDraftStore implements DraftStore {
  async read(): Promise<unknown | null> {
    throw new Error(
      "No draft store is configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for production, or SLUICE_DRAFT_DIR for local development.",
    );
  }

  async write(): Promise<void> {
    throw new Error("No draft store is configured.");
  }

  async remove(): Promise<void> {
    throw new Error("No draft store is configured.");
  }
}

let cached: DraftStore | null = null;

/** Resolves the configured store once and reuses it. */
export function draftStore(): DraftStore {
  if (cached !== null) return cached;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    supabaseUrl !== undefined &&
    supabaseUrl.length > 0 &&
    serviceKey !== undefined &&
    serviceKey.length > 0
  ) {
    cached = new SupabaseDraftStore(supabaseUrl.replace(/\/$/, ""), serviceKey);
    return cached;
  }

  const directory = process.env.SLUICE_DRAFT_DIR;
  if (directory !== undefined && directory.length > 0) {
    cached = new FileDraftStore(directory);
    return cached;
  }

  cached = new UnconfiguredDraftStore();
  return cached;
}
