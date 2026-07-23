/**
 * Durable domain store for TravelMate.
 *
 * Uses Redis when REDIS_URL is set (same runtime as the toolkit session store),
 * otherwise an in-memory map (dev + dialog harness). Never scans the keyspace —
 * every collection is one explicit key. Workers without Redis keep per-isolate
 * memory; session state still survives via the Durable Object adapter.
 */

import type { RedisLike } from "./toolkit/session/redis.js";
import { now, nowIso } from "./clock.js";

const MEM: Record<string, unknown> = {};

let redisClient: RedisLike | null = null;
let redisInit: Promise<void> | null = null;

async function getRedis(): Promise<RedisLike | null> {
  if (redisClient) return redisClient;
  const url = (typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>)).REDIS_URL;
  if (!url) return null;
  if (!redisInit) {
    redisInit = (async () => {
      try {
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ioredis: any = require("ioredis");
        const Redis = ioredis.default ?? ioredis.Redis ?? ioredis;
        const client = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
        redisClient = {
          get: (k) => client.get(k),
          set: (k, v) => client.set(k, v),
          del: (k) => client.del(k),
          keys: (p) => client.keys(p),
        } as RedisLike;
      } catch {
        redisClient = null;
      }
    })();
  }
  await redisInit;
  return redisClient;
}

async function load<T>(key: string, fallback: T): Promise<T> {
  const r = await getRedis();
  if (r) {
    const raw = await r.get("tm:" + key);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        /* corrupt → fallback */
      }
    }
    return fallback;
  }
  return (MEM["tm:" + key] as T) ?? fallback;
}

async function save<T>(key: string, value: T): Promise<void> {
  const r = await getRedis();
  const json = JSON.stringify(value);
  if (r) {
    await r.set("tm:" + key, json);
  } else {
    MEM["tm:" + key] = JSON.parse(json);
  }
}

export interface WalletTx {
  date: string;
  desc: string;
  amount: string;
}

export interface UserRec {
  id: number;
  firstName?: string;
  username?: string;
  email?: string;
  credits: number;
  blocked?: boolean;
  lastSeen?: string;
  preferredCountries?: string[];
  /** Explicit wallet ledger (not derived from orders). */
  transactions?: WalletTx[];
  emailConsent?: boolean;
  referralCode?: string;
  referredBy?: string;
}

export interface OrderRec {
  id: string;
  userId: number;
  type: "esim" | "recharge";
  country: string;
  plan: string;
  amount: string;
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  provider?: string;
  createdAt: string;
  paymentMethod?: string;
  paymentId?: string;
  qr?: string;
  email?: string;
  expiresAt?: string;
}

export interface TicketRec {
  id: string;
  userId: number;
  query: string;
  status: "open" | "assigned" | "closed";
  createdAt: string;
  agentId?: number;
}

export interface CouponRec {
  code: string;
  credit: number;
  active: boolean;
  maxUses?: number;
  usedBy?: number[];
}

export interface ProviderRec {
  id: string;
  name: string;
  active: boolean;
  credentials?: Record<string, string>;
  planMap?: Record<string, string>;
}

export interface AuditRec {
  id: string;
  ts: string;
  adminId: number;
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
}

export interface BroadcastRec {
  id: string;
  text: string;
  imageUrl?: string;
  segment?: string;
  scheduledAt?: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  createdBy: number;
}

export interface SettingsRec {
  testMode: boolean;
  lastBroadcastTs: number;
  coupons: CouponRec[];
}

const DEFAULT_SETTINGS: SettingsRec = {
  testMode: false,
  lastBroadcastTs: 0,
  coupons: [
    { code: "WELCOME", credit: 2, active: true },
    { code: "TRAVEL10", credit: 0, active: true }, // percent promo handled in purchase flow
  ],
};

