import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  confirmKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "📲 Recharge", data: "recharge:start", order: 20 });

// ── Data catalog ──────────────────────────────────────────────────────────────

const COUNTRIES = [
  { name: "🇮🇳 India", code: "IN" },
  { name: "🇺🇸 United States", code: "US" },
  { name: "🇬🇧 United Kingdom", code: "GB" },
  { name: "🇩🇪 Germany", code: "DE" },
  { name: "🇯🇵 Japan", code: "JP" },
  { name: "🇧🇷 Brazil", code: "BR" },
];

const OPERATORS: Record<string, Array<{ id: string; name: string }>> = {
  IN: [
    { id: "jio", name: "Jio" },
    { id: "airtel", name: "Airtel" },
    { id: "vi", name: "Vi (Vodafone Idea)" },
    { id: "bsnl", name: "BSNL" },
  ],
  US: [
    { id: "tmobile", name: "T-Mobile" },
    { id: "att", name: "AT&T" },
    { id: "verizon", name: "Verizon" },
  ],
  GB: [
    { id: "ee", name: "EE" },
    { id: "vodafone_uk", name: "Vodafone" },
    { id: "three", name: "Three" },
    { id: "o2", name: "O2" },
  ],
  DE: [
    { id: "telekom", name: "Telekom" },
    { id: "vodafone_de", name: "Vodafone" },
    { id: "o2_de", name: "O2" },
  ],
  JP: [
    { id: "docomo", name: "NTT Docomo" },
    { id: "softbank", name: "SoftBank" },
    { id: "kddi", name: "au (KDDI)" },
  ],
  BR: [
    { id: "vivo", name: "Vivo" },
    { id: "claro", name: "Claro" },
    { id: "tim", name: "TIM" },
    { id: "oi", name: "Oi" },
  ],
};

const AMOUNTS: Record<string, string[]> = {
  IN: ["₹100", "₹200", "₹500", "₹1000"],
  US: ["$5", "$10", "$25", "$50"],
  GB: ["£5", "£10", "£20", "£50"],
  DE: ["€5", "€10", "€20", "€50"],
  JP: ["¥1000", "¥3000", "¥5000", "¥10000"],
  BR: ["R$20", "R$50", "R$100", "R$200"],
};

// ── Keyboard builders ─────────────────────────────────────────────────────────

function countryKeyboard() {
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < COUNTRIES.length; i += 2) {
    const row = COUNTRIES.slice(i, i + 2).map((c) =>
      inlineButton(c.name, `recharge:country:${c.code}`)
    );
    rows.push(row);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  return inlineKeyboard(rows);
}

function operatorKeyboard(countryCode: string) {
  const ops = OPERATORS[countryCode] ?? [];
  const rows = ops.map((op) => [inlineButton(op.name, `recharge:operator:${op.id}`)]);
  rows.push([inlineButton("⬅️ Back to countries", "recharge:start")]);
  return inlineKeyboard(rows);
}

function amountKeyboard(countryCode: string) {
  const amounts = AMOUNTS[countryCode] ?? [];
  const rows = amounts.map((a) => [inlineButton(a, `recharge:amount:${a}`)]);
  rows.push([inlineButton("⬅️ Back to operators", `recharge:back:operator`)]);
  return inlineKeyboard(rows);
}

function backToMenuKeyboard() {
  return inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);
}

function supportKeyboard() {
  return inlineKeyboard([
    [inlineButton("💬 Get AI help", "ai:chat")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

// ── Composer ──────────────────────────────────────────────────────────────────

const composer = new Composer<Ctx>();

// Step 1: Country selection
composer.callbackQuery("recharge:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "recharge_country";
  ctx.session.recharge = {};
  await ctx.editMessageText("Which country is your mobile number from?", {
    reply_markup: countryKeyboard(),
  });
});

// Step 2: Country selected — show operators
composer.callbackQuery(/^recharge:country:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const code = ctx.match[1];
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) {
    await ctx.editMessageText("Country not found. Try again.", {
      reply_markup: countryKeyboard(),
    });
    return;
  }
  ctx.session.recharge = { country: code };
  ctx.session.step = "recharge_operator";
  await ctx.editMessageText(
    `Who is your ${country.name} mobile operator?`,
    { reply_markup: operatorKeyboard(code) }
  );
});

// Step 3: Operator selected — ask for phone number
composer.callbackQuery(/^recharge:operator:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const opId = ctx.match[1];
  const country = ctx.session.recharge?.country;
  const ops = OPERATORS[country ?? ""] ?? [];
  const op = ops.find((o) => o.id === opId);
  if (!op || !country) {
    await ctx.editMessageText("Something went wrong. Start again.", {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  ctx.session.recharge!.operator = opId;
  ctx.session.step = "recharge_phone";
  await ctx.editMessageText(
    `Enter your ${op.name} mobile number:`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to operators", "recharge:back:operator")],
      ]),
    }
  );
});

