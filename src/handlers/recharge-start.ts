import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  confirmKeyboard,
} from "../toolkit/index.js";
import { recharge as copy, render } from "../i18n/en.js";
import { store, ensureUser } from "../store.js";

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
  await safeAnswer(ctx);
  ctx.session.step = "recharge_country";
  ctx.session.recharge = {};
  await safeEdit(ctx, copy.countryPrompt, {
    reply_markup: countryKeyboard(),
  });
});

// Step 2: Country selected — show operators
composer.callbackQuery(/^recharge:country:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const code = ctx.match[1];
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) {
    await safeEdit(ctx, copy.countryNotFound, {
      reply_markup: countryKeyboard(),
    });
    return;
  }
  ctx.session.recharge = { country: code };
  ctx.session.step = "recharge_operator";
  await safeEdit(
    ctx,
    render(copy.operatorPrompt, { country: country.name }),
    { reply_markup: operatorKeyboard(code) }
  );
});

// Step 3: Operator selected — ask for phone number
composer.callbackQuery(/^recharge:operator:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const opId = ctx.match[1];
  const country = ctx.session.recharge?.country;
  const ops = OPERATORS[country ?? ""] ?? [];
  const op = ops.find((o) => o.id === opId);
  if (!op || !country) {
    await safeEdit(ctx, copy.operatorError, {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  ctx.session.recharge!.operator = opId;
  ctx.session.step = "recharge_phone";
  await safeEdit(
    ctx,
    render(copy.phonePrompt, { operator: op.name }),
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
    await ctx.reply(copy.phoneInvalid);
    return;
  }
  ctx.session.recharge!.phone = text;
  ctx.session.step = "recharge_amount";
  await ctx.reply(copy.amountPrompt, {
    reply_markup: amountKeyboard(ctx.session.recharge!.country!),
  });
});

// Step 5: Amount selected — show confirmation
composer.callbackQuery(/^recharge:amount:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const amount = ctx.match[1];
  const r = ctx.session.recharge;
  if (!r?.country || !r?.operator || !r?.phone) {
    await safeEdit(ctx, copy.sessionExpired, {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const country = COUNTRIES.find((c) => c.code === r.country);
  const ops = OPERATORS[r.country ?? ""] ?? [];
  const op = ops.find((o) => o.id === r.operator);
  ctx.session.recharge!.amount = amount;
  ctx.session.step = "recharge_confirm";

  await safeEdit(
    ctx,
    render(copy.summary, {
      country: country?.name ?? r.country,
      operator: op?.name ?? r.operator,
      phone: r.phone,
      amount,
    }),
    {
      reply_markup: confirmKeyboard("recharge:pay", {
        yes: copy.confirmPay,
        no: copy.confirmCancel,
      }),
    }
  );
});

// Step 6a: Confirmed — process payment
composer.callbackQuery("recharge:pay:yes", async (ctx) => {
  await safeAnswer(ctx);
  const r = ctx.session.recharge;
  if (!r?.country || !r?.operator || !r?.phone || !r?.amount) {
    await safeEdit(ctx, copy.sessionExpired, {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const country = COUNTRIES.find((c) => c.code === r.country);
  const ops = OPERATORS[r.country ?? ""] ?? [];
  const op = ops.find((o) => o.id === r.operator);

  // Record order durable
  const orderId = `RCG-${Date.now().toString(36).toUpperCase()}`;
  await ensureUser(ctx.from || undefined);
  await store.saveOrder({
    id: orderId,
    userId: ctx.from?.id ?? 0,
    type: "recharge",
    country: country?.name ?? r.country,
    plan: `${op?.name ?? r.operator} — ${r.amount}`,
    amount: r.amount,
    status: "paid",
    createdAt: new Date().toISOString(),
    paymentMethod: "wallet",
  });

  ctx.session.step = "idle";
  ctx.session.recharge = {};

  await safeEdit(
    ctx,
    render(copy.success, {
      amount: r.amount,
      phone: r.phone,
      operator: op?.name ?? r.operator,
    }),
    {
      reply_markup: supportKeyboard(),
    }
  );
});

// Step 6b: Cancelled
composer.callbackQuery("recharge:pay:no", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "idle";
  ctx.session.recharge = {};
  await safeEdit(ctx, copy.cancelled, {
    reply_markup: backToMenuKeyboard(),
  });
});

// Back navigation
composer.callbackQuery("recharge:back:operator", async (ctx) => {
  await safeAnswer(ctx);
  const country = COUNTRIES.find((c) => c.code === ctx.session.recharge?.country);
  if (ctx.session.recharge?.country) {
    ctx.session.step = "recharge_operator";
    await safeEdit(
      ctx,
      render(copy.operatorPrompt, { country: country?.name ?? "" }),
      { reply_markup: operatorKeyboard(ctx.session.recharge.country) }
    );
  }
});

export default composer;