export const store = {
  async getAdmins(): Promise<number[]> {
    return load<number[]>("admins", []);
  },
  async setAdmins(ids: number[]): Promise<void> {
    await save("admins", ids);
  },
  async addAdmin(id: number): Promise<void> {
    const cur = await this.getAdmins();
    if (!cur.includes(id)) {
      await this.setAdmins([...cur, id]);
    }
  },
  async removeAdmin(id: number): Promise<void> {
    const cur = await this.getAdmins();
    await this.setAdmins(cur.filter((x) => x !== id));
  },

  /** Index of known user ids — never scan Redis; read through this list. */
  async getUserIds(): Promise<number[]> {
    return load<number[]>("userIds", []);
  },
  async getUsers(): Promise<UserRec[]> {
    const ids = await this.getUserIds();
    const out: UserRec[] = [];
    for (const id of ids) {
      const u = await this.getUser(id);
      if (u) out.push(u);
    }
    return out;
  },
  async saveUser(u: UserRec): Promise<void> {
    await save(`user:${u.id}`, u);
    const ids = await this.getUserIds();
    if (!ids.includes(u.id)) {
      await save("userIds", [...ids, u.id]);
    }
  },
  async getUser(id: number): Promise<UserRec | undefined> {
    return load<UserRec | undefined>(`user:${id}`, undefined);
  },

  async getOrderIds(): Promise<string[]> {
    return load<string[]>("orderIds", []);
  },
  async getOrders(): Promise<OrderRec[]> {
    const ids = await this.getOrderIds();
    const out: OrderRec[] = [];
    for (const id of ids) {
      const o = await this.getOrder(id);
      if (o) out.push(o);
    }
    // Newest first
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async getOrder(id: string): Promise<OrderRec | undefined> {
    return load<OrderRec | undefined>(`order:${id}`, undefined);
  },
  async saveOrder(o: OrderRec): Promise<void> {
    await save(`order:${o.id}`, o);
    const ids = await this.getOrderIds();
    if (!ids.includes(o.id)) {
      await save("orderIds", [o.id, ...ids].slice(0, 2000));
    }
  },
  async updateOrder(id: string, patch: Partial<OrderRec>): Promise<OrderRec | undefined> {
    const cur = await this.getOrder(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch };
    await save(`order:${id}`, next);
    return next;
  },

  async getProviders(): Promise<ProviderRec[]> {
    return load<ProviderRec[]>("providers", [
      { id: "jio", name: "Jio", active: true },
      { id: "airtel", name: "Airtel", active: true },
      { id: "telekom", name: "Telekom", active: true },
    ]);
  },
  async saveProvider(p: ProviderRec): Promise<void> {
    const list = await this.getProviders();
    const idx = list.findIndex((x) => x.id === p.id);
    if (idx >= 0) list[idx] = p;
    else list.push(p);
    await save("providers", list);
  },
  async deactivateProvider(id: string): Promise<void> {
    const list = await this.getProviders();
    const p = list.find((x) => x.id === id);
    if (p) {
      p.active = false;
      await save("providers", list);
    }
  },
  async activateProvider(id: string): Promise<void> {
    const list = await this.getProviders();
    const p = list.find((x) => x.id === id);
    if (p) {
      p.active = true;
      await save("providers", list);
    }
  },

  async getAudits(): Promise<AuditRec[]> {
    return load<AuditRec[]>("audits", []);
  },
  async addAudit(a: Omit<AuditRec, "id" | "ts">): Promise<AuditRec> {
    const audits = await this.getAudits();
    const rec: AuditRec = {
      ...a,
      id: "AUD-" + now().toString(36).toUpperCase(),
      ts: nowIso(),
    };
    audits.unshift(rec);
    await save("audits", audits.slice(0, 500));
    return rec;
  },

  async getBroadcasts(): Promise<BroadcastRec[]> {
    return load<BroadcastRec[]>("broadcasts", []);
  },
  async saveBroadcast(b: BroadcastRec): Promise<void> {
    const list = await this.getBroadcasts();
    const idx = list.findIndex((x) => x.id === b.id);
    if (idx >= 0) list[idx] = b;
    else list.push(b);
    await save("broadcasts", list);
  },

  async getSettings(): Promise<SettingsRec> {
    return load<SettingsRec>("settings", { ...DEFAULT_SETTINGS, coupons: [...DEFAULT_SETTINGS.coupons] });
  },
  async saveSettings(s: SettingsRec): Promise<void> {
    await save("settings", s);
  },

  async getTicketIds(): Promise<string[]> {
    return load<string[]>("ticketIds", []);
  },
  async saveTicket(t: TicketRec): Promise<void> {
    await save(`ticket:${t.id}`, t);
    const ids = await this.getTicketIds();
    if (!ids.includes(t.id)) {
      await save("ticketIds", [t.id, ...ids].slice(0, 1000));
    }
  },
  async getTicket(id: string): Promise<TicketRec | undefined> {
    return load<TicketRec | undefined>(`ticket:${id}`, undefined);
  },

  async getWallet(userId: number): Promise<{ balance: number; transactions: WalletTx[] }> {
    const u = await this.getUser(userId);
    return {
      balance: u?.credits ?? 0,
      transactions: u?.transactions ?? [],
    };
  },

  async addCredit(userId: number, amount: number, desc: string): Promise<void> {
    let u = await this.getUser(userId);
    if (!u) u = { id: userId, credits: 0, transactions: [] };
    u.credits = (u.credits || 0) + amount;
    const sign = amount >= 0 ? "+" : "";
    const tx: WalletTx = {
      date: nowIso().slice(5, 10),
      desc,
      amount: `${sign}$${Math.abs(amount).toFixed(2)}`,
    };
    u.transactions = [tx, ...(u.transactions ?? [])].slice(0, 50);
    await this.saveUser(u);
  },

  async redeemCoupon(userId: number, code: string): Promise<{ ok: boolean; credit: number; reason?: string }> {
    const settings = await this.getSettings();
    const coupon = settings.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.active);
    if (!coupon || coupon.credit <= 0) {
      return { ok: false, credit: 0, reason: "invalid" };
    }
    if (coupon.usedBy?.includes(userId)) {
      return { ok: false, credit: 0, reason: "already_used" };
    }
    coupon.usedBy = [...(coupon.usedBy ?? []), userId];
    await this.saveSettings(settings);
    await this.addCredit(userId, coupon.credit, `Coupon ${coupon.code}`);
    return { ok: true, credit: coupon.credit };
  },
};

