import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import {
  Alert,
  Button,
  IconButton,
  InlineField,
  Input,
  Select,
  Stack,
  Tab,
  TabsBar,
  useStyles2,
} from '@grafana/ui';
import { GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import {
  CDFLoginOptions,
  InstanceId,
  SelectedTimeSeriesItem,
  SelectedTimeSeriesQuery,
  TimeSeries,
  ViewId,
} from '../types';

type Props = QueryEditorProps<DataSource, SelectedTimeSeriesQuery, CDFLoginOptions>;

type SelectionTab = 'search' | 'equipment';
type TimeSeriesType = 'string' | 'numeric' | 'state';
type AggregationMethod =
  | 'average'
  | 'max'
  | 'maxDatapoint'
  | 'min'
  | 'minDatapoint'
  | 'count'
  | 'sum';

type LabelProperty =
  | 'name'
  | 'externalId'
  | 'description'
  | 'unit'
  | 'space'
  | 'type'
  | 'nameWithUnit'
  | 'externalIdWithName'
  | 'nameWithSpace';

interface SeriesConfig {
  aggregation: AggregationMethod;
  /** Property key (name, externalId, …) or custom label text. */
  label: string;
}

interface PlaceholderView {
  id: string;
  label: string;
}


interface PlaceholderTimeSeries {
  space: string;
  externalId: string;
  name: string;
  description: string;
  unit: string;
  viewId: string;
  type: TimeSeriesType;
  isStep: boolean;
  height: number;
  createdTime: string;
}

interface PlaceholderEquipment {
  id: string;
  name: string;
  timeSeriesIds: string[];
}
//
// interface SearchFilters {
//   space: string;
//   externalIdPrefix: string;
//   type: TimeSeriesType | '';
//   isStep: boolean;
//   heightMin: string;
//   heightMax: string;
//   createdTimeMin: string;
//   createdTimeMax: string;
// }


const DEFAULT_AGGREGATION: AggregationMethod = 'average';
const DEFAULT_LABEL = 'name';

const LABEL_PROPERTY_VALUES = new Set<string>([
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

const DEFAULT_SERIES_CONFIG: SeriesConfig = {
  aggregation: DEFAULT_AGGREGATION,
  label: DEFAULT_LABEL,
};

const PLACEHOLDER_VIEWS: PlaceholderView[] = [
  { id: 'asset_hierarchy', label: 'Asset hierarchy' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'maintenance', label: 'Maintenance' },
];

const PLACEHOLDER_CATALOG_SIZE = 1000;

const HANDCRAFTED_PLACEHOLDER_TIME_SERIES: Array<Omit<PlaceholderTimeSeries, 'height' | 'createdTime'>> = [
  {
    externalId: 'ts-pump-01-pressure',
    name: 'Pump 01 – discharge pressure',
    description: 'Discharge pressure on primary feed pump.',
    unit: 'bar',
    viewId: 'asset_hierarchy',
    space: 'sp:plant-a',
    type: 'numeric',
    isStep: false,
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
  },
];

const PLACEHOLDER_EQUIPMENT: PlaceholderEquipment[] = [
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

const DOCUMENTATION_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';


// const typeFilterOptions: Array<SelectableValue<TimeSeriesType | ''>> = [
//   { label: 'Any type', value: '' },
//   { label: 'String', value: 'string' },
//   { label: 'Numeric', value: 'numeric' },
//   { label: 'State', value: 'state' },
// ];

const aggregationOptions: Array<SelectableValue<AggregationMethod>> = [
  { label: 'Average', value: 'average' },
  { label: 'Max', value: 'max' },
  { label: 'Max datapoint', value: 'maxDatapoint' },
  { label: 'Min', value: 'min' },
  { label: 'Min datapoint', value: 'minDatapoint' },
  { label: 'Count', value: 'count' },
  { label: 'Sum', value: 'sum' },
];

const PLACEHOLDER_SPACES_BY_VIEW: Record<string, Array<SelectableValue<string>>> = {
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

const FILTER_LABEL_WIDTH = 16;
const PAGINATION_LABEL_WIDTH = 14;

// const DEFAULT_SEARCH_FILTERS: SearchFilters = {
//   space: '',
//   externalIdPrefix: '',
//   type: '',
//   isStep: false,
//   heightMin: '',
//   heightMax: '',
//   createdTimeMin: '',
//   createdTimeMax: '',
// };

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
    });
  }

  return catalog;
}

const PLACEHOLDER_TIME_SERIES = buildPlaceholderCatalog();

const PAGE_SIZE_OPTIONS: Array<SelectableValue<number>> = [
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
];

const timeSeriesById = new Map(PLACEHOLDER_TIME_SERIES.map((series) => [series.externalId, series]));

function getSeriesLabel(series: PlaceholderTimeSeries, labelProperty: LabelProperty): string {
  switch (labelProperty) {
    case 'externalId':
      return series.externalId;
    case 'description':
      return series.description;
    case 'unit':
      return series.unit || '—';
    case 'space':
      return series.space;
    case 'type':
      return series.type;
    case 'nameWithUnit':
      return series.unit ? `${series.name} (${series.unit})` : series.name;
    case 'externalIdWithName':
      return `${series.externalId} — ${series.name}`;
    case 'nameWithSpace':
      return `${series.name} · ${series.space}`;
    default:
      return series.name;
  }
}

function isLabelProperty(value: string): value is LabelProperty {
  return LABEL_PROPERTY_VALUES.has(value);
}

function resolveSeriesDisplayLabel(series: PlaceholderTimeSeries, label: string): string {
  if (isLabelProperty(label)) {
    return getSeriesLabel(series, label);
  }

  return label;
}

function getLabelOptionsForSeries(series: PlaceholderTimeSeries): Array<SelectableValue<string>> {
  const nameWithUnit = series.unit ? `${series.name} (${series.unit})` : series.name;
  const externalIdWithName = `${series.externalId} — ${series.name}`;
  const nameWithSpace = `${series.name} · ${series.space}`;

  return [
    { label: `Name — ${series.name}`, value: 'name' },
    { label: `External ID — ${series.externalId}`, value: 'externalId' },
    { label: `Description — ${series.description}`, value: 'description' },
    { label: `Unit — ${series.unit || '—'}`, value: 'unit' },
    { label: `Space — ${series.space}`, value: 'space' },
    { label: `Type — ${series.type}`, value: 'type' },
    { label: `Name + unit — ${nameWithUnit}`, value: 'nameWithUnit' },
    { label: `ID + name — ${externalIdWithName}`, value: 'externalIdWithName' },
    { label: `Name + space — ${nameWithSpace}`, value: 'nameWithSpace' },
  ];
}

// function parseOptionalNumber(value: string): number | null {
//   if (!value.trim()) {
//     return null;
//   }
//
//   const parsed = Number.parseFloat(value);
//   return Number.isNaN(parsed) ? null : parsed;
// }

// function parseOptionalDate(value: string): Date | null {
//   if (!value.trim()) {
//     return null;
//   }
//
//   const parsed = new Date(value);
//   return Number.isNaN(parsed.getTime()) ? null : parsed;
// }

function parseQueryState(items: SelectedTimeSeriesItem[]): {
  selectedIds: Set<string>;
  seriesConfig: Map<string, SeriesConfig>;
} {
  if (!items) {
    return { selectedIds: new Set(), seriesConfig: new Map() };
  }
  const selectedIds = new Set(items.map((item) => instanceIdAsString(item.space, item.externalId)));
  const seriesConfig = new Map<string, SeriesConfig>(items.map((item) => {
    const id = instanceIdAsString(item.space, item.externalId);
    const config = { aggregation: item.aggregation as AggregationMethod, label: item.label ?? DEFAULT_LABEL };
    return [id, config]
    }
  ))


  return { selectedIds, seriesConfig };
}

function serializeQueryState(selectedIds: Set<string>, seriesConfig: Map<string, SeriesConfig>): SelectedTimeSeriesItem[] {
  const selected = [...selectedIds].sort();
  const selectedTimeSeriesItems: SelectedTimeSeriesItem[] = [];


  for (const id of selected) {
    const config = seriesConfig.get(id) ?? DEFAULT_SERIES_CONFIG;
    const instanceId = instanceStringAsId(id);
    selectedTimeSeriesItems.push({
      space: instanceId.space,
      externalId: instanceId.externalId,
      aggregation: config.aggregation as AggregationMethod,
      label: config.label ?? DEFAULT_LABEL,
    })
  }

  return selectedTimeSeriesItems;
}

// function matchesSearchFilters(series: PlaceholderTimeSeries, filters: SearchFilters): boolean {
//   if (filters.space && series.space !== filters.space) {
//     return false;
//   }
//
//   if (filters.externalIdPrefix && !series.externalId.startsWith(filters.externalIdPrefix)) {
//     return false;
//   }
//
//   if (filters.type && series.type !== filters.type) {
//     return false;
//   }
//
//   if (filters.isStep && !series.isStep) {
//     return false;
//   }
//
//   const heightMin = parseOptionalNumber(filters.heightMin);
//   if (heightMin !== null && series.height < heightMin) {
//     return false;
//   }
//
//   const heightMax = parseOptionalNumber(filters.heightMax);
//   if (heightMax !== null && series.height > heightMax) {
//     return false;
//   }
//
//   const createdTimeMin = parseOptionalDate(filters.createdTimeMin);
//   if (createdTimeMin !== null && new Date(series.createdTime) < createdTimeMin) {
//     return false;
//   }
//
//   const createdTimeMax = parseOptionalDate(filters.createdTimeMax);
//   if (createdTimeMax !== null && new Date(series.createdTime) > createdTimeMax) {
//     return false;
//   }
//
//   return true;
// }

function DocumentationBlock({ testId }: { testId?: string }) {
  const styles = useStyles2(getStyles);
  const [showDocumentation, setShowDocumentation] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.documentationToggle}
        onClick={() => setShowDocumentation((open) => !open)}
        aria-expanded={showDocumentation}
      >
        {showDocumentation ? 'Hide documentation' : 'Documentation'}
      </button>
      {showDocumentation && (
        <p className={styles.documentation} data-testid={testId}>
          {DOCUMENTATION_TEXT}
        </p>
      )}
    </>
  );
}

