import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { wallet as copy, render } from "../i18n/en.js";

// ── Safe API helpers ──────────────────────────────────────────────────────────

async function safeAnswer(ctx: Ctx) {
  try {
    await ctx.answerCallbackQuery();
  } catch {
    // Query too old or invalid — ignore silently.
  }
}

async function safeEdit(ctx: Ctx, text: string, extra?: Record<string, unknown>) {
  try {
    await ctx.editMessageText(text, extra);
  } catch {
    // Message not modified or already deleted — ignore.
  }
}

// ── Keyboard builders ─────────────────────────────────────────────────────────

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
    return render(copy.emptyFull, { balance });
  }
  const txLines = wallet.transactions
    .slice(0, 10)
    .map((t) => `${t.date}  ${t.desc}  ${t.amount}`)
    .join("\n");
  return render(copy.withTransactions, { balance, transactions: txLines });
}

// ── Composer ──────────────────────────────────────────────────────────────────

const composer = new Composer<Ctx>();

composer.command("wallet", async (ctx) => {
  await ctx.reply(walletText(ctx), { reply_markup: walletKeyboard() });
});

composer.callbackQuery("wallet:show", async (ctx) => {
  await safeAnswer(ctx);
  await safeEdit(ctx, walletText(ctx), { reply_markup: walletKeyboard() });
});

composer.callbackQuery("wallet:coupon", async (ctx) => {
  await safeAnswer(ctx);
  await safeEdit(
    ctx,
    copy.couponPrompt,
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to wallet", "wallet:show")]]) },
  );
  ctx.session.step = "wallet_coupon";
});

composer.callbackQuery("wallet:referral", async (ctx) => {
  await safeAnswer(ctx);
  const code = "TRAVEL-" + String(ctx.from?.id ?? 0).slice(-6);
  await safeEdit(
    ctx,
    render(copy.referral, { code }),
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to wallet", "wallet:show")]]) },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "wallet_coupon") return next();
  const code = ctx.message.text.trim();
  if (code.length < 3) {
    await ctx.reply(copy.couponInvalid);
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
    render(copy.couponSuccess, { code, balance }),
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
});

export default composer;
