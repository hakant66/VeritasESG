#!/usr/bin/env python3
"""
Build upsert SQL for sasbsubsectors + nacecodemappings from the two Horizon
reference Excel files, so NACE/SASB auto-matching in SectorClassificationFields
has much fuller coverage.

Source files:
  docs/Sasb alt sektör listesi.xlsx                      -> 77 official SASB sub-sectors
  docs/Sektör Meslek Nace Kodları_2026.03 (1).xlsx        -> 1534 unique Turkish NACE Rev.2.1 codes

sasbsubsectors: upsert all 77, matched to existing ids where possible (exact
labelEn match, or a couple of known near-matches), generating new SICS-style
ids for the rest. Existing rows' sortOrder is left untouched on conflict.

nacecodemappings: upsert all 1534 unique (code -> description) pairs. Each
code's sasbSubSectorId is inferred from its 2-digit NACE division via a
hand-built division->subsector map (standard NACE Rev.2 structure), since the
source file has no direct NACE->SASB link itself. This is a best-effort
*suggestion*, not an authoritative SASB/NACE crosswalk -- flagged as such in
the written report.

Usage (run from repo root, with the Docker Postgres stack up):
  python3 scripts/seed-sasb-nace-from-excel.py
  docker cp /tmp/sasb_nace_upsert.sql <postgres-container>:/tmp/sasb_nace_upsert.sql
  docker compose exec -T postgres psql -U governance -d governance -f /tmp/sasb_nace_upsert.sql

Re-running is safe (upsert, wrapped in a single transaction). The source
Excel files are tracked in this repo under docs/ (same convention as
docs/onceliklendirme-*.xlsx).
"""
import json
import openpyxl

MACRO_NAME_TO_KEY = {
    'Consumer Goods': 'consumer_goods',
    'Extractives & Minerals Processing': 'extractives',
    'Financials': 'financials',
    'Food & Beverage': 'food_beverage',
    'Health Care': 'health_care',
    'Infrastructure': 'infrastructure',
    'Renewable Resources & Alternative Energy': 'renewable_resources',
    'Resource Transformation': 'resource_transformation',
    'Services': 'services',
    'Technology & Communications': 'technology_communications',
    'Transportation': 'transportation',
}

# Existing DB ids keyed by exact labelEn, plus the 2 known near-matches
# (same concept, Excel uses slightly different official wording).
EXISTING_ID_BY_LABEL = {
    'Apparel, Accessories & Footwear': 'CG-AA',
    'Household & Personal Products': 'CG-HP',
    'Coal Operations': 'EM-CO',
    'Oil & Gas – Exploration & Production': 'EM-EP',
    'Metals & Mining': 'EM-MM',
    'Oil & Gas – Refining & Marketing': 'EM-RM',
    'Commercial Banks': 'FN-CB',
    'Insurance': 'FN-IN',
    'Agricultural Products': 'FB-AB',
    'Food Retailers & Distributors': 'FB-FR',
    'Processed Foods': 'FB-PF',
    'Non-Alcoholic Beverages': 'FB-NB',
    'Biotechnology & Pharmaceuticals': 'HC-BP',
    'Health Care Delivery': 'HC-DY',
    'Electric Utilities & Power Generators': 'IF-EU',
    'Real Estate': 'IF-RE',
    'Forestry Management': 'RR-FM',
    'Solar Technology & Project Developers': 'RR-ST',
    'Chemicals': 'RT-CH',
    'Industrial Machinery & Goods': 'RT-IG',       # DB has "Industrial Goods & Machinery" -> relabel
    'Aerospace & Defense': 'RT-AE',
    'Auto Parts': 'RT-AP',
    'Automobiles': 'RT-AV',
    'Education': 'SV-ED',
    'Professional & Commercial Services': 'SV-PS',
    'Hardware': 'TC-HW',                           # DB has "Technology & Communications Hardware" -> relabel
    'Software & IT Services': 'TC-SI',
    'Telecommunication Services': 'TC-TL',
    'Semiconductors': 'TC-SC',
    'Air Freight & Logistics': 'TR-AF',
    'Airlines': 'TR-AL',
    'Car Rental & Leasing': 'TR-CR',
}

