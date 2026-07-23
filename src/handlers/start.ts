import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  mainMenuKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "💰 Wallet", data: "wallet:show", order: 40 });

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome! Tap a button below to get started.";

composer.command("start", async (ctx) => {
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
