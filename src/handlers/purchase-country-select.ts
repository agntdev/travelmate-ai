import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  confirmKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "🛒 Buy", data: "product:select", order: 10 });

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
}

interface Country {
  name: string;
  code: string;
  plans: Plan[];
}

const COUNTRIES: Country[] = [
  {
    name: "🇮🇳 India", code: "IN", plans: [
      { id: "in_1g_7d_jio", name: "1 GB — 7 days", price: "$3.99", validity: "7 days", data: "1 GB", provider: "Jio", providerId: "jio", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "in_3g_30d_jio", name: "3 GB — 30 days", price: "$9.99", validity: "30 days", data: "3 GB", provider: "Jio", providerId: "jio", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "in_10g_30d_airtel", name: "10 GB — 30 days", price: "$24.99", validity: "30 days", data: "10 GB", provider: "Airtel", providerId: "airtel", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G major cities" },
    ],
  },
  {
    name: "🇩🇪 Germany", code: "DE", plans: [
      { id: "de_1g_7d_telekom", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB", provider: "Telekom", providerId: "telekom", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "de_3g_30d_vodafone", name: "3 GB — 30 days", price: "$12.99", validity: "30 days", data: "3 GB", provider: "Vodafone", providerId: "vodafone", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "de_10g_30d_o2", name: "10 GB — 30 days", price: "$29.99", validity: "30 days", data: "10 GB", provider: "O2", providerId: "o2", activation: "Instant", compatible: "All eSIM devices", coverage: "4G nationwide" },
    ],
  },
  {
    name: "🇯🇵 Japan", code: "JP", plans: [
      { id: "jp_1g_7d_docomo", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB", provider: "NTT Docomo", providerId: "docomo", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "jp_3g_30d_softbank", name: "3 GB — 30 days", price: "$11.99", validity: "30 days", data: "3 GB", provider: "SoftBank", providerId: "softbank", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas" },
      { id: "jp_10g_30d_docomo", name: "10 GB — 30 days", price: "$29.99", validity: "30 days", data: "10 GB", provider: "NTT Docomo", providerId: "docomo", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
    ],
  },
  {
    name: "🇦🇺 Australia", code: "AU", plans: [
      { id: "au_1g_7d_telstra", name: "1 GB — 7 days", price: "$5.99", validity: "7 days", data: "1 GB", provider: "Telstra", providerId: "telstra", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G major cities" },
      { id: "au_3g_30d_optus", name: "3 GB — 30 days", price: "$14.99", validity: "30 days", data: "3 GB", provider: "Optus", providerId: "optus", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas" },
      { id: "au_10g_30d_telstra", name: "10 GB — 30 days", price: "$34.99", validity: "30 days", data: "10 GB", provider: "Telstra", providerId: "telstra", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
    ],
  },
  {
    name: "🇫🇷 France", code: "FR", plans: [
      { id: "fr_1g_7d_orange", name: "1 GB — 7 days", price: "$4.49", validity: "7 days", data: "1 GB", provider: "Orange", providerId: "orange", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "fr_3g_30d_sfr", name: "3 GB — 30 days", price: "$11.99", validity: "30 days", data: "3 GB", provider: "SFR", providerId: "sfr", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas" },
      { id: "fr_10g_30d_orange", name: "10 GB — 30 days", price: "$27.99", validity: "30 days", data: "10 GB", provider: "Orange", providerId: "orange", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
    ],
  },
  {
    name: "🇦🇪 United Arab Emirates", code: "AE", plans: [
      { id: "ae_1g_7d_etisalat", name: "1 GB — 7 days", price: "$6.99", validity: "7 days", data: "1 GB", provider: "Etisalat", providerId: "etisalat", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "ae_3g_30d_du", name: "3 GB — 30 days", price: "$16.99", validity: "30 days", data: "3 GB", provider: "du", providerId: "du", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas" },
      { id: "ae_10g_30d_etisalat", name: "10 GB — 30 days", price: "$39.99", validity: "30 days", data: "10 GB", provider: "Etisalat", providerId: "etisalat", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
    ],
  },
  {
    name: "🇬🇧 United Kingdom", code: "GB", plans: [
      { id: "gb_1g_7d_ee", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB", provider: "EE", providerId: "ee", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "gb_3g_30d_vodafone", name: "3 GB — 30 days", price: "$13.99", validity: "30 days", data: "3 GB", provider: "Vodafone", providerId: "vodafone", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G urban areas" },
      { id: "gb_10g_30d_ee", name: "10 GB — 30 days", price: "$33.99", validity: "30 days", data: "10 GB", provider: "EE", providerId: "ee", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
    ],
  },
  {
    name: "🇺🇸 United States", code: "US", plans: [
      { id: "us_1g_7d_tmobile", name: "1 GB — 7 days", price: "$4.49", validity: "7 days", data: "1 GB", provider: "T-Mobile", providerId: "tmobile", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "us_3g_30d_att", name: "3 GB — 30 days", price: "$12.99", validity: "30 days", data: "3 GB", provider: "AT&T", providerId: "att", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
      { id: "us_10g_30d_tmobile", name: "10 GB — 30 days", price: "$32.99", validity: "30 days", data: "10 GB", provider: "T-Mobile", providerId: "tmobile", activation: "Instant", compatible: "All eSIM devices", coverage: "4G/5G nationwide" },
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

// ── Keyboard builders ─────────────────────────────────────────────────────────

function productTypeKeyboard() {
  return inlineKeyboard([
    [inlineButton("📱 eSIM", "product:esim"), inlineButton("📲 Recharge", "product:recharge")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

function countryKeyboard() {
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < COUNTRIES.length; i += 2) {
    const row = COUNTRIES.slice(i, i + 2).map((c) =>
      inlineButton(c.name, `purchase:country:${c.code}`)
    );
    rows.push(row);
  }
  rows.push([inlineButton("⬅️ Back", "product:select")]);
  return inlineKeyboard(rows);
}

function planKeyboard(countryCode: string) {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return inlineKeyboard([[inlineButton("⬅️ Back", "product:select")]]);
  const rows = country.plans.map((p) => [
    inlineButton(`${p.provider} — ${p.data} ${p.validity} — ${p.price}`, `purchase:plan:${p.id}`),
  ]);
  rows.push([inlineButton("⬅️ Back to countries", "purchase:country_select")]);
  return inlineKeyboard(rows);
}

function quantityKeyboard() {
  return inlineKeyboard([
    [
      inlineButton("1", "purchase:qty:1"),
      inlineButton("2", "purchase:qty:2"),
      inlineButton("3", "purchase:qty:3"),
      inlineButton("4", "purchase:qty:4"),
    ],
    [inlineButton("⬅️ Back to plans", "purchase:back:plans")],
  ]);
}

function paymentMethodKeyboard() {
  return inlineKeyboard([
    [inlineButton("💳 Card", "purchase:pay:card"), inlineButton("📱 UPI", "purchase:pay:upi")],
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

// ── Composer ──────────────────────────────────────────────────────────────────

const composer = new Composer<Ctx>();

// Step 1: Product type selection
composer.callbackQuery("product:select", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "product_type";
  ctx.session.purchase = {};
  await ctx.editMessageText("What would you like to buy?", {
    reply_markup: productTypeKeyboard(),
  });
});

// Step 2a: eSIM — country selection
composer.callbackQuery("product:esim", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_country";
  ctx.session.purchase = {};
  await ctx.editMessageText("Where are you traveling? Pick a country to see available eSIM plans.", {
    reply_markup: countryKeyboard(),
  });
});

composer.callbackQuery("purchase:country_select", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_country";
  ctx.session.purchase = {};
  await ctx.editMessageText("Where are you traveling? Pick a country to see available eSIM plans.", {
    reply_markup: countryKeyboard(),
  });
});

// Step 2b: Country selected — show plans
composer.callbackQuery(/^purchase:country:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const code = ctx.match[1];
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) {
    await ctx.editMessageText("Country not found. Try again.", { reply_markup: countryKeyboard() });
    return;
  }
  ctx.session.purchase = { country: code };
  ctx.session.step = "esim_plan";
  await ctx.editMessageText(
    `${country.name} — available plans:\n\nChoose a plan below:`,
    { reply_markup: planKeyboard(code) }
  );
});

// Step 3: Plan selected — show details + quantity
composer.callbackQuery(/^purchase:plan:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const planId = ctx.match[1];
  const result = findPlan(planId);
  if (!result || !ctx.session.purchase?.country) {
    await ctx.editMessageText("Something went wrong. Start again.", {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const { plan, country } = result;
  ctx.session.purchase.planId = planId;
  ctx.session.purchase.providerId = plan.providerId;
  ctx.session.step = "esim_quantity";

  await ctx.editMessageText(
    `${country.name} — ${plan.provider}\n\n` +
    `${plan.data} — ${plan.validity}\n` +
    `Price: ${plan.price}\n` +
    `Activation: ${plan.activation}\n` +
    `Compatible: ${plan.compatible}\n` +
    `Coverage: ${plan.coverage}\n\n` +
    `How many would you like?`,
    { reply_markup: quantityKeyboard() }
  );
});

// Step 4: Quantity selected — ask for travel dates
composer.callbackQuery(/^purchase:qty:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const qty = parseInt(ctx.match[1], 10);
  ctx.session.purchase!.quantity = qty;
  ctx.session.step = "esim_dates";
  await ctx.editMessageText(
    `Great choice! ${qty} eSIM${qty > 1 ? "s" : ""} selected.\n\n` +
    `When does your trip start? (e.g. Aug 15)`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to quantity", "purchase:back:quantity")],
      ]),
    }
  );
});

// Step 5: Travel dates — text input
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_dates") return next();
  const text = ctx.message.text.trim();
  if (text.length < 3) {
    await ctx.reply("Please enter a date (e.g. Aug 15).");
    return;
  }
  ctx.session.purchase!.travelStart = text;
  ctx.session.step = "esim_dates_end";
  await ctx.reply(
    `Trip starts: ${text}\n\nWhen does your trip end? (e.g. Aug 25)`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to start date", "purchase:back:dates_start")],
      ]),
    }
  );
});

// Step 6: End date — ask for purchaser info
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_dates_end") return next();
  const text = ctx.message.text.trim();
  if (text.length < 3) {
    await ctx.reply("Please enter a date (e.g. Aug 25).");
    return;
  }
  ctx.session.purchase!.travelEnd = text;
  ctx.session.step = "esim_info";
  await ctx.reply(
    `Trip: ${ctx.session.purchase!.travelStart} → ${text}\n\n` +
    `Almost there! Just need a couple of details:\n\n` +
    `Your name:`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to dates", "purchase:back:dates_end")],
      ]),
    }
  );
});

// Step 7a: Name received — ask for email
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_info") return next();
  const name = ctx.message.text.trim();
  if (name.length < 2) {
    await ctx.reply("Please enter your name.");
    return;
  }
  ctx.session.purchase!.purchaser = { name };
  ctx.session.step = "esim_info_email";
  await ctx.reply(
    `Thanks, ${name}!\n\nYour email (for QR code delivery):`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to name", "purchase:back:info_name")],
      ]),
    }
  );
});