// Step 4: Phone number input
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "recharge_phone") return next();
  const text = ctx.message.text.trim();
  if (text.length < 5 || text.length > 15 || !/^\+?\d+$/.test(text)) {
    await ctx.reply("That doesn't look like a valid phone number. Enter your number with country code (e.g. +911234567890).");
    return;
  }
  ctx.session.recharge!.phone = text;
  const country = COUNTRIES.find((c) => c.code === ctx.session.recharge!.country);
  ctx.session.step = "recharge_amount";
  await ctx.reply(`Pick a top-up amount:`, {
    reply_markup: amountKeyboard(ctx.session.recharge!.country!),
  });
});

// Step 5: Amount selected — show confirmation
composer.callbackQuery(/^recharge:amount:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const amount = ctx.match[1];
  const r = ctx.session.recharge;
  if (!r?.country || !r?.operator || !r?.phone) {
    await ctx.editMessageText("Session expired. Start again.", {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const country = COUNTRIES.find((c) => c.code === r.country);
  const ops = OPERATORS[r.country ?? ""] ?? [];
  const op = ops.find((o) => o.id === r.operator);
  ctx.session.recharge!.amount = amount;
  ctx.session.step = "recharge_confirm";

  await ctx.editMessageText(
    `📋 Recharge Summary\n\n` +
    `Country: ${country?.name ?? r.country}\n` +
    `Operator: ${op?.name ?? r.operator}\n` +
    `Phone: ${r.phone}\n` +
    `Amount: ${amount}\n\n` +
    `Confirm this recharge?`,
    {
      reply_markup: confirmKeyboard("recharge:pay", {
        yes: "💳 Confirm and Pay",
        no: "Cancel",
      }),
    }
  );
});

// Step 6a: Confirmed — process payment
composer.callbackQuery("recharge:pay:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const r = ctx.session.recharge;
  if (!r?.country || !r?.operator || !r?.phone || !r?.amount) {
    await ctx.editMessageText("Session expired. Start again.", {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const country = COUNTRIES.find((c) => c.code === r.country);
  const ops = OPERATORS[r.country ?? ""] ?? [];
  const op = ops.find((o) => o.id === r.operator);

  // Record order
  const orderId = `RCG-${Date.now().toString(36).toUpperCase()}`;
  if (!ctx.session.orders) ctx.session.orders = [];
  ctx.session.orders.push({
    id: orderId,
    type: "recharge",
    country: country?.name ?? r.country,
    plan: `${op?.name ?? r.operator} — ${r.amount}`,
    amount: r.amount,
    status: "paid",
    createdAt: new Date().toISOString(),
  });

  // Add to wallet transactions
  if (!ctx.session.wallet) ctx.session.wallet = { balance: 0, transactions: [] };
  ctx.session.wallet.transactions.unshift({
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    desc: `Recharge ${op?.name ?? r.operator} ${r.phone}`,
    amount: `-${r.amount}`,
  });

  ctx.session.step = "idle";
  ctx.session.recharge = {};

  await ctx.editMessageText(
    `✅ Recharge successful!\n\n` +
    `${r.amount} has been sent to ${r.phone} (${op?.name ?? r.operator}).\n\n` +
    `You'll receive a confirmation SMS from your operator shortly.\n\n` +
    `Need help with anything else?`,
    {
      reply_markup: supportKeyboard(),
    }
  );
});

// Step 6b: Cancelled
composer.callbackQuery("recharge:pay:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.recharge = {};
  await ctx.editMessageText("Recharge cancelled. Tap a button below to do something else.", {
    reply_markup: backToMenuKeyboard(),
  });
});

// Back navigation
composer.callbackQuery("recharge:back:operator", async (ctx) => {
  await ctx.answerCallbackQuery();
  const country = COUNTRIES.find((c) => c.code === ctx.session.recharge?.country);
  if (ctx.session.recharge?.country) {
    ctx.session.step = "recharge_operator";
    await ctx.editMessageText(
      `Who is your ${country?.name ?? ""} mobile operator?`,
      { reply_markup: operatorKeyboard(ctx.session.recharge.country) }
    );
  }
});

export default composer;
