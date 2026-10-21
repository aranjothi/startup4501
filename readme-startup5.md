# Startup 5: KitchenTicket — Verified order intake for shared kitchens

**Inspired by:** [FoodCourt](https://www.ycombinator.com/companies/foodcourt). Its multi-brand kitchen model got us thinking about how staff turn informal customer messages into accurate orders across several menus. We're proposing our own software tool, with no affiliation with FoodCourt or access to its operations.

**Our idea:** Staff would paste a text order or upload a voice recording, and KitchenTicket would turn it into a validated ticket using the kitchen's current menu. We'd start with one participating kitchen.

## 1. Solves one problem extremely well.

Informal orders can be hard to enter accurately when several brands have different items and options. We want to reduce transcription and item-selection errors.

The first version will map requests to an approved catalog, ask about missing options, and produce one combined ticket. Payments, purchasing, driver dispatch, delivery estimates, and running a kitchen are outside our scope. We'll compare staff entry time and corrected tickets per 100 orders with the kitchen's existing process.

## 2. You know the target customers or have direct access to them.

We'd target owner-operated delivery kitchens that accept manual text or voice orders and run at least two menus. We plan to recruit through local food entrepreneurs or personal connections in an area we can visit. We haven't secured an operator yet.

We need one operator willing to share a current menu and anonymized historical orders, let us observe the workflow weekly, and try a supervised prototype. We'll use those sessions to learn how staff handle modifiers, corrections, and unclear requests.

## 3. You are familiar with (or can quickly learn) most of the required infrastructure.

We'd use a tablet-friendly web app, Python API, PostgreSQL, hosted transcription, an LLM for structured order extraction, and a rules engine for checking orders. Staff would paste messages or upload audio with customer permission, so we wouldn't need a messaging-platform integration to start.

Our three developers can divide the staff interface and catalog tools, backend and order transactions, and extraction and validation. We'll first build a working path from a sample order to a checked ticket. Kitchen-specific modifiers and order states will come from observation with the operator.

## 4. Reimagines the problem space to make it significantly better.

We want staff to get exact catalog items and modifiers from everyday language. “Two chicken meals, one without the side” should produce the correct item IDs and options, or a specific question if the menu doesn't support that request.

Multiple brands would share one order, reducing repeated entry. We'll test accuracy and handling time against manual transcription before claiming an improvement.

## 5. An LLM/Generative model is core to the solution (no generic "chatbot in a sidebar").

The model would interpret paraphrases, mixed item descriptions, and corrections, then propose catalog-linked line items. A transcription model would handle voice input. For a request like “same meal as before, but make the second one mild,” we'd supply the authorized order context.

Prices, stock checks, and ticket rendering would stay in deterministic application code.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator.

Raw transcripts, extracted orders, and generated clarification questions stay internal until checked. Validators will enforce the expected structure, valid item and modifier IDs, allowed combinations, positive integer quantities, current catalog versions, source references, and available stock. The rules engine will calculate prices, taxes, fees, and totals using the operator's configured rules.

For the first version, a designated staff verifier will compare every interpretation with the original message or recording before it reaches the customer or kitchen recipient. That review is especially important for unclear audio. Other recipients won't have access to pending drafts.

We won't use model output to decide allergy safety. Allergy requests and unknown ingredients will follow the operator's established process through fixed notices.

Only approved data can reach the ticket renderer. Questions and confirmations must pass validation too. We'll recheck stock and price versions in a database transaction when the order is submitted.

## 7. Self-Correction Loop: Validation errors must automatically feed back into the LLM to retry/correct.

Errors such as `UNKNOWN_MENU_ITEM`, `INVALID_MODIFIER`, and `MISSING_QUANTITY` will go back to the model with the original order and relevant current catalog entries. We'll allow three total attempts and validate each one. Staff-verifier rejections will use the same loop.

When information is missing, we'll generate and validate a clarification question. If all attempts fail, we'll show a fixed manual-intake status and create no ticket. A customer's answer will restart extraction and validation with the updated context.

## 8. Deployability: If built, you are able to fully deploy it.

We'll deploy the app, API, worker, review queue, and database with HTTPS, staff roles, private audio storage, retention controls, secret management, monitoring, and backups. We'll use idempotency keys to prevent duplicate tickets and explicit states for pending, validated, confirmed, and submitted orders.

If the network fails, staff will see a pending status and have a manual-entry option. We'll start with an on-screen kitchen queue, leaving printer and point-of-sale integrations for later.

Before release, we'll test a real menu, invalid modifiers, unclear audio, automatic correction, stale stock, and duplicate submissions. Our team will own the software deployment. We still need operator access and hosting and model accounts.
