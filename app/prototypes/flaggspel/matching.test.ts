/** Runs every case in data/matching-cases.json. `pnpm test` */
import assert from "node:assert/strict";
import { test } from "node:test";

import cases from "./data/matching-cases.json";
import { byCode, COUNTRIES } from "./data";
import { judgeChoices, judgeFree } from "./matching";

type Expect = { result: string; heard?: string; partOf?: string | null };

function country(code: string) {
  const c = byCode(code);
  assert.ok(c, `unknown country ${code}`);
  return c;
}

function check(verdict: Record<string, unknown>, expect: Expect) {
  assert.equal(verdict.result, expect.result);
  if ("heard" in expect) assert.equal(verdict.heard, expect.heard);
  if ("partOf" in expect) assert.equal(verdict.partOf, expect.partOf);
}

for (const c of cases.free as { flag: string; said: string; expect: Expect }[]) {
  test(`free: ${c.flag} ← "${c.said}" → ${c.expect.result}`, () => {
    const v = judgeFree({ all: COUNTRIES, cur: country(c.flag), fin: [c.said], mid: [], canWrong: true });
    check(v, c.expect);
  });
}

for (const c of cases.choices as { options: string[]; flag: string; said: string; expect: Expect }[]) {
  test(`choices [${c.options}]: ${c.flag} ← "${c.said}" → ${c.expect.result}`, () => {
    const v = judgeChoices({
      all: COUNTRIES,
      cur: country(c.flag),
      choices: c.options.map(country),
      fin: [c.said],
      mid: [],
      canWrong: true,
    });
    check(v, c.expect);
  });
}
