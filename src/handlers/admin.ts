import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
  paginate,
} from "../toolkit/index.js";
import { admin as copy, render } from "../i18n/en.js";
import { store, ensureUser, type OrderRec, type UserRec } from "../store.js";

const composer = new Composer<Ctx>();

const OWNER_ID = Number((typeof process !== "undefined" ? process.env.OWNER_TELEGRAM_ID : "") || "1");

async function getAdmins(): Promise<number[]> {
  const a = await store.getAdmins();
  if (a.length === 0 && OWNER_ID) {
    // ensure owner always admin
    await store.addAdmin(OWNER_ID);
    return [OWNER_ID];
  }
  return a;
}

async function isAdmin(id?: number): Promise<boolean> {
  if (!id) return false;
  if (id === OWNER_ID) return true;
  const admins = await getAdmins();
  return admins.includes(id);
}

async function safeAnswer(ctx: Ctx, text?: string) {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch {}
}

async function safeEdit(ctx: Ctx, text: string, extra?: any) {
  try {
    await ctx.editMessageText(text, extra);
  } catch {}
}

function adminMenuKeyboard() {
  return inlineKeyboard([
    [inlineButton(copy.dashboard, "admin:dashboard"), inlineButton(copy.orders, "admin:orders")],
    [inlineButton(copy.users, "admin:users"), inlineButton(copy.providers, "admin:providers")],
    [inlineButton(copy.broadcasts, "admin:broadcasts"), inlineButton(copy.settings, "admin:settings")],
    [inlineButton(copy.audit, "admin:audit")],
    [inlineButton(copy.back, "menu:main")],
  ]);
}

function backToAdmin() {
  return inlineKeyboard([[inlineButton(copy.back, "admin:menu")]]);
}

// /admin command entry
composer.command("admin", async (ctx) => {
  const uid = ctx.from?.id;
  if (!(await isAdmin(uid))) {
    await ctx.reply(copy.notAuthorized);
    return;
  }
  await ctx.reply(copy.menuTitle, { reply_markup: adminMenuKeyboard() });
});

// Admin button from menu (only rendered for admins)
composer.callbackQuery("admin:menu", async (ctx) => {
  if (!(await isAdmin(ctx.from?.id))) {
    await safeAnswer(ctx, copy.notAuthorized);
    return;
  }
  await safeAnswer(ctx);
  await safeEdit(ctx, copy.menuTitle, { reply_markup: adminMenuKeyboard() });
});

// Non-admin protection for any admin:*
composer.callbackQuery(/^admin:/, async (ctx, next) => {
  if (await isAdmin(ctx.from?.id)) return next();
  await safeAnswer(ctx, copy.notAuthorized);
});

// ── Dashboard ────────────────────────────────────────────────────────────────
composer.callbackQuery("admin:dashboard", async (ctx) => {
  await safeAnswer(ctx);
  const orders = await store.getOrders();
  const now = Date.now();
  const day = 86400000;
  const today = orders.filter(o => now - new Date(o.createdAt).getTime() < day && (o.status === "paid" || o.status === "refunded")).reduce((s, o) => s + parseAmount(o.amount), 0);
  const w7 = orders.filter(o => now - new Date(o.createdAt).getTime() < 7 * day && (o.status === "paid")).reduce((s, o) => s + parseAmount(o.amount), 0);
  const w30 = orders.filter(o => now - new Date(o.createdAt).getTime() < 30 * day && (o.status === "paid")).reduce((s, o) => s + parseAmount(o.amount), 0);
  const active = orders.filter(o => o.status === "paid" && o.type === "esim").length;
  const pending = orders.filter(o => o.status === "pending").length;
  const failed = orders.filter(o => o.status === "failed").length;
  const text = render(copy.dashTitle, {
    today: today.toFixed(2), w7: w7.toFixed(2), w30: w30.toFixed(2),
    active: String(active), pending: String(pending), failed: String(failed),
  });
  await safeEdit(ctx, text, {
    reply_markup: inlineKeyboard([
      [inlineButton("Sales today", "admin:metric:today"), inlineButton("Last 7d", "admin:metric:7")],
      [inlineButton("Active eSIMs", "admin:metric:active"), inlineButton("Pending", "admin:metric:pending")],
      [inlineButton(copy.back, "admin:menu")],
    ]),
  });
});

