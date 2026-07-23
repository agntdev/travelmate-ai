import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
} from "../toolkit/index.js";

registerMainMenuItem({ label: "💬 Travel Assistant", data: "ai:chat", order: 30 });

const TRAVEL_TIPS: Record<string, string> = {
  visa: "Most Southeast Asian countries offer visa-on-arrival or visa-free entry for 30–90 days. Check your passport's expiry — many countries require 6 months validity. Always verify requirements for your specific nationality before traveling.",
  currency: "ATMs are widely available in tourist areas. Withdraw local currency for the best rates — avoid airport exchange counters (they charge 5–10% more). In Japan, 7-Eleven ATMs accept foreign cards.",
  safety: "Keep digital copies of your passport and visa in a secure cloud folder. Use a money belt in crowded areas. Save your embassy's local phone number. Most tourist areas are very safe, but stay aware of your surroundings.",
  food: "Street food is safe in most Asian countries — look for stalls with high turnover and long local queues. In Thailand and Vietnam, some of the best meals cost under $2.",
  transport: "Download offline maps (Google Maps or Maps.me) before you go. In Southeast Asia, grab a local SIM and use Grab for rides. Japan's rail pass is worth it if you're hopping between cities.",
  packing: "Pack light — you can buy anything you need locally for cheap. Bring a universal power adapter, quick-dry towel, and a padlock for hostel lockers. Roll your clothes to save space.",
  budget: "Daily budget for Southeast Asia: $25–50/day (hostel, food, transport). Europe: $50–100/day. Japan: $60–120/day. These include accommodation, meals, and local transport.",
  connectivity: "Buy a local SIM at the airport for the best data rates. eSIMs are great for quick setup — you can buy one right here! Most cafés and restaurants have free Wi-Fi.",
  health: "Pack basic meds (painkillers, anti-diarrheal, band-aids). Check if you need vaccinations 6 weeks before travel. Travel insurance is essential — don't skip it.",
};

const TOPIC_BUTTONS = [
  [inlineButton("🛂 Visa & entry", "ai:topic:visa"), inlineButton("💱 Currency", "ai:topic:currency")],
  [inlineButton("🔒 Safety", "ai:topic:safety"), inlineButton("🍜 Food", "ai:topic:food")],
  [inlineButton("🚌 Transport", "ai:topic:transport"), inlineButton("🎒 Packing", "ai:topic:packing")],
  [inlineButton("💰 Budget", "ai:topic:budget"), inlineButton("📶 Connectivity", "ai:topic:connectivity")],
  [inlineButton("💊 Health", "ai:topic:health")],
];

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

const composer = new Composer<Ctx>();

composer.callbackQuery("ai:chat", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "ai_chat";
  await ctx.editMessageText(
    "What can I help you with?\n\nPick a topic below, or just type your travel question.",
    { reply_markup: inlineKeyboard([...TOPIC_BUTTONS, [inlineButton("⬅️ Back to menu", "menu:main")]]) },
  );
});

composer.callbackQuery(/^ai:topic:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const topic = ctx.match[1];
  const answer = TRAVEL_TIPS[topic];
  if (!answer) {
    await ctx.editMessageText("I don't have info on that yet. Try another topic or type your question.", {
      reply_markup: inlineKeyboard([...TOPIC_BUTTONS, [inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.editMessageText(answer, {
    reply_markup: inlineKeyboard([
      ...TOPIC_BUTTONS,
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
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
      reply_markup: inlineKeyboard([...TOPIC_BUTTONS, [inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } else {
    await ctx.reply(
      "Thanks for your question! I'm best with travel topics like visas, safety, food, transport, and budget tips.\n\n" +
      "Pick a topic below for quick answers, or rephrase your question.",
      { reply_markup: inlineKeyboard([...TOPIC_BUTTONS, [inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
  }
});

export default composer;
