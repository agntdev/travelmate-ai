import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { aiAssistant as copy, render } from "../i18n/en.js";
import { store, ensureUser } from "../store.js";
import { safeAnswer, safeEdit } from "../safe-api.js";
import { now, nowIso } from "../clock.js";

registerMainMenuItem({ label: "💬 Travel Assistant", data: "ai:chat", order: 30 });

const TRAVEL_TIPS: Record<string, string> = {
  visa: copy.tipVisa,
  currency: copy.tipCurrency,
  safety: copy.tipSafety,
  food: copy.tipFood,
  transport: copy.tipTransport,
  packing: copy.tipPacking,
  budget: copy.tipBudget,
  connectivity: copy.tipConnectivity,
  health: copy.tipHealth,
};

// Keyword aliases so free-text questions map onto the curated tips.
const KEYWORD_MAP: Array<{ keys: string[]; topic: string }> = [
  { keys: ["visa", "entry", "passport", "immigration"], topic: "visa" },
  { keys: ["currency", "money", "atm", "exchange", "cash"], topic: "currency" },
  { keys: ["safety", "safe", "theft", "scam", "crime"], topic: "safety" },
  { keys: ["food", "eat", "restaurant", "street food", "cuisine"], topic: "food" },
  { keys: ["transport", "train", "bus", "metro", "taxi", "grab", "uber"], topic: "transport" },
  { keys: ["pack", "packing", "luggage", "suitcase", "bag"], topic: "packing" },
  { keys: ["budget", "cheap", "cost", "price", "expensive"], topic: "budget" },
  { keys: ["sim", "esim", "wifi", "internet", "data", "connectivity", "roaming"], topic: "connectivity" },
  { keys: ["health", "vaccine", "hospital", "medicine", "insurance"], topic: "health" },
];

function topicKeyboard() {
  return inlineKeyboard([
    [inlineButton(copy.topicVisa, "ai:topic:visa"), inlineButton(copy.topicCurrency, "ai:topic:currency")],
    [inlineButton(copy.topicSafety, "ai:topic:safety"), inlineButton(copy.topicFood, "ai:topic:food")],
    [inlineButton(copy.topicTransport, "ai:topic:transport"), inlineButton(copy.topicPacking, "ai:topic:packing")],
    [inlineButton(copy.topicBudget, "ai:topic:budget"), inlineButton(copy.topicConnectivity, "ai:topic:connectivity")],
    [inlineButton(copy.topicHealth, "ai:topic:health")],
    [inlineButton(copy.topicHuman, "ai:escalate")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);
}

function matchTopic(query: string): string | null {
  const q = query.toLowerCase();
  for (const { keys, topic } of KEYWORD_MAP) {
    if (keys.some((k) => q.includes(k))) return topic;
  }
  return null;
}

const composer = new Composer<Ctx>();

composer.callbackQuery("ai:chat", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "ai_chat";
  await safeEdit(ctx, copy.intro, { reply_markup: topicKeyboard() });
});

composer.callbackQuery(/^ai:topic:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const topic = ctx.match[1];
  const answer = TRAVEL_TIPS[topic];
  if (!answer) {
    await safeEdit(ctx, copy.topicNotFound, { reply_markup: topicKeyboard() });
    return;
  }
  await safeEdit(ctx, answer, { reply_markup: topicKeyboard() });
});

// Human escalation — durable support ticket
composer.callbackQuery("ai:escalate", async (ctx) => {
  await safeAnswer(ctx);
  const query = ctx.callbackQuery.message?.text ?? "General inquiry";
  const ticketId = `TKT-${now().toString(36).toUpperCase()}`;
  const uid = ctx.from?.id ?? 0;
  await ensureUser(ctx.from || undefined);
  await store.saveTicket({
    id: ticketId,
    userId: uid,
    query,
    status: "open",
    createdAt: nowIso(),
  });

  if (!ctx.session.tickets) ctx.session.tickets = [];
  ctx.session.tickets.push({
    id: ticketId,
    query,
    status: "open",
    createdAt: nowIso(),
  });

  ctx.session.step = "idle";
  await safeEdit(
    ctx,
    `${copy.escalateTitle}\n\n` + render(copy.escalateTicket, { ticket_id: ticketId }),
    {
      reply_markup: inlineKeyboard([
        [inlineButton(copy.escalateBrowse, "ai:chat")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "ai_chat") return next();
  const query = ctx.message.text.trim();
  const topic = matchTopic(query);
  if (topic && TRAVEL_TIPS[topic]) {
    await ctx.reply(TRAVEL_TIPS[topic], { reply_markup: topicKeyboard() });
  } else {
    await ctx.reply(copy.noMatch, { reply_markup: topicKeyboard() });
  }
});

export default composer;
