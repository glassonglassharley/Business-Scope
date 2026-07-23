// Pure geometry for discovery grid tiling. No API calls, no database.
//
// Nearby Search caps results at 60 (3 pages x 20) per query, so one query can
// never exhaustively cover a real area. We tile the target circle with small
// overlapping search circles instead: square grid with spacing tileRadius * √2,
// which guarantees every point in the plane is within tileRadius of some tile
// center. Overlap between adjacent tiles is expected — dedup handles it.

const EARTH_M_PER_DEG_LAT = 111_320;

/**
 * @param {{ center: { lat: number, lng: number }, radiusKm: number, tileRadiusM: number }} criteria
 * @returns {Array<{ key: string, lat: number, lng: number }>}
 */
export function planTiles({ center, radiusKm, tileRadiusM }) {
  if (!center || typeof center.lat !== "number" || typeof center.lng !== "number") {
    throw new Error("planTiles requires center {lat, lng}.");
  }
  if (!(radiusKm > 0)) throw new Error("planTiles requires radiusKm > 0.");
  if (!(tileRadiusM > 0)) throw new Error("planTiles requires tileRadiusM > 0.");

  const radiusM = radiusKm * 1000;
  const spacingM = tileRadiusM * Math.SQRT2;
  const latDegPerStep = spacingM / EARTH_M_PER_DEG_LAT;
  const lngDegPerStep = spacingM / (EARTH_M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180));
  // Include tiles whose center is within radius + tileRadius so businesses at
  // the very edge of the target circle are still covered by some tile.
  const reachM = radiusM + tileRadiusM;
  const steps = Math.ceil(reachM / spacingM);

  const tiles = [];
  for (let i = -steps; i <= steps; i += 1) {
    for (let j = -steps; j <= steps; j += 1) {
      const lat = center.lat + i * latDegPerStep;
      const lng = center.lng + j * lngDegPerStep;
      if (haversineM(center, { lat, lng }) <= reachM) {
        tiles.push({ key: `${i},${j}`, lat: roundCoord(lat), lng: roundCoord(lng) });
      }
    }
  }

  return tiles;
}

export function haversineM(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function roundCoord(value) {
  return Math.round(value * 1e6) / 1e6;
}
