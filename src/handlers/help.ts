import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { help as helpCopy } from "../i18n/en.js";

const composer = new Composer<Ctx>();

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(helpCopy.default);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(helpCopy.default, { reply_markup: backToMenu });
});

export default composer;
