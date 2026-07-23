import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";

const BALANCE = "$12.50";
const TRANSACTIONS = [
  { date: "Jul 20", desc: "eSIM Japan 3 GB", amount: "-$11.99" },
  { date: "Jul 18", desc: "Wallet top-up", amount: "+$25.00" },
  { date: "Jul 15", desc: "Mobile recharge India", amount: "-$4.49" },
];

function walletKeyboard() {
  return inlineKeyboard([
    [inlineButton("🎁 Redeem coupon", "wallet:coupon"), inlineButton("👥 Referral", "wallet:referral")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

const composer = new Composer<Ctx>();

composer.command("wallet", async (ctx) => {
  const txLines = TRANSACTIONS.map((t) => `${t.date}  ${t.desc}  ${t.amount}`).join("\n");
  await ctx.reply(
    `💰 Your wallet\n\n` +
    `Balance: ${BALANCE}\n\n` +
    `Recent transactions:\n${txLines}\n\n` +
    `Use the buttons below to redeem a coupon or check your referral code.`,
    { reply_markup: walletKeyboard() },
  );
});

composer.callbackQuery("wallet:coupon", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Enter your coupon code to redeem it.\n\n" +
    "Just type or paste the code here.",
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to wallet", "wallet:show")]]) },
  );
  ctx.session.step = "wallet_coupon";
});

composer.callbackQuery("wallet:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const txLines = TRANSACTIONS.map((t) => `${t.date}  ${t.desc}  ${t.amount}`).join("\n");
  await ctx.editMessageText(
    `💰 Your wallet\n\n` +
    `Balance: ${BALANCE}\n\n` +
    `Recent transactions:\n${txLines}\n\n` +
    `Use the buttons below to redeem a coupon or check your referral code.`,
    { reply_markup: walletKeyboard() },
  );
});

composer.callbackQuery("wallet:referral", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "👥 Share your referral link with friends!\n\n" +
    "When they sign up and make their first purchase, you both get $5.00 credit.\n\n" +
    "Your referral code: TRAVEL-" + String(ctx.from?.id ?? 0).slice(-6) + "\n\n" +
    "Share this code — they enter it during sign-up.",
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to wallet", "wallet:show")]]) },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "wallet_coupon") return next();
  const code = ctx.message.text.trim();
  if (code.length < 3) {
    await ctx.reply("That code doesn't look right. Please enter a valid coupon code.");
    return;
  }
  ctx.session.step = "idle";
  await ctx.reply(
    `Coupon "${code}" redeemed! $2.00 has been added to your wallet.\n\n` +
    `New balance: $14.50`,
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
});

export default composer;