# Hand-picked 2-letter abbreviations for the 47 new sub-sectors (id = MACRO_PREFIX + '-' + code).
NEW_ID_ABBR = {
    'Appliance Manufacturing': 'AM',
    'Building Products & Furnishings': 'BF',
    'E-Commerce': 'EC',
    'Multiline and Specialty Retailers & Distributors': 'MR',
    'Toys & Sporting Goods': 'TS',
    'Construction Materials': 'CM',
    'Iron & Steel Producers': 'IS',
    'Oil & Gas – Midstream': 'MD',
    'Oil & Gas – Services': 'SV',
    'Asset Management & Custody Activities': 'AC',
    'Consumer Finance': 'CF',
    'Investment Banking & Brokerage': 'IB',
    'Mortgage Finance': 'MF',
    'Security & Commodity Exchanges': 'SE',
    'Alcoholic Beverages': 'AL',
    'Meat, Poultry & Dairy': 'MP',
    'Restaurants': 'RN',
    'Tobacco': 'TB',
    'Drug Retailers': 'DR',
    'Health Care Distributors': 'HD',
    'Managed Care': 'MC',
    'Medical Equipment & Supplies': 'MS',
    'Engineering & Construction Services': 'EN',
    'Gas Utilities & Distributors': 'GU',
    'Home Builders': 'HB',
    'Real Estate Services': 'RS',
    'Waste Management': 'WM',
    'Water Utilities & Services': 'WU',
    'Biofuels': 'BI',
    'Fuel Cells & Industrial Batteries': 'FC',
    'Pulp & Paper Products': 'PP',
    'Wind Technology & Project Developers': 'WT',
    'Containers & Packaging': 'CP',
    'Electrical & Electronic Equipment': 'EE',
    'Advertising & Marketing': 'AM2',
    'Casinos & Gaming': 'CG2',
    'Hotels & Lodging': 'HL',
    'Leisure Facilities': 'LF',
    'Media & Entertainment': 'ME',
    'Electronic Manufacturing Services & Original Design Manufacturing': 'EM2',
    'Internet Media & Services': 'IM',
    'Cruise Lines': 'CL',
    'Marine Transportation': 'MT',
    'Rail Transportation': 'RT2',
    'Road Transportation': 'RD',
}

MACRO_PREFIX = {
    'consumer_goods': 'CG', 'extractives': 'EM', 'financials': 'FN',
    'food_beverage': 'FB', 'health_care': 'HC', 'infrastructure': 'IF',
    'renewable_resources': 'RR', 'resource_transformation': 'RT',
    'services': 'SV', 'technology_communications': 'TC', 'transportation': 'TR',
}

