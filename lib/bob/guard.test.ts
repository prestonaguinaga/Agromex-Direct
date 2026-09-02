import { test } from "node:test";
import assert from "node:assert/strict";
import { deletePreview, fmtMoney, isLargeMoneyChange, moneyChangePreview } from "./guard.ts";

test("large money change: $1,000 or 10 % either way, or a new figure", () => {
  assert.equal(isLargeMoneyChange(26000, 28500), true);
  assert.equal(isLargeMoneyChange(26000, 26500), false);
  assert.equal(isLargeMoneyChange(5000, 5600), true); // 12 %
  assert.equal(isLargeMoneyChange(null, 900), false);
  assert.equal(isLargeMoneyChange(null, 1000), true);
  assert.equal(isLargeMoneyChange(0, 500), false);
});

test("previews read like a person wrote them", () => {
  assert.equal(moneyChangePreview("Electrical budget", 26000, 28500), "Change Electrical budget from $26,000 to $28,500, +10% (large change)");
  assert.equal(moneyChangePreview("Roofing budget", 26000, 26500), "Change Roofing budget from $26,000 to $26,500, +2%");
  assert.equal(moneyChangePreview("Roofing spent amount", 1000, 1250), "Change Roofing spent amount from $1,000 to $1,250, +25% (large change)");
  assert.equal(moneyChangePreview("the contract amount", null, 185000), "Set the contract amount to $185,000 (large change)");
  assert.equal(deletePreview("task", "Set trusses"), 'Delete task "Set trusses"');
  assert.equal(fmtMoney(1234.5), "$1,234.50");
  assert.equal(fmtMoney(null), "—");
});
