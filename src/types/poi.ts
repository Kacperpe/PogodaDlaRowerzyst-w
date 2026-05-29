export type PoiCategory =
  | "restaurant"
  | "accommodation"
  | "toilet"
  | "campsite"
  | "attraction"
  | "shop"
  | "water";

export type Poi = {
  id: number;
  lat: number;
  lon: number;
  category: PoiCategory;
  name?: string;
};

export const POI_CONFIG: Record<PoiCategory, { label: string; color: string }> = {
  restaurant:    { label: "Restauracje/Kawiarnie", color: "#f97316" },
  accommodation: { label: "Noclegi",               color: "#a855f7" },
  toilet:        { label: "Toalety/WC",            color: "#3b82f6" },
  campsite:      { label: "Kempingi",              color: "#22c55e" },
  attraction:    { label: "Atrakcje",              color: "#eab308" },
  shop:          { label: "Sklepy",                color: "#14b8a6" },
  water:         { label: "Woda pitna",            color: "#06b6d4" },
};