function parseAmount(a: string): number {
  return parseFloat((a || "0").replace(/[^0-9.]/g, "")) || 0;
}

composer.callbackQuery(/^admin:metric:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const m = ctx.match[1];
  const orders = await store.getOrders();
  let text = "Details:\n";
  if (m === "today") {
    const list = orders.slice(0, 5).map(o => `${o.id} ${o.amount}`);
    text += list.join("\n") || "None";
  } else if (m === "active") {
    text = "Active eSIMs: " + orders.filter(o => o.type === "esim" && o.status === "paid").length;
  } else {
    text = `${m} metric: ${orders.length} total orders.`;
  }
  await safeEdit(ctx, text, { reply_markup: backToAdmin() });
});

// ── Orders ───────────────────────────────────────────────────────────────────
composer.callbackQuery("admin:orders", async (ctx) => {
  await safeAnswer(ctx);
  await showOrders(ctx, 0, undefined);
});

async function showOrders(ctx: Ctx, page: number, statusFilter?: string) {
  let orders = await store.getOrders();
  if (statusFilter) orders = orders.filter(o => o.status === statusFilter);
  const { pageItems, controls, page: p } = paginate(orders, { page, perPage: 5, callbackPrefix: "admin:orders:pg" });
  if (pageItems.length === 0) {
    await safeEdit(ctx, copy.noOrders, { reply_markup: backToAdmin() });
    return;
  }
  const lines = pageItems.map((o, i) => `${i + 1}. ${o.id} ${o.status} ${o.amount}`);
  const kbRows = pageItems.map(o => [inlineButton(o.id, `admin:order:${o.id}`)]);
  const filterRow = [
    inlineButton("all", "admin:orders"),
    inlineButton("paid", "admin:orders:status:paid"),
    inlineButton("pending", "admin:orders:status:pending"),
    inlineButton("failed", "admin:orders:status:failed"),
  ];
  const kb = inlineKeyboard([
    ...kbRows,
    filterRow,
    controls.inline_keyboard[0] || [],
    [inlineButton("🔍 Search", "admin:orders:search"), inlineButton(copy.back, "admin:menu")],
  ]);
  await safeEdit(ctx, render(copy.ordersTitle, { page: String(p + 1) }) + "\n" + lines.join("\n"), { reply_markup: kb });
}

composer.callbackQuery(/^admin:orders:pg:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const pg = parseInt(ctx.match[1], 10);
  await showOrders(ctx, pg);
});

composer.callbackQuery(/^admin:orders:status:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const st = ctx.match[1];
  await showOrders(ctx, 0, st);
});

composer.callbackQuery("admin:orders:search", async (ctx) => {
  await safeAnswer(ctx);
  (ctx.session as any).step = "admin_search_orders";
  await safeEdit(ctx, "Enter order ID, phone or user ID to search:", { reply_markup: backToAdmin() });
});

// search handler later in text

composer.callbackQuery(/^admin:order:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const id = ctx.match[1];
  const orders = await store.getOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) {
    await safeEdit(ctx, "Order not found.", { reply_markup: backToAdmin() });
    return;
  }
  const text = render(copy.orderDetail, {
    id: o.id, user: String(o.userId), type: o.type, plan: o.plan, amount: o.amount, status: o.status, at: o.createdAt.slice(0, 16),
  });
  await safeEdit(ctx, text, {
    reply_markup: inlineKeyboard([
      [inlineButton(copy.resendQR, `admin:act:resend:${id}`), inlineButton(copy.retryPay, `admin:act:retry:${id}`)],
      [inlineButton(copy.refund, `admin:act:refund:${id}`), inlineButton(copy.cancelOrder, `admin:act:cancel:${id}`)],
      [inlineButton(copy.changeStatus, `admin:act:status:${id}`), inlineButton(copy.exportCSV, `admin:act:export:${id}`)],
      [inlineButton(copy.back, "admin:orders")],
    ]),
  });
});

