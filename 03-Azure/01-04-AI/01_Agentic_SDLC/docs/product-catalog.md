# OctoCAT Supply Chain – Product & Supplier Catalog

This document is a source knowledge base for a RAG (Retrieval-Augmented Generation) pipeline that lets a user chat in natural language to learn about products, ask questions, and get recommendations.

Data source: `src/database/seed/004_products.sql` (products) and `src/database/seed/001_suppliers.sql` (suppliers).

## Products

| ID | Name | SKU | Price | Discount | Unit | Supplier | Description |
|----|------|-----|-------|----------|------|----------|-------------|
| 1 | SmartFeeder One | CAT-FEED-001 | $129.99 | 25% | piece | PurrTech Innovations | AI-powered feeder that learns your cat's snack schedule based on nap cycles and mealtime habits. Detects overeating, undernapping, and auto-updates a Feline Health Repo. |
| 2 | AutoClean Litter Dome | CAT-LITTER-001 | $199.99 | 25% | piece | PurrTech Innovations | Self-cleaning litter box that detects patterns in your cat's... commits. Sends a health report and Slack alert if things look off. |
| 3 | CatFlix Entertainment Portal | CAT-FLIX-001 | $89.99 | 0% | piece | WhiskerWare Systems | On-demand laser shows, motion videos, and bird-watching streams customized per cat using AI interest tracking. Like Netflix, but for felines. |
| 4 | PawTrack Smart Collar | CAT-COLLAR-001 | $79.99 | 0% | piece | WhiskerWare Systems | GPS and activity tracker with AI-powered mood detection based on tail position, purring frequency, and movement patterns. Syncs with your phone for walk stats and zoomie alerts. |
| 5 | WhiskerCam Pro | CAT-CAM-001 | $149.99 | 15% | piece | PurrTech Innovations | 360-degree camera with motion alerts, treat dispensing, live streaming, and night vision for midnight mischief detection. |
| 6 | ThermoNest Deluxe | CAT-BED-001 | $99.99 | 0% | piece | PurrTech Innovations | Self-heating pet bed with temperature sensors that adjust to your cat's preferred warmth. Includes memory foam and a built-in purr simulator. |
| 7 | ClimbCast Cat Tree | CAT-TREE-001 | $299.99 | 10% | piece | PurrTech Innovations | Multi-level climbing structure with integrated speakers, charging stations, and modular perches. |
| 8 | HydroFlow Smart Bowl | CAT-WATER-001 | $119.99 | 0% | piece | WhiskerWare Systems | AI-powered water fountain that monitors hydration levels and sends health alerts. Includes filtration and customizable flow patterns. |
| 9 | PurrFect Groomer Bot | CAT-GROOM-001 | $399.99 | 20% | piece | PurrTech Innovations | Robotic grooming assistant with gentle brushes and nail trimmers. Uses AI to detect grooming preferences and stress levels. |
| 10 | MemoryFoam Recovery Pod | CAT-POD-001 | $179.99 | 0% | piece | PurrTech Innovations | Therapeutic resting pod with memory foam and heat therapy for senior cats or post-surgery recovery, with health-tracking sensors. |
| 11 | DoorDash Smart Portal | CAT-DOOR-001 | $159.99 | 0% | piece | PurrTech Innovations | Smart cat door with facial recognition and time-based access. Prevents midnight squirrel parties and tracks in/out commits. |
| 12 | ZoomieTracker AI Mat | CAT-TRACKER-001 | $79.99 | 0% | piece | WhiskerWare Systems | Motion-sensing mat that detects zoomies, spins up chase lights, and logs agility bursts to a weekly health report. |

## Product Categories (for recommendation grouping)

- **Feeding & Hydration**: SmartFeeder One, HydroFlow Smart Bowl
- **Litter & Hygiene**: AutoClean Litter Dome, PurrFect Groomer Bot
- **Entertainment & Enrichment**: CatFlix Entertainment Portal, ClimbCast Cat Tree, ZoomieTracker AI Mat
- **Monitoring & Safety**: WhiskerCam Pro, PawTrack Smart Collar, DoorDash Smart Portal
- **Comfort & Health Recovery**: ThermoNest Deluxe, MemoryFoam Recovery Pod

## Suppliers (Services)

Suppliers act as the vendors/service providers who manufacture and supply products to OctoCAT Supply's branches.

| ID | Name | Description | Contact | Email | Active | Verified |
|----|------|-------------|---------|-------|--------|----------|
| 1 | PurrTech Innovations | Leading supplier of premium smart cat technology | Felix Whiskerton | felix@purrtech.co | Yes | Yes |
| 2 | WhiskerWare Systems | Advanced feline-focused smart product supplier | Tabitha Pawson | tabitha@whiskerware.com | Yes | No |
| 3 | CatNip Creations | Supplier of eco-friendly cat toys and accessories | Nina Nibbles | nina@catnip.com | No | No |

## Related Entities for RAG Context

Beyond products and suppliers, the following entities can enrich retrieval context (e.g., availability, fulfillment, order history):

- **Headquarters / Branches**: locations that place orders and stock products.
- **Orders / Order Details**: records linking branches to products with quantity and pricing, useful for popularity or reorder-based recommendations.
- **Deliveries / Order Detail Deliveries**: fulfillment status from suppliers to branches, useful for answering "is this in stock" or "when will it arrive" style questions.

Schema reference: [src/database/migrations/001_init.sql](../src/database/migrations/001_init.sql)

## Suggested RAG Pipeline Notes

- Chunk each product row (name, description, price, discount, supplier, category) into its own retrievable document/embedding for accurate single-product answers.
- Include supplier metadata alongside products so the assistant can answer "who supplies this?" or filter by verified/active suppliers.
- Use the category groupings above as a lightweight taxonomy to support "recommend me something for X" queries.
- Keep this file in sync with `src/database/seed/004_products.sql` and `src/database/seed/001_suppliers.sql` as the canonical data source; regenerate embeddings when the seed data changes.
