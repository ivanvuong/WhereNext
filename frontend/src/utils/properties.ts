import type { PropertyListingApi } from '../api/properties'
import type { PropertyListing } from '../types/app'
import { formatCurrency } from './format'

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
  estimatedCommuteMinutes: null,
})

export const isRentalListing = (listing: PropertyListing) =>
  listing.status.toLowerCase().includes('rent') || listing.status.toLowerCase().includes('lease')

export const formatPropertyPrice = (listing: PropertyListing) => {
  if (!listing.listPrice) {
    return 'Price unavailable'
  }
  return isRentalListing(listing) ? `${formatCurrency(listing.listPrice)}/mo` : formatCurrency(listing.listPrice)
}

const buildZillowSearchUrl = (address: string) =>
  `https://www.zillow.com/homes/${encodeURIComponent(address).replace(/%20/g, '-')}_rb/`

export const getListingExternalLink = (listing: PropertyListing) => {
  if (listing.detailUrl) {
    return {
      href: listing.detailUrl,
      label: 'Open on Realtor',
    }
  }

  return {
    href: buildZillowSearchUrl(listing.address),
    label: 'Search on Zillow',
  }
}
