import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  mainMenuItems,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { welcome } from "../i18n/en.js";
import { store, ensureUser } from "../store.js";
import { safeAnswer, safeEdit } from "../safe-api.js";

registerMainMenuItem({ label: "💰 Wallet", data: "wallet:show", order: 40 });

const composer = new Composer<Ctx>();

const OWNER_ID = Number((typeof process !== "undefined" ? process.env.OWNER_TELEGRAM_ID : "") || "1");

async function isAdmin(id?: number): Promise<boolean> {
  if (!id) return false;
  if (id === OWNER_ID) return true;
  const admins = await store.getAdmins();
  return admins.includes(id);
}

function buildMenuKeyboard(isAdm: boolean) {
  const items = mainMenuItems();
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2).map((it) => inlineButton(it.label, it.data)));
  }
  if (isAdm) {
    rows.push([inlineButton("🛠 Admin", "admin:menu")]);
  }
  rows.push([inlineButton("❓ Help", "menu:help")]);
  return inlineKeyboard(rows);
}

composer.command("start", async (ctx) => {
  await ensureUser(ctx.from || undefined);
  // Deep-link payloads: /start <code> for referral or invite join.
  const payload = ctx.message?.text?.split(/\s+/)[1];
  if (payload && payload.startsWith("ref_")) {
    const u = await ensureUser(ctx.from || undefined);
    if (!u.referredBy && payload.slice(4)) {
      u.referredBy = payload.slice(4);
      await store.saveUser(u);
    }
  }
  const adm = await isAdmin(ctx.from?.id);
  await ctx.reply(welcome.default, { reply_markup: buildMenuKeyboard(adm) });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await safeAnswer(ctx);
  await ensureUser(ctx.from || undefined);
  const adm = await isAdmin(ctx.from?.id);
  await safeEdit(ctx, welcome.default, { reply_markup: buildMenuKeyboard(adm) });
});

export default composer;
