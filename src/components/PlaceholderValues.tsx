import { SelectableValue } from '@grafana/data';
import {
  AggregationMethod,
  PlaceholderEquipment,
  PlaceholderTimeSeries,
  PlaceholderView,
  QueryEditorTimeSeriesState, SearchFilters,
  TimeSeriesType,
} from '../types';

export const DEFAULT_AGGREGATION: AggregationMethod = 'average';
export const DEFAULT_LABEL = 'name';
export const LABEL_PROPERTY_VALUES = new Set<string>([
  'name',
  'externalId',
  'description',
  'unit',
  'space',
  'type',
  'nameWithUnit',
  'externalIdWithName',
  'nameWithSpace',
]);
export const DEFAULT_SERIES_CONFIG: QueryEditorTimeSeriesState = {
  aggregation: DEFAULT_AGGREGATION,
  label: DEFAULT_LABEL,
  labelOptions: [DEFAULT_LABEL],
};
export const PLACEHOLDER_VIEWS: PlaceholderView[] = [
  { id: 'asset_hierarchy', label: 'Asset hierarchy' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'maintenance', label: 'Maintenance' },
];
export const PLACEHOLDER_CATALOG_SIZE = 1000;
export const HANDCRAFTED_PLACEHOLDER_TIME_SERIES: Array<Omit<PlaceholderTimeSeries, 'height' | 'createdTime'>> = [
  {
    externalId: 'ts-pump-01-pressure',
    name: 'Pump 01 – discharge pressure',
    description: 'Discharge pressure on primary feed pump.',
    unit: 'bar',
    viewId: 'asset_hierarchy',
    space: 'sp:plant-a',
    type: 'numeric',
    isStep: false,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-pump-01-flow',
    name: 'Pump 01 – flow rate',
    description: 'Volumetric flow from pump 01.',
    unit: 'm³/h',
    viewId: 'asset_hierarchy',
    space: 'sp:plant-a',
    type: 'numeric',
    isStep: false,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-pump-02-pressure',
    name: 'Pump 02 – discharge pressure',
    description: 'Discharge pressure on standby pump.',
    unit: 'bar',
    viewId: 'asset_hierarchy',
    space: 'sp:plant-b',
    type: 'numeric',
    isStep: true,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-compressor-power',
    name: 'Compressor – active power',
    description: 'Electrical active power draw.',
    unit: 'kW',
    viewId: 'equipment',
    space: 'sp:utilities',
    type: 'numeric',
    isStep: false,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-compressor-vibration',
    name: 'Compressor – vibration RMS',
    description: 'Overall vibration level at bearing.',
    unit: 'mm/s',
    viewId: 'equipment',
    space: 'sp:utilities',
    type: 'numeric',
    isStep: false,
    stringProperties: {} as Record<string, string>,
  },

  {
    externalId: 'ts-tank-level',
    name: 'Storage tank – level',
    description: 'Product level in storage tank T-401.',
    unit: '%',
    viewId: 'equipment',
    space: 'sp:storage',
    type: 'numeric',
    isStep: true,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-motor-temp',
    name: 'Motor M-12 – winding temperature',
    description: 'Stator winding temperature.',
    unit: '°C',
    viewId: 'maintenance',
    space: 'sp:maintenance',
    type: 'numeric',
    isStep: false,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-filter-dp',
    name: 'Filter F-03 – differential pressure',
    description: 'Inlet/outlet differential pressure.',
    unit: 'kPa',
    viewId: 'maintenance',
    space: 'sp:maintenance',
    type: 'numeric',
    isStep: false,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-valve-position',
    name: 'Control valve CV-07 – position',
    description: 'Valve stem position feedback.',
    unit: '%',
    viewId: 'maintenance',
    space: 'sp:maintenance',
    type: 'state',
    isStep: true,
    stringProperties: {} as Record<string, string>,
  },
  {
    externalId: 'ts-valve-status',
    name: 'Control valve CV-07 – status',
    description: 'Open/closed status string.',
    unit: '',
    viewId: 'maintenance',
    space: 'sp:maintenance',
    type: 'string',
    isStep: false,
    stringProperties: {} as Record<string, string>,
  },
];
export const PLACEHOLDER_EQUIPMENT: PlaceholderEquipment[] = [
  {
    id: 'eq-pump-01',
    name: 'Feed pump P-01',
    timeSeriesIds: ['ts-pump-01-pressure', 'ts-pump-01-flow'],
  },
  {
    id: 'eq-compressor',
    name: 'Compressor C-201',
    timeSeriesIds: ['ts-compressor-power', 'ts-compressor-vibration'],
  },
  {
    id: 'eq-tank-401',
    name: 'Storage tank T-401',
    timeSeriesIds: ['ts-tank-level'],
  },
];
export const DOCUMENTATION_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
export const PLACEHOLDER_SPACES_BY_VIEW: Record<string, Array<SelectableValue<string>>> = {
  asset_hierarchy: [
    { label: 'All spaces', value: '' },
    { label: 'sp:plant-a', value: 'sp:plant-a' },
    { label: 'sp:plant-b', value: 'sp:plant-b' },
  ],
  equipment: [
    { label: 'All spaces', value: '' },
    { label: 'sp:utilities', value: 'sp:utilities' },
    { label: 'sp:storage', value: 'sp:storage' },
  ],
  maintenance: [
    { label: 'All spaces', value: '' },
    { label: 'sp:maintenance', value: 'sp:maintenance' },
  ],
};
export const FILTER_LABEL_WIDTH = 16;

function buildPlaceholderCatalog(): PlaceholderTimeSeries[] {
  const catalog: PlaceholderTimeSeries[] = HANDCRAFTED_PLACEHOLDER_TIME_SERIES.map((series, index) => ({
    ...series,
    height: 1.2 + index * 0.45,
    createdTime: new Date(Date.UTC(2022, index % 12, ((index * 2) % 28) + 1, 9, 0, 0)).toISOString(),
  }));
  const viewIds = PLACEHOLDER_VIEWS.map((view) => view.id);
  const units = ['bar', 'kW', '%', '°C', 'm³/h', 'kPa', 'mm/s'];
  const types: TimeSeriesType[] = ['numeric', 'numeric', 'state', 'string'];

  for (let i = catalog.length; i < PLACEHOLDER_CATALOG_SIZE; i++) {
    const viewId = viewIds[i % viewIds.length];
    const spaceOptions =
      PLACEHOLDER_SPACES_BY_VIEW[viewId]?.filter((option) => option.value).map((option) => option.value as string) ??
      [];
    const space = spaceOptions[i % spaceOptions.length] ?? '';
    const type = types[i % types.length];
    const index = String(i).padStart(4, '0');

    catalog.push({
      externalId: `ts-gen-${index}`,
      name: `Sensor ${i} – measurement`,
      description: `Generated placeholder time series ${i}.`,
      unit: units[i % units.length],
      viewId,
      space,
      type,
      isStep: i % 7 === 0,
      height: 0.5 + (i % 200) * 0.1,
      createdTime: new Date(Date.UTC(2020, 0, 1) + i * 36 * 60 * 60 * 1000).toISOString(),
      stringProperties: {} as Record<string, string>
    });
  }

  return catalog;
}

export const PLACEHOLDER_TIME_SERIES = buildPlaceholderCatalog();

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  space: '',
  externalIdPrefix: '',
  type: '',
  isStep: false,
  heightMin: '',
  heightMax: '',
  createdTimeMin: '',
  createdTimeMax: '',
};
