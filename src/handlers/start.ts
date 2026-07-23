import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  mainMenuKeyboard,
} from "../toolkit/index.js";
import { welcome } from "../i18n/en.js";

registerMainMenuItem({ label: "💰 Wallet", data: "wallet:show", order: 40 });

const composer = new Composer<Ctx>();

// Tolerate "query is too old" and "message is not modified" so tapping a
// stale button (or re-tapping the current screen) never throws into the logs.
async function safeAnswer(ctx: Ctx) {
  try {
    await ctx.answerCallbackQuery();
  } catch {
    // Query expired / invalid — nothing to do.
  }
}

async function safeEdit(ctx: Ctx, text: string, extra?: Record<string, unknown>) {
  try {
    await ctx.editMessageText(text, extra);
  } catch {
    // Message unchanged or already gone — ignore.
  }
}

composer.command("start", async (ctx) => {
  await ctx.reply(welcome.default, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await safeAnswer(ctx);
  await safeEdit(ctx, welcome.default, { reply_markup: mainMenuKeyboard() });
});

export default composer;
