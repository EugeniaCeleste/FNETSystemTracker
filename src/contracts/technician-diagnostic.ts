export type TechnicianAssignmentSource = "correctivos" | "preventivos";

export type TechnicianFieldFormat = "VACIO" | "EMAIL" | "EMAIL_LISTA" | "JSON" | "LISTA_SEPARADA" | "TEXTO_MULTIPALABRA" | "TEXTO" | "OTRO";

export interface TechnicianFieldDiagnostic {
  total: number;
  populated: number;
  empty: number;
  formats: Record<TechnicianFieldFormat, number>;
  examples: string[];
}

export interface TechnicianAssignmentDiagnosticSummary {
  source: TechnicianAssignmentSource | "TOTAL";
  total: number;
  withAssignedTo: number;
  withCollaborator: number;
  withBoth: number;
  onlyAssignedTo: number;
  onlyCollaborator: number;
  withSupplierResponsibles: number;
  withoutAny: number;
  assignedTo: TechnicianFieldDiagnostic;
  collaborator: TechnicianFieldDiagnostic;
  supplierResponsibles: TechnicianFieldDiagnostic;
}

export interface TechnicianAttributeKeyDiagnostic {
  key: string;
  occurrences: number;
  valueShapes: string[];
}

export interface TechnicianAttributeDiagnostic {
  total: number;
  populated: number;
  jsonObjects: number;
  jsonArrays: number;
  parseFailures: number;
  frequentKeys: TechnicianAttributeKeyDiagnostic[];
  signalOccurrences: Record<"AA" | "GE" | "ALTURA" | "COTA_0", number>;
}

export interface TechnicianDiagnosticData {
  source: "postgresql";
  assignments: TechnicianAssignmentDiagnosticSummary[];
  correctiveFields: Record<"nombre" | "descripcion" | "tarea" | "plantilla" | "proyecto", TechnicianFieldDiagnostic>;
  attributes: TechnicianAttributeDiagnostic;
  notes: string[];
}
