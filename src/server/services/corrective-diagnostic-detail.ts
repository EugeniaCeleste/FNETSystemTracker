import type { Prisma } from "@prisma/client";
import type { CorrectiveAssignedPersonnelDiagnostic, CorrectiveAttributeDiagnostic, CorrectiveDiagnosticDetailData, CorrectiveDiagnosticSample, CorrectiveDiagnosticStructure, CorrectiveRawDataDiagnostic, CorrectiveRawFieldDiagnostic, CorrectiveRawFieldInspection, CorrectiveTypeFieldAssessment } from "@/contracts";
import { getPrismaClient } from "@/server/prisma";

type CorrectiveDiagnosticRow = {
  atributos: string | null;
  raw_data: Prisma.JsonValue;
};

type RawRecord = Record<string, unknown>;

type RawFieldTarget = {
  field: string;
  aliases: string[];
};

const inspectedRawFields: RawFieldTarget[] = [
  { field: "Personal asignado", aliases: ["Personal asignado", "Personal asignado(s)", "Personal"] },
  { field: "Asignado a rol", aliases: ["Asignado a rol", "Asignado rol"] },
  { field: "Responsables de sitios afectados", aliases: ["Responsables de sitios afectados", "Responsables sitios afectados"] },
  { field: "Plantilla de tarea", aliases: ["Plantilla de tarea", "Plantilla tarea"] },
  { field: "Tipo de tarea", aliases: ["Tipo de tarea", "Tipo tarea"] },
  { field: "Descripción de la tarea", aliases: ["Descripción de la tarea", "Descripcion de la tarea", "Descripción tarea", "Descripcion tarea"] },
  { field: "Prioridad", aliases: ["Prioridad"] },
  { field: "Campos adicionales", aliases: ["Campos adicionales", "Campo adicionales", "Campos adicional"] },
  { field: "Proyecto", aliases: ["Proyecto"] },
  { field: "Sub proyecto", aliases: ["Sub proyecto", "Subproyecto"] },
  { field: "Workflow", aliases: ["Workflow", "Flujo de trabajo"] },
  { field: "Tarea padre", aliases: ["Tarea padre", "Tarea principal"] },
  { field: "Nombre de elemento de red", aliases: ["Nombre de elemento de red", "Nombre elemento de red"] },
  { field: "Códigos adicionales", aliases: ["Códigos adicionales", "Codigos adicionales", "Código adicional", "Codigo adicional"] },
  { field: "Comentarios del estado", aliases: ["Comentarios del estado", "Comentario del estado"] },
  { field: "Estado de aceptación", aliases: ["Estado de aceptación", "Estado de aceptacion"] },
  { field: "Sitios de elemento de red", aliases: ["Sitios de elemento de red", "Sitios elemento de red"] },
];

const rawDiagnosticTerms: Record<string, RegExp> = {
  AA: /\bAA\b/,
  AIRE: /\bAIRE\b/,
  AIRE_ACONDICIONADO: /AIRE\s+ACONDICIONADO/,
  CLIMATIZACION: /CLIMATIZACION/,
  GE: /\bGE\b/,
  GRUPO_ELECTROGENO: /GRUPO\s+ELECTROGENO/,
  GENERADOR: /GENERADOR/,
  ALTURA: /ALTURA/,
  TORRE: /TORRE/,
  COTA: /\bCOTA\b/,
  ENERGIA: /ENERGIA/,
  ENTORNO: /ENTORNO/,
};

const deterministicCategories: Record<string, RegExp[]> = {
  AA: [rawDiagnosticTerms.AA, rawDiagnosticTerms.AIRE, rawDiagnosticTerms.AIRE_ACONDICIONADO, rawDiagnosticTerms.CLIMATIZACION],
  GE: [rawDiagnosticTerms.GE, rawDiagnosticTerms.GRUPO_ELECTROGENO, rawDiagnosticTerms.GENERADOR],
  ALTURA: [rawDiagnosticTerms.ALTURA],
  COTA_0: [/\bCOTA\s*0\b/],
};

