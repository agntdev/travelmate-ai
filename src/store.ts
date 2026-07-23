import type { RedisLike } from "./toolkit/session/redis.js";

const MEM: Record<string, unknown> = {};

let redisClient: RedisLike | null = null;
let redisInit: Promise<void> | null = null;

async function getRedis(): Promise<RedisLike | null> {
  if (redisClient) return redisClient;
  const url = (typeof process !== "undefined" ? process.env : ({} as any)).REDIS_URL;
  if (!url) return null;
  if (!redisInit) {
    redisInit = (async () => {
      try {
        const { createRequire } = await import("node:module");
        const require = createRequire(import.meta.url);
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
      try { return JSON.parse(raw) as T; } catch {}
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
    MEM["tm:" + key] = JSON.parse(json); // clone
  }
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
  qr?: string;
}

export interface ProviderRec {
  id: string;
  name: string;
  active: boolean;
  credentials?: Record<string, string>;
  planMap?: Record<string, string>; // sku -> app plan
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

  async getUsers(): Promise<UserRec[]> {
    return load<UserRec[]>("users", []);
  },
  async saveUser(u: UserRec): Promise<void> {
    const users = await this.getUsers();
    const idx = users.findIndex((x) => x.id === u.id);
    if (idx >= 0) users[idx] = u; else users.push(u);
    await save("users", users);
  },
  async getUser(id: number): Promise<UserRec | undefined> {
    const users = await this.getUsers();
    return users.find((u) => u.id === id);
  },

  async getOrders(): Promise<OrderRec[]> {
    return load<OrderRec[]>("orders", []);
  },
  async saveOrder(o: OrderRec): Promise<void> {
    const orders = await this.getOrders();
    const idx = orders.findIndex((x) => x.id === o.id);
    if (idx >= 0) orders[idx] = o; else orders.push(o);
    await save("orders", orders);
  },
  async updateOrder(id: string, patch: Partial<OrderRec>): Promise<OrderRec | undefined> {
    const orders = await this.getOrders();
    const idx = orders.findIndex((x) => x.id === id);
    if (idx < 0) return undefined;
    const before = { ...orders[idx] };
    orders[idx] = { ...orders[idx], ...patch };
    await save("orders", orders);
    return orders[idx];
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
    if (idx >= 0) list[idx] = p; else list.push(p);
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
    const rec: AuditRec = { ...a, id: "AUD-" + Date.now().toString(36).toUpperCase(), ts: new Date().toISOString() };
    audits.unshift(rec);
    await save("audits", audits.slice(0, 500)); // cap
    return rec;
  },

  async getBroadcasts(): Promise<BroadcastRec[]> {
    return load<BroadcastRec[]>("broadcasts", []);
  },
  async saveBroadcast(b: BroadcastRec): Promise<void> {
    const list = await this.getBroadcasts();
    const idx = list.findIndex((x) => x.id === b.id);
    if (idx >= 0) list[idx] = b; else list.push(b);
    await save("broadcasts", list);
  },

  // For per-user wallet/credits we sync to userRec.credits
  async getWallet(userId: number): Promise<{ balance: number; transactions: Array<{date:string;desc:string;amount:string}> }> {
    const u = await this.getUser(userId);
    const bal = u?.credits ?? 0;
    // transactions kept minimal in orders, here return recent from orders for user
    const orders = (await this.getOrders()).filter(o => o.userId === userId).slice(0,5).map(o => ({
      date: o.createdAt.slice(5,10),
      desc: o.plan,
      amount: `-${o.amount}`,
    }));
    return { balance: bal, transactions: orders };
  },
  async addCredit(userId: number, amount: number, desc: string): Promise<void> {
    let u = await this.getUser(userId);
    if (!u) u = { id: userId, credits: 0 };
    u.credits = (u.credits || 0) + amount;
    await this.saveUser(u);
  },
};

export async function ensureUser(ctxFrom: {id:number; first_name?:string; username?:string} | undefined): Promise<UserRec> {
  if (!ctxFrom) return { id: 0, credits: 0 };
  let u = await store.getUser(ctxFrom.id);
  if (!u) {
    u = { id: ctxFrom.id, firstName: ctxFrom.first_name, username: ctxFrom.username, credits: 0 };
    await store.saveUser(u);
  } else if (u.firstName !== ctxFrom.first_name || u.username !== ctxFrom.username) {
    u.firstName = ctxFrom.first_name;
    u.username = ctxFrom.username;
    await store.saveUser(u);
  }
  return u;
}

export function isAdminSync(admins: number[], owner: number, id?: number): boolean {
  if (!id) return false;
  if (id === owner) return true;
  return admins.includes(id);
}

/** Test isolation only — clears in-memory state between specs. */
export function _resetStoreForTests(): void {
  Object.keys(MEM).forEach((k) => delete MEM[k]);
  redisClient = null;
  redisInit = null;
}