// interface SearchFiltersPanelProps {
//   viewId: string;
//   filters: SearchFilters;
//   onFiltersChange: (filters: SearchFilters) => void;
// }

// function SearchFiltersPanel({ viewId, filters, onFiltersChange }: SearchFiltersPanelProps) {
//   const styles = useStyles2(getStyles);
//   const [showFilters, setShowFilters] = useState(false);
//   const spaceOptions = PLACEHOLDER_SPACES_BY_VIEW[viewId] ?? [{ label: 'All spaces', value: '' }];
//
//   const updateFilters = (patch: Partial<SearchFilters>) => {
//     onFiltersChange({ ...filters, ...patch });
//   };
//
//   return (
//     <Stack direction="column" gap={0.5}>
//       <InlineSwitch
//         id="query-editor-show-filters"
//         label="Show filters"
//         showLabel
//         value={showFilters}
//         onChange={(event) => setShowFilters(event.currentTarget.checked)}
//       />
//
//       {showFilters && (
//         <div className={styles.filtersGrid}>
//           <InlineField label="Space" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterField}>
//             <Select
//               inputId="query-editor-filter-space"
//               options={spaceOptions}
//               value={filters.space}
//               onChange={(option) => updateFilters({ space: option.value ?? '' })}
//               width={20}
//             />
//           </InlineField>
//           <InlineField
//             label="External ID"
//             labelWidth={FILTER_LABEL_WIDTH}
//             tooltip="Filter by external ID prefix"
//             className={styles.filterField}
//           >
//             <Input
//               id="query-editor-filter-external-id"
//               placeholder="Prefix…"
//               value={filters.externalIdPrefix}
//               onChange={(event) => updateFilters({ externalIdPrefix: event.currentTarget.value })}
//               width={20}
//             />
//           </InlineField>
//           <InlineField label="Type" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterField}>
//             <Select
//               inputId="query-editor-filter-type"
//               options={typeFilterOptions}
//               value={filters.type}
//               onChange={(option) => updateFilters({ type: option.value ?? '' })}
//               width={20}
//             />
//           </InlineField>
//           <InlineField label="Is step" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterField}>
//             <Checkbox
//               id="query-editor-filter-is-step"
//               value={filters.isStep}
//               label="Step only"
//               onChange={(event) => updateFilters({ isStep: event.currentTarget.checked })}
//             />
//           </InlineField>
//           <InlineField label="Height" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterFieldWide}>
//             <div className={styles.rangeInputs}>
//               <Input
//                 id="query-editor-filter-height-min"
//                 type="number"
//                 step="any"
//                 placeholder="Min"
//                 aria-label="Minimum height"
//                 value={filters.heightMin}
//                 onChange={(event) => updateFilters({ heightMin: event.currentTarget.value })}
//                 width={12}
//               />
//               <span className={styles.rangeSeparator}>to</span>
//               <Input
//                 id="query-editor-filter-height-max"
//                 type="number"
//                 step="any"
//                 placeholder="Max"
//                 aria-label="Maximum height"
//                 value={filters.heightMax}
//                 onChange={(event) => updateFilters({ heightMax: event.currentTarget.value })}
//                 width={12}
//               />
//             </div>
//           </InlineField>
//           <InlineField label="Created" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterFieldWide}>
//             <div className={styles.rangeInputs}>
//               <Input
//                 id="query-editor-filter-created-min"
//                 type="datetime-local"
//                 aria-label="Created after"
//                 value={filters.createdTimeMin}
//                 onChange={(event) => updateFilters({ createdTimeMin: event.currentTarget.value })}
//                 width={22}
//               />
//               <span className={styles.rangeSeparator}>to</span>
//               <Input
//                 id="query-editor-filter-created-max"
//                 type="datetime-local"
//                 aria-label="Created before"
//                 value={filters.createdTimeMax}
//                 onChange={(event) => updateFilters({ createdTimeMax: event.currentTarget.value })}
//                 width={22}
//               />
//             </div>
//           </InlineField>
//         </div>
//       )}
//     </Stack>
//   );
// }

