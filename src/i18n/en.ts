/**
 * TravelMate AI — English UI copy (en).
 *
 * All user-facing strings live here. Handlers import this module and render
 * templates with runtime values via `render()`. Each key carries up to three
 * length variants for A/B testing (short ≤60 chars, medium ≤160, long ≤400).
 *
 * Placeholders use {name} syntax — call `render(template, vars)` to fill them.
 *
 * Button labels follow UX rules: verb-first, sentence case, ≤24 chars,
 * ≤1 emoji, no question marks.
 */

// ── Template renderer ─────────────────────────────────────────────────────────

/** Replace every {key} in `template` with the corresponding value from `vars`. */
export function render(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce<string>(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

// ── 1. /start & welcome / onboarding ─────────────────────────────────────────

export const welcome = {
  default: "👋 Welcome! Tap a button below to get started.",
  short: "👋 Welcome to TravelMate! Tap a button to get started.",
  medium:
    "👋 Welcome to TravelMate — your travel companion for eSIMs, recharges, and tips.\n\nTap a button below to get started.",
  long: [
    "👋 Welcome to TravelMate!",
    "",
    "I help you stay connected while traveling:",
    "• Buy eSIMs for instant data",
    "• Recharge mobile numbers worldwide",
    "• Get AI-powered travel tips",
    "",
    "Tap a button below to get started.",
  ].join("\n"),
};

// ── 2. Main menu & quick actions ─────────────────────────────────────────────

export const menu = {
  buyEsim: "🛒 Buy eSIM",
  recharge: "📲 Recharge",
  travelAssistant: "💬 Travel Assistant",
  wallet: "💰 Wallet",
  orders: "📋 Orders",
  help: "❓ Help",
  settings: "⚙️ Settings",
  backToMenu: "⬅️ Back to menu",
};

// ── 3. Help ───────────────────────────────────────────────────────────────────

export const help = {
  default:
    "ℹ️ Tap /start to open the menu, then pick what you want from the buttons.\n\nEverything in this bot is reachable by tapping — you don't need to remember any commands.",
  short: "Tap /start to open the menu, then pick a button.",
  long: [
    "ℹ️ How to use TravelMate",
    "",
    "Tap /start to open the main menu, then choose what you need:",
    "• Buy an eSIM for your trip",
    "• Recharge a mobile number",
    "• Ask the AI travel assistant",
    "• Check your wallet & orders",
    "",
    "Everything is a tap away — no commands to remember.",
  ].join("\n"),
};

// ── 4. Product discovery — eSIM country selection ────────────────────────────

export const purchase = {
  countryPrompt: "Where are you traveling? Pick a country to see available eSIM plans.",
  countryNotFound: "Country not found. Try again.",

  planList: "{country} — available plans:\n\nChoose a plan below:",

  planDetail:
    "{country} — {provider}\n\n" +
    "{data} — {validity}\n" +
    "Price: {price}\n" +
    "Rating: {rating} ⭐\n" +
    "Activation: {activation}\n" +
    "Compatible: {compatible}\n" +
    "Coverage: {coverage}\n\n" +
    "When would you like to activate this eSIM?",

  planDetailShort:
    "{country} — {provider}\n" +
    "{data} for {validity} — {price}\n\n" +
    "When would you like to activate?",

  // ── Activation ─────────────────────────────────────────────────────────────

  activationImmediate: "⚡ Immediate",
  activationScheduled: "📅 Scheduled",
  datePromptStart: "When does your trip start? (e.g. Aug 15)",
  datePromptEnd: "Trip starts: {start}\n\nWhen does your trip end? (e.g. Aug 25)",
  dateTooShort: "Please enter a date (e.g. Aug 15).",

  // ── Quantity ───────────────────────────────────────────────────────────────

  quantityPrompt:
    "{country} — {provider}\n\n" +
    "{data} — {validity}\n" +
    "Price: {price}\n" +
    "Activation: Immediate\n\n" +
    "How many would you like?",

  quantityPromptScheduled:
    "{country} — {provider}\n\n" +
    "{data} — {validity}\n" +
    "Price: {price}\n" +
    "Activation: {start} → {end}\n\n" +
    "How many would you like?",

  quantitySelected: "Great choice! {qty} eSIM{plural} selected.\n\nYour email (for QR code delivery):",
  quantitySelectedShort: "{qty} eSIM{plural} selected. Your email?",

  // ── Contact info ───────────────────────────────────────────────────────────

  emailPrompt: "Your email (for QR code delivery):",
  emailInvalid: "Please enter a valid email address.",
  emailSaved:
    "Email saved: {email}\n\nPhone number (optional — for delivery notifications):",
  phoneSkip: "Skip",

  // ── Order review ───────────────────────────────────────────────────────────

  review:
    "📋 Order Review\n\n" +
    "Plan: {provider} — {data} {validity}\n" +
    "Country: {country}\n" +
    "Quantity: {qty}\n" +
    "Activation: {activation}\n" +
    "Email: {email}\n\n" +
    "💰 Breakdown\n" +
    "Base price: ${subtotal}\n" +
    "Taxes & fees: ${taxes}\n" +
    "Total: ${total}\n\n" +
    "Ready to pay?",

  reviewWithPromo:
    "📋 Order Review\n\n" +
    "Plan: {provider} — {data} {validity}\n" +
    "Country: {country}\n" +
    "Quantity: {qty}\n" +
    "Activation: {activation}\n" +
    "Email: {email}\n\n" +
    "💰 Breakdown\n" +
    "Base price: ${subtotal}\n" +
    "{discountLine}" +
    "Taxes & fees: ${taxes}\n" +
    "Total: ${total}\n\n" +
    "Ready to pay?",

  // ── Promo ──────────────────────────────────────────────────────────────────

  promoPrompt: "Enter your promo code:",
  promoApplied: "Promo ({code}): -${discount}",
  promoInvalid: 'Promo "{code}" — not a valid code. You can still pay full price.',

  // ── Payment ────────────────────────────────────────────────────────────────

  paymentMethods: "Choose a payment method:",
  paymentCard: "💳 Card",
  paymentUpi: "📱 UPI",
  paymentProcessing: "Processing your payment…",

  paymentSuccess:
    "✅ Payment received via {method}!\n\n" +
    "Your eSIM QR code and installation instructions are being sent to {email}.\n\n" +
    "📱 QR Code Delivery\n" +
    "Check your email for the QR code and step-by-step device-specific installation guide.\n\n" +
    "Need help with anything else?",

  paymentSuccessShort:
    "✅ Paid via {method}! QR code sent to {email}.\n\nNeed help with anything else?",

  paymentSuccessLong:
    "✅ Payment received via {method}!\n\n" +
    "Order: {order_id}\n\n" +
    "📱 QR Code Delivery\n" +
    "Your eSIM QR code and installation instructions have been sent to {email}.\n\n" +
    "How to install:\n" +
    "1. Open Settings → Cellular → Add eSIM\n" +
    "2. Scan the QR code from your email\n" +
    "3. Follow the on-screen prompts\n\n" +
    "Troubleshooting: make sure you're on Wi-Fi and your device supports eSIM.\n\n" +
    "Need help with anything else?",

  // ── QR delivery & installation ─────────────────────────────────────────────

  qrDelivery:
    "📱 QR Code Delivery\n" +
    "Check your email for the QR code and step-by-step device-specific installation guide.",

  qrInstallSteps: [
    "1. Open Settings → Cellular → Add eSIM",
    "2. Scan the QR code from your email",
    "3. Follow the on-screen prompts",
  ].join("\n"),

  qrTroubleshooting:
    "Having trouble? Make sure you're on Wi-Fi and your device supports eSIM. " +
    "Most phones from 2020+ work.",

  // ── Cancellation ───────────────────────────────────────────────────────────

  cancel: "No worries — your order was cancelled. Tap a button below to do something else.",
  cancelShort: "Order cancelled.",

  // ── Error / session ────────────────────────────────────────────────────────

  sessionExpired: "Session expired. Start again.",
  somethingWrong: "Something went wrong. Start again.",

  // ── Post-success actions ───────────────────────────────────────────────────

  buyAnother: "🆕 Buy another eSIM",
  needHelp: "💬 Need help?",
};

// ── 5. Recharge flow ─────────────────────────────────────────────────────────

export const recharge = {
  countryPrompt: "Which country is your mobile number from?",
  countryNotFound: "Country not found. Try again.",

  operatorPrompt: "Who is your {country} mobile operator?",
  operatorError: "Something went wrong. Start again.",

  phonePrompt: "Enter your {operator} mobile number:",
  phoneInvalid:
    "That doesn't look like a valid phone number. Enter your number with country code (e.g. +911234567890).",

  amountPrompt: "Pick a top-up amount:",

  summary:
    "📋 Recharge Summary\n\n" +
    "Country: {country}\n" +
    "Operator: {operator}\n" +
    "Phone: {phone}\n" +
    "Amount: {amount}\n\n" +
    "Confirm this recharge?",

  confirmPay: "💳 Confirm and Pay",
  confirmCancel: "Cancel",

  success:
    "✅ Recharge successful!\n\n" +
    "{amount} has been sent to {phone} ({operator}).\n\n" +
    "You'll receive a confirmation SMS from your operator shortly.\n\n" +
    "Need help with anything else?",

  successShort:
    "✅ {amount} sent to {phone} ({operator}). SMS confirmation coming shortly.\n\nNeed help with anything else?",

  cancelled: "Recharge cancelled. Tap a button below to do something else.",
  cancelledShort: "Recharge cancelled.",

  sessionExpired: "Session expired. Start again.",
};

// ── 6. AI Travel Assistant ───────────────────────────────────────────────────

export const aiAssistant = {
  intro:
    "What can I help you with?\n\nPick a topic below, or just type your travel question.",
  introShort: "Pick a topic or type your question.",

  topicPrompt: "Pick a topic below for quick answers:",

  topicNotFound: "I don't have info on that yet. Try another topic or type your question.",

  noMatch:
    "Thanks for your question! I'm best with travel topics like visas, safety, food, transport, and budget tips.\n\n" +
    "Pick a topic below for quick answers, or rephrase your question.",

  // ── Topic labels ───────────────────────────────────────────────────────────

  topicVisa: "🛂 Visa & entry",
  topicCurrency: "💱 Currency",
  topicSafety: "🔒 Safety",
  topicFood: "🍜 Food",
  topicTransport: "🚌 Transport",
  topicPacking: "🎒 Packing",
  topicBudget: "💰 Budget",
  topicConnectivity: "📶 Connectivity",
  topicHealth: "💊 Health",
  topicHuman: "👨‍💼 Talk to human",

  // ── Topic answers ──────────────────────────────────────────────────────────

  tipVisa:
    "Most Southeast Asian countries offer visa-on-arrival or visa-free entry for 30–90 days. " +
    "Check your passport's expiry — many countries require 6 months validity. " +
    "Always verify requirements for your specific nationality before traveling.",

  tipCurrency:
    "ATMs are widely available in tourist areas. Withdraw local currency for the best rates — " +
    "avoid airport exchange counters (they charge 5–10% more). In Japan, 7-Eleven ATMs accept foreign cards.",

  tipSafety:
    "Keep digital copies of your passport and visa in a secure cloud folder. " +
    "Use a money belt in crowded areas. Save your embassy's local phone number. " +
    "Most tourist areas are very safe, but stay aware of your surroundings.",

  tipFood:
    "Street food is safe in most Asian countries — look for stalls with high turnover and long local queues. " +
    "In Thailand and Vietnam, some of the best meals cost under $2.",

  tipTransport:
    "Download offline maps (Google Maps or Maps.me) before you go. " +
    "In Southeast Asia, grab a local SIM and use Grab for rides. " +
    "Japan's rail pass is worth it if you're hopping between cities.",

  tipPacking:
    "Pack light — you can buy anything you need locally for cheap. " +
    "Bring a universal power adapter, quick-dry towel, and a padlock for hostel lockers. " +
    "Roll your clothes to save space.",

  tipBudget:
    "Daily budget for Southeast Asia: $25–50/day (hostel, food, transport). " +
    "Europe: $50–100/day. Japan: $60–120/day. These include accommodation, meals, and local transport.",

  tipConnectivity:
    "Buy a local SIM at the airport for the best data rates. " +
    "eSIMs are great for quick setup — you can buy one right here! " +
    "Most cafés and restaurants have free Wi-Fi.",

  tipHealth:
    "Pack basic meds (painkillers, anti-diarrheal, band-aids). " +
    "Check if you need vaccinations 6 weeks before travel. " +
    "Travel insurance is essential — don't skip it.",

  // ── Escalation ─────────────────────────────────────────────────────────────

  escalateTitle: "✅ Support request created",
  escalateTicket: "Ticket: {ticket_id}\n\nA human agent will review your request and get back to you soon. " +
    "You'll receive a message when an agent is assigned.\n\n" +
    "In the meantime, you can browse our travel topics for quick answers.",
  escalateBrowse: "💬 Browse topics",
};

// ── 7. Wallet ────────────────────────────────────────────────────────────────

export const wallet = {
  title: "💰 Your wallet",
  balance: "Balance: {balance}",
  emptyState: "No transactions yet — buy an eSIM or recharge to get started.",
  recentTransactions: "Recent transactions:",
  useButtons: "Use the buttons below to redeem a coupon or check your referral code.",

  emptyFull:
    "💰 Your wallet\n\n" +
    "Balance: {balance}\n\n" +
    "No transactions yet — buy an eSIM or recharge to get started.",

  withTransactions:
    "💰 Your wallet\n\n" +
    "Balance: {balance}\n\n" +
    "Recent transactions:\n{transactions}\n\n" +
    "Use the buttons below to redeem a coupon or check your referral code.",

  // ── Coupon ─────────────────────────────────────────────────────────────────

  couponPrompt: "Enter your coupon code to redeem it.\n\nJust type or paste the code here.",
  couponShort: "Enter your coupon code:",
  couponSuccess: 'Coupon "{code}" redeemed! $2.00 has been added to your wallet.\n\nNew balance: {balance}',
  couponInvalid: "That code doesn't look right. Please enter a valid coupon code.",

  // ── Referral ───────────────────────────────────────────────────────────────

  referral:
    "👥 Share your referral link with friends!\n\n" +
    "When they sign up and make their first purchase, you both get $5.00 credit.\n\n" +
    "Your referral code: {code}\n\n" +
    "Share this code — they enter it during sign-up.",

  referralShort:
    "Share code {code} with friends — you both get $5.00 when they sign up.",
};

// ── 8. Errors, validation & cancellations ────────────────────────────────────

export const errors = {
  invalidInput: "Please enter a valid {field}.",
  tooShort: "That's too short — please try again.",
  networkError: "Something went wrong on our end. Please try again in a moment.",
  rateLimited: "Too many requests — please wait a moment and try again.",
  sessionExpired: "Your session expired. Tap /start to begin again.",
  unknownCommand: "Sorry, I didn't understand that. Try /help.",
  paymentFailed: "Payment didn't go through. Please try again or choose a different method.",
  paymentFailedShort: "Payment failed — try again or pick another method.",

  retry: "🔄 Try again",
  changePaymentMethod: "💳 Change payment method",
  contactSupport: "💬 Contact support",
};

// ── 9. Button labels (quick-reply & inline) ──────────────────────────────────

export const buttons = {
  backToMenu: "⬅️ Back to menu",
  backToCountries: "⬅️ Back to countries",
  backToPlans: "⬅️ Back to plans",
  backToActivation: "⬅️ Back to activation",
  backToQuantity: "⬅️ Back to quantity",
  backToEmail: "⬅️ Back to email",
  backToReview: "⬅️ Back to review",
  backToOperators: "⬅️ Back to operators",
  backToWallet: "⬅️ Back to wallet",
  cancel: "Cancel",
  skip: "Skip",
  confirmAndPay: "💳 Confirm and Pay",
  enterPromo: "🏷️ Enter promo code",
  buyAnotherEsim: "🆕 Buy another eSIM",
  needHelp: "💬 Need help?",
  browseTopics: "💬 Browse topics",
  getAiHelp: "💬 Get AI help",
  talkToHuman: "👨‍💼 Talk to human",
  redeemCoupon: "🎁 Redeem coupon",
  referral: "👥 Referral",
  tryAgain: "🔄 Try again",
  changePaymentMethod: "💳 Change payment method",
  contactSupport: "💬 Contact support",
};

// ── 10. Notification text (push / digest) ────────────────────────────────────

export const notifications = {
  paymentConfirmation:
    "✅ Payment confirmed for order {order_id} — {amount} via {method}.",
  rechargeSuccess: "📲 Recharge of {amount} to {phone} ({operator}) completed.",
  planExpiryWarning:
    "⏰ Your {provider} eSIM for {country} expires in {days} days. " +
    "Tap here to renew before you lose connectivity.",
  lowDataAlert:
    "📶 You have {remaining} of data left on your {country} eSIM. " +
    "Need more? Tap to top up.",
  specialOffer:
    "🎉 Special offer: Get {discount}% off your next eSIM purchase with code {code}.",
};

// ── 11. Privacy & trust ──────────────────────────────────────────────────────

export const privacy = {
  trustNote:
    "Your payment info is encrypted and never stored on our servers. " +
    "We only use your email to deliver your eSIM QR code.",
  gdprConsent:
    "We store only what's needed to deliver your order. " +
    "You can request data deletion anytime by contacting support.",
};

// ── Export as flat lookup for JSON generation ─────────────────────────────────

export const allCopy = {
  welcome,
  menu,
  help,
  purchase,
  recharge,
  aiAssistant,
  wallet,
  errors,
  buttons,
  notifications,
  privacy,
};
