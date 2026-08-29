import type { Address } from '@chaosity/location-client'

/** The structured address the finder pages display. */
export interface AddressResult {
  placeId?: string
  label?: string
  addressLineOne?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
  position?: [number, number]
}

/**
 * One mapping from the Places `Address` shape to what the page shows. It used
 * to be copied three times (select, map click, geolocation) inside one
 * component, drifting a field at a time.
 */
export function toAddressResult(
  address: Address | undefined,
  position: [number, number] | undefined,
  placeId?: string,
): AddressResult {
  return {
    placeId,
    label: address?.Label,
    addressLineOne: address?.AddressNumber
      ? `${address.AddressNumber} ${address.Street ?? ''}`.trim()
      : address?.Street,
    city: address?.Locality,
    province: address?.Region?.Name,
    postalCode: address?.PostalCode,
    country: address?.Country?.Code3 ?? address?.Country?.Name ?? undefined,
    position,
  }
}

/** `Code (status): message` from a LocationServiceException, or the plain message. */
export function describeError(
  err: unknown,
  fallback = 'Request failed',
): string {
  const e = err as { code?: string; statusCode?: number; message?: string }
  if (!e?.message) return fallback
  return `${e.code ?? 'Error'}${e.statusCode ? ` (${e.statusCode})` : ''}: ${e.message}`
}
