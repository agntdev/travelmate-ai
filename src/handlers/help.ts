import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { help as helpCopy } from "../i18n/en.js";

const composer = new Composer<Ctx>();

// Tolerate "query is too old" and "message is not modified" so a stale tap
// never throws into the logs.
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

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(helpCopy.default);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await safeAnswer(ctx);
  await safeEdit(ctx, helpCopy.default, { reply_markup: backToMenu });
});

export default composer;