export async function ensureUser(
  ctxFrom: { id: number; first_name?: string; username?: string } | undefined,
): Promise<UserRec> {
  if (!ctxFrom) return { id: 0, credits: 0, transactions: [] };
  let u = await store.getUser(ctxFrom.id);
  if (!u) {
    u = {
      id: ctxFrom.id,
      firstName: ctxFrom.first_name,
      username: ctxFrom.username,
      credits: 0,
      transactions: [],
      referralCode: "TRAVEL-" + String(ctxFrom.id).slice(-6),
      lastSeen: nowIso(),
    };
    await store.saveUser(u);
  } else {
    let dirty = false;
    if (u.firstName !== ctxFrom.first_name) {
      u.firstName = ctxFrom.first_name;
      dirty = true;
    }
    if (u.username !== ctxFrom.username) {
      u.username = ctxFrom.username;
      dirty = true;
    }
    u.lastSeen = nowIso();
    dirty = true;
    if (dirty) await store.saveUser(u);
  }
  return u;
}

export function isAdminSync(admins: number[], owner: number, id?: number): boolean {
  if (!id) return false;
  if (id === owner) return true;
  return admins.includes(id);
}

/** Test isolation — clears in-memory state between specs. */
export function _resetStoreForTests(): void {
  Object.keys(MEM).forEach((k) => delete MEM[k]);
  redisClient = null;
  redisInit = null;
}
