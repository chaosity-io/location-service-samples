'use client'

import { useState } from 'react'
import { AutocompleteBox } from './AutocompleteBox'
import { GeocodeBox } from './GeocodeBox'
import { GetPlaceBox } from './GetPlaceBox'
import { ReverseGeocodeBox } from './ReverseGeocodeBox'
import { SearchBox } from './SearchBox'
import { SearchNearbyBox } from './SearchNearbyBox'
import { SuggestBox } from './SuggestBox'

const tabs = [
  {
    id: 'search',
    label: 'SearchText',
    description: 'Find places, POIs, or businesses by keyword or phrase.',
    component: SearchBox,
  },
  {
    id: 'autocomplete',
    label: 'Autocomplete',
    description:
      'Real-time address suggestions as the user types. Ideal for checkout forms and address inputs.',
    component: AutocompleteBox,
  },
  {
    id: 'suggest',
    label: 'Suggest',
    description:
      'Search predictions including places and query completions. Great for search bars.',
    component: SuggestBox,
  },
  {
    id: 'geocode',
    label: 'Geocode',
    description:
      'Convert an address to geographic coordinates with normalized address components.',
    component: GeocodeBox,
  },
  {
    id: 'reverse',
    label: 'ReverseGeocode',
    description:
      'Convert coordinates to a street address. Useful for map clicks and GPS locations.',
    component: ReverseGeocodeBox,
  },
  {
    id: 'nearby',
    label: 'SearchNearby',
    description:
      'Find places within a radius of a point. Powers "near me" features.',
    component: SearchNearbyBox,
  },
  {
    id: 'getplace',
    label: 'GetPlace',
    description:
      'Get full details (contacts, hours, categories) for a place by its PlaceId.',
    component: GetPlaceBox,
  },
]

export function DemoTabs() {
  const [activeTab, setActiveTab] = useState('search')
  const active = tabs.find((t) => t.id === activeTab)!
  const ActiveComponent = active.component

  return (
    <div className="demo-tabs">
      <nav className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <p className="tab-description">{active.description}</p>
      <ActiveComponent />
    </div>
  )
}
