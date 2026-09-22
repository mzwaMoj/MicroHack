# User Journey – Natural Language Product Chat (RAG Assistant)

This document describes example user personas, scenarios, and natural language questions to guide the design and testing of the RAG-powered chat assistant described in [product-catalog.md](./product-catalog.md).

## POC Scope

The first release supports text prompts and JPEG, PNG, or WebP image uploads on
the dedicated `/assistant` page. Retrieval is grounded in products and
suppliers from SQLite, with citations returned alongside matching product
records. Image input is converted to a factual search description before using
the same retrieval path as text.

Order and delivery retrieval in Scenario 6 remains a follow-up. Conversation
history is limited to the current browser session and is not persisted.

## Persona

**Priya, Branch Manager at an OctoCAT Supply branch.** She restocks products for her store and wants a faster way to find products, compare options, and get recommendations than browsing the catalog UI or querying the database directly.

## Scenario 1: Discovering products by need

Priya's branch is getting complaints about cats overeating. She opens the chat assistant instead of searching the product catalog manually.

Example questions:
- "Do we have anything that helps monitor how much a cat is eating?"
- "What products help with overfeeding or portion control?"
- "Is there a smart feeder that tracks eating habits?"

Expected assistant behavior: retrieve **SmartFeeder One** from the catalog, explain its overeating-detection feature, and mention price/discount.

## Scenario 2: Comparing similar products

Priya wants to stock one hydration-related product and isn't sure which one fits.

Example questions:
- "What's the difference between the HydroFlow Smart Bowl and other water products?"
- "Do we sell any water fountains for cats?"
- "Which product is better for a cat that doesn't drink enough water?"

Expected assistant behavior: identify products in the "Feeding & Hydration" category, compare features/price, and recommend based on stated need.

## Scenario 3: Budget-constrained recommendation

Priya has a limited budget for a seasonal promotion.

Example questions:
- "What's the cheapest entertainment product we carry?"
- "Show me products under $100."
- "Which products currently have a discount applied?"

Expected assistant behavior: filter/sort by price and discount fields, return a ranked list.

## Scenario 4: Supplier and sourcing questions

Priya wants to check supplier reliability before placing a bulk order.

Example questions:
- "Who supplies the PurrFect Groomer Bot?"
- "Is WhiskerWare Systems a verified supplier?"
- "Which suppliers are currently active?"
- "What products come from PurrTech Innovations?"

Expected assistant behavior: join product-to-supplier data and answer using supplier metadata (active/verified status, contact info).

## Scenario 5: Recommendations based on a described customer

Priya is talking to a customer at the counter and wants quick suggestions.

Example questions:
- "A customer has a senior cat recovering from surgery, what would you recommend?"
- "I have a customer with an anxious cat that hides a lot, what products might help?"
- "Recommend a starter bundle for a new cat owner."

Expected assistant behavior: reason over product descriptions/categories (e.g., MemoryFoam Recovery Pod for recovery, ThermoNest Deluxe for comfort) and produce a short, justified recommendation list.

## Scenario 6: Order and fulfillment follow-up

After choosing products, Priya wants to know about restocking status.

Example questions:
- "Has the AutoClean Litter Dome been delivered to my branch recently?"
- "What's the status of our last order for cat trees?"
- "Which products are pending delivery from PurrTech Innovations?"

Expected assistant behavior: retrieve order/delivery records tied to products and suppliers, and summarize status in plain language.

## Non-Functional Expectations

- Responses should cite the specific product(s)/supplier(s) used to answer, not just a generic summary.
- If no matching product exists, the assistant should say so rather than inventing one.
- Ambiguous questions (e.g., "something for my cat") should prompt a clarifying follow-up or return a short set of top candidates across categories.

## Success Criteria for the RAG Pipeline

- Correctly retrieves the right product(s) for at least the six scenarios above.
- Distinguishes between similar products in the same category.
- Combines product + supplier + order/delivery data when a question spans multiple entities.
- Declines gracefully when the catalog has no relevant match.
