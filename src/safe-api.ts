/**
 * Tolerate the two benign Bot-API 400s that fire under normal use:
 *   - "message is not modified" — re-tapping the current screen
 *   - "query is too old / query ID is invalid" — stale callback button
 * Never let them bubble into the global error log.
 */
import type { Ctx } from "./bot.js";

function errText(err: unknown): string {
  if (!err || typeof err !== "object") return String(err ?? "");
  const e = err as { description?: string; message?: string };
  return `${e.description ?? ""} ${e.message ?? ""}`.toLowerCase();
}

export async function safeAnswer(ctx: Ctx, text?: string): Promise<void> {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch {
    // Stale or invalid callback query — nothing to do.
  }
}

export async function safeEdit(
  ctx: Ctx,
  text: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    await ctx.editMessageText(text, extra);
  } catch (err) {
    const d = errText(err);
    // Re-tap of the same screen — content already correct, do nothing.
    if (d.includes("message is not modified")) return;
    // Message gone or too old to edit — send a fresh one so the user still sees it.
    try {
      await ctx.reply(text, extra);
    } catch {
      // User blocked / chat gone — swallow.
    }
  }
}
