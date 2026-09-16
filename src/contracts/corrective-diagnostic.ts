export type CorrectiveDiagnosticStructure =
  | "JSON"
  | "JSON_COMILLAS_SIMPLES"
  | "CLAVE_VALOR_DOS_PUNTOS"
  | "CLAVE_VALOR_IGUAL"
  | "SEPARADO_POR_PUNTO_Y_COMA"
  | "SEPARADO_POR_BARRA_VERTICAL"
  | "SEPARADO_POR_COMAS"
  | "TEXTO_PLANO"
  | "HTML"
  | "OTRA";

export interface CorrectiveDiagnosticSample {
  structure: CorrectiveDiagnosticStructure;
  length: number;
  sanitized: string;
  detectedLabels: string[];
}

export interface CorrectiveAttributeDiagnostic {
  nonEmptyCount: number;
  javascriptTypeCounts: Record<string, number>;
  length: { min: number | null; max: number | null; average: number | null };
  structureCounts: Record<CorrectiveDiagnosticStructure, number>;
  separatorPresence: Record<string, number>;
  frequentLabels: Array<{ label: string; occurrences: number; separators: string[] }>;
  termMatches: Record<string, number>;
  samples: CorrectiveDiagnosticSample[];
}

export interface CorrectiveRawDataDiagnostic {
  totalCount: number;
  withRawDataCount: number;
  withRawDataPercentage: number;
  javascriptTypeCounts: Record<string, number>;
  firstLevelKeys: Array<{ key: string; occurrences: number }>;
  samples: Array<{ structure: string; sanitized: unknown }>;
  rawDataOnlyKeys: string[];
  normalizedFieldsFoundInRawData: string[];
  relevantKeyMatches: Record<string, string[]>;
}

export interface CorrectiveRawFieldValueFrequency {
  value: unknown;
  occurrences: number;
}

export interface CorrectiveRawFieldDiagnostic {
  field: string;
  matchedKeys: string[];
  withValueCount: number;
  emptyOrNullCount: number;
  javascriptTypeCounts: Record<string, number>;
  distinctValueCount: number;
  topValues: CorrectiveRawFieldValueFrequency[];
  samples: Array<{ value: unknown; javascriptType: string; structure: string }>;
  structureCounts: Record<string, number>;
  structuredKeys: Array<{ key: string; occurrences: number }>;
  structuredExamples: unknown[];
  keywordMatches: Record<string, number>;
  classificationAssessment: CorrectiveTypeFieldAssessment;
}

export interface CorrectiveTypeFieldAssessment {
  field: string;
  nonEmptyDistinctValues: number;
  valuesWithExactlyOneCategory: number;
  valuesWithoutCategory: number;
  valuesWithMultipleCategories: number;
  categoryMatchCounts: Record<string, number>;
  deterministicCandidate: boolean;
}

export interface CorrectiveAssignedPersonnelDiagnostic {
  withoutPersonnel: number;
  onePerson: number;
  twoPeople: number;
  moreThanTwoPeople: number;
  separatorCounts: Record<string, number>;
  samples: Array<{ value: unknown; javascriptType: string; peopleCount: number; format: string }>;
}

export interface CorrectiveRawFieldInspection {
  fields: CorrectiveRawFieldDiagnostic[];
  personalAsignado: CorrectiveAssignedPersonnelDiagnostic;
  deterministicClassificationCandidates: string[];
}

export interface CorrectiveDiagnosticDetailData {
  source: "postgresql";
  totalCorrectives: number;
  atributos: CorrectiveAttributeDiagnostic;
  rawData: CorrectiveRawDataDiagnostic;
  rawFieldInspection: CorrectiveRawFieldInspection;
  normalizedCorrectiveColumns: string[];
  notes: string[];
}