const structures: CorrectiveDiagnosticStructure[] = ["JSON", "JSON_COMILLAS_SIMPLES", "CLAVE_VALOR_DOS_PUNTOS", "CLAVE_VALOR_IGUAL", "SEPARADO_POR_PUNTO_Y_COMA", "SEPARADO_POR_BARRA_VERTICAL", "SEPARADO_POR_COMAS", "TEXTO_PLANO", "HTML", "OTRA"];
const normalizedCorrectiveColumns = [
  "id", "codigo", "codigo_remoto", "nombre", "descripcion", "plantilla", "proyecto", "tarea", "estado", "cliente", "elemento_red",
  "codigos_sitios_afectados", "nombres_sitios_afectados", "atributos", "solicitado_por", "contratista_asignado", "usuarios_responsables_proveedor",
  "asignado_a", "usuario_colaborador", "revisado_por", "notas", "fecha_plan", "creado_el", "abierto_el", "en_proceso_el", "en_revision_el",
  "enviado_el", "rechazado_el", "comentarios_rechazo", "tipo_rechazo", "cantidad_rechazos", "respuestas_rechazadas", "cancelado_el",
  "comentarios_cancelacion", "aprobado_con_pendientes_el", "aprobado_con_pendientes_por", "aprobado_el", "comentarios_aprobacion", "aprobado_por",
  "enlace", "sytex_tipo", "sytex_proyecto_id", "sincronizado_el", "raw_data", "creado_bd", "actualizado_bd",
];

const relevantTerms: Record<string, RegExp> = {
  tecnico: /t[eé]cnico|tecnico/i,
  responsable: /responsable/i,
  asignado: /asignad/i,
  colaborador: /colaborador/i,
  usuario: /usuario/i,
  proveedor: /proveedor/i,
  AA: /\bAA\b|aire|climatiz/i,
  GE: /\bGE\b|grupo\s+electr[oó]geno|generador/i,
  ALTURA: /altura/i,
  TORRE: /torre/i,
  COTA: /cota/i,
  ENERGIA: /energ[ií]a/i,
  ENTORNO: /entorno/i,
};

function emptyStructureCounts(): Record<CorrectiveDiagnosticStructure, number> {
  return Object.fromEntries(structures.map((structure) => [structure, 0])) as Record<CorrectiveDiagnosticStructure, number>;
}

function normalizeKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function labelMatches(value: string): Array<{ label: string; separator: string }> {
  const matches: Array<{ label: string; separator: string }> = [];
  const pattern = /(?:^|[|,;{\n])\s*["'`]?([^:=|,;{}\n]{2,100})["'`]?\s*([:=])/g;
  for (const match of value.matchAll(pattern)) {
    const label = match[1].trim().replace(/["'`]/g, "");
    if (label && !/@/.test(label)) matches.push({ label, separator: match[2] });
  }
  return matches;
}

export function classifyAttributeStructure(value: string): CorrectiveDiagnosticStructure {
  const text = value.trim();
  if (!text) return "TEXTO_PLANO";
  if (/^<[^>]+[\s\S]*<\/[^>]+>/.test(text)) return "HTML";
  try {
    JSON.parse(text);
    return "JSON";
  } catch {
    // Continue with non-JSON representations used by external systems.
  }
  if (/^\s*[\[{]/.test(text) && /['"][^'"]+['"]\s*:/.test(text)) return "JSON_COMILLAS_SIMPLES";
  const labels = labelMatches(text);
  if (labels.some((label) => label.separator === ":")) return "CLAVE_VALOR_DOS_PUNTOS";
  if (labels.some((label) => label.separator === "=")) return "CLAVE_VALOR_IGUAL";
  if (text.includes(";")) return "SEPARADO_POR_PUNTO_Y_COMA";
  if (text.includes("|")) return "SEPARADO_POR_BARRA_VERTICAL";
  if (text.includes(",")) return "SEPARADO_POR_COMAS";
  if (/^[\w\s./_-]+$/.test(text)) return "TEXTO_PLANO";
  return "OTRA";
}

function sanitizeAttribute(value: string): string {
  let sanitized = value.slice(0, 320);
  sanitized = sanitized.replace(/\b[^\s@|;,{}]+@[^\s@|;,{}]+\b/g, "[EMAIL]");
  sanitized = sanitized.replace(/https?:\/\/[^\s|;,}]+/gi, "[URL]");
  sanitized = sanitized.replace(/((?:nombre|name|persona|responsable|t[eé]cnico|tecnico|usuario|asignad|colaborador)\s*[:=]\s*)([^|;,\n]+)/gi, "$1[PERSONA]");
  sanitized = sanitized.replace(/([:=]\s*)("[^"]*"|'[^']*'|[^|;,}\n]{1,100})/g, "$1[VALOR]");
  return sanitized.replace(/\b\d{4,}\b/g, "[NUMERO]");
}

function sanitizeRawValue(value: unknown, key = "", depth = 0): unknown {
  if (depth > 2) return "[ANIDADO]";
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return { tipo: "ARRAY", cantidad: value.length, ejemplo: value.slice(0, 3).map((item) => sanitizeRawValue(item, key, depth + 1)) };
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 30).map(([childKey, child]) => [childKey, sanitizeRawValue(child, childKey, depth + 1)]));
  }
  if (typeof value === "string") {
    if (/https?:\/\//i.test(value)) return "[URL]";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "[EMAIL]";
    if (/nombre|name|persona|responsable|t[eé]cnico|tecnico|usuario|asignad|colaborador|proveedor/i.test(key)) return "[PERSONA]";
    return "[VALOR]";
  }
  if (typeof value === "number") return "[NUMERO]";
  if (typeof value === "boolean") return "[BOOLEANO]";
  return "[VALOR]";
}

function rawType(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isRawRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEmptyRawValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  if (isRawRecord(value)) return Object.keys(value).length === 0;
  return false;
}

function structuredValue(value: unknown): unknown {
  if (Array.isArray(value) || isRawRecord(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) || isRawRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function searchableRawValue(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function matchingDeterministicCategories(value: unknown): string[] {
  const text = searchableRawValue(value);
  return Object.entries(deterministicCategories).filter(([, patterns]) => patterns.some((pattern) => pattern.test(text))).map(([category]) => category);
}

function rawFieldStructure(value: unknown): string {
  if (isEmptyRawValue(value)) return "VACIO";
  if (Array.isArray(value)) return "ARRAY";
  if (isRawRecord(value)) return "OBJETO";
  if (typeof value === "string") {
    const text = value.trim();
    if (/^<[^>]+[\s\S]*<\/[^>]+>/.test(text)) return "HTML";
    const parsed = structuredValue(value);
    if (Array.isArray(parsed)) return "JSON_ARRAY";
    if (isRawRecord(parsed)) return "JSON_OBJETO";
    return "TEXTO";
  }
  if (typeof value === "number") return "NUMERO";
  if (typeof value === "boolean") return "BOOLEANO";
  return "OTRA";
}

function inspectionValueKey(value: unknown): string {
  try {
    return `${rawType(value)}:${JSON.stringify(value)}`;
  } catch {
    return `${rawType(value)}:${String(value)}`;
  }
}

function sanitizeInspectionValue(value: unknown, key = "", depth = 0): unknown {
  if (depth > 2) return "[ANIDADO]";
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return { tipo: "ARRAY", cantidad: value.length, valores: value.slice(0, 10).map((item) => sanitizeInspectionValue(item, key, depth + 1)) };
  if (isRawRecord(value)) return Object.fromEntries(Object.entries(value).slice(0, 30).map(([childKey, child]) => [childKey, sanitizeInspectionValue(child, childKey, depth + 1)]));
  if (typeof value === "string") {
    if (/token|secret|password|api[_-]?key|authorization|credential/i.test(key)) return "[SECRETO]";
    return value
      .slice(0, 500)
      .replace(/https?:\/\/[^\s|;,}]+/gi, "[URL]")
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[TOKEN]");
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  return "[VALOR]";
}

function rawObject(rawData: Prisma.JsonValue): RawRecord | null {
  return isRawRecord(rawData) ? rawData : null;
}

function valuesForTarget(record: RawRecord | null, target: RawFieldTarget): Array<{ key: string; value: unknown }> {
  if (!record) return [];
  const aliases = new Set(target.aliases.map(normalizeKey));
  return Object.entries(record).filter(([key]) => aliases.has(normalizeKey(key))).map(([key, value]) => ({ key, value }));
}

function selectedTargetValue(record: RawRecord | null, target: RawFieldTarget): { key: string; value: unknown } | null {
  const matches = valuesForTarget(record, target);
  return matches.find((match) => !isEmptyRawValue(match.value)) ?? matches[0] ?? null;
}

function collectStructuredKeys(value: unknown, counts: Map<string, number>): void {
  const structured = structuredValue(value);
  if (Array.isArray(structured)) {
    structured.slice(0, 30).forEach((item) => collectStructuredKeys(item, counts));
    return;
  }
  if (!isRawRecord(structured)) return;
  for (const key of Object.keys(structured)) counts.set(key, (counts.get(key) ?? 0) + 1);
}

function personnelCount(value: unknown): { count: number; format: string; separators: string[] } {
  if (isEmptyRawValue(value)) return { count: 0, format: "VACIO", separators: [] };
  if (Array.isArray(value)) return { count: value.length, format: "JSON_ARRAY", separators: ["json_array"] };
  if (isRawRecord(value)) return { count: 1, format: "OBJETO", separators: [] };
  if (typeof value !== "string") return { count: 1, format: rawType(value).toUpperCase(), separators: [] };
  const text = value.trim();
  const parsed = structuredValue(text);
  if (Array.isArray(parsed)) return { count: parsed.length, format: "JSON_ARRAY", separators: ["json_array"] };
  const separators: string[] = [];
  if (text.includes(",")) separators.push("coma");
  if (text.includes(";")) separators.push("punto_y_coma");
  if (text.includes("|")) separators.push("barra_vertical");
  if (/\r?\n/.test(text)) separators.push("salto_de_linea");
  const parts = text.split(/[,;|\r\n]/).map((part) => part.trim()).filter(Boolean);
  const emails = text.match(/[^\s,;|\r\n@]+@[^\s,;|\r\n@]+/g) ?? [];
  if (emails.length > 1) {
    separators.push("emails_separados");
    return { count: emails.length, format: "EMAILS_SEPARADOS", separators: [...new Set(separators)] };
  }
  if (parts.length > 1) {
    separators.push("nombres_separados");
    return { count: parts.length, format: "TEXTO_SEPARADO", separators: [...new Set(separators)] };
  }
  return { count: 1, format: "TEXTO_UNICO", separators };
}

function analyzePersonnel(values: Array<unknown>): CorrectiveAssignedPersonnelDiagnostic {
  const counts = { withoutPersonnel: 0, onePerson: 0, twoPeople: 0, moreThanTwoPeople: 0 };
  const separatorCounts: Record<string, number> = {};
  const samples: CorrectiveAssignedPersonnelDiagnostic["samples"] = [];
  for (const value of values) {
    const result = personnelCount(value);
    if (result.count === 0) counts.withoutPersonnel += 1;
    else if (result.count === 1) counts.onePerson += 1;
    else if (result.count === 2) counts.twoPeople += 1;
    else counts.moreThanTwoPeople += 1;
    for (const separator of result.separators) separatorCounts[separator] = (separatorCounts[separator] ?? 0) + 1;
    if (samples.length < 10 && result.count > 0) samples.push({ value: sanitizeInspectionValue(value), javascriptType: rawType(value), peopleCount: result.count, format: result.format });
  }
  return { ...counts, separatorCounts, samples };
}

function analyzeRawFieldInspection(rows: CorrectiveDiagnosticRow[]): CorrectiveRawFieldInspection {
  const fields: CorrectiveRawFieldDiagnostic[] = [];
  let personnelValues: unknown[] = [];
  for (const target of inspectedRawFields) {
    const matchedKeys = new Set<string>();
    const typeCounts: Record<string, number> = {};
    const structureCounts: Record<string, number> = {};
    const values = new Map<string, { value: unknown; occurrences: number }>();
    const structuredKeys = new Map<string, number>();
    const structuredExamples: unknown[] = [];
    const samples: CorrectiveRawFieldDiagnostic["samples"] = [];
    const keywordMatches = Object.fromEntries(Object.keys(rawDiagnosticTerms).map((term) => [term, 0]));
    const categoryMatchesByValue = new Map<string, string[]>();
    let withValueCount = 0;
    for (const row of rows) {
      const match = selectedTargetValue(rawObject(row.raw_data), target);
      const value = match?.value;
      if (match) matchedKeys.add(match.key);
      const structure = rawFieldStructure(value);
      structureCounts[structure] = (structureCounts[structure] ?? 0) + 1;
      if (isEmptyRawValue(value)) continue;
      withValueCount += 1;
      typeCounts[rawType(value)] = (typeCounts[rawType(value)] ?? 0) + 1;
      const valueKey = inspectionValueKey(value);
      const current = values.get(valueKey) ?? { value, occurrences: 0 };
      current.occurrences += 1;
      values.set(valueKey, current);
      const searchText = searchableRawValue(value);
      for (const [term, pattern] of Object.entries(rawDiagnosticTerms)) if (pattern.test(searchText)) keywordMatches[term] += 1;
      categoryMatchesByValue.set(valueKey, matchingDeterministicCategories(value));
      if (samples.length < 10) samples.push({ value: sanitizeInspectionValue(value, target.field), javascriptType: rawType(value), structure });
      const structured = structuredValue(value);
      if (structured && structuredExamples.length < 5) structuredExamples.push(sanitizeInspectionValue(structured, target.field));
      collectStructuredKeys(value, structuredKeys);
    }
    if (target.field === "Personal asignado") personnelValues = rows.map((row) => selectedTargetValue(rawObject(row.raw_data), target)?.value);
    const categoryMatchCounts = Object.fromEntries(Object.keys(deterministicCategories).map((category) => [category, 0]));
    let valuesWithExactlyOneCategory = 0;
    let valuesWithoutCategory = 0;
    let valuesWithMultipleCategories = 0;
    for (const [valueKey, entry] of values) {
      const categories = categoryMatchesByValue.get(valueKey) ?? [];
      if (categories.length === 1) valuesWithExactlyOneCategory += 1;
      else if (categories.length === 0) valuesWithoutCategory += 1;
      else valuesWithMultipleCategories += 1;
      for (const category of categories) categoryMatchCounts[category] += entry.occurrences;
    }
    const classificationAssessment: CorrectiveTypeFieldAssessment = {
      field: target.field,
      nonEmptyDistinctValues: values.size,
      valuesWithExactlyOneCategory,
      valuesWithoutCategory,
      valuesWithMultipleCategories,
      categoryMatchCounts,
      deterministicCandidate: values.size > 0 && valuesWithExactlyOneCategory === values.size,
    };
    fields.push({
      field: target.field,
      matchedKeys: [...matchedKeys].sort(),
      withValueCount,
      emptyOrNullCount: rows.length - withValueCount,
      javascriptTypeCounts: typeCounts,
      distinctValueCount: values.size,
      topValues: [...values.values()].sort((left, right) => right.occurrences - left.occurrences).slice(0, 30).map((entry) => ({ value: sanitizeInspectionValue(entry.value, target.field), occurrences: entry.occurrences })),
      samples,
      structureCounts,
      structuredKeys: [...structuredKeys.entries()].sort(([, left], [, right]) => right - left).slice(0, 30).map(([key, occurrences]) => ({ key, occurrences })),
      structuredExamples,
      keywordMatches,
      classificationAssessment,
    });
  }
  return { fields, personalAsignado: analyzePersonnel(personnelValues), deterministicClassificationCandidates: fields.filter((field) => field.classificationAssessment.deterministicCandidate).map((field) => field.field) };
}

function analyzeAttributes(rows: CorrectiveDiagnosticRow[]): CorrectiveAttributeDiagnostic {
  const nonEmpty = rows.map((row) => row.atributos?.trim() ?? "").filter(Boolean);
  const lengths = nonEmpty.map((value) => value.length);
  const typeCounts: Record<string, number> = {};
  const structureCounts = emptyStructureCounts();
  const separatorPresence: Record<string, number> = {};
  const labels = new Map<string, { label: string; occurrences: number; separators: Set<string> }>();
  const termMatches = Object.fromEntries(Object.keys(relevantTerms).map((term) => [term, 0]));
  const samples: CorrectiveDiagnosticSample[] = [];
  for (const row of rows) {
    const raw = row.atributos;
    const type = rawType(raw);
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    if (!raw?.trim()) continue;
    const value = raw.trim();
    const structure = classifyAttributeStructure(value);
    structureCounts[structure] += 1;
    for (const [separator, pattern] of Object.entries({ dosPuntos: /:/, igual: /=/, puntoYComa: /;/, barraVertical: /\|/, comas: /,/, llaves: /[{}]/, corchetes: /[\[\]]/, saltosLinea: /\n/, html: /<[^>]+>/ })) if (pattern.test(value)) separatorPresence[separator] = (separatorPresence[separator] ?? 0) + 1;
    for (const match of labelMatches(value)) {
      const current = labels.get(normalizeKey(match.label)) ?? { label: match.label, occurrences: 0, separators: new Set<string>() };
      current.occurrences += 1;
      current.separators.add(match.separator);
      labels.set(normalizeKey(match.label), current);
    }
    for (const [term, pattern] of Object.entries(relevantTerms)) if (pattern.test(value)) termMatches[term] += 1;
    if (samples.length < 5) samples.push({ structure, length: value.length, sanitized: sanitizeAttribute(value), detectedLabels: labelMatches(value).slice(0, 20).map((match) => match.label) });
  }
  return {
    nonEmptyCount: nonEmpty.length,
    javascriptTypeCounts: typeCounts,
    length: { min: lengths.length ? Math.min(...lengths) : null, max: lengths.length ? Math.max(...lengths) : null, average: lengths.length ? Number((lengths.reduce((sum, length) => sum + length, 0) / lengths.length).toFixed(2)) : null },
    structureCounts,
    separatorPresence,
    frequentLabels: [...labels.values()].sort((left, right) => right.occurrences - left.occurrences).slice(0, 30).map((value) => ({ label: value.label, occurrences: value.occurrences, separators: [...value.separators] })),
    termMatches,
    samples,
  };
}

function analyzeRawData(rows: CorrectiveDiagnosticRow[]): CorrectiveRawDataDiagnostic {
  const typeCounts: Record<string, number> = {};
  const firstLevel = new Map<string, { key: string; occurrences: number }>();
  const rawKeyNames = new Map<string, Set<string>>();
  const relevantMatches = new Map<string, Set<string>>();
  const samples: Array<{ structure: string; sanitized: unknown }> = [];
  let withRawDataCount = 0;
  for (const row of rows) {
    const value = row.raw_data;
    const type = rawType(value);
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    const populated = value !== null && value !== undefined && (typeof value !== "object" || Object.keys(value as object).length > 0);
    if (!populated) continue;
    withRawDataCount += 1;
    if (samples.length < 5) samples.push({ structure: type === "object" ? "OBJETO" : type === "array" ? "ARRAY" : type.toUpperCase(), sanitized: sanitizeRawValue(value) });
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const key of Object.keys(value)) {
      const normalized = normalizeKey(key);
      const current = firstLevel.get(key) ?? { key, occurrences: 0 };
      current.occurrences += 1;
      firstLevel.set(key, current);
      const names = rawKeyNames.get(normalized) ?? new Set<string>();
      names.add(key);
      rawKeyNames.set(normalized, names);
      for (const [label, pattern] of Object.entries({ tecnico: /tecnico|asignad|responsable|colaborador|usuario|proveedor/, tipo: /tipo|especialidad|categoria|plantilla/, descripcion: /descripcion|detalle|tarea|nombre/, sitio: /sitio|site|elemento_red/, prioridad: /prioridad|criticidad|urgencia/ })) {
        if (!pattern.test(normalized)) continue;
        const paths = relevantMatches.get(label) ?? new Set<string>();
        paths.add(key);
        relevantMatches.set(label, paths);
      }
    }
  }
  const normalizedColumns = new Set(normalizedCorrectiveColumns);
  const rawDataOnlyKeys = [...rawKeyNames.entries()]
    .filter(([normalized]) => !normalizedColumns.has(normalized))
    .flatMap(([, names]) => [...names])
    .sort((left, right) => left.localeCompare(right));
  const normalizedFieldsFoundInRawData = [...rawKeyNames.entries()]
    .filter(([normalized]) => normalizedColumns.has(normalized))
    .flatMap(([, names]) => [...names])
    .sort((left, right) => left.localeCompare(right));
  return {
    totalCount: rows.length,
    withRawDataCount,
    withRawDataPercentage: rows.length ? Number(((withRawDataCount / rows.length) * 100).toFixed(2)) : 0,
    javascriptTypeCounts: typeCounts,
    firstLevelKeys: [...firstLevel.values()]
      .sort((left, right) => right.occurrences - left.occurrences || left.key.localeCompare(right.key)),
    samples,
    rawDataOnlyKeys,
    normalizedFieldsFoundInRawData,
    relevantKeyMatches: Object.fromEntries([...relevantMatches.entries()].map(([label, keys]) => [label, [...keys].sort()])),
  };
}

const diagnosticSelect = {
  atributos: true,
  raw_data: true,
} satisfies Prisma.correctivosSelect;

export async function getCorrectiveDiagnosticDetail(): Promise<CorrectiveDiagnosticDetailData> {
  const prisma = getPrismaClient();
  const rows = await prisma.correctivos.findMany({ select: diagnosticSelect, orderBy: { id: "asc" } });
  return {
    source: "postgresql",
    totalCorrectives: rows.length,
    atributos: analyzeAttributes(rows),
    rawData: analyzeRawData(rows),
    rawFieldInspection: analyzeRawFieldInspection(rows),
    normalizedCorrectiveColumns,
    notes: ["Diagnóstico temporal y read-only; no devuelve los textos completos de atributos ni raw_data.", "La inspección de los diecisiete campos solicitados devuelve top 30 valores y hasta 10 muestras por campo.", "Las muestras de campos inspeccionados conservan emails y nombres para identificación local, pero reemplazan URLs, tokens y valores asociados a credenciales.", "Un campo se marca como candidato determinístico solo si todos sus valores distintos no vacíos coinciden con exactamente una categoría entre AA, GE, ALTURA y COTA_0; esto es una señal diagnóstica y no modifica classifyCorrectiveWorkType.", "La comparación de claves usa los campos actuales del modelo correctivos sin modificar el schema.", "No se modifica classifyCorrectiveWorkType ni ninguna regla de scoring."],
  };
}