// actions with confirm
composer.callbackQuery(/^admin:act:(resend|retry|refund|cancel|status|export):(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const [, act, id] = ctx.match;
  if (act === "resend" || act === "retry") {
    await store.addAudit({ adminId: ctx.from?.id ?? 0, action: act, target: id });
    await safeEdit(ctx, `${act} done for ${id}. ${copy.actionDone}`, { reply_markup: backToAdmin() });
    return;
  }
  if (act === "export") {
    const orders = await store.getOrders();
    const o = orders.find(x => x.id === id);
    const csv = `id,user,type,amount,status\n${o ? `${o.id},${o.userId},${o.type},${o.amount},${o.status}` : ""}`;
    await safeEdit(ctx, "CSV:\n" + csv, { reply_markup: backToAdmin() });
    return;
  }
  if (act === "refund") {
    await safeEdit(ctx, render(copy.confirmRefund, { id }), {
      reply_markup: inlineKeyboard([
        [inlineButton(copy.confirm, `admin:do:refund:${id}`), inlineButton(copy.cancel, `admin:order:${id}`)],
      ]),
    });
    return;
  }
  if (act === "cancel") {
    await safeEdit(ctx, render(copy.confirmCancel, { id }), {
      reply_markup: inlineKeyboard([
        [inlineButton(copy.confirm, `admin:do:cancel:${id}`), inlineButton(copy.cancel, `admin:order:${id}`)],
      ]),
    });
    return;
  }
  if (act === "status") {
    await safeEdit(ctx, "Set status to:", {
      reply_markup: inlineKeyboard([
        [inlineButton("paid", `admin:do:status:${id}:paid`), inlineButton("failed", `admin:do:status:${id}:failed`)],
        [inlineButton("refunded", `admin:do:status:${id}:refunded`), inlineButton("cancelled", `admin:do:status:${id}:cancelled`)],
        [inlineButton(copy.back, `admin:order:${id}`)],
      ]),
    });
  }
});

composer.callbackQuery(/^admin:do:(refund|cancel):(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const [, act, id] = ctx.match;
  const newStatus = act === "refund" ? "refunded" : "cancelled";
  const before = await store.updateOrder(id, { status: newStatus as any });
  await store.addAudit({ adminId: ctx.from?.id ?? 0, action: `order_${act}`, target: id, before, after: { status: newStatus } });
  await safeEdit(ctx, `Order ${id} ${newStatus}. ${copy.actionDone}`, { reply_markup: backToAdmin() });
});

composer.callbackQuery(/^admin:do:status:(.+):(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const id = ctx.match[1];
  const st = ctx.match[2] as any;
  const before = await store.updateOrder(id, { status: st });
  await store.addAudit({ adminId: ctx.from?.id ?? 0, action: "order_status", target: id, before, after: { status: st } });
  await safeEdit(ctx, `Status updated. ${copy.actionDone}`, { reply_markup: backToAdmin() });
});

// ── Users ────────────────────────────────────────────────────────────────────
composer.callbackQuery("admin:users", async (ctx) => {
  await safeAnswer(ctx);
  await showUsers(ctx, 0);
});

async function showUsers(ctx: Ctx, page: number) {
  const users = await store.getUsers();
  const { pageItems, controls, page: p } = paginate(users, { page, perPage: 5, callbackPrefix: "admin:users:pg" });
  const lines = pageItems.map(u => `${u.id} ${u.firstName || ""} cr:${u.credits || 0}`);
  const rows = pageItems.map(u => [inlineButton(String(u.id), `admin:user:${u.id}`)]);
  const kb = inlineKeyboard([
    ...rows,
    controls.inline_keyboard[0] || [],
    [inlineButton("🔍 Search users", "admin:users:search"), inlineButton(copy.back, "admin:menu")],
  ]);
  await safeEdit(ctx, render(copy.usersTitle, { page: String(p + 1) }) + "\n" + (lines.join("\n") || "No users"), { reply_markup: kb });
}

composer.callbackQuery(/^admin:users:pg:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  await showUsers(ctx, parseInt(ctx.match[1]));
});

composer.callbackQuery("admin:users:search", async (ctx) => {
  await safeAnswer(ctx);
  (ctx.session as any).step = "admin_search_users";
  await safeEdit(ctx, "Enter Telegram ID, email or phone:", { reply_markup: backToAdmin() });
});

