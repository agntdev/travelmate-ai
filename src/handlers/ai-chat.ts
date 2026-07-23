import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";
import { aiAssistant as copy } from "../i18n/en.js";

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

function backToMenuKeyboard() {
  return inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);
}

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

const composer = new Composer<Ctx>();

composer.callbackQuery("ai:chat", async (ctx) => {
  await safeAnswer(ctx);
  ctx.session.step = "ai_chat";
  await safeEdit(
    ctx,
    copy.intro,
    { reply_markup: topicKeyboard() },
  );
});

composer.callbackQuery(/^ai:topic:(.+)$/, async (ctx) => {
  await safeAnswer(ctx);
  const topic = ctx.match[1];
  const answer = TRAVEL_TIPS[topic];
  if (!answer) {
    await safeEdit(ctx, copy.topicNotFound, {
      reply_markup: topicKeyboard(),
    });
    return;
  }
  await safeEdit(ctx, answer, {
    reply_markup: topicKeyboard(),
  });
});

// Human escalation
composer.callbackQuery("ai:escalate", async (ctx) => {
  await safeAnswer(ctx);
  const query = ctx.callbackQuery.message?.text ?? "General inquiry";

  // Create support ticket in session (durable storage)
  if (!ctx.session.tickets) ctx.session.tickets = [];
  const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
  ctx.session.tickets.push({
    id: ticketId,
    query,
    status: "open",
    createdAt: new Date().toISOString(),
  });

  ctx.session.step = "idle";
  await safeEdit(
    ctx,
    `${copy.escalateTitle}\n\n` +
    `Ticket: ${ticketId}\n\n` +
    `A human agent will review your request and get back to you soon. ` +
    `You'll receive a message when an agent is assigned.\n\n` +
    `In the meantime, you can browse our travel topics for quick answers.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton(copy.escalateBrowse, "ai:chat")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    }
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "ai_chat") return next();
  const query = ctx.message.text.trim().toLowerCase();

  let matched: string | null = null;
  for (const [key, tip] of Object.entries(TRAVEL_TIPS)) {
    if (query.includes(key)) {
      matched = tip;
      break;
    }
  }

  if (matched) {
    await ctx.reply(matched, {
      reply_markup: topicKeyboard(),
    });
  } else {
    await ctx.reply(
      copy.noMatch,
      { reply_markup: topicKeyboard() },
    );
  }
});

export default composer;
