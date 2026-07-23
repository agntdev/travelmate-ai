import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  confirmKeyboard,
} from "../toolkit/index.js";
import { purchase as copy, buttons as btn, render } from "../i18n/en.js";
import { store, ensureUser } from "../store.js";
import { safeAnswer, safeEdit } from "../safe-api.js";
import { now, nowIso } from "../clock.js";
import { processPayment, buildEsimQrPayload } from "../payments.js";

registerMainMenuItem({ label: "🛒 Buy eSIM", data: "purchase:country_select", order: 10 });

// ── Data catalog ──────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: string;
  validity: string;
  data: string;
  provider: string;
  providerId: string;
  activation: string;
  compatible: string;
  coverage: string;
  rating: string;
}

interface Country {
  name: string;
  code: string;
  plans: Plan[];
}

const COUNTRIES: Country[] = [
  {
    name: "🇮🇳 India", code: "IN", plans: [
      { id: "in_1g_7d_jio", name: "1 GB — 7 days", price: "$3.99", validity: "7 days", data: "1 GB", provider: "Jio", providerId: "jio", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.5" },
      { id: "in_3g_30d_jio", name: "3 GB — 30 days", price: "$9.99", validity: "30 days", data: "3 GB", provider: "Jio", providerId: "jio", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.5" },
      { id: "in_10g_30d_airtel", name: "10 GB — 30 days", price: "$24.99", validity: "30 days", data: "10 GB", provider: "Airtel", providerId: "airtel", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G major cities", rating: "4.3" },
    ],
  },
  {
    name: "🇩🇪 Germany", code: "DE", plans: [
      { id: "de_1g_7d_telekom", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB", provider: "Telekom", providerId: "telekom", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.4" },
      { id: "de_3g_30d_vodafone", name: "3 GB — 30 days", price: "$12.99", validity: "30 days", data: "3 GB", provider: "Vodafone", providerId: "vodafone", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.2" },
      { id: "de_10g_30d_o2", name: "10 GB — 30 days", price: "$29.99", validity: "30 days", data: "10 GB", provider: "O2", providerId: "o2", activation: "Instant", compatible: "All eSIM devices", coverage: "4G nationwide", rating: "4.0" },
    ],
  },
  {
    name: "🇯🇵 Japan", code: "JP", plans: [
      { id: "jp_1g_7d_docomo", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB", provider: "NTT Docomo", providerId: "docomo", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.7" },
      { id: "jp_3g_30d_softbank", name: "3 GB — 30 days", price: "$11.99", validity: "30 days", data: "3 GB", provider: "SoftBank", providerId: "softbank", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas", rating: "4.3" },
      { id: "jp_10g_30d_docomo", name: "10 GB — 30 days", price: "$29.99", validity: "30 days", data: "10 GB", provider: "NTT Docomo", providerId: "docomo", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.7" },
    ],
  },
  {
    name: "🇦🇺 Australia", code: "AU", plans: [
      { id: "au_1g_7d_telstra", name: "1 GB — 7 days", price: "$5.99", validity: "7 days", data: "1 GB", provider: "Telstra", providerId: "telstra", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G major cities", rating: "4.5" },
      { id: "au_3g_30d_optus", name: "3 GB — 30 days", price: "$14.99", validity: "30 days", data: "3 GB", provider: "Optus", providerId: "optus", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas", rating: "4.2" },
      { id: "au_10g_30d_telstra", name: "10 GB — 30 days", price: "$34.99", validity: "30 days", data: "10 GB", provider: "Telstra", providerId: "telstra", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.5" },
    ],
  },
  {
    name: "🇫🇷 France", code: "FR", plans: [
      { id: "fr_1g_7d_orange", name: "1 GB — 7 days", price: "$4.49", validity: "7 days", data: "1 GB", provider: "Orange", providerId: "orange", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.4" },
      { id: "fr_3g_30d_sfr", name: "3 GB — 30 days", price: "$11.99", validity: "30 days", data: "3 GB", provider: "SFR", providerId: "sfr", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas", rating: "4.1" },
      { id: "fr_10g_30d_orange", name: "10 GB — 30 days", price: "$27.99", validity: "30 days", data: "10 GB", provider: "Orange", providerId: "orange", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.4" },
    ],
  },
  {
    name: "🇦🇪 United Arab Emirates", code: "AE", plans: [
      { id: "ae_1g_7d_etisalat", name: "1 GB — 7 days", price: "$6.99", validity: "7 days", data: "1 GB", provider: "Etisalat", providerId: "etisalat", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.3" },
      { id: "ae_3g_30d_du", name: "3 GB — 30 days", price: "$16.99", validity: "30 days", data: "3 GB", provider: "du", providerId: "du", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas", rating: "4.1" },
      { id: "ae_10g_30d_etisalat", name: "10 GB — 30 days", price: "$39.99", validity: "30 days", data: "10 GB", provider: "Etisalat", providerId: "etisalat", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.3" },
    ],
  },
  {
    name: "🇬🇧 United Kingdom", code: "GB", plans: [
      { id: "gb_1g_7d_ee", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB", provider: "EE", providerId: "ee", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.5" },
      { id: "gb_3g_30d_vodafone", name: "3 GB — 30 days", price: "$13.99", validity: "30 days", data: "3 GB", provider: "Vodafone", providerId: "vodafone", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas", rating: "4.2" },
      { id: "gb_10g_30d_ee", name: "10 GB — 30 days", price: "$33.99", validity: "30 days", data: "10 GB", provider: "EE", providerId: "ee", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.5" },
    ],
  },
  {
    name: "🇺🇸 United States", code: "US", plans: [
      { id: "us_1g_7d_tmobile", name: "1 GB — 7 days", price: "$4.49", validity: "7 days", data: "1 GB", provider: "T-Mobile", providerId: "tmobile", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.6" },
      { id: "us_3g_30d_att", name: "3 GB — 30 days", price: "$12.99", validity: "30 days", data: "3 GB", provider: "AT&T", providerId: "att", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.4" },
      { id: "us_10g_30d_tmobile", name: "10 GB — 30 days", price: "$32.99", validity: "30 days", data: "10 GB", provider: "T-Mobile", providerId: "tmobile", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide", rating: "4.6" },
    ],
  },
];

function findPlan(planId: string): { plan: Plan; country: Country } | undefined {
  for (const country of COUNTRIES) {
    const plan = country.plans.find((p) => p.id === planId);
    if (plan) return { plan, country };
  }
  return undefined;
}

function parsePrice(priceStr: string): number {
  return parseFloat(priceStr.replace(/[^0-9.]/g, ""));
}

// ── Analytics ─────────────────────────────────────────────────────────────────

type AnalyticsEvent =
  | { type: "purchase_started"; userId: number }
  | { type: "plan_selected"; userId: number; planId: string; country: string; price: string }
  | { type: "payment_attempt"; userId: number; orderId: string; method: string }
  | { type: "payment_success"; userId: number; orderId: string; amount: string }
  | { type: "payment_failure"; userId: number; orderId: string; method: string; error: string }
  | { type: "purchase_cancelled"; userId: number; step: string };

function emitEvent(_event: AnalyticsEvent) {
  // Analytics instrumentation — no-op in test/dev.
  // In production, send to analytics endpoint via fetch.
}

// ── Email confirmation ────────────────────────────────────────────────────────

async function sendConfirmationEmail(
  email: string,
  orderId: string,
  planName: string,
  country: string,
  total: string,
): Promise<boolean> {
  const apiKey = process.env.EMAIL_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  if (!apiKey || !fromAddress) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        subject: `TravelMate — eSIM Order ${orderId}`,
        html:
          `<p>Hi!</p>` +
          `<p>Your eSIM has been purchased successfully.</p>` +
          `<p><strong>Order:</strong> ${orderId}</p>` +
          `<p><strong>Plan:</strong> ${planName}</p>` +
          `<p><strong>Country:</strong> ${country}</p>` +
          `<p><strong>Total:</strong> ${total}</p>` +
          `<p>Check your Telegram chat for the QR code and activation instructions.</p>` +
          `<p>— TravelMate Team</p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Keyboard builders ─────────────────────────────────────────────────────────

function countryKeyboard() {
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < COUNTRIES.length; i += 2) {
    const row = COUNTRIES.slice(i, i + 2).map((c) =>
      inlineButton(c.name, `purchase:country:${c.code}`)
    );
    rows.push(row);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  return inlineKeyboard(rows);
}

function planKeyboard(countryCode: string) {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return inlineKeyboard([[inlineButton("⬅️ Back", "purchase:country_select")]]);
  const rows = country.plans.map((p) => [
    inlineButton(`${p.provider} — ${p.data} ${p.validity} — ${p.price}`, `purchase:plan:${p.id}`),
  ]);
  rows.push([inlineButton("⬅️ Back to countries", "purchase:country_select")]);
  return inlineKeyboard(rows);
}

function activationKeyboard() {
  return inlineKeyboard([
    [inlineButton(copy.activationImmediate, "purchase:activation:immediate")],
    [inlineButton(copy.activationScheduled, "purchase:activation:scheduled")],
    [inlineButton("⬅️ Back to plans", "purchase:back:plans")],
  ]);
}

function quantityKeyboard() {
  return inlineKeyboard([
    [
      inlineButton("1", "purchase:qty:1"),
      inlineButton("2", "purchase:qty:2"),
      inlineButton("3", "purchase:qty:3"),
      inlineButton("4", "purchase:qty:4"),
    ],
    [inlineButton("⬅️ Back to activation", "purchase:back:activation")],
  ]);
}

function paymentMethodKeyboard() {
  return inlineKeyboard([
    [inlineButton(copy.paymentCard, "purchase:pay:card"), inlineButton(copy.paymentUpi, "purchase:pay:upi")],
    [inlineButton("⬅️ Back to review", "purchase:back:review")],
  ]);
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

function postSuccessKeyboard() {
  return inlineKeyboard([
    [inlineButton(copy.buyAnother, "purchase:country_select")],
    [inlineButton(copy.needHelp, "ai:chat")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

function errorKeyboard() {
  return inlineKeyboard([
    [inlineButton("🔄 Try again", "purchase:checkout")],
    [inlineButton(btn.changePaymentMethod, "purchase:pay_methods")],
    [inlineButton("💬 Contact support", "ai:chat")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

// ── Composer ──────────────────────────────────────────────────────────────────

const composer = new Composer<Ctx>();

// ── Entry points ──────────────────────────────────────────────────────────────

// /buy slash command (power-user shortcut per spec)
composer.command("buy", async (ctx) => {
  emitEvent({ type: "purchase_started", userId: ctx.from?.id ?? 0 });
  ctx.session.step = "esim_country";
  ctx.session.purchase = {};
  await ctx.reply(copy.countryPrompt, {
    reply_markup: countryKeyboard(),
  });
});

// Main menu "Buy eSIM" button — opens country selection directly
composer.callbackQuery("purchase:country_select", async (ctx) => {
  await safeAnswer(ctx);
  emitEvent({ type: "purchase_started", userId: ctx.from?.id ?? 0 });
  ctx.session.step = "esim_country";
  ctx.session.purchase = {};
  await safeEdit(ctx, copy.countryPrompt, {
    reply_markup: countryKeyboard(),
  });
});

// Legacy "🛒 Buy" button entry (product type selection)
composer.callbackQuery("product:select", async (ctx) => {
  await safeAnswer(ctx);
  emitEvent({ type: "purchase_started", userId: ctx.from?.id ?? 0 });
  ctx.session.step = "esim_country";
  ctx.session.purchase = {};
  await safeEdit(ctx, copy.countryPrompt, {
    reply_markup: countryKeyboard(),
  });
});

// ── Step 1: Country selected → show plans ─────────────────────────────────────

composer.callbackQuery(/^purchase:country:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const code = ctx.match[1];
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) {
    await safeEdit(ctx, copy.countryNotFound, { reply_markup: countryKeyboard() });
    return;
  }
  ctx.session.purchase = { country: code };
  ctx.session.step = "esim_plan";
  await safeEdit(
    ctx,
    render(copy.planList, { country: country.name }),
    { reply_markup: planKeyboard(code) }
  );
});

// ── Step 2: Plan selected → show details + activation ─────────────────────────

composer.callbackQuery(/^purchase:plan:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const planId = ctx.match[1];
  const result = findPlan(planId);
  if (!result || !ctx.session.purchase?.country) {
    await safeEdit(ctx, copy.somethingWrong, {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const { plan, country } = result;
  ctx.session.purchase.planId = planId;
  ctx.session.purchase.providerId = plan.providerId;
  ctx.session.step = "esim_activation";

  emitEvent({ type: "plan_selected", userId: ctx.from?.id ?? 0, planId, country: country.name, price: plan.price });

  await safeEdit(
    ctx,
    render(copy.planDetail, {
      country: country.name,
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      price: plan.price,
      rating: plan.rating,
      activation: plan.activation,
      compatible: plan.compatible,
      coverage: plan.coverage,
    }),
    { reply_markup: activationKeyboard() }
  );
});

// ── Step 3: Activation selected → show quantity ───────────────────────────────

composer.callbackQuery(/^purchase:activation:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const activation = ctx.match[1]; // "immediate" or "scheduled"
  ctx.session.purchase!.travelStart = activation === "immediate" ? "Immediate" : "";
  ctx.session.step = "esim_quantity";

  if (activation === "scheduled") {
    ctx.session.step = "esim_dates";
    await safeEdit(
      ctx,
      copy.datePromptStart,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to activation", "purchase:back:activation")],
        ]),
      }
    );
    return;
  }

  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) return;
  const { plan, country } = result;

  await safeEdit(
    ctx,
    render(copy.quantityPrompt, {
      country: country.name,
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      price: plan.price,
    }),
    { reply_markup: quantityKeyboard() }
  );
});

// ── Step 3b: Scheduled date entry ────────────────────────────────────────────

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_dates") return next();
  const text = ctx.message.text.trim();
  if (text.length < 3) {
    await ctx.reply(copy.dateTooShort);
    return;
  }
  ctx.session.purchase!.travelStart = text;
  ctx.session.step = "esim_dates_end";
  await ctx.reply(
    render(copy.datePromptEnd, { start: text }),
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to start date", "purchase:back:dates_start")],
      ]),
    }
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_dates_end") return next();
  const text = ctx.message.text.trim();
  if (text.length < 3) {
    await ctx.reply("Please enter a date (e.g. Aug 25).");
    return;
  }
  ctx.session.purchase!.travelEnd = text;
  ctx.session.step = "esim_quantity";

  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) return;
  const { plan, country } = result;

  await ctx.reply(
    render(copy.quantityPromptScheduled, {
      country: country.name,
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      price: plan.price,
      start: ctx.session.purchase!.travelStart!,
      end: text,
    }),
    { reply_markup: quantityKeyboard() }
  );
});

// ── Step 4: Quantity selected → ask for contact info ──────────────────────────

composer.callbackQuery(/^purchase:qty:(\d+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const qty = parseInt(ctx.match[1], 10);
  ctx.session.purchase!.quantity = qty;
  ctx.session.step = "esim_info_email";
  await safeEdit(
    ctx,
    render(copy.quantitySelected, {
      qty: String(qty),
      plural: qty > 1 ? "s" : "",
    }),
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to quantity", "purchase:back:quantity")],
      ]),
    }
  );
});

// ── Step 5: Email collected → ask for phone (optional) ────────────────────────

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_info_email") return next();
  const email = ctx.message.text.trim();
  if (!email.includes("@")) {
    await ctx.reply(copy.emailInvalid);
    return;
  }
  ctx.session.purchase!.purchaser = { email };
  ctx.session.step = "esim_info_phone";
  await ctx.reply(
    render(copy.emailSaved, { email }),
    {
      reply_markup: inlineKeyboard([
        [inlineButton(copy.phoneSkip, "purchase:info_phone:skip")],
        [inlineButton("⬅️ Back to email", "purchase:back:info_email")],
      ]),
    }
  );
});

// ── Step 5b: Phone skipped or collected → show order review ──────────────────

composer.callbackQuery("purchase:info_phone:skip", async (ctx) => {
  await safeAnswer(ctx);
  if (!ctx.session.purchase?.purchaser) return;
  ctx.session.purchase.purchaser.phone = "";
  ctx.session.step = "esim_review";
  await renderReview(ctx);
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_info_phone") return next();
  const phone = ctx.message.text.trim();
  if (ctx.session.purchase?.purchaser) {
    ctx.session.purchase.purchaser.phone = phone;
  }
  ctx.session.step = "esim_review";
  await renderReview(ctx);
});

// ── Review renderer ──────────────────────────────────────────────────────────

async function renderReview(ctx: Ctx) {
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) {
    await ctx.reply(copy.somethingWrong, {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const { plan, country } = result;
  const qty = ctx.session.purchase!.quantity ?? 1;
  const unitPrice = parsePrice(plan.price);
  const subtotal = unitPrice * qty;
  const taxes = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + taxes;

  ctx.session.step = "esim_review";

  const activationLabel =
    ctx.session.purchase!.travelStart +
    (ctx.session.purchase!.travelEnd ? ` → ${ctx.session.purchase!.travelEnd}` : "");

  await ctx.reply(
    render(copy.review, {
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      country: country.name,
      qty: String(qty),
      activation: activationLabel,
      email: ctx.session.purchase!.purchaser!.email!,
      subtotal: subtotal.toFixed(2),
      taxes: taxes.toFixed(2),
      total: total.toFixed(2),
    }),
    {
      reply_markup: inlineKeyboard([
        [inlineButton(btn.confirmAndPay, "purchase:checkout")],
        [inlineButton(btn.enterPromo, "purchase:promo")],
        [inlineButton("⬅️ Back to email", "purchase:back:info_email")],
        [inlineButton(copy.cancel, "purchase:cancel")],
      ]),
    }
  );
}

// ── Step 6: Promo code ───────────────────────────────────────────────────────

composer.callbackQuery("purchase:promo", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "esim_promo";
  await safeEdit(
    ctx,
    copy.promoPrompt,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to review", "purchase:back:review")],
      ]),
    }
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_promo") return next();
  const code = ctx.message.text.trim();
  ctx.session.purchase!.promoCode = code;
  ctx.session.step = "esim_review";

  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) {
    await ctx.reply(copy.somethingWrong, {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const { plan, country } = result;
  const qty = ctx.session.purchase!.quantity ?? 1;
  const unitPrice = parsePrice(plan.price);
  const subtotal = unitPrice * qty;
  const discount = code.toUpperCase() === "TRAVEL10" ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const taxes = Math.round((subtotal - discount) * 0.1 * 100) / 100;
  const total = subtotal - discount + taxes;

  const discountLine = discount > 0
    ? render(copy.promoApplied, { code: code.toUpperCase(), discount: discount.toFixed(2) }) + "\n"
    : render(copy.promoInvalid, { code }) + "\n";

  const activationLabel =
    ctx.session.purchase!.travelStart +
    (ctx.session.purchase!.travelEnd ? ` → ${ctx.session.purchase!.travelEnd}` : "");

  await ctx.reply(
    render(copy.reviewWithPromo, {
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      country: country.name,
      qty: String(qty),
      activation: activationLabel,
      email: ctx.session.purchase!.purchaser!.email!,
      subtotal: subtotal.toFixed(2),
      discountLine,
      taxes: taxes.toFixed(2),
      total: total.toFixed(2),
    }),
    {
      reply_markup: inlineKeyboard([
        [inlineButton(btn.confirmAndPay, "purchase:checkout")],
        [inlineButton(btn.enterPromo, "purchase:promo")],
        [inlineButton("⬅️ Back to email", "purchase:back:info_email")],
        [inlineButton(copy.cancel, "purchase:cancel")],
      ]),
    }
  );
});

// ── Step 7: Checkout — show payment methods ───────────────────────────────────

composer.callbackQuery("purchase:checkout", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "esim_payment";
  await safeEdit(
    ctx,
    copy.paymentMethods,
    { reply_markup: paymentMethodKeyboard() }
  );
});

// ── Step 8: Payment processing ───────────────────────────────────────────────

composer.callbackQuery(/^purchase:pay:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const method = ctx.match[1] as "card" | "upi";
  const methodName = method === "upi" ? "UPI" : "Card";
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result || !ctx.session.purchase?.planId) {
    await safeEdit(ctx, copy.sessionExpired, {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const { plan, country } = result;
  const qty = ctx.session.purchase!.quantity ?? 1;
  const orderId = `ORD-${now().toString(36).toUpperCase()}`;
  const unitPrice = parsePrice(plan.price);
  const promo = ctx.session.purchase?.promoCode?.toUpperCase();
  const discount = promo === "TRAVEL10" ? Math.round(unitPrice * qty * 0.1 * 100) / 100 : 0;
  const subtotal = unitPrice * qty - discount;
  const taxes = Math.round(subtotal * 0.1 * 100) / 100;
  const totalNum = subtotal + taxes;
  const total = `$${totalNum.toFixed(2)}`;
  const email = ctx.session.purchase?.purchaser?.email;
  const uid = ctx.from?.id ?? 0;

  emitEvent({ type: "payment_attempt", userId: uid, orderId, method: methodName });

  await ensureUser(ctx.from || undefined);

  // Create pending order first so a failed charge is still auditable.
  const qr = buildEsimQrPayload(orderId, plan.id);
  await store.saveOrder({
    id: orderId,
    userId: uid,
    type: "esim",
    country: country.name,
    plan: `${plan.provider} — ${plan.data} ${plan.validity}`,
    amount: total,
    status: "pending",
    provider: plan.provider,
    createdAt: nowIso(),
    paymentMethod: methodName,
    qr,
    email,
    expiresAt: new Date(now() + 30 * 86400000).toISOString(),
  });

  const pay = await processPayment({
    orderId,
    amountMinor: Math.round(totalNum * 100),
    currency: method === "upi" ? "inr" : "usd",
    description: `eSIM ${plan.provider} ${plan.data}`,
    email,
    method,
    receipt: orderId,
  });

  if (!pay.ok) {
    await store.updateOrder(orderId, { status: "failed", paymentId: pay.paymentId });
    emitEvent({
      type: "payment_failure",
      userId: uid,
      orderId,
      method: methodName,
      error: pay.error ?? "unknown",
    });
    await safeEdit(
      ctx,
      "Payment didn't go through. Try again or pick a different method — we won't charge you twice.",
      { reply_markup: errorKeyboard() },
    );
    return;
  }

  await store.updateOrder(orderId, {
    status: "paid",
    paymentId: pay.paymentId,
    paymentMethod: `${methodName}/${pay.gateway}`,
  });

  emitEvent({ type: "payment_success", userId: uid, orderId, amount: total });

  // Email QR + receipt (best-effort; chat still carries the activation string).
  if (email) {
    sendConfirmationEmail(
      email,
      orderId,
      `${plan.provider} — ${plan.data}`,
      country.name,
      total,
    ).catch(() => {});
  }

  ctx.session.step = "idle";
  ctx.session.purchase = {};

  await safeEdit(
    ctx,
    render(copy.paymentSuccess, {
      method: methodName,
      email: email ?? "your email",
    }),
    { reply_markup: postSuccessKeyboard() },
  );

  // Deliver the activation QR payload in-chat so the user is not email-only.
  try {
    await ctx.reply(
      `📱 Your eSIM activation code\n\n\`${qr}\`\n\nScan this with your phone's eSIM settings, or open the QR we emailed to ${email ?? "you"}.`,
    );
  } catch {
    // Non-fatal — email path still covers delivery.
  }
});

// ── Cancel ───────────────────────────────────────────────────────────────────

composer.callbackQuery("purchase:cancel", async (ctx) => {
  await safeAnswer(ctx);
  emitEvent({ type: "purchase_cancelled", userId: ctx.from?.id ?? 0, step: ctx.session.step ?? "unknown" });
  ctx.session.step = "idle";
  ctx.session.purchase = {};
  await safeEdit(ctx, copy.cancel, {
    reply_markup: backToMenuKeyboard(),
  });
});

// Change payment method — return to payment method selection
composer.callbackQuery("purchase:pay_methods", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "esim_payment";
  await safeEdit(
    ctx,
    copy.paymentMethods,
    { reply_markup: paymentMethodKeyboard() }
  );
});

// ── Back navigation ──────────────────────────────────────────────────────────

composer.callbackQuery("purchase:back:activation", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "esim_activation";
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) return;
  const { plan, country } = result;
  await safeEdit(
    ctx,
    render(copy.planDetail, {
      country: country.name,
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      price: plan.price,
      rating: plan.rating,
      activation: plan.activation,
      compatible: plan.compatible,
      coverage: plan.coverage,
    }),
    { reply_markup: activationKeyboard() }
  );
});

composer.callbackQuery("purchase:back:quantity", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "esim_quantity";
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) return;
  const { plan, country } = result;
  await safeEdit(
    ctx,
    render(copy.quantityPrompt, {
      country: country.name,
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      price: plan.price,
    }),
    { reply_markup: quantityKeyboard() }
  );
});

composer.callbackQuery("purchase:back:plans", async (ctx) => {
  await safeAnswer(ctx);
  const code = ctx.session.purchase?.country;
  if (!code) return;
  ctx.session.step = "esim_plan";
  const country = COUNTRIES.find((c) => c.code === code);
  await safeEdit(
    ctx,
    render(copy.planList, { country: country?.name ?? "Country" }),
    { reply_markup: planKeyboard(code) }
  );
});

composer.callbackQuery("purchase:back:dates_start", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "esim_dates";
  await safeEdit(
    ctx,
    copy.datePromptStart,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to activation", "purchase:back:activation")],
      ]),
    }
  );
});

composer.callbackQuery("purchase:back:info_email", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "esim_info_email";
  await safeEdit(
    ctx,
    copy.emailPrompt,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to quantity", "purchase:back:quantity")],
      ]),
    }
  );
});

composer.callbackQuery("purchase:back:review", async (ctx) => {
  await safeAnswer(ctx);
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) return;
  const { plan, country } = result;
  const qty = ctx.session.purchase!.quantity ?? 1;
  const unitPrice = parsePrice(plan.price);
  const subtotal = unitPrice * qty;
  const taxes = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + taxes;
  ctx.session.step = "esim_review";

  const activationLabel =
    ctx.session.purchase!.travelStart +
    (ctx.session.purchase!.travelEnd ? ` → ${ctx.session.purchase!.travelEnd}` : "");

  await safeEdit(
    ctx,
    render(copy.review, {
      provider: plan.provider,
      data: plan.data,
      validity: plan.validity,
      country: country.name,
      qty: String(qty),
      activation: activationLabel,
      email: ctx.session.purchase!.purchaser!.email!,
      subtotal: subtotal.toFixed(2),
      taxes: taxes.toFixed(2),
      total: total.toFixed(2),
    }),
    {
      reply_markup: inlineKeyboard([
        [inlineButton(btn.confirmAndPay, "purchase:checkout")],
        [inlineButton(btn.enterPromo, "purchase:promo")],
        [inlineButton("⬅️ Back to email", "purchase:back:info_email")],
        [inlineButton(copy.cancel, "purchase:cancel")],
      ]),
    }
  );
});

export default composer;