composer.callbackQuery(/^admin:user:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const id = Number(ctx.match[1]);
  const u = await store.getUser(id) || { id, credits: 0 } as UserRec;
  const text = render(copy.userDetail, { id: String(u.id), name: u.firstName || "-", credits: String(u.credits || 0), blocked: u.blocked ? "yes" : "no" });
  await safeEdit(ctx, text, {
    reply_markup: inlineKeyboard([
      [inlineButton(copy.addCredit, `admin:usr:credit:${id}`), inlineButton(u.blocked ? copy.unblockUser : copy.blockUser, `admin:usr:block:${id}`)],
      [inlineButton(copy.messageUser, `admin:usr:msg:${id}`)],
      [inlineButton(copy.back, "admin:users")],
    ]),
  });
});

composer.callbackQuery(/^admin:usr:(credit|block|msg):(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const [ , act, ids ] = ctx.match;
  const id = Number(ids);
  if (act === "credit") {
    (ctx.session as any).step = `admin_add_credit:${id}`;
    await safeEdit(ctx, "Enter amount to add (e.g. 5):", { reply_markup: backToAdmin() });
    return;
  }
  if (act === "block") {
    const u = await store.getUser(id) || { id, credits: 0 };
    u.blocked = !u.blocked;
    await store.saveUser(u);
    await store.addAudit({ adminId: ctx.from?.id ?? 0, action: u.blocked ? "block_user" : "unblock_user", target: String(id) });
    await safeEdit(ctx, copy.actionDone, { reply_markup: backToAdmin() });
    return;
  }
  if (act === "msg") {
    (ctx.session as any).step = `admin_msg_user:${id}`;
    await safeEdit(ctx, "Type message to send to user:", { reply_markup: backToAdmin() });
  }
});

