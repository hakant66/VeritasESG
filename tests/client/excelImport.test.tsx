import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  autoMapExcelHeaders,
  detectExcelImportMode,
  findExcelHeader,
  getExcelImportFieldDefs,
  mergeImportHeaderOptions,
  parseQuestionSetExcel,
  questionToExcelRow,
  TEMPLATE_QUESTION_EXCEL_HEADERS,
  TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER,
} from "../../src/services/excel";
import type { Question } from "../../src/types";

const TSRS_HEADERS = [
  "BÖLÜM",
  "KOD",
  "BAŞLIK",
  "SORU",
  "FİRMA_YANITI",
  "FİRMA_YANITI_YIL1",
  "FİRMA_YANITI_YIL2",
  "FİRMA_YANITI_YIL3",
  "İLGİLİ_BİRİM",
  "VERİ_DOĞRULAMA",
  "SORU AÇIKLAMA",
  "ÖRNEK_YANIT",
  "DAYANAK",
  "ONAY",
  "RAPOR_YERİ",
  "REPORTING_ITR",
  "ATANAN SAYFA",
  "KAYIT",
  "TSRS 1",
  "TSRS 2",
  "SASB_RT-CH",
  "GRI",
  "MSCI",
  "ESRS",
];

describe("excel import mapping", () => {
  it("uses canonical TSRS column headers", () => {
    expect(TEMPLATE_QUESTION_EXCEL_HEADERS).toEqual(TSRS_HEADERS);
  });

  it("auto-maps all TSRS1 column headers", () => {
    const mapped = autoMapExcelHeaders(TSRS_HEADERS);
    expect(mapped.bolumField).toBe("BÖLÜM");
    expect(mapped.kodField).toBe("KOD");
    expect(mapped.baslikField).toBe("BAŞLIK");
    expect(mapped.soruField).toBe("SORU");
    expect(mapped.firmaYanitiField).toBe("FİRMA_YANITI");
    expect(mapped.birimField).toBe("İLGİLİ_BİRİM");
    expect(mapped.veriDogruluguField).toBe("VERİ_DOĞRULAMA");
    expect(mapped.aciklamaField).toBe("SORU AÇIKLAMA");
    expect(mapped.ornekField).toBe("ÖRNEK_YANIT");
    expect(mapped.dayanakField).toBe("DAYANAK");
    expect(mapped.onayField).toBe("ONAY");
    expect(mapped.raporField).toBe("RAPOR_YERİ");
    expect(mapped.reportingItrField).toBe("REPORTING_ITR");
    expect(mapped.tsrs1Field).toBe("TSRS 1");
    expect(mapped.tsrs2Field).toBe("TSRS 2");
    expect(mapped.sasbRtChField).toBe("SASB_RT-CH");
    expect(mapped.griField).toBe("GRI");
    expect(mapped.msciField).toBe("MSCI");
    expect(mapped.esrsField).toBe("ESRS");
    expect(mapped.atananSayfaField).toBe("ATANAN SAYFA");
    expect(mapped.kayitField).toBe("KAYIT");
    expect(mapped.numaraField).toBe("");
  });

  it("auto-maps NUMARA column when present", () => {
    const mapped = autoMapExcelHeaders(["NUMARA", ...TSRS_HEADERS]);
    expect(mapped.numaraField).toBe("NUMARA");
    expect(mapped.kodField).toBe("KOD");
  });

  it("merges canonical headers missing from spreadsheet (e.g. ESRS)", () => {
    const kimyaGenelBeyanlarHeaders = [
      "BÖLÜM",
      "KOD",
      "BAŞLIK",
      "SORU",
      "FİRMA YANITI",
      "İLGİLİ BİRİM",
      "VERİ DOĞRULUĞU",
      "SORU AÇIKLAMA",
      "ÖRNEK YANIT",
      "DAYANAK",
      "ONAY",
      "RAPOR YERİ",
      "REPORTING ITR",
      "ATANAN SAYFA",
      "KAYIT",
      "TSRS 1",
      "TSRS 2",
      "SASB RT-CH",
      "GRI",
      "MSCI\n(Specialty Chemicals)",
    ];
    const merged = mergeImportHeaderOptions(kimyaGenelBeyanlarHeaders);
    expect(merged).toContain("ESRS");
    expect(merged.indexOf("ESRS")).toBeGreaterThan(
      merged.indexOf("MSCI (Specialty Chemicals)"),
    );
  });

  it("auto-maps MSCI header with parenthetical subtitle", () => {
    const mapped = autoMapExcelHeaders([
      ...TSRS_HEADERS.slice(0, TSRS_HEADERS.indexOf("MSCI")),
      "MSCI\n(Specialty Chemicals)",
      "ESRS",
    ]);
    expect(mapped.msciField).toBe("MSCI\n(Specialty Chemicals)");
  });

  it("findExcelHeader matches Turkish headers case-insensitively", () => {
    expect(findExcelHeader(["bölüm", "KOD"], ["BÖLÜM", "BOLUM"])).toBe("bölüm");
  });

  it("detects sayısal import mode from Kimya sector numerical headers", () => {
    const sayisalHeaders = [
      "NUMARA",
      "BÖLÜM",
      "KOD",
      "BAŞLIK",
      "BİRİM",
      "FİRMA_YANITI_YIL1",
      "FİRMA_YANITI_YIL2",
      "FİRMA_YANITI_YIL3",
      "FİRMA_NOT",
      "İLGİLİ_BİRİM",
    ];
    expect(detectExcelImportMode(sayisalHeaders)).toBe("sayisal");
    const mapped = autoMapExcelHeaders(sayisalHeaders);
    expect(mapped.soruField).toBe("");
    expect(mapped.firmaYanitiField).toBe("");
    expect(mapped.unitField).toBe("BİRİM");
    expect(mapped.firmaYanitiYil1Field).toBe("FİRMA_YANITI_YIL1");
    expect(mapped.firmaNotField).toBe("FİRMA_NOT");
    expect(mapped.birimField).toBe("İLGİLİ_BİRİM");
    const fieldKeys = getExcelImportFieldDefs("sayisal").map((f) => f.key);
    expect(fieldKeys).toContain("firmaYanitiYil1Field");
    expect(fieldKeys).toContain("firmaNotField");
    expect(fieldKeys).not.toContain("soruField");
    expect(fieldKeys).not.toContain("firmaYanitiField");
  });

  it("detects sözel import mode from Kimya sector verbal headers", () => {
    const sozelHeaders = [
      "NUMARA",
      "BÖLÜM",
      "KOD",
      "BAŞLIK",
      "SORU",
      "FİRMA_YANITI",
      "İLGİLİ_BİRİM",
    ];
    expect(detectExcelImportMode(sozelHeaders)).toBe("sozel");
    const fieldKeys = getExcelImportFieldDefs("sozel").map((f) => f.key);
    expect(fieldKeys).toContain("soruField");
    expect(fieldKeys).toContain("firmaYanitiField");
    expect(fieldKeys).not.toContain("firmaYanitiYil1Field");
  });

  it("auto-maps legacy combined header names from older spreadsheets", () => {
    const legacyHeaders = [
      "BÖLÜM",
      "KOD",
      "BAŞLIK",
      "SORU",
      "FİRMA YANITI",
      "İLGİLİ BİRİM",
      "VERİ DOĞRULUĞU AÇIKLAMA",
      "ÖRNEK YANIT",
      "DAYANAK",
      "FİRMA AÇIKLAMA",
      "ONAY",
    ];
    const mapped = autoMapExcelHeaders(legacyHeaders);
    expect(mapped.veriDogruluguField).toBe("VERİ DOĞRULUĞU AÇIKLAMA");
    expect(mapped.aciklamaField).toBe("FİRMA AÇIKLAMA");
    expect(mapped.firmaYanitiField).toBe("FİRMA YANITI");
    expect(mapped.birimField).toBe("İLGİLİ BİRİM");
    expect(mapped.ornekField).toBe("ÖRNEK YANIT");
  });
});

