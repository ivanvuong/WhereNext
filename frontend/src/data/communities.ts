import type { Region } from '../api/analyze'

export type LifestyleScore = {
  walkable: number
  quiet: number
  food: number
  nightlife: number
  outdoors: number
  family: number
  pets: number
  academic: number
  wellness: number
}

export type BoundaryGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

export type NeighborhoodBoundary = {
  id: string
  name: string
  region: Extract<Region, 'sf' | 'seattle' | 'irvine' | 'la' | 'nyc'>
  latitude: number
  longitude: number
  source: 'wof' | 'osm'
  geometry: BoundaryGeometry | null
}

export type Community = {
  id: string
  name: string
  region: Region
  latitude: number
  longitude: number
  avgRent: number
  lifestyle: LifestyleScore
}

type NeighborhoodSeed = Omit<NeighborhoodBoundary, 'geometry'> & {
  boundaryRadiusMiles: number
}

const hashString = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

const scoreFromHash = (hash: number, min: number, max: number, offset: number) => {
  const range = Math.max(1, max - min + 1)
  return min + ((hash + offset) % range)
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const makePolygon = (latitude: number, longitude: number, radiusMiles: number, rotationDeg: number): BoundaryGeometry => {
  const milesPerLatitude = 69
  const latitudeRadius = radiusMiles / milesPerLatitude
  const longitudeRadius = radiusMiles / (milesPerLatitude * Math.max(Math.cos((latitude * Math.PI) / 180), 0.25))

  const ring: [number, number][] = []
  const points = 8
  for (let index = 0; index < points; index += 1) {
    const angle = ((360 / points) * index + rotationDeg) * (Math.PI / 180)
    const stretch = index % 2 === 0 ? 1 : 0.74
    ring.push([
      Number((longitude + Math.cos(angle) * longitudeRadius * stretch).toFixed(6)),
      Number((latitude + Math.sin(angle) * latitudeRadius * stretch).toFixed(6)),
    ])
  }
  ring.push(ring[0])

  return {
    type: 'Polygon',
    coordinates: [ring],
  }
}

const toLifestyle = (seed: NeighborhoodSeed): LifestyleScore => {
  const hash = hashString(`${seed.id}-${seed.name}-${seed.latitude}-${seed.longitude}`)
  return {
    walkable: scoreFromHash(hash, 42, 96, 3),
    quiet: scoreFromHash(hash, 35, 95, 11),
    food: scoreFromHash(hash, 38, 97, 19),
    nightlife: scoreFromHash(hash, 30, 96, 29),
    outdoors: scoreFromHash(hash, 36, 95, 37),
    family: scoreFromHash(hash, 34, 95, 43),
    pets: scoreFromHash(hash, 38, 96, 53),
    academic: scoreFromHash(hash, 35, 95, 61),
    wellness: scoreFromHash(hash, 36, 95, 73),
  }
}

const toAverageRent = (seed: NeighborhoodSeed): number => {
  const hash = hashString(seed.id)
  const baseline =
    seed.region === 'sf' ? 3450 : seed.region === 'seattle' ? 2700 : seed.region === 'la' ? 3200 : seed.region === 'nyc' ? 3850 : 3000
  const variance = scoreFromHash(hash, -850, 850, 17)
  return clamp(baseline + variance, 1700, 5600)
}

const SEED_NEIGHBORHOODS: NeighborhoodSeed[] = [
  { id: 'sf-financial-district', name: 'Financial District', region: 'sf', latitude: 37.7946, longitude: -122.3999, source: 'wof', boundaryRadiusMiles: 0.5 },
  { id: 'sf-soma', name: 'SoMa', region: 'sf', latitude: 37.7786, longitude: -122.4056, source: 'wof', boundaryRadiusMiles: 0.56 },
  { id: 'sf-south-beach', name: 'South Beach', region: 'sf', latitude: 37.7828, longitude: -122.3892, source: 'wof', boundaryRadiusMiles: 0.5 },
  { id: 'sf-tenderloin', name: 'Tenderloin', region: 'sf', latitude: 37.7831, longitude: -122.4143, source: 'wof', boundaryRadiusMiles: 0.48 },
  { id: 'sf-chinatown', name: 'Chinatown', region: 'sf', latitude: 37.7941, longitude: -122.4078, source: 'wof', boundaryRadiusMiles: 0.45 },
  { id: 'sf-north-beach', name: 'North Beach', region: 'sf', latitude: 37.8061, longitude: -122.4103, source: 'wof', boundaryRadiusMiles: 0.52 },
  { id: 'sf-nob-hill', name: 'Nob Hill', region: 'sf', latitude: 37.793, longitude: -122.4162, source: 'wof', boundaryRadiusMiles: 0.49 },
  { id: 'sf-russian-hill', name: 'Russian Hill', region: 'sf', latitude: 37.801, longitude: -122.4192, source: 'wof', boundaryRadiusMiles: 0.52 },
  { id: 'sf-pacific-heights', name: 'Pacific Heights', region: 'sf', latitude: 37.7924, longitude: -122.4382, source: 'wof', boundaryRadiusMiles: 0.66 },
  { id: 'sf-marina', name: 'Marina', region: 'sf', latitude: 37.8037, longitude: -122.4368, source: 'wof', boundaryRadiusMiles: 0.62 },
  { id: 'sf-cow-hollow', name: 'Cow Hollow', region: 'sf', latitude: 37.7981, longitude: -122.4387, source: 'wof', boundaryRadiusMiles: 0.56 },
  { id: 'sf-japantown', name: 'Japantown', region: 'sf', latitude: 37.7852, longitude: -122.4312, source: 'wof', boundaryRadiusMiles: 0.47 },
  { id: 'sf-hayes-valley', name: 'Hayes Valley', region: 'sf', latitude: 37.7764, longitude: -122.4242, source: 'wof', boundaryRadiusMiles: 0.5 },
  { id: 'sf-haight-ashbury', name: 'Haight-Ashbury', region: 'sf', latitude: 37.7692, longitude: -122.4481, source: 'wof', boundaryRadiusMiles: 0.62 },
  { id: 'sf-cole-valley', name: 'Cole Valley', region: 'sf', latitude: 37.7659, longitude: -122.449, source: 'wof', boundaryRadiusMiles: 0.48 },
  { id: 'sf-castro', name: 'Castro', region: 'sf', latitude: 37.7609, longitude: -122.435, source: 'wof', boundaryRadiusMiles: 0.57 },
  { id: 'sf-noe-valley', name: 'Noe Valley', region: 'sf', latitude: 37.7502, longitude: -122.4337, source: 'wof', boundaryRadiusMiles: 0.62 },
  { id: 'sf-mission-district', name: 'Mission District', region: 'sf', latitude: 37.7599, longitude: -122.4148, source: 'wof', boundaryRadiusMiles: 0.72 },
  { id: 'sf-bernal-heights', name: 'Bernal Heights', region: 'sf', latitude: 37.7394, longitude: -122.4156, source: 'wof', boundaryRadiusMiles: 0.75 },
  { id: 'sf-potrero-hill', name: 'Potrero Hill', region: 'sf', latitude: 37.7597, longitude: -122.3977, source: 'wof', boundaryRadiusMiles: 0.64 },
  { id: 'sf-dogpatch', name: 'Dogpatch', region: 'sf', latitude: 37.7591, longitude: -122.3885, source: 'wof', boundaryRadiusMiles: 0.55 },
  { id: 'sf-bayview', name: 'Bayview', region: 'sf', latitude: 37.7289, longitude: -122.3928, source: 'wof', boundaryRadiusMiles: 0.8 },
  { id: 'sf-glen-park', name: 'Glen Park', region: 'sf', latitude: 37.7333, longitude: -122.4337, source: 'wof', boundaryRadiusMiles: 0.58 },
  { id: 'sf-excelsior', name: 'Excelsior', region: 'sf', latitude: 37.7218, longitude: -122.4313, source: 'wof', boundaryRadiusMiles: 0.78 },
  { id: 'sf-west-portal', name: 'West Portal', region: 'sf', latitude: 37.7401, longitude: -122.4659, source: 'wof', boundaryRadiusMiles: 0.62 },
  { id: 'sf-inner-richmond', name: 'Inner Richmond', region: 'sf', latitude: 37.7808, longitude: -122.4662, source: 'wof', boundaryRadiusMiles: 0.67 },
  { id: 'sf-outer-richmond', name: 'Outer Richmond', region: 'sf', latitude: 37.7798, longitude: -122.4939, source: 'wof', boundaryRadiusMiles: 0.78 },
  { id: 'sf-inner-sunset', name: 'Inner Sunset', region: 'sf', latitude: 37.7621, longitude: -122.4687, source: 'wof', boundaryRadiusMiles: 0.71 },
  { id: 'sf-outer-sunset', name: 'Outer Sunset', region: 'sf', latitude: 37.7522, longitude: -122.4944, source: 'wof', boundaryRadiusMiles: 0.87 },
  { id: 'sf-presidio-heights', name: 'Presidio Heights', region: 'sf', latitude: 37.7865, longitude: -122.4527, source: 'wof', boundaryRadiusMiles: 0.6 },

  { id: 'sea-downtown', name: 'Downtown Seattle', region: 'seattle', latitude: 47.6062, longitude: -122.3321, source: 'osm', boundaryRadiusMiles: 0.9 },
  { id: 'sea-belltown', name: 'Belltown', region: 'seattle', latitude: 47.6142, longitude: -122.3476, source: 'osm', boundaryRadiusMiles: 0.8 },
  { id: 'sea-capitol-hill', name: 'Capitol Hill', region: 'seattle', latitude: 47.623, longitude: -122.319, source: 'osm', boundaryRadiusMiles: 0.95 },
  { id: 'sea-first-hill', name: 'First Hill', region: 'seattle', latitude: 47.6097, longitude: -122.3244, source: 'osm', boundaryRadiusMiles: 0.8 },
  { id: 'sea-queen-anne', name: 'Queen Anne', region: 'seattle', latitude: 47.6373, longitude: -122.356, source: 'osm', boundaryRadiusMiles: 1.05 },
  { id: 'sea-lower-queen-anne', name: 'Lower Queen Anne', region: 'seattle', latitude: 47.6249, longitude: -122.355, source: 'osm', boundaryRadiusMiles: 0.85 },
  { id: 'sea-south-lake-union', name: 'South Lake Union', region: 'seattle', latitude: 47.6234, longitude: -122.3382, source: 'osm', boundaryRadiusMiles: 0.82 },
  { id: 'sea-ballard', name: 'Ballard', region: 'seattle', latitude: 47.6686, longitude: -122.386, source: 'osm', boundaryRadiusMiles: 1.15 },
  { id: 'sea-fremont', name: 'Fremont', region: 'seattle', latitude: 47.6505, longitude: -122.3509, source: 'osm', boundaryRadiusMiles: 0.95 },
  { id: 'sea-wallingford', name: 'Wallingford', region: 'seattle', latitude: 47.6613, longitude: -122.3345, source: 'osm', boundaryRadiusMiles: 0.95 },
  { id: 'sea-university-district', name: 'University District', region: 'seattle', latitude: 47.6618, longitude: -122.3131, source: 'osm', boundaryRadiusMiles: 0.98 },
  { id: 'sea-green-lake', name: 'Green Lake', region: 'seattle', latitude: 47.6788, longitude: -122.3273, source: 'osm', boundaryRadiusMiles: 1.06 },
  { id: 'sea-ravenna', name: 'Ravenna', region: 'seattle', latitude: 47.6758, longitude: -122.303, source: 'osm', boundaryRadiusMiles: 0.93 },
  { id: 'sea-magnolia', name: 'Magnolia', region: 'seattle', latitude: 47.6413, longitude: -122.3991, source: 'osm', boundaryRadiusMiles: 1.24 },
  { id: 'sea-interbay', name: 'Interbay', region: 'seattle', latitude: 47.6486, longitude: -122.3768, source: 'osm', boundaryRadiusMiles: 0.94 },
  { id: 'sea-west-seattle', name: 'West Seattle', region: 'seattle', latitude: 47.5757, longitude: -122.3862, source: 'osm', boundaryRadiusMiles: 1.25 },
  { id: 'sea-alki', name: 'Alki', region: 'seattle', latitude: 47.5755, longitude: -122.4107, source: 'osm', boundaryRadiusMiles: 0.92 },
  { id: 'sea-beacon-hill', name: 'Beacon Hill', region: 'seattle', latitude: 47.5799, longitude: -122.3119, source: 'osm', boundaryRadiusMiles: 1.12 },
  { id: 'sea-columbia-city', name: 'Columbia City', region: 'seattle', latitude: 47.5598, longitude: -122.2928, source: 'osm', boundaryRadiusMiles: 1.04 },
  { id: 'sea-georgetown', name: 'Georgetown', region: 'seattle', latitude: 47.5502, longitude: -122.3208, source: 'osm', boundaryRadiusMiles: 0.96 },
  { id: 'sea-leschi', name: 'Leschi', region: 'seattle', latitude: 47.6019, longitude: -122.2864, source: 'osm', boundaryRadiusMiles: 0.91 },
  { id: 'sea-madison-park', name: 'Madison Park', region: 'seattle', latitude: 47.6342, longitude: -122.2755, source: 'osm', boundaryRadiusMiles: 0.86 },
  { id: 'sea-phinney-ridge', name: 'Phinney Ridge', region: 'seattle', latitude: 47.6715, longitude: -122.3556, source: 'osm', boundaryRadiusMiles: 0.97 },
  { id: 'sea-northgate', name: 'Northgate', region: 'seattle', latitude: 47.706, longitude: -122.3256, source: 'osm', boundaryRadiusMiles: 1.22 },
  { id: 'sea-central-district', name: 'Central District', region: 'seattle', latitude: 47.6085, longitude: -122.3028, source: 'osm', boundaryRadiusMiles: 0.96 },

  { id: 'la-downtown', name: 'Downtown LA', region: 'la', latitude: 34.0407, longitude: -118.2468, source: 'osm', boundaryRadiusMiles: 1.12 },
  { id: 'la-arts-district', name: 'Arts District', region: 'la', latitude: 34.0376, longitude: -118.2348, source: 'osm', boundaryRadiusMiles: 0.88 },
  { id: 'la-koreatown', name: 'Koreatown', region: 'la', latitude: 34.0617, longitude: -118.3004, source: 'osm', boundaryRadiusMiles: 1.05 },
  { id: 'la-hollywood', name: 'Hollywood', region: 'la', latitude: 34.1016, longitude: -118.3267, source: 'osm', boundaryRadiusMiles: 1.14 },
  { id: 'la-west-hollywood', name: 'West Hollywood', region: 'la', latitude: 34.09, longitude: -118.3617, source: 'osm', boundaryRadiusMiles: 0.95 },
  { id: 'la-los-feliz', name: 'Los Feliz', region: 'la', latitude: 34.1108, longitude: -118.287, source: 'osm', boundaryRadiusMiles: 0.91 },
  { id: 'la-silver-lake', name: 'Silver Lake', region: 'la', latitude: 34.0866, longitude: -118.2707, source: 'osm', boundaryRadiusMiles: 0.98 },
  { id: 'la-echo-park', name: 'Echo Park', region: 'la', latitude: 34.0782, longitude: -118.2606, source: 'osm', boundaryRadiusMiles: 0.9 },
  { id: 'la-mid-wilshire', name: 'Mid-Wilshire', region: 'la', latitude: 34.0611, longitude: -118.3378, source: 'osm', boundaryRadiusMiles: 1.08 },
  { id: 'la-westwood', name: 'Westwood', region: 'la', latitude: 34.0635, longitude: -118.4455, source: 'osm', boundaryRadiusMiles: 1.03 },
  { id: 'la-brentwood', name: 'Brentwood', region: 'la', latitude: 34.0544, longitude: -118.473, source: 'osm', boundaryRadiusMiles: 1.02 },
  { id: 'la-culver-city', name: 'Culver City', region: 'la', latitude: 34.0211, longitude: -118.3965, source: 'osm', boundaryRadiusMiles: 1.08 },
  { id: 'la-palms', name: 'Palms', region: 'la', latitude: 34.0214, longitude: -118.405, source: 'osm', boundaryRadiusMiles: 0.83 },
  { id: 'la-marina-del-rey', name: 'Marina del Rey', region: 'la', latitude: 33.9803, longitude: -118.4517, source: 'osm', boundaryRadiusMiles: 0.92 },
  { id: 'la-venice', name: 'Venice', region: 'la', latitude: 33.985, longitude: -118.4695, source: 'osm', boundaryRadiusMiles: 1.03 },
  { id: 'la-santa-monica', name: 'Santa Monica', region: 'la', latitude: 34.0195, longitude: -118.4912, source: 'osm', boundaryRadiusMiles: 1.14 },
  { id: 'la-pasadena', name: 'Pasadena', region: 'la', latitude: 34.1478, longitude: -118.1445, source: 'osm', boundaryRadiusMiles: 1.21 },
  { id: 'la-glendale', name: 'Glendale', region: 'la', latitude: 34.1425, longitude: -118.2551, source: 'osm', boundaryRadiusMiles: 1.16 },
  { id: 'la-burbank', name: 'Burbank', region: 'la', latitude: 34.1808, longitude: -118.3089, source: 'osm', boundaryRadiusMiles: 1.18 },
  { id: 'la-studio-city', name: 'Studio City', region: 'la', latitude: 34.1391, longitude: -118.3928, source: 'osm', boundaryRadiusMiles: 1.01 },
  { id: 'la-sherman-oaks', name: 'Sherman Oaks', region: 'la', latitude: 34.1511, longitude: -118.4492, source: 'osm', boundaryRadiusMiles: 1.13 },
  { id: 'la-highland-park', name: 'Highland Park', region: 'la', latitude: 34.1099, longitude: -118.1951, source: 'osm', boundaryRadiusMiles: 1.06 },
  { id: 'la-playa-vista', name: 'Playa Vista', region: 'la', latitude: 33.9764, longitude: -118.4214, source: 'osm', boundaryRadiusMiles: 0.92 },
  { id: 'la-manhattan-beach', name: 'Manhattan Beach', region: 'la', latitude: 33.8847, longitude: -118.4109, source: 'osm', boundaryRadiusMiles: 1.12 },
  { id: 'la-el-segundo', name: 'El Segundo', region: 'la', latitude: 33.9192, longitude: -118.4165, source: 'osm', boundaryRadiusMiles: 1.08 },

  { id: 'nyc-financial-district', name: 'Financial District', region: 'nyc', latitude: 40.7075, longitude: -74.0113, source: 'osm', boundaryRadiusMiles: 0.76 },
  { id: 'nyc-tribeca', name: 'Tribeca', region: 'nyc', latitude: 40.7163, longitude: -74.0086, source: 'osm', boundaryRadiusMiles: 0.72 },
  { id: 'nyc-soho', name: 'SoHo', region: 'nyc', latitude: 40.7233, longitude: -74.002, source: 'osm', boundaryRadiusMiles: 0.73 },
  { id: 'nyc-chinatown', name: 'Chinatown', region: 'nyc', latitude: 40.7158, longitude: -73.997, source: 'osm', boundaryRadiusMiles: 0.66 },
  { id: 'nyc-lower-east-side', name: 'Lower East Side', region: 'nyc', latitude: 40.718, longitude: -73.9882, source: 'osm', boundaryRadiusMiles: 0.81 },
  { id: 'nyc-east-village', name: 'East Village', region: 'nyc', latitude: 40.7265, longitude: -73.9815, source: 'osm', boundaryRadiusMiles: 0.77 },
  { id: 'nyc-west-village', name: 'West Village', region: 'nyc', latitude: 40.7342, longitude: -74.006, source: 'osm', boundaryRadiusMiles: 0.74 },
  { id: 'nyc-chelsea', name: 'Chelsea', region: 'nyc', latitude: 40.7465, longitude: -74.0014, source: 'osm', boundaryRadiusMiles: 0.89 },
  { id: 'nyc-midtown', name: 'Midtown', region: 'nyc', latitude: 40.7549, longitude: -73.984, source: 'osm', boundaryRadiusMiles: 1.02 },
  { id: 'nyc-hells-kitchen', name: "Hell's Kitchen", region: 'nyc', latitude: 40.7644, longitude: -73.9936, source: 'osm', boundaryRadiusMiles: 0.93 },
  { id: 'nyc-upper-west-side', name: 'Upper West Side', region: 'nyc', latitude: 40.787, longitude: -73.9754, source: 'osm', boundaryRadiusMiles: 1.11 },
  { id: 'nyc-upper-east-side', name: 'Upper East Side', region: 'nyc', latitude: 40.7736, longitude: -73.9566, source: 'osm', boundaryRadiusMiles: 1.08 },
  { id: 'nyc-harlem', name: 'Harlem', region: 'nyc', latitude: 40.8116, longitude: -73.9465, source: 'osm', boundaryRadiusMiles: 1.17 },
  { id: 'nyc-long-island-city', name: 'Long Island City', region: 'nyc', latitude: 40.7447, longitude: -73.9485, source: 'osm', boundaryRadiusMiles: 1.04 },
  { id: 'nyc-astoria', name: 'Astoria', region: 'nyc', latitude: 40.7644, longitude: -73.9235, source: 'osm', boundaryRadiusMiles: 1.09 },
  { id: 'nyc-williamsburg', name: 'Williamsburg', region: 'nyc', latitude: 40.7081, longitude: -73.9571, source: 'osm', boundaryRadiusMiles: 1.04 },
  { id: 'nyc-greenpoint', name: 'Greenpoint', region: 'nyc', latitude: 40.7293, longitude: -73.9541, source: 'osm', boundaryRadiusMiles: 0.95 },
  { id: 'nyc-dumbo', name: 'DUMBO', region: 'nyc', latitude: 40.7033, longitude: -73.9881, source: 'osm', boundaryRadiusMiles: 0.72 },
  { id: 'nyc-brooklyn-heights', name: 'Brooklyn Heights', region: 'nyc', latitude: 40.696, longitude: -73.9967, source: 'osm', boundaryRadiusMiles: 0.78 },
  { id: 'nyc-park-slope', name: 'Park Slope', region: 'nyc', latitude: 40.672, longitude: -73.977, source: 'osm', boundaryRadiusMiles: 1.03 },
  { id: 'nyc-fort-greene', name: 'Fort Greene', region: 'nyc', latitude: 40.6916, longitude: -73.9733, source: 'osm', boundaryRadiusMiles: 0.88 },
  { id: 'nyc-flushing', name: 'Flushing', region: 'nyc', latitude: 40.7654, longitude: -73.8173, source: 'osm', boundaryRadiusMiles: 1.21 },
  { id: 'nyc-forest-hills', name: 'Forest Hills', region: 'nyc', latitude: 40.7181, longitude: -73.8448, source: 'osm', boundaryRadiusMiles: 1.1 },
  { id: 'nyc-jackson-heights', name: 'Jackson Heights', region: 'nyc', latitude: 40.7557, longitude: -73.8831, source: 'osm', boundaryRadiusMiles: 0.94 },
  { id: 'nyc-sunnyside', name: 'Sunnyside', region: 'nyc', latitude: 40.7422, longitude: -73.9196, source: 'osm', boundaryRadiusMiles: 0.9 },

  { id: 'irv-spectrum', name: 'Irvine Spectrum', region: 'irvine', latitude: 33.6508, longitude: -117.743, source: 'osm', boundaryRadiusMiles: 0.85 },
  { id: 'irv-woodbridge', name: 'Woodbridge', region: 'irvine', latitude: 33.6785, longitude: -117.8032, source: 'osm', boundaryRadiusMiles: 1.05 },
  { id: 'irv-turtle-rock', name: 'Turtle Rock', region: 'irvine', latitude: 33.6397, longitude: -117.8049, source: 'osm', boundaryRadiusMiles: 0.94 },
  { id: 'irv-university-park', name: 'University Park', region: 'irvine', latitude: 33.6561, longitude: -117.786, source: 'osm', boundaryRadiusMiles: 0.96 },
  { id: 'irv-portola-springs', name: 'Portola Springs', region: 'irvine', latitude: 33.7055, longitude: -117.7338, source: 'osm', boundaryRadiusMiles: 1.06 },
  { id: 'irv-cypress-village', name: 'Cypress Village', region: 'irvine', latitude: 33.7011, longitude: -117.7694, source: 'osm', boundaryRadiusMiles: 0.92 },
  { id: 'irv-great-park', name: 'Great Park', region: 'irvine', latitude: 33.6813, longitude: -117.7417, source: 'osm', boundaryRadiusMiles: 1.02 },
  { id: 'irv-laguna-altura', name: 'Laguna Altura', region: 'irvine', latitude: 33.6404, longitude: -117.7567, source: 'osm', boundaryRadiusMiles: 0.88 },
  { id: 'irv-quail-hill', name: 'Quail Hill', region: 'irvine', latitude: 33.6616, longitude: -117.7732, source: 'osm', boundaryRadiusMiles: 0.89 },
  { id: 'irv-westpark', name: 'Westpark', region: 'irvine', latitude: 33.6846, longitude: -117.823, source: 'osm', boundaryRadiusMiles: 0.98 },
  { id: 'irv-northwood', name: 'Northwood', region: 'irvine', latitude: 33.7114, longitude: -117.7921, source: 'osm', boundaryRadiusMiles: 1.04 },
  { id: 'irv-oak-creek', name: 'Oak Creek', region: 'irvine', latitude: 33.6555, longitude: -117.7448, source: 'osm', boundaryRadiusMiles: 0.88 },
  { id: 'irv-woodbury', name: 'Woodbury', region: 'irvine', latitude: 33.6979, longitude: -117.7569, source: 'osm', boundaryRadiusMiles: 0.97 },
  { id: 'irv-orchard-hills', name: 'Orchard Hills', region: 'irvine', latitude: 33.7398, longitude: -117.7442, source: 'osm', boundaryRadiusMiles: 1.11 },
  { id: 'irv-turtle-ridge', name: 'Turtle Ridge', region: 'irvine', latitude: 33.6239, longitude: -117.8172, source: 'osm', boundaryRadiusMiles: 0.91 },
  { id: 'irv-stonegate', name: 'Stonegate', region: 'irvine', latitude: 33.7206, longitude: -117.7676, source: 'osm', boundaryRadiusMiles: 0.98 },
  { id: 'irv-northpark', name: 'Northpark', region: 'irvine', latitude: 33.7195, longitude: -117.8126, source: 'osm', boundaryRadiusMiles: 1.06 },
  { id: 'irv-rancho-san-joaquin', name: 'Rancho San Joaquin', region: 'irvine', latitude: 33.6637, longitude: -117.8159, source: 'osm', boundaryRadiusMiles: 0.86 },
  { id: 'irv-west-irvine', name: 'West Irvine', region: 'irvine', latitude: 33.7338, longitude: -117.8398, source: 'osm', boundaryRadiusMiles: 1.12 },
  { id: 'irv-university-town-center', name: 'University Town Center', region: 'irvine', latitude: 33.649, longitude: -117.839, source: 'osm', boundaryRadiusMiles: 0.92 },
]

export const NEIGHBORHOOD_BOUNDARIES: NeighborhoodBoundary[] = SEED_NEIGHBORHOODS.map((seed, index) => {
  const geometry =
    seed.source === 'wof' ? makePolygon(seed.latitude, seed.longitude, seed.boundaryRadiusMiles, (index % 6) * 11) : null

  return {
    id: seed.id,
    name: seed.name,
    region: seed.region,
    latitude: seed.latitude,
    longitude: seed.longitude,
    source: seed.source,
    geometry,
  }
})

export const COMMUNITIES: Community[] = SEED_NEIGHBORHOODS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  region: seed.region,
  latitude: seed.latitude,
  longitude: seed.longitude,
  avgRent: toAverageRent(seed),
  lifestyle: toLifestyle(seed),
}))

const NEIGHBORHOOD_BOUNDARY_LOOKUP = new Map(NEIGHBORHOOD_BOUNDARIES.map((item) => [item.id, item]))

export const getNeighborhoodBoundary = (id: string): NeighborhoodBoundary | null =>
  NEIGHBORHOOD_BOUNDARY_LOOKUP.get(id) ?? null

export const getCommunitiesForRegion = (region: Region): Community[] => COMMUNITIES.filter((item) => item.region === region)