// ── Providers CRUD ───────────────────────────────────────────────────────────
composer.callbackQuery("admin:providers", async (ctx) => {
  await safeAnswer(ctx);
  const provs = await store.getProviders();
  const rows = provs.map(p => [inlineButton(`${p.name} ${p.active ? "✅" : "⏸"}`, `admin:prov:${p.id}`)]);
  rows.push([inlineButton(copy.createProv, "admin:prov:create"), inlineButton(copy.back, "admin:menu")]);
  await safeEdit(ctx, copy.providersTitle, { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery(/^admin:prov:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const pid = ctx.match[1];
  if (pid === "create") {
    (ctx.session as any).step = "admin_create_prov";
    await safeEdit(ctx, "Enter provider name (e.g. Airalo):", { reply_markup: backToAdmin() });
    return;
  }
  const list = await store.getProviders();
  const p = list.find(x => x.id === pid);
  if (!p) return;
  const text = render(copy.providerDetail, { name: p.name, active: p.active ? "yes" : "no" });
  await safeEdit(ctx, text, {
    reply_markup: inlineKeyboard([
      [inlineButton(copy.deactivate, `admin:prov:deact:${pid}`), inlineButton(copy.activate, `admin:prov:act:${pid}`)],
      [inlineButton(copy.testFetch, `admin:prov:test:${pid}`)],
      [inlineButton(copy.back, "admin:providers")],
    ]),
  });
});

composer.callbackQuery(/^admin:prov:(deact|act):(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const act = ctx.match[1];
  const pid = ctx.match[2];
  if (act === "deact") {
    await safeEdit(ctx, render(copy.confirmDeleteProv, { name: pid }), {
      reply_markup: inlineKeyboard([
        [inlineButton(copy.confirm, `admin:do:deact:${pid}`), inlineButton(copy.cancel, "admin:providers")],
      ]),
    });
    return;
  }
  if (act === "act") {
    await store.activateProvider(pid);
    await store.addAudit({ adminId: ctx.from?.id ?? 0, action: "provider_activate", target: pid });
    await safeEdit(ctx, copy.actionDone, { reply_markup: backToAdmin() });
  }
});

composer.callbackQuery(/^admin:do:deact:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const pid = ctx.match[1];
  await store.deactivateProvider(pid);
  await store.addAudit({ adminId: ctx.from?.id ?? 0, action: "provider_deactivate", target: pid });
  await safeEdit(ctx, copy.actionDone, { reply_markup: backToAdmin() });
});

composer.callbackQuery(/^admin:prov:test:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  await safeEdit(ctx, `Test fetch for ${ctx.match[1]}: OK (simulated 3 plans, 200ms).`, { reply_markup: backToAdmin() });
});

// ── Broadcasts ───────────────────────────────────────────────────────────────
let lastBroadcastTs = 0;

composer.callbackQuery("admin:broadcasts", async (ctx) => {
  await safeAnswer(ctx);
  const bs = await store.getBroadcasts();
  const lines = bs.slice(0, 3).map(b => `${b.id} ${b.status}`);
  await safeEdit(ctx, copy.broadcastsTitle + "\n" + (lines.join("\n") || "None"), {
    reply_markup: inlineKeyboard([
      [inlineButton(copy.compose, "admin:bc:compose"), inlineButton(copy.sendNow, "admin:bc:send")],
      [inlineButton(copy.preview, "admin:bc:preview"), inlineButton(copy.cancelSched, "admin:bc:cancel")],
      [inlineButton(copy.back, "admin:menu")],
    ]),
  });
});

composer.callbackQuery("admin:bc:compose", async (ctx) => {
  await safeAnswer(ctx);
  (ctx.session as any).step = "admin_bc_text";
  await safeEdit(ctx, "Type broadcast text:", { reply_markup: backToAdmin() });
});

composer.callbackQuery("admin:bc:preview", async (ctx) => {
  await safeAnswer(ctx);
  await safeEdit(ctx, "Preview: [Your message here]\nSegment: all", { reply_markup: backToAdmin() });
});

composer.callbackQuery("admin:bc:send", async (ctx) => {
  await safeAnswer(ctx);
  const now = Date.now();
  if (now - lastBroadcastTs < 30000) {
    await safeEdit(ctx, copy.rateLimit, { reply_markup: backToAdmin() });
    return;
  }
  await safeEdit(ctx, render(copy.confirmBroadcast, { count: "42" }), {
    reply_markup: inlineKeyboard([
      [inlineButton(copy.confirm, "admin:do:bc:send"), inlineButton(copy.cancel, "admin:broadcasts")],
    ]),
  });
});

composer.callbackQuery("admin:do:bc:send", async (ctx) => {
  await safeAnswer(ctx);
  lastBroadcastTs = Date.now();
  const b: any = { id: "BC-" + Date.now().toString(36), text: "demo", status: "sent", createdBy: ctx.from?.id ?? 0 };
  await store.saveBroadcast(b);
  await store.addAudit({ adminId: ctx.from?.id ?? 0, action: "broadcast_send", target: b.id });
  await safeEdit(ctx, "Broadcast sent (sim).", { reply_markup: backToAdmin() });
});

composer.callbackQuery("admin:bc:cancel", async (ctx) => {
  await safeAnswer(ctx);
  await safeEdit(ctx, "No scheduled broadcasts.", { reply_markup: backToAdmin() });
});

// ── Settings ─────────────────────────────────────────────────────────────────
composer.callbackQuery("admin:settings", async (ctx) => {
  await safeAnswer(ctx);
  const test = "off";
  const text = render(copy.settingsTitle, { test });
  await safeEdit(ctx, text, {
    reply_markup: inlineKeyboard([
      [inlineButton(copy.toggleTest, "admin:set:test")],
      [inlineButton("Add admin ID", "admin:set:addadmin"), inlineButton("Remove admin ID", "admin:set:rmadmin")],
      [inlineButton(copy.back, "admin:menu")],
    ]),
  });
});

composer.callbackQuery("admin:set:test", async (ctx) => {
  await safeAnswer(ctx);
  await store.addAudit({ adminId: ctx.from?.id ?? 0, action: "toggle_test", target: "settings" });
  await safeEdit(ctx, "Test mode toggled (sim).", { reply_markup: backToAdmin() });
});

composer.callbackQuery(/^admin:set:(addadmin|rmadmin)$/, async (ctx) => {
  await safeAnswer(ctx);
  const act = ctx.match[1];
  (ctx.session as any).step = act === "addadmin" ? "admin_add_admin" : "admin_rm_admin";
  await safeEdit(ctx, "Enter Telegram user ID:", { reply_markup: backToAdmin() });
});

// ── Audit Logs ───────────────────────────────────────────────────────────────
composer.callbackQuery("admin:audit", async (ctx) => {
  await safeAnswer(ctx);
  const audits = await store.getAudits();
  const lines = audits.slice(0, 8).map(a => `${a.ts.slice(11,19)} ${a.adminId} ${a.action} ${a.target}`);
  const csvBtn = audits.length ? [inlineButton(copy.auditExport, "admin:audit:export")] : [];
  await safeEdit(ctx, copy.auditTitle + "\n" + (lines.join("\n") || copy.noAudits), {
    reply_markup: inlineKeyboard([ csvBtn, [inlineButton(copy.back, "admin:menu")] ]),
  });
});

composer.callbackQuery("admin:audit:export", async (ctx) => {
  await safeAnswer(ctx);
  const audits = await store.getAudits();
  const csv = "ts,admin,action,target\n" + audits.map(a => `${a.ts},${a.adminId},${a.action},${a.target}`).join("\n");
  await safeEdit(ctx, "Audit CSV:\n" + csv.slice(0, 1500), { reply_markup: backToAdmin() });
});

// ── Text input handlers for admin steps ──────────────────────────────────────
composer.on("message:text", async (ctx, next) => {
  const step = (ctx.session as any).step;
  if (!step || !step.startsWith("admin")) return next();

  const text = ctx.message.text.trim();
  const uid = ctx.from?.id ?? 0;

  if (step === "admin_search_orders") {
    (ctx.session as any).step = "idle";
    const orders = (await store.getOrders()).filter(o =>
      o.id.toLowerCase().includes(text.toLowerCase()) ||
      String(o.userId).includes(text)
    );
    const lines = orders.slice(0, 5).map(o => `${o.id} ${o.status}`);
    await ctx.reply("Search results:\n" + (lines.join("\n") || "none"), { reply_markup: backToAdmin() });
    return;
  }
  if (step === "admin_search_users") {
    (ctx.session as any).step = "idle";
    const users = (await store.getUsers()).filter(u => String(u.id).includes(text) || (u.email || "").includes(text));
    const lines = users.map(u => `${u.id} ${u.firstName}`);
    await ctx.reply("Users:\n" + (lines.join("\n") || "none"), { reply_markup: backToAdmin() });
    return;
  }
  if (step === "admin_create_prov") {
    (ctx.session as any).step = "idle";
    const id = text.toLowerCase().replace(/\s+/g, "_");
    await store.saveProvider({ id, name: text, active: true });
    await store.addAudit({ adminId: uid, action: "provider_create", target: id });
    await ctx.reply("Provider created.", { reply_markup: backToAdmin() });
    return;
  }
  if (step === "admin_add_admin") {
    (ctx.session as any).step = "idle";
    const nid = parseInt(text, 10);
    if (nid && uid === OWNER_ID) {
      await store.addAdmin(nid);
      await store.addAudit({ adminId: uid, action: "admin_add", target: String(nid) });
      await ctx.reply("Admin added. Access immediate.", { reply_markup: backToAdmin() });
    } else {
      await ctx.reply(copy.ownerOnly);
    }
    return;
  }
  if (step === "admin_rm_admin") {
    (ctx.session as any).step = "idle";
    const nid = parseInt(text, 10);
    if (nid && uid === OWNER_ID && nid !== OWNER_ID) {
      await store.removeAdmin(nid);
      await store.addAudit({ adminId: uid, action: "admin_remove", target: String(nid) });
      await ctx.reply("Admin removed.", { reply_markup: backToAdmin() });
    } else {
      await ctx.reply(copy.ownerOnly);
    }
    return;
  }
  if (step.startsWith("admin_add_credit:")) {
    const id = Number(step.split(":")[1]);
    const amt = parseFloat(text) || 0;
    (ctx.session as any).step = "idle";
    await store.addCredit(id, amt, "admin");
    await store.addAudit({ adminId: uid, action: "add_credit", target: String(id), after: { amt } });
    await ctx.reply(`Added ${amt} to ${id}.`, { reply_markup: backToAdmin() });
    return;
  }
  if (step.startsWith("admin_msg_user:")) {
    const id = Number(step.split(":")[1]);
    (ctx.session as any).step = "idle";
    await store.addAudit({ adminId: uid, action: "msg_user", target: String(id) });
    await ctx.reply(`(sim) Message sent to ${id}: ${text}`, { reply_markup: backToAdmin() });
    return;
  }
  if (step === "admin_bc_text") {
    (ctx.session as any).step = "idle";
    (ctx.session as any).bcText = text;
    await ctx.reply("Text saved. Use preview or send.", { reply_markup: backToAdmin() });
    return;
  }

  await next();
});

// ensure on start etc user tracked
composer.use(async (ctx, next) => {
  if (ctx.from) await ensureUser(ctx.from).catch(() => {});
  return next();
});

export default composer;