// Step 7b: Email received — show order review
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "esim_info_email") return next();
  const email = ctx.message.text.trim();
  if (!email.includes("@")) {
    await ctx.reply("Please enter a valid email address.");
    return;
  }
  ctx.session.purchase!.purchaser!.email = email;

  const result = findPlan(ctx.session.purchase!.planId!);
  if (!result) {
    await ctx.reply("Something went wrong. Start again.", {
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

  await ctx.reply(
    `📋 Order Review\n\n` +
    `Plan: ${plan.provider} — ${plan.data} ${plan.validity}\n` +
    `Country: ${country.name}\n` +
    `Quantity: ${qty}\n` +
    `Travel: ${ctx.session.purchase!.travelStart} → ${ctx.session.purchase!.travelEnd}\n` +
    `Name: ${ctx.session.purchase!.purchaser!.name}\n` +
    `Email: ${email}\n\n` +
    `💰 Breakdown\n` +
    `Base price: $${subtotal.toFixed(2)}\n` +
    `Taxes & fees: $${taxes.toFixed(2)}\n` +
    `Total: $${total.toFixed(2)}\n\n` +
    `Ready to pay?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("💳 Confirm and Pay", "purchase:checkout")],
        [inlineButton("🏷️ Enter promo code", "purchase:promo")],
        [inlineButton("⬅️ Back to email", "purchase:back:info_email")],
        [inlineButton("Cancel", "purchase:cancel")],
      ]),
    }
  );
});

// Step 8: Promo code
composer.callbackQuery("purchase:promo", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_promo";
  await ctx.editMessageText(
    "Enter your promo code:",
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

  const result = findPlan(ctx.session.purchase!.planId!);
  if (!result) {
    await ctx.reply("Something went wrong. Start again.", {
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

  const discountLine = discount > 0 ? `Promo (${code.toUpperCase()}): -$${discount.toFixed(2)}\n` : 
    `Promo "${code}" — not a valid code. You can still pay full price.\n`;

  await ctx.reply(
    `📋 Order Review\n\n` +
    `Plan: ${plan.provider} — ${plan.data} ${plan.validity}\n` +
    `Country: ${country.name}\n` +
    `Quantity: ${qty}\n` +
    `Travel: ${ctx.session.purchase!.travelStart} → ${ctx.session.purchase!.travelEnd}\n` +
    `Name: ${ctx.session.purchase!.purchaser!.name}\n` +
    `Email: ${ctx.session.purchase!.purchaser!.email}\n\n` +
    `💰 Breakdown\n` +
    `Base price: $${subtotal.toFixed(2)}\n` +
    discountLine +
    `Taxes & fees: $${taxes.toFixed(2)}\n` +
    `Total: $${total.toFixed(2)}\n\n` +
    `Ready to pay?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("💳 Confirm and Pay", "purchase:checkout")],
        [inlineButton("🏷️ Enter promo code", "purchase:promo")],
        [inlineButton("⬅️ Back to email", "purchase:back:info_email")],
        [inlineButton("Cancel", "purchase:cancel")],
      ]),
    }
  );
});

