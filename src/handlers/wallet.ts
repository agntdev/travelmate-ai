import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";

function walletKeyboard() {
  return inlineKeyboard([
    [inlineButton("🎁 Redeem coupon", "wallet:coupon"), inlineButton("👥 Referral", "wallet:referral")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

function walletText(ctx: Ctx): string {
  const wallet = ctx.session.wallet ?? { balance: 0, transactions: [] };
  const balance = `$${wallet.balance.toFixed(2)}`;
  if (wallet.transactions.length === 0) {
    return (
      `💰 Your wallet\n\n` +
      `Balance: ${balance}\n\n` +
      `No transactions yet — buy an eSIM or recharge to get started.`
    );
  }
  const txLines = wallet.transactions
    .slice(0, 10)
    .map((t) => `${t.date}  ${t.desc}  ${t.amount}`)
    .join("\n");
  return (
    `💰 Your wallet\n\n` +
    `Balance: ${balance}\n\n` +
    `Recent transactions:\n${txLines}\n\n` +
    `Use the buttons below to redeem a coupon or check your referral code.`
  );
}

const composer = new Composer<Ctx>();

composer.command("wallet", async (ctx) => {
  await ctx.reply(walletText(ctx), { reply_markup: walletKeyboard() });
});

composer.callbackQuery("wallet:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(walletText(ctx), { reply_markup: walletKeyboard() });
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

  // Apply coupon to wallet
  if (!ctx.session.wallet) ctx.session.wallet = { balance: 0, transactions: [] };
  ctx.session.wallet.balance += 2.0;
  ctx.session.wallet.transactions.unshift({
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    desc: `Coupon "${code}"`,
    amount: "+$2.00",
  });

  const balance = `$${ctx.session.wallet.balance.toFixed(2)}`;
  await ctx.reply(
    `Coupon "${code}" redeemed! $2.00 has been added to your wallet.\n\n` +
    `New balance: ${balance}`,
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
});

export default composer;