def sql_str(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

# ---------- 1. SASB sub-sectors ----------
wb1 = openpyxl.load_workbook('docs/Sasb alt sektör listesi.xlsx', data_only=True)
ws1 = wb1['Sayfa1']
rows1 = [r for r in ws1.iter_rows(min_row=4, max_row=80, values_only=True) if r[1]]

subsector_rows = []
counters = {}
for macro_en, label_en, label_tr in rows1:
    macro_key = MACRO_NAME_TO_KEY[macro_en.strip()]
    label_en = label_en.strip()
    label_tr = label_tr.strip()
    if label_en in EXISTING_ID_BY_LABEL:
        sid = EXISTING_ID_BY_LABEL[label_en]
        is_new = False
    else:
        abbr = NEW_ID_ABBR[label_en].rstrip('0123456789')
        prefix = MACRO_PREFIX[macro_key]
        sid = f'{prefix}-{abbr}'
        is_new = True
    counters[macro_key] = counters.get(macro_key, -1) + 1
    subsector_rows.append({
        'id': sid, 'macroId': macro_key, 'labelEn': label_en, 'labelTr': label_tr,
        'sortOrder': counters[macro_key], 'isNew': is_new,
    })

assert len({r['id'] for r in subsector_rows}) == len(subsector_rows), 'duplicate SASB ids generated'
assert len(subsector_rows) == 77

# ---------- 2. NACE division -> SASB sub-sector id ----------
DIVISION_TO_SUBSECTOR = {
    '01': 'FB-AB', '02': 'RR-FM', '03': 'FB-AB',
    '08': 'EM-MM',
    '10': 'FB-PF', '11': 'FB-NB', '12': 'FB-TB',
    '13': 'CG-AA', '14': 'CG-AA', '15': 'CG-AA',
    '16': 'RR-PP', '17': 'RR-PP', '18': 'SV-AM',
    '19': 'EM-RM', '20': 'RT-CH', '21': 'HC-BP', '22': 'RT-CH',
    '23': 'EM-CM', '24': 'EM-MM', '25': 'EM-IS',
    '26': 'TC-HW', '27': 'RT-EE', '28': 'RT-IG', '29': 'RT-AV',
    '30': 'RT-AE', '31': 'CG-BF', '32': 'CG-TS', '33': 'RT-IG',
    '35': 'IF-EU', '36': 'IF-WU', '37': 'IF-WU', '38': 'IF-WM',
    '41': 'IF-HB', '42': 'IF-EN', '43': 'IF-EN',
    '46': 'CG-MR', '47': 'CG-MR',
    '49': 'TR-RD', '50': 'TR-MT', '52': 'TR-AF', '53': 'TR-AF',
    '55': 'SV-HL', '56': 'FB-RN',
    '58': 'SV-ME', '59': 'SV-ME', '60': 'SV-ME', '61': 'TC-TL',
    '62': 'TC-SI', '63': 'TC-SI',
    '68': 'IF-RE', '69': 'SV-PS', '70': 'SV-PS', '71': 'SV-PS',
    '73': 'SV-AM', '74': 'SV-PS',
    '77': 'TR-CR', '78': 'SV-PS', '79': 'SV-HL',
    '80': 'SV-PS', '81': 'SV-PS', '82': 'SV-PS',
    '85': 'SV-ED', '86': 'HC-DY', '87': 'HC-DY', '88': 'HC-DY',
    '90': 'SV-ME', '91': 'SV-LF', '92': 'SV-CG', '93': 'SV-LF',
    '95': 'CG-HP', '96': 'CG-HP',
}

valid_ids = {r['id'] for r in subsector_rows}
for div, sid in DIVISION_TO_SUBSECTOR.items():
    assert sid in valid_ids, f'{div} -> {sid} not a valid subsector id'

wb2 = openpyxl.load_workbook('docs/Sektör Meslek Nace Kodları_2026.03 (1).xlsx', data_only=True)
ws2 = wb2['Sheet0']
rows2 = list(ws2.iter_rows(min_row=2, values_only=True))

nace_by_code = {}
unmapped_divisions = set()
for r in rows2:
    code, desc = r[4], r[5]
    if not code:
        continue
    code = str(code).strip()
    div = code.split('.')[0]
    sid = DIVISION_TO_SUBSECTOR.get(div)
    if not sid:
        unmapped_divisions.add(div)
        continue
    if code not in nace_by_code:
        nace_by_code[code] = {'code': code, 'descriptionTr': desc.strip(), 'sasbSubSectorId': sid}

print(f'-- subsector rows: {len(subsector_rows)} ({sum(1 for r in subsector_rows if r["isNew"])} new)')
print(f'-- nace rows: {len(nace_by_code)} (unmapped divisions skipped: {sorted(unmapped_divisions)})')

# ---------- 3. Emit SQL ----------
with open('/tmp/sasb_nace_upsert.sql', 'w') as f:
    f.write('BEGIN;\n\n')

    f.write('-- SASB sub-sectors\n')
    for r in subsector_rows:
        f.write(
            f'INSERT INTO sasbsubsectors (id, "macroId", "labelEn", "labelTr", "sortOrder", "createdAt", "updatedAt")\n'
            f'VALUES ({sql_str(r["id"])}, {sql_str(r["macroId"])}, {sql_str(r["labelEn"])}, {sql_str(r["labelTr"])}, {r["sortOrder"]}, now(), now())\n'
            f'ON CONFLICT (id) DO UPDATE SET "labelEn" = EXCLUDED."labelEn", "labelTr" = EXCLUDED."labelTr", "macroId" = EXCLUDED."macroId", "updatedAt" = now();\n'
        )

    f.write('\n-- NACE code mappings\n')
    for row in nace_by_code.values():
        nid = 'nace_' + row['code'].replace('.', '')
        f.write(
            f'INSERT INTO nacecodemappings (id, code, "descriptionTr", "descriptionEn", "sasbSubSectorId", "sortOrder", "createdAt", "updatedAt")\n'
            f'VALUES ({sql_str(nid)}, {sql_str(row["code"])}, {sql_str(row["descriptionTr"])}, \'\', {sql_str(row["sasbSubSectorId"])}, 0, now(), now())\n'
            f'ON CONFLICT (code) DO UPDATE SET "descriptionTr" = EXCLUDED."descriptionTr", "sasbSubSectorId" = EXCLUDED."sasbSubSectorId", "updatedAt" = now();\n'
        )

    f.write('\nCOMMIT;\n')

print('Wrote /tmp/sasb_nace_upsert.sql')

# Save a small mapping report for the final summary to the user.
with open('/tmp/sasb_nace_report.json', 'w') as f:
    json.dump({
        'subsector_count': len(subsector_rows),
        'subsector_new_count': sum(1 for r in subsector_rows if r['isNew']),
        'nace_count': len(nace_by_code),
        'unmapped_divisions': sorted(unmapped_divisions),
        'new_subsector_ids': sorted(r['id'] for r in subsector_rows if r['isNew']),
    }, f, indent=2)
