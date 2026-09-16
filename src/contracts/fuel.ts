export interface FuelCharge {
  id: string;
  formulario: string;
  taskCode: string | null;
  siteCode: string | null;
  siteName: string | null;
  networkElement: string | null;
  status: string | null;
  origin: string;
  formType: string | null;
  sourceKey: string;
  fuel: string | null;
  tank: string | null;
  liters: string | null;
  levelBefore: string | null;
  levelFinal: string | null;
  hourmeter: string | null;
  generatorRunning: boolean | null;
  eventAt: string | null;
  editedAt: string | null;
}

export interface FuelMetrics {
  totalLiters: number;
  totalCharges: number;
  monthLiters: number;
  monthCharges: number;
  averageLiters: number;
  litersByOrigin: Record<string, number>;
  litersBySite: Record<string, number>;
  litersByMonth: Record<string, number>;
}
