import type { PropertyListingApi } from '../api/properties'
import type { PropertyListing } from '../types/app'

export const toPropertyListing = (item: PropertyListingApi): PropertyListing => ({
  id: item.id,
  address: item.address,
  status: item.status,
  listPrice: item.list_price,
  beds: item.beds,
  baths: item.baths,
  sqft: item.sqft,
  latitude: item.latitude,
  longitude: item.longitude,
  primaryPhoto: item.primary_photo,
  detailUrl: item.detail_url,
})
