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

export type Community = {
  id: string
  name: string
  region: 'sf' | 'irvine'
  latitude: number
  longitude: number
  avgRent: number
  lifestyle: LifestyleScore
}

export const COMMUNITIES: Community[] = [
  {
    id: 'sf-mission',
    name: 'Mission District',
    region: 'sf',
    latitude: 37.7599,
    longitude: -122.4148,
    avgRent: 3150,
    lifestyle: { walkable: 92, quiet: 48, food: 96, nightlife: 94, outdoors: 61, family: 54, pets: 72, academic: 60, wellness: 66 },
  },
  {
    id: 'sf-soma',
    name: 'SoMa',
    region: 'sf',
    latitude: 37.7786,
    longitude: -122.4056,
    avgRent: 3380,
    lifestyle: { walkable: 90, quiet: 42, food: 84, nightlife: 87, outdoors: 52, family: 43, pets: 65, academic: 58, wellness: 69 },
  },
  {
    id: 'sf-richmond',
    name: 'Inner Richmond',
    region: 'sf',
    latitude: 37.7808,
    longitude: -122.4662,
    avgRent: 2790,
    lifestyle: { walkable: 82, quiet: 74, food: 80, nightlife: 55, outdoors: 79, family: 81, pets: 83, academic: 70, wellness: 75 },
  },
  {
    id: 'sf-sunset',
    name: 'Sunset District',
    region: 'sf',
    latitude: 37.7488,
    longitude: -122.4862,
    avgRent: 2660,
    lifestyle: { walkable: 73, quiet: 82, food: 71, nightlife: 45, outdoors: 88, family: 84, pets: 86, academic: 67, wellness: 77 },
  },
  {
    id: 'sf-marina',
    name: 'Marina',
    region: 'sf',
    latitude: 37.8037,
    longitude: -122.4368,
    avgRent: 3540,
    lifestyle: { walkable: 88, quiet: 64, food: 82, nightlife: 81, outdoors: 84, family: 69, pets: 78, academic: 57, wellness: 73 },
  },
  {
    id: 'sf-noe',
    name: 'Noe Valley',
    region: 'sf',
    latitude: 37.7502,
    longitude: -122.4337,
    avgRent: 3290,
    lifestyle: { walkable: 80, quiet: 78, food: 74, nightlife: 58, outdoors: 71, family: 89, pets: 84, academic: 69, wellness: 78 },
  },
  {
    id: 'sf-hayes',
    name: 'Hayes Valley',
    region: 'sf',
    latitude: 37.7764,
    longitude: -122.4242,
    avgRent: 3420,
    lifestyle: { walkable: 94, quiet: 56, food: 89, nightlife: 83, outdoors: 60, family: 58, pets: 69, academic: 66, wellness: 71 },
  },
  {
    id: 'sf-potrero',
    name: 'Potrero Hill',
    region: 'sf',
    latitude: 37.7597,
    longitude: -122.3977,
    avgRent: 3180,
    lifestyle: { walkable: 77, quiet: 72, food: 73, nightlife: 59, outdoors: 67, family: 71, pets: 76, academic: 63, wellness: 74 },
  },
  {
    id: 'sf-bernal',
    name: 'Bernal Heights',
    region: 'sf',
    latitude: 37.7394,
    longitude: -122.4156,
    avgRent: 2880,
    lifestyle: { walkable: 74, quiet: 80, food: 72, nightlife: 51, outdoors: 74, family: 80, pets: 88, academic: 62, wellness: 79 },
  },
  {
    id: 'sf-castro',
    name: 'Castro',
    region: 'sf',
    latitude: 37.7609,
    longitude: -122.435,
    avgRent: 3320,
    lifestyle: { walkable: 91, quiet: 53, food: 81, nightlife: 85, outdoors: 64, family: 57, pets: 70, academic: 61, wellness: 68 },
  },
  {
    id: 'sf-cow-hollow',
    name: 'Cow Hollow',
    region: 'sf',
    latitude: 37.7981,
    longitude: -122.4387,
    avgRent: 3490,
    lifestyle: { walkable: 88, quiet: 62, food: 79, nightlife: 77, outdoors: 83, family: 68, pets: 75, academic: 58, wellness: 72 },
  },
  {
    id: 'sf-dogpatch',
    name: 'Dogpatch',
    region: 'sf',
    latitude: 37.7591,
    longitude: -122.3885,
    avgRent: 3240,
    lifestyle: { walkable: 71, quiet: 67, food: 76, nightlife: 63, outdoors: 70, family: 62, pets: 73, academic: 59, wellness: 72 },
  },
  {
    id: 'irvine-spectrum',
    name: 'Irvine Spectrum',
    region: 'irvine',
    latitude: 33.6508,
    longitude: -117.743,
    avgRent: 3040,
    lifestyle: { walkable: 72, quiet: 65, food: 85, nightlife: 63, outdoors: 64, family: 70, pets: 75, academic: 67, wellness: 73 },
  },
  {
    id: 'irvine-woodbridge',
    name: 'Woodbridge',
    region: 'irvine',
    latitude: 33.6785,
    longitude: -117.8032,
    avgRent: 2780,
    lifestyle: { walkable: 66, quiet: 86, food: 62, nightlife: 39, outdoors: 81, family: 92, pets: 83, academic: 71, wellness: 77 },
  },
  {
    id: 'irvine-turtle-rock',
    name: 'Turtle Rock',
    region: 'irvine',
    latitude: 33.6397,
    longitude: -117.8049,
    avgRent: 3290,
    lifestyle: { walkable: 58, quiet: 88, food: 55, nightlife: 32, outdoors: 79, family: 90, pets: 78, academic: 87, wellness: 76 },
  },
  {
    id: 'irvine-university-park',
    name: 'University Park',
    region: 'irvine',
    latitude: 33.6561,
    longitude: -117.786,
    avgRent: 2860,
    lifestyle: { walkable: 64, quiet: 82, food: 59, nightlife: 35, outdoors: 75, family: 88, pets: 80, academic: 90, wellness: 74 },
  },
  {
    id: 'irvine-portola',
    name: 'Portola Springs',
    region: 'irvine',
    latitude: 33.7055,
    longitude: -117.7338,
    avgRent: 3200,
    lifestyle: { walkable: 49, quiet: 91, food: 52, nightlife: 28, outdoors: 87, family: 94, pets: 82, academic: 79, wellness: 81 },
  },
  {
    id: 'irvine-cypress-village',
    name: 'Cypress Village',
    region: 'irvine',
    latitude: 33.7011,
    longitude: -117.7694,
    avgRent: 3020,
    lifestyle: { walkable: 57, quiet: 84, food: 63, nightlife: 34, outdoors: 76, family: 89, pets: 81, academic: 77, wellness: 78 },
  },
  {
    id: 'irvine-great-park',
    name: 'Great Park',
    region: 'irvine',
    latitude: 33.6813,
    longitude: -117.7417,
    avgRent: 3120,
    lifestyle: { walkable: 55, quiet: 79, food: 66, nightlife: 41, outdoors: 85, family: 88, pets: 82, academic: 74, wellness: 80 },
  },
  {
    id: 'irvine-laguna-altura',
    name: 'Laguna Altura',
    region: 'irvine',
    latitude: 33.6404,
    longitude: -117.7567,
    avgRent: 3340,
    lifestyle: { walkable: 48, quiet: 89, food: 54, nightlife: 27, outdoors: 83, family: 92, pets: 80, academic: 78, wellness: 79 },
  },
  {
    id: 'irvine-quail-hill',
    name: 'Quail Hill',
    region: 'irvine',
    latitude: 33.6616,
    longitude: -117.7732,
    avgRent: 3090,
    lifestyle: { walkable: 63, quiet: 83, food: 67, nightlife: 40, outdoors: 78, family: 86, pets: 84, academic: 75, wellness: 79 },
  },
  {
    id: 'irvine-westpark',
    name: 'Westpark',
    region: 'irvine',
    latitude: 33.6846,
    longitude: -117.823,
    avgRent: 2890,
    lifestyle: { walkable: 69, quiet: 77, food: 71, nightlife: 46, outdoors: 69, family: 83, pets: 79, academic: 72, wellness: 73 },
  },
  {
    id: 'irvine-northwood',
    name: 'Northwood',
    region: 'irvine',
    latitude: 33.7114,
    longitude: -117.7921,
    avgRent: 2970,
    lifestyle: { walkable: 61, quiet: 87, food: 60, nightlife: 33, outdoors: 74, family: 90, pets: 80, academic: 76, wellness: 75 },
  },
  {
    id: 'irvine-oak-creek',
    name: 'Oak Creek',
    region: 'irvine',
    latitude: 33.6555,
    longitude: -117.7448,
    avgRent: 2940,
    lifestyle: { walkable: 60, quiet: 81, food: 68, nightlife: 44, outdoors: 77, family: 84, pets: 82, academic: 73, wellness: 76 },
  },
]
