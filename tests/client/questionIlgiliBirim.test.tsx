import { describe, expect, it } from "vitest";
import {
  ilgiliBirimMongoPayload,
  normalizeQuestionIlgiliBirim,
  readQuestionIlgiliBirim,
} from "../../src/lib/questionIlgiliBirim";
import type { Question } from "../../src/types";

const baseQuestion = (): Question => ({
  id: "q1",
  templateId: "t1",
  sectorId: "s1",
  kod: "1",
  baslik: "Başlık",
  soru: "Soru",
  ilgiliBirum: "",
  aciklama: "",
  ornekYanit: "",
  raporYeri: "",
  thematicGroup: "",
  isMandatory: false,
  order: 1,
});

describe("questionIlgiliBirim", () => {
  it("reads Mongo ilgiliBirim when UI ilgiliBirum is empty", () => {
    const q = { ...baseQuestion(), ilgiliBirim: "Finans" };
    expect(readQuestionIlgiliBirim(q)).toBe("Finans");
  });

  it("prefers non-empty ilgiliBirim over legacy ilgiliBirum", () => {
    const q = {
      ...baseQuestion(),
      ilgiliBirim: "Sürdürülebilirlik",
      ilgiliBirum: "Eski",
    };
    expect(readQuestionIlgiliBirim(q)).toBe("Sürdürülebilirlik");
  });

  it("normalizes API question for grid display", () => {
    const q = normalizeQuestionIlgiliBirim({
      ...baseQuestion(),
      ilgiliBirim: "İK",
    });
    expect(q.ilgiliBirum).toBe("İK");
    expect(q.ilgiliBirim).toBe("İK");
  });

  it("writes Mongo payload with canonical key", () => {
    expect(ilgiliBirimMongoPayload("  Risk  ")).toEqual({
      ilgiliBirim: "Risk",
    });
  });
});
