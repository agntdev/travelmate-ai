# TravelMate AI — Bot specification

**Archetype:** booking

**Voice:** professional and warm — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot for budget travelers to buy eSIMs, recharge mobile numbers, and access AI-powered travel assistance in under two minutes. Features multi-provider support, secure payments, and instant QR code delivery.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- budget international tourists
- backpackers
- digital nomads

## Success criteria

- 90% of eSIM purchases completed in <2 minutes
- 95% recharge transaction success rate
- AI assistant resolves 80% of travel queries without human escalation

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with featured plans and quick actions
  - inputs: Telegram user ID
  - outputs: Main menu interface
- **Buy eSIM** (button, actor: user, callback: purchase:country_select) — Start eSIM purchase flow with country selection
  - inputs: Country selection
  - outputs: Plan listing interface
- **Mobile Recharge** (button, actor: user, callback: recharge:start) — Initiate mobile top-up flow
  - inputs: Country selection, Phone number
  - outputs: Operator selection screen
- **Travel Assistant** (button, actor: user, callback: ai:chat) — Open AI-powered travel help interface
  - inputs: Natural language query
  - outputs: AI response with optional human escalation
- **/wallet** (command, actor: user, command: /wallet) — View wallet balance and transaction history
  - inputs: Telegram user ID
  - outputs: Wallet dashboard

## Flows

### eSIM Purchase Flow
_Trigger:_ purchase:country_select

1. Country selection
2. Plan listing
3. Plan selection
4. Checkout confirmation
5. Payment processing
6. QR code delivery

_Data touched:_ User, Country, Plan, Order, Payment

### Mobile Recharge Flow
_Trigger:_ recharge:start

1. Country selection
2. Phone number input
3. Operator selection
4. Amount selection
5. Payment confirmation
6. Transaction completion

_Data touched:_ User, Recharge, Payment

### AI Assistant Interaction
_Trigger:_ ai:chat

1. Query input
2. AI response generation
3. Optional human escalation
4. Ticket creation

_Data touched:_ User, Support Ticket

### Wallet Management
_Trigger:_ /wallet

1. Balance display
2. Transaction history
3. Coupon redemption
4. Referral tracking

_Data touched:_ User, Wallet, Transaction

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user profile with authentication and preferences
  - fields: Telegram ID, Email, Social login tokens, Preferred countries
- **Plan** _(retention: persistent)_ — eSIM plan details from multiple providers
  - fields: Price, Validity period, Provider, Coverage map, 5G availability
- **Order** _(retention: persistent)_ — eSIM purchase transaction record
  - fields: QR code, Status, Payment method, Expiry date
- **Wallet** _(retention: persistent)_ — User balance and transaction history
  - fields: Available balance, Transaction list, Referral credits
- **Support Ticket** _(retention: persistent)_ — Escalated AI chat requests
  - fields: Query text, Escalation timestamp, Agent assignment

## Integrations

- **Telegram** (required) — Bot API messaging and Mini App interface
- **Razorpay** (required) — UPI and card payments in India
- **Stripe** (required) — International card payments
- **Email Service** (required) — QR code delivery and transaction notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Manage plan catalog and pricing
- Configure coupon rewards and referrals
- Monitor admin alerts for failed payments
- Manage payment gateway integrations
- View audit logs for security

## Notifications

- Payment confirmation with QR code
- Recharge success alerts
- Plan expiry warnings
- Low data alerts
- Special offer notifications

## Permissions & privacy

- PCI-DSS compliant payment handling
- End-to-end encrypted user data
- GDPR-compliant data retention
- User consent for email notifications

## Edge cases

- Failed payment retries with multiple gateways
- Expired plan auto-renewal prompts
- Human escalation during AI maintenance
- Rate limiting for abuse prevention

## Required tests

- End-to-end eSIM purchase flow with webhook verification
- AI response accuracy for 100+ travel queries
- Notification delivery across all channels
- Wallet transaction rollback for chargebacks

## Assumptions

- Users have Telegram installed
- Multi-provider adapter pattern will scale to new regions
- AI responses meet 80% accuracy threshold