// Back navigation
composer.callbackQuery("purchase:back:quantity", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_quantity";
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) return;
  const { plan, country } = result;
  await ctx.editMessageText(
    `${country.name} — ${plan.provider}\n\n` +
    `${plan.data} — ${plan.validity}\n` +
    `Price: ${plan.price}\n` +
    `Activation: ${plan.activation}\n` +
    `Compatible: ${plan.compatible}\n` +
    `Coverage: ${plan.coverage}\n\n` +
    `How many would you like?`,
    { reply_markup: quantityKeyboard() }
  );
});

composer.callbackQuery("purchase:back:plans", async (ctx) => {
  await ctx.answerCallbackQuery();
  const code = ctx.session.purchase?.country;
  if (!code) return;
  ctx.session.step = "esim_plan";
  const country = COUNTRIES.find((c) => c.code === code);
  await ctx.editMessageText(
    `${country?.name ?? "Country"} — available plans:\n\nChoose a plan below:`,
    { reply_markup: planKeyboard(code) }
  );
});

composer.callbackQuery("purchase:back:dates_start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_dates";
  await ctx.editMessageText(
    `When does your trip start? (e.g. Aug 15)`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to quantity", "purchase:back:quantity")],
      ]),
    }
  );
});

composer.callbackQuery("purchase:back:dates_end", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_dates_end";
  await ctx.editMessageText(
    `Trip starts: ${ctx.session.purchase?.travelStart}\n\nWhen does your trip end? (e.g. Aug 25)`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to start date", "purchase:back:dates_start")],
      ]),
    }
  );
});

