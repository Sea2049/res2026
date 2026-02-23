import path from "path";
import fs from "fs";
import { getCreateTablesSql, getCreateIndexesSql } from "./schema";

export type Driver = "sqlite" | "postgres";

function getDriver(): Driver {
  const d = process.env["DB_DRIVER"] ?? "sqlite";
  if (d !== "sqlite" && d !== "postgres") {
    throw new Error(`Invalid DB_DRIVER "${d}". Must be "sqlite" or "postgres".`);
  }
  return d as Driver;
}

/**
 * 将 SQL 中的 ? 占位符替换为 PostgreSQL 的 $1/$2/$3...
 * SQLite 模式原样返回
 */
export function adaptSql(sql: string, driver: Driver): string {
  if (driver === "sqlite") return sql;
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

// ==================== DbClient 接口 ====================

/** 统一数据库访问接口（SQLite 与 PostgreSQL 双模式） */
export interface DbClient {
  /** 执行 SQL，返回影响的行数 */
  run(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
  /** 查询单行，未找到返回 null */
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  /** 查询多行 */
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** 关闭连接 */
  close(): Promise<void>;
  /** 事务执行 */
  transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T>;
}

// ==================== SQLite 实现 ====================

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BetterSqlite3 = require("better-sqlite3");

type RawSqliteDb = {
  prepare(sql: string): {
    run(...args: unknown[]): { changes: number };
    get(...args: unknown[]): unknown;
    all(...args: unknown[]): unknown[];
  };
  exec(sql: string): void;
  close(): void;
  pragma(pragma: string, options?: unknown): unknown;
};

function createSqliteClient(): DbClient {
  const envPath = process.env["DB_PATH"];
  const dbPath = envPath
    ? path.resolve(envPath)
    : path.resolve(__dirname, "../../data/browser-worker.db");

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const rawDb: RawSqliteDb = new BetterSqlite3(dbPath);
  rawDb.pragma("journal_mode = WAL");
  rawDb.pragma("foreign_keys = ON");
  rawDb.pragma("synchronous = NORMAL");

  rawDb.exec(getCreateTablesSql("sqlite"));
  rawDb.exec(getCreateIndexesSql("sqlite"));

  const client: DbClient = {
    async run(sql, params = []) {
      const result = rawDb.prepare(sql).run(...params);
      return { rowCount: result.changes };
    },

    async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const row = rawDb.prepare(sql).get(...params);
      return (row ?? null) as T | null;
    },

    async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      return rawDb.prepare(sql).all(...params) as T[];
    },

    async close() {
      rawDb.close();
    },

    async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
      rawDb.exec("BEGIN");
      try {
        const result = await fn(client);
        rawDb.exec("COMMIT");
        return result;
      } catch (err) {
        rawDb.exec("ROLLBACK");
        throw err;
      }
    },
  };

  return client;
}

// ==================== PostgreSQL 实现 ====================

async function runMultiPgSql(
  pool: import("pg").Pool,
  sql: string
): Promise<void> {
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
}

function createPostgresClient(): DbClient {
  let poolPromise: Promise<import("pg").Pool> | null = null;

  function getPool(): Promise<import("pg").Pool> {
    if (!poolPromise) {
      poolPromise = (async () => {
        const { Pool } = await import("pg");
        const databaseUrl = process.env["DATABASE_URL"];
        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL is required when DB_DRIVER=postgres ' +
              '(e.g. postgresql://user:pass@host:5432/dbname)'
          );
        }
        const pool = new Pool({ connectionString: databaseUrl });
        await runMultiPgSql(pool, getCreateTablesSql("postgres"));
        await runMultiPgSql(pool, getCreateIndexesSql("postgres"));
        return pool;
      })();
    }
    return poolPromise;
  }

  const client: DbClient = {
    async run(sql, params = []) {
      const pool = await getPool();
      const adapted = adaptSql(sql, "postgres");
      const result = await pool.query(adapted, params as unknown[]);
      return { rowCount: result.rowCount ?? 0 };
    },

    async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const pool = await getPool();
      const adapted = adaptSql(sql, "postgres");
      const result = await pool.query(adapted, params as unknown[]);
      return (result.rows[0] ?? null) as T | null;
    },

    async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const pool = await getPool();
      const adapted = adaptSql(sql, "postgres");
      const result = await pool.query(adapted, params as unknown[]);
      return result.rows as T[];
    },

    async close() {
      if (poolPromise) {
        const pool = await poolPromise;
        await pool.end();
        poolPromise = null;
      }
    },

    async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
      const pool = await getPool();
      const pgClient = await pool.connect();
      try {
        await pgClient.query("BEGIN");

        const txClient: DbClient = {
          async run(sql, params = []) {
            const adapted = adaptSql(sql, "postgres");
            const result = await pgClient.query(adapted, params as unknown[]);
            return { rowCount: result.rowCount ?? 0 };
          },
          async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
            const adapted = adaptSql(sql, "postgres");
            const result = await pgClient.query(adapted, params as unknown[]);
            return (result.rows[0] ?? null) as T | null;
          },
          async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
            const adapted = adaptSql(sql, "postgres");
            const result = await pgClient.query(adapted, params as unknown[]);
            return result.rows as T[];
          },
          async close() {
            // no-op: connection lifecycle managed by transaction()
          },
          transaction: <T2>(fn2: (c: DbClient) => Promise<T2>) => fn2(txClient),
        };

        const result = await fn(txClient);
        await pgClient.query("COMMIT");
        return result;
      } catch (err) {
        await pgClient.query("ROLLBACK");
        throw err;
      } finally {
        pgClient.release();
      }
    },
  };

  return client;
}

// ==================== Singleton ====================

let _dbClient: DbClient | null = null;

/**
 * 获取数据库客户端 singleton
 * - DB_DRIVER=sqlite（默认）：better-sqlite3 同步包装的 async 客户端
 * - DB_DRIVER=postgres：pg.Pool 客户端（连接池首次使用时懒初始化）
 */
export function getDb(): DbClient {
  if (!_dbClient) {
    _dbClient =
      getDriver() === "postgres" ? createPostgresClient() : createSqliteClient();
  }
  return _dbClient;
}

/**
 * 关闭数据库连接（进程退出时调用）
 */
export async function closeDb(): Promise<void> {
  if (_dbClient) {
    await _dbClient.close();
    _dbClient = null;
  }
}

// 进程退出时自动关闭
process.on("exit", () => {
  if (_dbClient) {
    void _dbClient.close();
    _dbClient = null;
  }
});
process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await closeDb();
  process.exit(0);
});
