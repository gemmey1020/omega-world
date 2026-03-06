export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface ZoneAPI {
  id: number;
  name: string;
  coordinates: GeoJSONPoint | null;
}

export interface SelectedZone {
  id: number;
  name: string;
}