composer.callbackQuery("purchase:back:info_name", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_info";
  await ctx.editMessageText(
    `Trip: ${ctx.session.purchase?.travelStart} → ${ctx.session.purchase?.travelEnd}\n\n` +
    `Your name:`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to dates", "purchase:back:dates_end")],
      ]),
    }
  );
});

composer.callbackQuery("purchase:back:info_email", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_info_email";
  await ctx.editMessageText(
    `Thanks, ${ctx.session.purchase?.purchaser?.name}!\n\nYour email (for QR code delivery):`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to name", "purchase:back:info_name")],
      ]),
    }
  );
});

composer.callbackQuery("purchase:back:review", async (ctx) => {
  await ctx.answerCallbackQuery();
  // Re-render the review step
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) return;
  const { plan, country } = result;
  const qty = ctx.session.purchase!.quantity ?? 1;
  const unitPrice = parsePrice(plan.price);
  const subtotal = unitPrice * qty;
  const taxes = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + taxes;
  ctx.session.step = "esim_review";

  await ctx.editMessageText(
    `📋 Order Review\n\n` +
    `Plan: ${plan.provider} — ${plan.data} ${plan.validity}\n` +
    `Country: ${country.name}\n` +
    `Quantity: ${qty}\n` +
    `Travel: ${ctx.session.purchase!.travelStart} → ${ctx.session.purchase!.travelEnd}\n` +
    `Name: ${ctx.session.purchase!.purchaser!.name}\n` +
    `Email: ${ctx.session.purchase!.purchaser!.email}\n\n` +
    `💰 Breakdown\n` +
    `Base price: $${subtotal.toFixed(2)}\n` +
    `Taxes & fees: $${taxes.toFixed(2)}\n` +
    `Total: $${total.toFixed(2)}\n\n` +
    `Ready to pay?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("💳 Confirm and Pay", "purchase:checkout")],
        [inlineButton("🏷️ Enter promo code", "purchase:promo")],
        [inlineButton("⬅️ Back to email", "purchase:back:info_email")],
        [inlineButton("Cancel", "purchase:cancel")],
      ]),
    }
  );
});

// Step 9: Checkout — show payment methods
composer.callbackQuery("purchase:checkout", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "esim_payment";
  await ctx.editMessageText(
    `Choose a payment method:`,
    { reply_markup: paymentMethodKeyboard() }
  );
});

// Step 10: Payment processing
composer.callbackQuery(/^purchase:pay:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const method = ctx.match[1];
  const methodName = method === "upi" ? "UPI" : "Card";
  const result = findPlan(ctx.session.purchase?.planId ?? "");
  if (!result) {
    await ctx.editMessageText("Session expired. Start again.", {
      reply_markup: backToMenuKeyboard(),
    });
    return;
  }
  const { plan, country } = result;
  const qty = ctx.session.purchase!.quantity ?? 1;

  // Record order
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
  if (!ctx.session.orders) ctx.session.orders = [];
  ctx.session.orders.push({
    id: orderId,
    type: "esim",
    country: country.name,
    plan: `${plan.provider} — ${plan.data} ${plan.validity}`,
    amount: `$${(parsePrice(plan.price) * qty).toFixed(2)}`,
    status: "paid",
    createdAt: new Date().toISOString(),
  });

  // Add to wallet transactions
  if (!ctx.session.wallet) ctx.session.wallet = { balance: 0, transactions: [] };
  ctx.session.wallet.transactions.unshift({
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    desc: `eSIM ${country.name} ${plan.data}`,
    amount: `-$${(parsePrice(plan.price) * qty).toFixed(2)}`,
  });

  ctx.session.step = "idle";
  ctx.session.purchase = {};

  await ctx.editMessageText(
    `✅ Payment received via ${methodName}!\n\n` +
    `Your eSIM QR code and installation instructions are being sent to ${ctx.session.purchase?.purchaser?.email ?? "your email"}.\n\n` +
    `📱 QR Code Delivery\n` +
    `Check your email for the QR code and step-by-step device-specific installation guide.\n\n` +
    `Need help? Tap below.`,
    {
      reply_markup: supportKeyboard(),
    }
  );
});

// Cancel
composer.callbackQuery("purchase:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.purchase = {};
  await ctx.editMessageText("No worries — your order was cancelled. Tap a button below to do something else.", {
    reply_markup: backToMenuKeyboard(),
  });
});

export default composer;
