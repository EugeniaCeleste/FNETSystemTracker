import type { Prisma } from "@prisma/client";
import type { TechnicianAssignmentDiagnosticSummary, TechnicianAttributeDiagnostic, TechnicianAttributeKeyDiagnostic, TechnicianDiagnosticData, TechnicianFieldDiagnostic, TechnicianFieldFormat } from "@/contracts";
import { getPrismaClient } from "@/server/prisma";

type DiagnosticRow = {
  nombre: string | null;
  descripcion: string | null;
  tarea: string | null;
  plantilla: string | null;
  proyecto: string | null;
  asignado_a: string | null;
  usuario_colaborador: string | null;
  usuarios_responsables_proveedor: string | null;
  atributos: string | null;
};

const fieldFormats: TechnicianFieldFormat[] = ["VACIO", "EMAIL", "EMAIL_LISTA", "JSON", "LISTA_SEPARADA", "TEXTO_MULTIPALABRA", "TEXTO", "OTRO"];
const sourceSelect = {
  nombre: true, descripcion: true, tarea: true, plantilla: true, proyecto: true,
  asignado_a: true, usuario_colaborador: true, usuarios_responsables_proveedor: true, atributos: true,
} satisfies Prisma.correctivosSelect;
const preventiveSelect = sourceSelect satisfies Prisma.preventivosSelect;

function emptyFormats(): Record<TechnicianFieldFormat, number> {
  return Object.fromEntries(fieldFormats.map((format) => [format, 0])) as Record<TechnicianFieldFormat, number>;
}

function isEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function isJson(value: string): boolean { try { JSON.parse(value); return true; } catch { return false; } }
function splitParts(value: string): string[] { return value.split(/[;,|\n]+/).map((part) => part.trim()).filter(Boolean); }

function valueFormat(value: string | null): TechnicianFieldFormat {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "VACIO";
  if (isJson(normalized)) return "JSON";
  const parts = splitParts(normalized);
  if (parts.length > 1) return parts.every(isEmail) ? "EMAIL_LISTA" : "LISTA_SEPARADA";
  if (isEmail(normalized)) return "EMAIL";
  if (/\s+/.test(normalized)) return "TEXTO_MULTIPALABRA";
  if (/^[\w .@+:/_-]+$/.test(normalized)) return "TEXTO";
  return "OTRO";
}

function fieldDiagnostic(rows: DiagnosticRow[], key: keyof DiagnosticRow): TechnicianFieldDiagnostic {
  const formats = emptyFormats();
  for (const row of rows) formats[valueFormat(row[key]) as TechnicianFieldFormat] += 1;
  const examples = fieldFormats.filter((format) => formats[format] > 0).map((format) => format === "EMAIL" ? "<email>" : format === "EMAIL_LISTA" ? "<lista de emails>" : format === "JSON" ? "<JSON>" : format === "LISTA_SEPARADA" ? "<lista separada>" : format === "TEXTO_MULTIPALABRA" ? "<texto de varias palabras>" : format === "TEXTO" ? "<texto>" : `<${format.toLowerCase()}>`);
  return { total: rows.length, populated: rows.length - formats.VACIO, empty: formats.VACIO, formats, examples };
}

function hasValue(value: string | null): boolean { return Boolean(value?.trim()); }

function assignmentSummary(source: TechnicianAssignmentDiagnosticSummary["source"], rows: DiagnosticRow[]): TechnicianAssignmentDiagnosticSummary {
  const withAssignedTo = rows.filter((row) => hasValue(row.asignado_a)).length;
  const withCollaborator = rows.filter((row) => hasValue(row.usuario_colaborador)).length;
  const withSupplierResponsibles = rows.filter((row) => hasValue(row.usuarios_responsables_proveedor)).length;
  return {
    source,
    total: rows.length,
    withAssignedTo,
    withCollaborator,
    withBoth: rows.filter((row) => hasValue(row.asignado_a) && hasValue(row.usuario_colaborador)).length,
    onlyAssignedTo: rows.filter((row) => hasValue(row.asignado_a) && !hasValue(row.usuario_colaborador)).length,
    onlyCollaborator: rows.filter((row) => !hasValue(row.asignado_a) && hasValue(row.usuario_colaborador)).length,
    withSupplierResponsibles,
    withoutAny: rows.filter((row) => !hasValue(row.asignado_a) && !hasValue(row.usuario_colaborador) && !hasValue(row.usuarios_responsables_proveedor)).length,
    assignedTo: fieldDiagnostic(rows, "asignado_a"),
    collaborator: fieldDiagnostic(rows, "usuario_colaborador"),
    supplierResponsibles: fieldDiagnostic(rows, "usuarios_responsables_proveedor"),
  };
}