describe("parseQuestionSetExcel", () => {
  it("parses all mapped spreadsheet fields", async () => {
    const rows = [
      TSRS_HEADERS,
      [
        1,
        "T1-KK-01",
        "Şirket Kimliği",
        "Şirketinizin yasal tam unvanı nedir?",
        "Firma cevabı",
        "1200",
        "1100",
        "1000",
        "Hukuk / Finans",
        "Doğrulama notu",
        "Soru açıklaması",
        "Örn: ABC A.Ş.",
        "BÖLÜM 1 — KURUMSAL KİMLİK (TSRS 1, Par. 5)",
        "Onaylandı",
        "TSRS 1 Bölüm 1",
        "ITR-01",
        "Sayfa A",
        "",
        "TSRS1-5",
        "TSRS2-3",
        "RT-CH-1",
        "GRI-305",
        "MSCI-E1",
        "ESRS-E1",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TSRS 1 Soru Seti");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new File([buffer], "fixture.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const mapping = autoMapExcelHeaders(TSRS_HEADERS);
    const parsed = await parseQuestionSetExcel(
      file,
      "template-1",
      "sector-1",
      mapping,
      "TSRS 1 Soru Seti",
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      bolum: "1",
      kod: "T1-KK-01",
      firmaYaniti: "Firma cevabı",
      firmaYanitiYil1: "1200",
      firmaYanitiYil2: "1100",
      firmaYanitiYil3: "1000",
      ilgiliBirim: "Hukuk / Finans",
      veriDogrulugu: "Doğrulama notu",
      aciklama: "Soru açıklaması",
      dayanak: "BÖLÜM 1 — KURUMSAL KİMLİK (TSRS 1, Par. 5)",
      onay: "Onaylandı",
      raporYeri: "TSRS 1 Bölüm 1",
      reportingItr: "ITR-01",
      atananSayfaTitle: "Sayfa A",
      tsrs1: "TSRS1-5",
      tsrs2: "TSRS2-3",
      sasbRtCh: "RT-CH-1",
      gri: "GRI-305",
      msci: "MSCI-E1",
      esrs: "ESRS-E1",
    });
    expect(parsed[0].kayit).toBeUndefined();
  });

  it("parses NUMARA when the column is present", async () => {
    const headers = ["NUMARA", ...TSRS_HEADERS];
    const rows = [
      headers,
      [
        7,
        "1",
        "GRI 2-1",
        "ŞİRKET HAKKINDA",
        "Şirketin adı?",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Genel Beyanlar");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new File([buffer], "numara.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const mapping = autoMapExcelHeaders(headers);
    const parsed = await parseQuestionSetExcel(
      file,
      "template-1",
      "sector-1",
      mapping,
      "Genel Beyanlar",
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      numara: 7,
      kod: "GRI 2-1",
      thematicGroup: "Genel Beyanlar",
    });
  });

  it("parses sayısal spreadsheets without SORU column", async () => {
    const headers = [
      "NUMARA",
      "BÖLÜM",
      "KOD",
      "BAŞLIK",
      "BİRİM",
      "FİRMA_YANITI_YIL1",
      "FİRMA_YANITI_YIL2",
      "FİRMA_YANITI_YIL3",
      "FİRMA_NOT",
      "İLGİLİ_BİRİM",
    ];
    const rows = [
      headers,
      [
        1,
        "Ekonomik",
        "E-01",
        "Net satışlar",
        "EUR",
        "1200",
        "1100",
        "1000",
        "Yıl bazlı not",
        "Finans",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ekonomik");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new File([buffer], "sayisal.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const mapping = autoMapExcelHeaders(headers);
    const parsed = await parseQuestionSetExcel(
      file,
      "template-1",
      "sector-1",
      mapping,
      "Ekonomik",
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      kod: "E-01",
      baslik: "Net satışlar",
      soru: "Net satışlar (EUR)",
      firmaYanitiYil1: "1200",
      firmaYanitiYil2: "1100",
      firmaYanitiYil3: "1000",
      firmaNot: "Yıl bazlı not",
      ilgiliBirim: "Finans",
      firmaYaniti: "",
    });
  });
});

describe("questionToExcelRow", () => {
  it("exports rows in canonical column order", () => {
    const q = {
      id: "1",
      templateId: "t",
      sectorId: "s",
      kod: "T1",
      baslik: "B",
      soru: "S",
      ilgiliBirum: "Finans",
      ilgiliBirim: "Finans",
      aciklama: "A",
      ornekYanit: "O",
      raporYeri: "R",
      thematicGroup: "G",
      isMandatory: false,
      order: 0,
      bolum: "1",
      firmaYaniti: "FY",
      veriDogrulugu: "VD",
      dayanak: "D",
      onay: "OK",
      reportingItr: "ITR",
      tsrs1: "T1",
      tsrs2: "T2",
      sasbRtCh: "SASB",
      gri: "GRI",
      msci: "MSCI",
      esrs: "ESRS",
      kayit: "Kayıt",
      numara: 3,
      pageId: "page-1",
    } satisfies Question;

    const row = questionToExcelRow(q, "Sayfa 1");
    expect(Object.keys(row)).toEqual([
      TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER,
      ...TEMPLATE_QUESTION_EXCEL_HEADERS,
    ]);
    expect(row[TEMPLATE_QUESTION_EXCEL_NUMARA_HEADER]).toBe("3");
    expect(row["FİRMA_YANITI"]).toBe("FY");
    expect(row["VERİ_DOĞRULAMA"]).toBe("VD");
    expect(row["SORU AÇIKLAMA"]).toBe("A");
    expect(row["REPORTING_ITR"]).toBe("ITR");
    expect(row["ATANAN SAYFA"]).toBe("Sayfa 1");
    expect(row["KAYIT"]).toBe("Kayıt");
    expect(row["TSRS 1"]).toBe("T1");
    expect(row["TSRS 2"]).toBe("T2");
    expect(row["SASB_RT-CH"]).toBe("SASB");
    expect(row["GRI"]).toBe("GRI");
    expect(row["MSCI"]).toBe("MSCI");
    expect(row["ESRS"]).toBe("ESRS");
  });
});