interface ResultsPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function ResultsPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: ResultsPaginationProps) {
  const styles = useStyles2(getStyles);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  const onPageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPage = Number.parseInt(event.currentTarget.value, 10);
    if (!Number.isNaN(nextPage)) {
      onPageChange(Math.min(totalPages, Math.max(1, nextPage)));
    }
  };

  return (
    <div className={styles.paginationBar}>
      <span className={styles.paginationRange}>
        {totalItems === 0 ? 'No results' : `Showing ${rangeStart}–${rangeEnd} of ${totalItems.toLocaleString()}`}
      </span>
      <div className={styles.paginationControls}>
        <InlineField label="Per page" labelWidth={PAGINATION_LABEL_WIDTH} className={styles.paginationField}>
          <Select
            inputId="query-editor-page-size"
            options={PAGE_SIZE_OPTIONS}
            value={pageSize}
            onChange={(option) => {
              if (option.value) {
                onPageSizeChange(option.value);
              }
            }}
            width={12}
          />
        </InlineField>
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(1)}>
          First
        </Button>
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <InlineField label="Page" labelWidth={PAGINATION_LABEL_WIDTH} className={styles.paginationField}>
          <Input
            id="query-editor-page"
            type="number"
            min={1}
            max={totalPages}
            value={String(page)}
            onChange={onPageInputChange}
            width={10}
          />
        </InlineField>
        <span className={styles.paginationTotalPages}>of {totalPages.toLocaleString()}</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          Last
        </Button>
      </div>
    </div>
  );
}

