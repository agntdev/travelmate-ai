import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  confirmKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "📱 Buy eSIM", data: "purchase:country_select", order: 10 });

const COUNTRIES = [
  { name: "🇯🇵 Japan", code: "JP" },
  { name: "🇰🇷 South Korea", code: "KR" },
  { name: "🇹🇭 Thailand", code: "TH" },
  { name: "🇻🇳 Vietnam", code: "VN" },
  { name: "🇮🇩 Indonesia", code: "ID" },
  { name: "🇪🇺 Europe (30 countries)", code: "EU" },
  { name: "🇺🇸 United States", code: "US" },
  { name: "🇬🇧 United Kingdom", code: "GB" },
];

const PLANS: Record<string, Array<{ id: string; name: string; price: string; validity: string; data: string }>> = {
  JP: [
    { id: "jp_1g_7d", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB" },
    { id: "jp_3g_30d", name: "3 GB — 30 days", price: "$11.99", validity: "30 days", data: "3 GB" },
    { id: "jp_10g_30d", name: "10 GB — 30 days", price: "$29.99", validity: "30 days", data: "10 GB" },
  ],
  KR: [
    { id: "kr_1g_7d", name: "1 GB — 7 days", price: "$3.99", validity: "7 days", data: "1 GB" },
    { id: "kr_3g_30d", name: "3 GB — 30 days", price: "$9.99", validity: "30 days", data: "3 GB" },
    { id: "kr_10g_30d", name: "10 GB — 30 days", price: "$24.99", validity: "30 days", data: "10 GB" },
  ],
  TH: [
    { id: "th_1g_7d", name: "1 GB — 7 days", price: "$3.49", validity: "7 days", data: "1 GB" },
    { id: "th_3g_30d", name: "3 GB — 30 days", price: "$8.99", validity: "30 days", data: "3 GB" },
    { id: "th_10g_30d", name: "10 GB — 30 days", price: "$19.99", validity: "30 days", data: "10 GB" },
  ],
  VN: [
    { id: "vn_1g_7d", name: "1 GB — 7 days", price: "$2.99", validity: "7 days", data: "1 GB" },
    { id: "vn_3g_30d", name: "3 GB — 30 days", price: "$7.99", validity: "30 days", data: "3 GB" },
    { id: "vn_10g_30d", name: "10 GB — 30 days", price: "$17.99", validity: "30 days", data: "10 GB" },
  ],
  ID: [
    { id: "id_1g_7d", name: "1 GB — 7 days", price: "$3.49", validity: "7 days", data: "1 GB" },
    { id: "id_3g_30d", name: "3 GB — 30 days", price: "$8.49", validity: "30 days", data: "3 GB" },
    { id: "id_10g_30d", name: "10 GB — 30 days", price: "$21.99", validity: "30 days", data: "10 GB" },
  ],
  EU: [
    { id: "eu_1g_7d", name: "1 GB — 7 days", price: "$5.99", validity: "7 days", data: "1 GB" },
    { id: "eu_3g_30d", name: "3 GB — 30 days", price: "$14.99", validity: "30 days", data: "3 GB" },
    { id: "eu_10g_30d", name: "10 GB — 30 days", price: "$34.99", validity: "30 days", data: "10 GB" },
  ],
  US: [
    { id: "us_1g_7d", name: "1 GB — 7 days", price: "$4.49", validity: "7 days", data: "1 GB" },
    { id: "us_3g_30d", name: "3 GB — 30 days", price: "$12.99", validity: "30 days", data: "3 GB" },
    { id: "us_10g_30d", name: "10 GB — 30 days", price: "$32.99", validity: "30 days", data: "10 GB" },
  ],
  GB: [
    { id: "gb_1g_7d", name: "1 GB — 7 days", price: "$4.99", validity: "7 days", data: "1 GB" },
    { id: "gb_3g_30d", name: "3 GB — 30 days", price: "$13.99", validity: "30 days", data: "3 GB" },
    { id: "gb_10g_30d", name: "10 GB — 30 days", price: "$33.99", validity: "30 days", data: "10 GB" },
  ],
};

function countryKeyboard() {
  const rows: ReturnType<typeof inlineButton>[][] = [];
  for (let i = 0; i < COUNTRIES.length; i += 2) {
    const row = COUNTRIES.slice(i, i + 2).map((c) => inlineButton(c.name, `purchase:country:${c.code}`));
    rows.push(row);
  }
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  return inlineKeyboard(rows);
}

function planKeyboard(countryCode: string) {
  const plans = PLANS[countryCode] ?? [];
  const rows = plans.map((p) => [inlineButton(`${p.name} — ${p.price}`, `purchase:plan:${p.id}`)]);
  rows.push([inlineButton("⬅️ Back to countries", "purchase:country_select")]);
  return inlineKeyboard(rows);
}

const composer = new Composer<Ctx>();

composer.callbackQuery("purchase:country_select", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "purchase_country";
  await ctx.editMessageText("Where are you traveling? Pick a country to see available eSIM plans.", {
    reply_markup: countryKeyboard(),
  });
});

composer.callbackQuery(/^purchase:country:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const code = ctx.match[1];
  const country = COUNTRIES.find((c) => c.code === code);
  if (!country) {
    await ctx.editMessageText("Country not found. Try again.", { reply_markup: countryKeyboard() });
    return;
  }
  ctx.session.purchase = { country: code };
  ctx.session.step = "purchase_plan";
  const plans = PLANS[code] ?? [];
  if (plans.length === 0) {
    await ctx.editMessageText(`No eSIM plans available for ${country.name} yet. Try another country.`, {
      reply_markup: countryKeyboard(),
    });
    return;
  }
  await ctx.editMessageText(`${country.name} — pick a plan:`, { reply_markup: planKeyboard(code) });
});

composer.callbackQuery(/^purchase:plan:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const planId = ctx.match[1];
  let selectedPlan: (typeof PLANS)[string][number] | undefined;
  for (const plans of Object.values(PLANS)) {
    const found = plans.find((p) => p.id === planId);
    if (found) { selectedPlan = found; break; }
  }
  if (!selectedPlan || !ctx.session.purchase?.country) {
    await ctx.editMessageText("Something went wrong. Start again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  ctx.session.purchase.planId = planId;
  ctx.session.step = "purchase_confirm";
  const country = COUNTRIES.find((c) => c.code === ctx.session.purchase!.country);
  await ctx.editMessageText(
    `${country?.name ?? "Country"} — ${selectedPlan.name}\n` +
    `Price: ${selectedPlan.price}\n` +
    `Validity: ${selectedPlan.validity}\n\n` +
    `Confirm your purchase?`,
    { reply_markup: confirmKeyboard("purchase:checkout") },
  );
});

composer.callbackQuery("purchase:checkout:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const planId = ctx.session.purchase?.planId;
  if (!planId) {
    await ctx.editMessageText("Session expired. Tap 📱 Buy eSIM to start again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  ctx.session.step = "purchase_payment";
  await ctx.editMessageText(
    "Processing your payment…\n\n" +
    "In production, this would open a secure payment form (Razorpay / Stripe). " +
    "After payment, your eSIM QR code will be delivered here instantly.",
    { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
  ctx.session.step = "idle";
  ctx.session.purchase = {};
});

composer.callbackQuery("purchase:checkout:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.purchase = {};
  await ctx.editMessageText("No worries — your purchase was cancelled. Tap a button below to do something else.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