function jsonValueShape(value: unknown): string {
  if (value === null) return "NULL";
  if (Array.isArray(value)) return "ARRAY";
  if (typeof value === "object") return "OBJECT";
  if (typeof value === "string") return isEmail(value) ? "EMAIL" : value.trim().includes(" ") ? "TEXTO_MULTIPALABRA" : "TEXTO";
  return typeof value === "number" ? "NUMERO" : typeof value === "boolean" ? "BOOLEANO" : "OTRO";
}

function attributeDiagnostic(rows: DiagnosticRow[]): TechnicianAttributeDiagnostic {
  const keyCounts = new Map<string, { occurrences: number; shapes: Set<string> }>();
  const signalOccurrences = { AA: 0, GE: 0, ALTURA: 0, COTA_0: 0 };
  let populated = 0;
  let jsonObjects = 0;
  let jsonArrays = 0;
  let parseFailures = 0;
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { jsonArrays += 1; value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    jsonObjects += 1;
    for (const [key, child] of Object.entries(value)) {
      const current = keyCounts.get(key) ?? { occurrences: 0, shapes: new Set<string>() };
      current.occurrences += 1;
      current.shapes.add(jsonValueShape(child));
      keyCounts.set(key, current);
      visit(child);
    }
  };
  for (const row of rows) {
    const raw = row.atributos?.trim();
    if (!raw) continue;
    populated += 1;
    for (const [signal, pattern] of [["AA", /\bAA\b/i], ["GE", /\bGE\b|GRUPO\s+ELECTROGENO|GENERADOR/i], ["ALTURA", /\bALTURA\b/i], ["COTA_0", /COTA\s*_?\s*0/i]] as const) {
      if (pattern.test(raw)) signalOccurrences[signal] += 1;
    }
    try {
      visit(JSON.parse(raw));
    } catch {
      parseFailures += 1;
    }
  }
  const frequentKeys: TechnicianAttributeKeyDiagnostic[] = [...keyCounts.entries()]
    .sort(([, left], [, right]) => right.occurrences - left.occurrences)
    .slice(0, 30)
    .map(([key, value]) => ({ key, occurrences: value.occurrences, valueShapes: [...value.shapes].sort() }));
  return { total: rows.length, populated, jsonObjects, jsonArrays, parseFailures, frequentKeys, signalOccurrences };
}

export async function getTechnicianDiagnostic(): Promise<TechnicianDiagnosticData> {
  const prisma = getPrismaClient();
  const [correctives, preventives] = await Promise.all([
    prisma.correctivos.findMany({ select: sourceSelect }),
    prisma.preventivos.findMany({ select: preventiveSelect }),
  ]);
  const sources: Array<[TechnicianAssignmentDiagnosticSummary["source"], DiagnosticRow[]]> = [["correctivos", correctives], ["preventivos", preventives]];
  const allRows = [...correctives, ...preventives];
  const fields = ["nombre", "descripcion", "tarea", "plantilla", "proyecto"] as const;
  return {
    source: "postgresql",
    assignments: [...sources.map(([source, rows]) => assignmentSummary(source, rows)), assignmentSummary("TOTAL", allRows)],
    correctiveFields: Object.fromEntries(fields.map((field) => [field, fieldDiagnostic(correctives, field)])) as TechnicianDiagnosticData["correctiveFields"],
    attributes: attributeDiagnostic(correctives),
    notes: ["Los ejemplos solo describen formato; no se devuelven nombres, emails ni valores de negocio.", "La analítica usa únicamente asignado_a y usuario_colaborador; usuarios_responsables_proveedor se informa como diagnóstico y no forma técnicos ni cuadrillas.", "Las señales de atributos son indicios estadísticos; no modifican la clasificación de correctivos.", "contratista_asignado no se consulta como integrante de cuadrilla."],
  };
}
