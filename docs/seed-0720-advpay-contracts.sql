-- ── Advocate Pay / SubcontractorHub: final paper in from RevOps, sent to Bryce (7/20) ──

INSERT INTO "AccountNote" ("id", "accountId", "partner", "kind", "body", "createdAt") VALUES
(
  'advpay-orderform-0720',
  'ADVOCATEPAY000001',
  'PrismHR RevOps (Deana''s team)',
  'note',
  'Final contracts in from RevOps 7/20 and sent to Bryce same day. Package: (1) PrismHR Global Order Form + Global Workforce Solutions Terms — Annex A to the 6/1/2026 MSSA, so it rides the existing agreement; (2) optional PEO→SMB template MSA that RevOps says should be handed to Advocate Pay for their SubcontractorHub paper (courtesy template, their counsel reviews). Order form terms: 12 EOR EEs Bulgaria (Tier 2) @ $385 PEPM wholesale = $4,620/mo; one-time $200/EE background checks + $500/EE setup = $8,400; refundable EOR deposit WAIVED on the face of the form (as committed); severance accrual deposit 8.33% of TEC monthly; start date = signature date; quote expires 7/31/2026; payment due on receipt. Pricing schedule incl. recommended Tier 2 markup $165 (→ $550 retail suggestion for their side). RECONCILE: 7/15 card carried ~$495/EE/mo (≈$71K/yr) — order form is $385 PEPM + one-times; square with what was quoted 7/8 before Bryce asks.',
  '2026-07-20 14:00:00'
)
ON CONFLICT ("id") DO NOTHING;

-- Deal card: decision-stage picture per the 7/20 send.
UPDATE "DashCard" SET
  "notes" = jsonb_set(
    COALESCE("notes", '{}'::jsonb),
    '{decision}',
    to_jsonb('Final paper sent to Bryce 7/20: Order Form + Global terms (Annex A to the existing MSSA) plus the optional SMB template for the SubcontractorHub agreement. Deposit waiver is on the face of the order form. Ask made on timing: signature this week — quote expires 7/31 and August first payroll needs runway. Awaiting Bryce on signature timing / redlines.'::text)
  ),
  "dealSize" = '12 Bulgaria EEs · $4,620/mo ($385 PEPM) + $8,400 one-time · deposit waived · quote exp 7/31',
  "updatedAt" = NOW()
WHERE "id" = 'seed-card-advocatepay';
