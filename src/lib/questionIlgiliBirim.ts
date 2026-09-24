import type { Question } from "../types";

/** Mongo/API canonical key */
export const ILGILI_BIRIM_MONGO_KEY = "ilgiliBirim" as const;

/** Legacy frontend typo — kept for backward compatibility in UI state */
export const ILGILI_BIRIM_UI_KEY = "ilgiliBirum" as const;

type QuestionLike = Pick<Question, "ilgiliBirum"> & {
  ilgiliBirim?: string;
};

export function readQuestionIlgiliBirim(
  q: QuestionLike | Record<string, unknown>,
): string {
  const raw = q as Record<string, unknown>;
  const fromMongo = raw[ILGILI_BIRIM_MONGO_KEY];
  const fromUi = raw[ILGILI_BIRIM_UI_KEY];
  if (typeof fromMongo === "string" && fromMongo.trim()) return fromMongo;
  if (typeof fromUi === "string" && fromUi.trim()) return fromUi;
  return typeof fromMongo === "string"
    ? fromMongo
    : typeof fromUi === "string"
      ? fromUi
      : "";
}

export function ilgiliBirimMongoPayload(value: string): {
  ilgiliBirim: string;
} {
  return { [ILGILI_BIRIM_MONGO_KEY]: value.trim() };
}

/** Normalize API documents so UI always has `ilgiliBirum` populated. */
export function normalizeQuestionIlgiliBirim<T extends Question>(q: T): T {
  const birim = readQuestionIlgiliBirim(q);
  return {
    ...q,
    ilgiliBirum: birim,
    ilgiliBirim: birim,
  };
}
