# Invoice classification — ZATCA only

The app reads invoices locally and saves reviewed fields with a SHA-256 fingerprint. Document contents are data, not instructions. Printed Excel invoices support repeated headings, continuation lines and shipment adjustments.

Only ZATCA's public tariff search is queried. Current leaf records supply HS-code suggestions, percentage duty rates, import status and procedure notes. No SABER or Tabseer requests are made. Source notes may mention those authorities and are displayed verbatim without contacting them.

## Search and matching

The rebuilt engine separates source retrieval (`zatca-client.ts`), product normalization (`product-profile.ts`), ranking and current-duty selection (`tariff-decision.ts`), and orchestration (`classification-engine.ts`). OEM numbers, model years and quantity-unit tags cannot increase match scores. Automotive abbreviations expand into search vocabulary. Supplied materials, function and vehicle class refine the candidates; no local tariff-rate catalog supplies results.

Search starts with a supplied code family or a product category, retrieves broader ZATCA heading context when needed, and uses product-text searches when category retrieval has no candidates. It performs at most four distinct searches per item and three simultaneous source requests. Five-minute caching deduplicates successful source calls; failures are briefly cached to prevent repeated requests during an outage. Failed responses, incomplete records and conflicting effective-date rates do not become zero duty.

Leaf candidates are ranked by product concepts, applicable category and explicit specifications. Contradictions, ties, generic residual headings and missing specifications prevent automatic selection. An exact supplied 12-digit code must exist; it is never silently replaced. Candidate cards show score explanations, rates, requirements and search history. Scores rank text matches, not statistical confidence or customs approval. Reviewers can refine product details and search again, or select an exact current code.

## Meaning of regulated

The display explicitly defines **Regulated / Non-regulated as ZATCA-listed customs controls**, not SABER technical-regulation coverage:

- Prohibited/restricted import statuses take precedence.
- An explicit import permit or conformity requirement is shown as Regulated.
- Non-regulated means no controls listed in the returned record: import permitted, restriction flag 0, and an explicitly empty procedures array.
- Missing, inconsistent or insufficient control data stays Unknown. Empty or absent notes alone never establish non-regulated status. Source notes remain visible for review.

These labels are derived from the returned ZATCA record under this definition. The engine does not claim that ZATCA publishes a SABER regulated/non-regulated field. Human classification review does not constitute clearance or certification approval.

Earlier multi-source results are sanitized on read to hide non-ZATCA evidence. Rechecking replaces them with ZATCA-only results. Historical audit records remain intact.

Duty estimates include invoice adjustments allocated by goods value, with cent reconciliation; the exact formula is displayed. Only a current unambiguous ad-valorem rate without a minimum is calculated. Specific/minimum duties remain for assessment. Prohibited imports do not receive payable-duty or landed-cost estimates. Standalone lookups without a supplied amount return rates, never fabricated fees. Standard VAT estimates use 15% on estimated value plus duty. Amounts remain in invoice currency; customs conversion, exemptions, credit treatment and other charges require review. FASAH submission is disconnected.

Run npm test and npm run build. Coverage includes invoice extraction, adjustment reconciliation, ambiguous matches, outages and a network test that rejects any request outside ZATCA.

Temporary connection failures and retryable HTTP responses receive up to two retries with backoff. Access denials are not retried. The table distinguishes unavailable searches, missing product details and indistinct matches, and offers a retry action for unmatched, unreviewed lines. Existing matches are preserved by that action. Explicit fan blades can match a parts leaf only after ZATCA parent context establishes fan coverage; generic parts captions alone remain insufficient.

Product recognition retains model context before removing model/year tokens from text scoring. `product-identity.ts` interprets bounded Mazda CX SUV and Isuzu D-MAX invoice aliases only alongside automotive product terms, excluding SKU tags, parenthesized identifiers, incompatible products and negative fitment statements. Conflicting model classes require review; supplied vehicle class overrides recognition. These are product inferences, recorded as `productInferences` and `recognizedDetails`, separately from `productDetails` supplied by the user. Manufacturer references document vehicle identity only; runtime tariff queries, rates and controls remain ZATCA-only. Recognition does not establish a binding classification. Model fitment and inferred classifications remain subject to user review.

Body-trim searches with supplied material and body-fitting function can select the source's body-parts residual leaf instead of remaining permanently below the score threshold. A complete bonnet is not substituted for bonnet trim, and a material conflict cannot be overridden by another score bonus. Tests cover these distinctions and confirm that changed source duty rates change calculated fees rather than using rates from the recognition vocabulary.

## HS collection and clearance preparation

The HS library is generated from persisted invoice line items, restricted to engine-v2 ZATCA-only records with confirmed 12-digit codes. It groups codes, deduplicates reuploads using document hash/line/code, shows the most recent stored source snapshot, counts reviewed product observations, and exposes product history and source requirements. Search covers HS code, product, invoice and origin. Filtered CSV exports escape spreadsheet formula prefixes. Library entries are saved invoice observations, not a separate official tariff catalog. Live lookup opens with the selected code and rechecks ZATCA; it does not automatically overwrite invoice classifications.

Clearance preparation lists line-specific missing codes, source dates, unknown duties/controls, import restrictions and outstanding product-scope reviews. Review actions open the existing line-item review flow. A 30-day source reminder is an internal operational default, not a legal validity period. The action list exports as CSV; the full review pack exports as JSON with invoice data, source evidence, requirements and incomplete estimates kept null. These exports neither verify supporting documents nor submit a declaration to FASAH. The existing disconnected submission endpoint remains disconnected.
# Description matching and suggestions

The HS reference is downloaded from https://saber.sa/Assets/Home/hscodes-8-2026.pdf. The app searches a validated index of this official source; `public/references/hscodes-8-2026.pdf` is only its downloaded cache. It no longer imports from the user-provided file. Source links point directly to SABER, with retrieval time and checksum retained. Its indexed English descriptions, page references, listed/replacement/deleted status and SHA-256 are bundled in `src/data/hs-reference.json`. All 391 code occurrences across 45 pages were reconciled against independent PDF text extraction. Run `scripts/index-hs-reference.py` with Python pdfplumber/pypdf to refresh from the fixed official URL; uploads use the last imported index rather than downloading the full PDF for every item. The importer validates coverage before replacing the index; it is intentionally specific to this document's layouts, including its deleted-code continuation at page 25.

The PDF contains multiple dated SASO/SABER notices, including replacement/deleted-code tables. Deleted entries are excluded. Product-name matching searches listed and alternative codes, sends the best candidate family to ZATCA, and displays separate PDF suggestions with page links. PDF candidates never populate confirmed codes, duty rates or customs-control statuses by themselves. `sourceMode: ZATCA_ONLY` describes confirmed tariff facts; `referenceSuggestions` explicitly records the additional discovery source. Existing invoices acquire this evidence through Recheck / Retry unmatched; new uploads use it automatically.

Invoice descriptions are normalized to remove SKU annotations and expand supported abbreviations. Search vocabulary adds alternative English and Arabic product names without supplying tariff codes or rates. Uncertain category results now trigger name searches within the existing four-query limit. Strong, distinct matches remain suggestions requiring product review; ambiguous results keep the HS code and fees unresolved.

Each invoice item offers a dropdown with relevant ZATCA codes, official descriptions and heading context. Selecting a suggestion opens the existing review dialog; applying it rechecks the exact code and recalculates estimates from the source. Excluded and zero-score results are omitted from suggestions. Existing saved items can use Recheck or Retry unmatched to obtain the improved search results.

