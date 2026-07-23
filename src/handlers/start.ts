import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  mainMenuKeyboard,
} from "../toolkit/index.js";
import { welcome } from "../i18n/en.js";

registerMainMenuItem({ label: "💰 Wallet", data: "wallet:show", order: 40 });

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  await ctx.reply(welcome.default, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(welcome.default, { reply_markup: mainMenuKeyboard() });
});

export default composer;