interface TimeSeriesListProps {
  series: TimeSeries[];
  selectedIds: Set<string>;
  onAddSeries: (externalId: string) => void;
  emptyMessage: string;
  contextLabel: string;
  listResetKey: string;
}

function instanceIdAsString(space: string, externalId: string) {
  return `${space}:${externalId}`;
}

function instanceStringAsId(instanceId: string): InstanceId {
  const index = instanceId.indexOf(":")
  const space = instanceId.slice(0, index);
  const externalId = instanceId.slice(index + 1);
  return {space:space, externalId:externalId};
}

function TimeSeriesList({
  series,
  selectedIds,
  onAddSeries,
  emptyMessage,
  contextLabel,
  listResetKey,
}: TimeSeriesListProps) {
  const styles = useStyles2(getStyles);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [prevResetKey, setPrevResetKey] = useState(listResetKey);

  if (prevResetKey !== listResetKey) {
    setPrevResetKey(listResetKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(series.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedSeries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return series.slice(start, start + pageSize);
  }, [currentPage, pageSize, series]);

  const onPageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  return (
    <>
      <div className={styles.resultsHeader}>
        <span>
          {series.length.toLocaleString()} time series {contextLabel}
        </span>
        <span>{selectedIds.size} in panel</span>
      </div>

      {series.length > 0 && (
        <ResultsPagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={series.length}
          onPageChange={setPage}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      <div className={styles.resultsList} role="list" aria-label="Time series results">
        {series.length === 0 ? (
          <p className={styles.emptyState}>{emptyMessage}</p>
        ) : (
          paginatedSeries.map((item) => {
            const identifier = instanceIdAsString(item.space, item.externalId)
            const inPanel = selectedIds.has(identifier);
            const displayName = item.name ?? item.externalId
            return (
              <div key={identifier} className={styles.resultRow} role="listitem" data-in-panel={inPanel}>
                <div className={styles.resultRowMain}>
                  <div className={styles.resultRowText}>
                    <span className={styles.resultRowName}>{displayName}</span>
                    <span className={styles.resultRowMeta}>
                      {item.space} · {item.externalId}
                      {item.unit ? ` · ${item.unit}` : ''}
                    </span>
                    <p className={styles.resultDescription}>{item.description}</p>
                  </div>
                  {inPanel ? (
                    <span className={styles.inPanelBadge}>In panel</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="plus"
                      onClick={() => onAddSeries(identifier)}
                      aria-label={`Add ${displayName} to panel`}
                    >
                      Add
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

interface SeriesPanelProps {
  selectedIds: Set<string>;
  seriesConfig: Map<string, SeriesConfig>;
  onRemoveSeries: (externalId: string) => void;
  onSeriesConfigChange: (externalId: string, patch: Partial<SeriesConfig>) => void;
}

function SeriesPanel({ selectedIds, seriesConfig, onRemoveSeries, onSeriesConfigChange }: SeriesPanelProps) {
  const styles = useStyles2(getStyles);
  const sortedIds = useMemo(() => [...selectedIds].sort(), [selectedIds]);

  return (
    <div className={styles.seriesPanel}>
      <div className={styles.seriesPanelHeader}>
        <span className={styles.seriesPanelTitle}>Panel</span>
        <span className={styles.seriesPanelCount}>
          {sortedIds.length === 0 ? 'Empty' : `${sortedIds.length} timeseries`}
        </span>
      </div>

      {sortedIds.length === 0 ? (
        <p className={styles.seriesPanelEmpty}>Add time series from the list above.</p>
      ) : (
        <div className={styles.seriesPanelList}>
          {sortedIds.map((identifier) => {
            const series = timeSeriesById.get(identifier);
            const config = seriesConfig.get(identifier) ?? DEFAULT_SERIES_CONFIG;
            const displayLabel = series ? resolveSeriesDisplayLabel(series, config.label) : identifier;
            const labelOptions = series ? getLabelOptionsForSeries(series) : [];

            return (
              <div key={identifier} className={styles.seriesPanelRow}>
                <IconButton
                  name="trash-alt"
                  variant="destructive"
                  size="md"
                  tooltip="Remove from panel"
                  onClick={() => onRemoveSeries(identifier)}
                  className={styles.seriesPanelRemove}
                />
                <div className={styles.seriesPanelRowMain}>
                  <div className={styles.seriesPanelRowInfo}>
                    <span className={styles.seriesPanelRowLabel}>{displayLabel}</span>
                    <span className={styles.seriesPanelRowMeta}>{identifier}</span>
                  </div>
                  <div className={styles.seriesPanelRowControls}>
                    <InlineField
                      label="Aggregation"
                      labelWidth={FILTER_LABEL_WIDTH}
                      className={styles.panelControlField}
                      grow
                    >
                      <Select
                        inputId={`query-editor-aggregation-${identifier}`}
                        options={aggregationOptions}
                        value={config.aggregation}
                        onChange={(option) => {
                          if (option.value) {
                            onSeriesConfigChange(identifier, { aggregation: option.value });
                          }
                        }}
                      />
                    </InlineField>
                    <InlineField
                      label="Label"
                      labelWidth={FILTER_LABEL_WIDTH}
                      className={styles.panelControlField}
                      grow
                    >
                      <Select
                        inputId={`query-editor-label-${identifier}`}
                        options={labelOptions}
                        value={config.label}
                        allowCustomValue
                        placeholder="Select property or type custom label"
                        onChange={(option) => {
                          if (option.value !== undefined && option.value !== '') {
                            onSeriesConfigChange(identifier, { label: String(option.value) });
                          }
                        }}
                        onCreateOption={(value) => onSeriesConfigChange(identifier, { label: value })}
                      />
                    </InlineField>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SearchTabProps {
  datasource: DataSource;
  selectedIds: Set<string>;
  onAddSeries: (externalId: string) => void;
}


function viewIdAsString (view: ViewId) {
  return `${view.space}:${view.externalId}(version=${view.version})`;
}
function viewStringAsId (viewString: string): ViewId {
  const colonIndex = viewString.indexOf(':');
  const space = viewString.slice(0, colonIndex);
  const rest = viewString.slice(colonIndex + 1);
  const parenIndex = rest.indexOf('(version=');
  const externalId = rest.slice(0, parenIndex);
  const versionWithParen = rest.slice(parenIndex + '(version='.length);
  const version = versionWithParen.endsWith(')') ? versionWithParen.slice(0, -1) : versionWithParen;
  return { space, externalId, version };
}

function SearchTab({datasource, selectedIds, onAddSeries }: SearchTabProps) {


  const [viewOptions, setViewOptions] = useState<Array<SelectableValue<string>>>([]);
  const [isViewsLoading, setIsViewsLoading] = useState(true);
  const [viewsError, setViewsError] = useState<string | null>(null);
  const cogniteTimeSeries: ViewId = { space: 'cdf_cdm', externalId: 'CogniteTimeSeries', version: 'v1' };
  const [viewId, setViewId] = useState<string>(viewIdAsString(cogniteTimeSeries));

  const [searchQuery, setSearchQuery] = useState<string | undefined>('');
  // const [filtersByView, setFiltersByView] = useState<Record<string, SearchFilters>>({});

  const [searchResults, setSearchResults] = useState<TimeSeries[]>([]);

  // const filters = filtersByView[viewId] ?? DEFAULT_SEARCH_FILTERS;

  // Load view options
  useEffect(() => {
    let cancelled = false;
    const loadViews = async () => {
      setIsViewsLoading(true);
      setViewsError(null);
      try {
        const views = await datasource.getTimeSeriesViews();
        if (cancelled) {
          return;
        }

        const options = views.map((view) => ({ label: viewIdAsString(view), value: viewIdAsString(view) }));
        setViewOptions(options);
      } catch (err) {
        setViewsError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
      } finally {
        if (!cancelled) {
          setIsViewsLoading(false);
        }
      }
    };
    void loadViews();
    return () => {
      cancelled = true;
    };
  }, [datasource]);

  // Search time series
  useEffect(() => {
    let cancelled = false

    const searchTimeSeries = async () => {
      try {
        console.log("viewStringAsId" + viewStringAsId(viewId));
        const searchResults = await datasource.searchTimeSeries(viewStringAsId(viewId), searchQuery, 1000);
        if (cancelled) {return;}
        setSearchResults(searchResults)
      } catch (err) {
        if (!cancelled) {setSearchResults([]);}
      }
    }
    void searchTimeSeries();
    return () => {cancelled = true;};
  }, [viewId, searchQuery, datasource]);

  // const selectedView = PLACEHOLDER_VIEWS.find((view) => view.id === viewId);

  const onViewChange = (option: SelectableValue<string>) => {
    if (option.value) {
      setViewId(option.value);
    }
  };

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // const onFiltersChange = (nextFilters: SearchFilters) => {
  //   setFiltersByView((current) => ({ ...current, [viewId]: nextFilters }));
  // };

  return (
    <Stack direction="column" gap={1}>
      <DocumentationBlock testId="query-editor-documentation" />

      {viewsError && (
        <Alert severity="error" title="Failed to load views">
          {viewsError}
        </Alert>
      )}
      {!viewsError && (
      <InlineField label="View" labelWidth={12}>
        <Select
          inputId="query-editor-view"
          options={viewOptions}
          value={viewId}

          onChange={onViewChange}
          isLoading={isViewsLoading}
          disabled={isViewsLoading || viewOptions.length === 0}
          width={28}
        />
      </InlineField>)}

      <InlineField label="Search" labelWidth={12}>
        <Input
          id="query-editor-search"
          aria-label="Search time series"
          placeholder="Search any text property..."
          value={searchQuery}
          onChange={onSearchChange}
          width={40}
        />
      </InlineField>

      {/*<SearchFiltersPanel viewId={viewId} filters={filters} onFiltersChange={onFiltersChange} />*/}

      <TimeSeriesList
        series={searchResults}
        selectedIds={selectedIds}
        onAddSeries={onAddSeries}
        emptyMessage="No time series match your search or filters."
        contextLabel={`in ${viewId ?? 'view'}`}
        listResetKey={`${viewId}|${searchQuery}`}
        // listResetKey={`${viewId}|${searchQuery}|${filters.space}|${filters.externalIdPrefix}|${filters.type}|${filters.isStep}|${filters.heightMin}|${filters.heightMax}|${filters.createdTimeMin}|${filters.createdTimeMax}`}
      />
    </Stack>
  );
}

interface EquipmentTabProps {
  selectedIds: Set<string>;
  onAddSeries: (externalId: string) => void;
}

function EquipmentTab({ selectedIds, onAddSeries }: EquipmentTabProps) {
  const [equipmentId, setEquipmentId] = useState(PLACEHOLDER_EQUIPMENT[0].id);

  const equipmentOptions: Array<SelectableValue<string>> = PLACEHOLDER_EQUIPMENT.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  const equipmentTimeSeries = useMemo(() => {
    const equipment = PLACEHOLDER_EQUIPMENT.find((item) => item.id === equipmentId);
    if (!equipment) {
      return [];
    }

    return equipment.timeSeriesIds
      .map((id) => timeSeriesById.get(id))
      .filter((series): series is PlaceholderTimeSeries => series !== undefined);
  }, [equipmentId]);

  const selectedEquipment = PLACEHOLDER_EQUIPMENT.find((item) => item.id === equipmentId);

  const onEquipmentChange = (option: SelectableValue<string>) => {
    if (option.value) {
      setEquipmentId(option.value);
    }
  };

  return (
    <Stack direction="column" gap={1}>
      <DocumentationBlock testId="query-editor-equipment-documentation" />

      <InlineField label="Equipment" labelWidth={12}>
        <Select
          inputId="query-editor-equipment"
          options={equipmentOptions}
          value={equipmentId}
          onChange={onEquipmentChange}
          width={32}
        />
      </InlineField>

      <TimeSeriesList
        series={equipmentTimeSeries}
        selectedIds={selectedIds}
        onAddSeries={onAddSeries}
        emptyMessage="No time series linked to this equipment."
        contextLabel={`for ${selectedEquipment?.name ?? 'equipment'}`}
        listResetKey={equipmentId}
      />
    </Stack>
  );
}

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const [activeTab, setActiveTab] = useState<SelectionTab>('search');

  const { selectedIds, seriesConfig } = useMemo(() => parseQueryState(query.items), [query.items]);

  const persistQueryState = useCallback(
    (nextSelected: Set<string>, nextSeriesConfig: Map<string, SeriesConfig>) => {
      const timeSeriesItems = serializeQueryState(nextSelected, nextSeriesConfig);
      onChange({ ...query, items: timeSeriesItems });
      if (timeSeriesItems) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery, query]
  );

  const onAddSeries = (identifier: string) => {
    if (selectedIds.has(identifier)) {
      return;
    }

    const nextSelected = new Set(selectedIds);
    const nextSeriesConfig = new Map(seriesConfig);

    nextSelected.add(identifier);
    nextSeriesConfig.set(identifier, { ...DEFAULT_SERIES_CONFIG });

    persistQueryState(nextSelected, nextSeriesConfig);
  };

  const onRemoveSeries = (identifier: string) => {
    const nextSelected = new Set(selectedIds);
    const nextSeriesConfig = new Map(seriesConfig);

    nextSelected.delete(identifier);
    nextSeriesConfig.delete(identifier);

    persistQueryState(nextSelected, nextSeriesConfig);
  };

  const onSeriesConfigChange = (identifier: string, patch: Partial<SeriesConfig>) => {
    const nextSeriesConfig = new Map(seriesConfig);
    const current = nextSeriesConfig.get(identifier) ?? DEFAULT_SERIES_CONFIG;

    nextSeriesConfig.set(identifier, { ...current, ...patch });
    persistQueryState(selectedIds, nextSeriesConfig);
  };

  return (
    <Stack direction="column" gap={1}>
      <TabsBar>
        <Tab label="Search" active={activeTab === 'search'} onChangeTab={() => setActiveTab('search')} />
        <Tab label="Equipment" active={activeTab === 'equipment'} onChangeTab={() => setActiveTab('equipment')} />
      </TabsBar>

      {activeTab === 'search' ? (
        <SearchTab datasource={datasource} selectedIds={selectedIds} onAddSeries={onAddSeries} />
      ) : (
        <EquipmentTab selectedIds={selectedIds} onAddSeries={onAddSeries} />
      )}

      <SeriesPanel
        selectedIds={selectedIds}
        seriesConfig={seriesConfig}
        onRemoveSeries={onRemoveSeries}
        onSeriesConfigChange={onSeriesConfigChange}
      />
    </Stack>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  documentationToggle: css({
    background: 'none',
    border: 'none',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    fontSize: theme.typography.bodySmall.fontSize,
    padding: 0,
    textAlign: 'left',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    '&:hover': {
      color: theme.colors.text.primary,
    },
  }),
  documentation: css({
    color: theme.colors.text.disabled,
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: theme.typography.bodySmall.lineHeight,
    margin: theme.spacing(0, 0, 0.5, 0),
  }),
  filtersGrid: css({
    display: 'grid',
    gap: theme.spacing(0.5, 2),
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    width: '100%',
  }),
  filterField: css({
    marginBottom: 0,
    minWidth: 0,
  }),
  filterFieldWide: css({
    gridColumn: '1 / -1',
    marginBottom: 0,
    minWidth: 0,
  }),
  rangeInputs: css({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5, 1),
  }),
  rangeSeparator: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  paginationField: css({
    flexShrink: 0,
    marginBottom: 0,
  }),
  panelControlField: css({
    marginBottom: 0,
    minWidth: 0,
    width: '100%',
  }),
  resultsHeader: css({
    alignItems: 'center',
    color: theme.colors.text.secondary,
    display: 'flex',
    fontSize: theme.typography.bodySmall.fontSize,
    justifyContent: 'space-between',
  }),
  paginationBar: css({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
  }),
  paginationRange: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  paginationControls: css({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
  }),
  paginationTotalPages: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    marginRight: theme.spacing(0.5),
  }),
  resultsList: css({
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    maxHeight: '280px',
    overflowY: 'auto',
  }),
  resultRow: css({
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    padding: theme.spacing(1, 1.5),
    '&:last-child': {
      borderBottom: 'none',
    },
    '&[data-in-panel="true"]': {
      background: theme.colors.action.hover,
    },
  }),
  resultRowMain: css({
    alignItems: 'flex-start',
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
  }),
  resultRowText: css({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: theme.spacing(0.25),
    minWidth: 0,
  }),
  resultRowName: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
  }),
  resultRowMeta: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  resultDescription: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    margin: theme.spacing(0.25, 0, 0, 0),
  }),
  inPanelBadge: css({
    color: theme.colors.text.secondary,
    flexShrink: 0,
    fontSize: theme.typography.bodySmall.fontSize,
    fontStyle: 'italic',
    padding: theme.spacing(0.5, 0, 0, 0),
  }),
  emptyState: css({
    color: theme.colors.text.secondary,
    margin: theme.spacing(2),
    textAlign: 'center',
  }),
  seriesPanel: css({
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    marginTop: theme.spacing(0.5),
    overflow: 'hidden',
    padding: theme.spacing(1, 1.5),
  }),
  seriesPanelHeader: css({
    alignItems: 'baseline',
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  }),
  seriesPanelTitle: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  seriesPanelCount: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  seriesPanelEmpty: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    margin: 0,
  }),
  seriesPanelList: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.75),
  }),
  seriesPanelRow: css({
    alignItems: 'flex-start',
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    display: 'flex',
    gap: theme.spacing(0.5),
    minWidth: 0,
    overflow: 'hidden',
    padding: theme.spacing(0.75, 1),
  }),
  seriesPanelRemove: css({
    flexShrink: 0,
    marginTop: theme.spacing(0.25),
  }),
  seriesPanelRowMain: css({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: theme.spacing(1),
    minWidth: 0,
    width: '100%',
  }),
  seriesPanelRowInfo: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.25),
    minWidth: '160px',
  }),
  seriesPanelRowLabel: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  seriesPanelRowMeta: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  seriesPanelRowControls: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    minWidth: 0,
    width: '100%',
  }),
});
