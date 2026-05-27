import React, { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import {
  Checkbox,
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
import { CDFLoginOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, CDFLoginOptions>;

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

interface PlaceholderView {
  id: string;
  label: string;
}

interface PlaceholderTimeSeries {
  externalId: string;
  name: string;
  description: string;
  unit: string;
  viewId: string;
  space: string;
  type: TimeSeriesType;
  isStep: boolean;
}

interface PlaceholderEquipment {
  id: string;
  name: string;
  timeSeriesIds: string[];
}

interface SearchFilters {
  space: string;
  externalIdPrefix: string;
  type: TimeSeriesType | '';
  isStep: boolean;
}

interface SerializedQuery {
  selected: string[];
  aggregations: Record<string, AggregationMethod>;
}

const DEFAULT_AGGREGATION: AggregationMethod = 'average';

const PLACEHOLDER_VIEWS: PlaceholderView[] = [
  { id: 'asset_hierarchy', label: 'Asset hierarchy' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'maintenance', label: 'Maintenance' },
];

const PLACEHOLDER_TIME_SERIES: PlaceholderTimeSeries[] = [
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

const viewOptions: Array<SelectableValue<string>> = PLACEHOLDER_VIEWS.map((view) => ({
  label: view.label,
  value: view.id,
}));

const typeFilterOptions: Array<SelectableValue<TimeSeriesType | ''>> = [
  { label: 'Any type', value: '' },
  { label: 'String', value: 'string' },
  { label: 'Numeric', value: 'numeric' },
  { label: 'State', value: 'state' },
];

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

const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  space: '',
  externalIdPrefix: '',
  type: '',
  isStep: false,
};

const timeSeriesById = new Map(PLACEHOLDER_TIME_SERIES.map((series) => [series.externalId, series]));

function parseQueryState(queryText: string | undefined): {
  selectedIds: Set<string>;
  aggregations: Map<string, AggregationMethod>;
} {
  if (!queryText?.trim()) {
    return { selectedIds: new Set(), aggregations: new Map() };
  }

  if (queryText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(queryText) as SerializedQuery;
      const selectedIds = new Set(parsed.selected ?? []);
      const aggregations = new Map(
        Object.entries(parsed.aggregations ?? {}) as Array<[string, AggregationMethod]>
      );

      for (const id of selectedIds) {
        if (!aggregations.has(id)) {
          aggregations.set(id, DEFAULT_AGGREGATION);
        }
      }

      return { selectedIds, aggregations };
    } catch {
      // Fall through to legacy comma-separated format.
    }
  }

  const selectedIds = new Set(
    queryText
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
  const aggregations = new Map<string, AggregationMethod>();

  for (const id of selectedIds) {
    aggregations.set(id, DEFAULT_AGGREGATION);
  }

  return { selectedIds, aggregations };
}

function serializeQueryState(
  selectedIds: Set<string>,
  aggregations: Map<string, AggregationMethod>
): string {
  const selected = [...selectedIds].sort();
  const aggregationRecord: Record<string, AggregationMethod> = {};

  for (const id of selected) {
    aggregationRecord[id] = aggregations.get(id) ?? DEFAULT_AGGREGATION;
  }

  return JSON.stringify({ selected, aggregations: aggregationRecord } satisfies SerializedQuery);
}

function matchesSearchFilters(series: PlaceholderTimeSeries, filters: SearchFilters): boolean {
  if (filters.space && series.space !== filters.space) {
    return false;
  }

  if (filters.externalIdPrefix && !series.externalId.startsWith(filters.externalIdPrefix)) {
    return false;
  }

  if (filters.type && series.type !== filters.type) {
    return false;
  }

  if (filters.isStep && !series.isStep) {
    return false;
  }

  return true;
}

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

interface SearchFiltersPanelProps {
  viewId: string;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

function SearchFiltersPanel({ viewId, filters, onFiltersChange }: SearchFiltersPanelProps) {
  const spaceOptions = PLACEHOLDER_SPACES_BY_VIEW[viewId] ?? [{ label: 'All spaces', value: '' }];

  const updateFilters = (patch: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <Stack direction="column" gap={0.5}>
      <InlineField label="Space" labelWidth={12}>
        <Select
          inputId="query-editor-filter-space"
          options={spaceOptions}
          value={filters.space}
          onChange={(option) => updateFilters({ space: option.value ?? '' })}
          width={24}
        />
      </InlineField>
      <InlineField label="External ID" labelWidth={12} tooltip="Filter by external ID prefix">
        <Input
          id="query-editor-filter-external-id"
          placeholder="Prefix…"
          value={filters.externalIdPrefix}
          onChange={(event) => updateFilters({ externalIdPrefix: event.currentTarget.value })}
          width={24}
        />
      </InlineField>
      <InlineField label="Type" labelWidth={12}>
        <Select
          inputId="query-editor-filter-type"
          options={typeFilterOptions}
          value={filters.type}
          onChange={(option) => updateFilters({ type: option.value ?? '' })}
          width={24}
        />
      </InlineField>
      <InlineField label="Is step" labelWidth={12}>
        <Checkbox
          id="query-editor-filter-is-step"
          value={filters.isStep}
          label="Step time series only"
          onChange={(event) => updateFilters({ isStep: event.currentTarget.checked })}
        />
      </InlineField>
    </Stack>
  );
}

interface TimeSeriesListProps {
  series: PlaceholderTimeSeries[];
  selectedIds: Set<string>;
  onToggleSeries: (externalId: string, checked: boolean) => void;
  emptyMessage: string;
  contextLabel: string;
}

function TimeSeriesList({
  series,
  selectedIds,
  onToggleSeries,
  emptyMessage,
  contextLabel,
}: TimeSeriesListProps) {
  const styles = useStyles2(getStyles);

  return (
    <>
      <div className={styles.resultsHeader}>
        <span>
          {series.length} time series {contextLabel}
        </span>
        <span>{selectedIds.size} selected for panel</span>
      </div>

      <div className={styles.resultsList} role="list" aria-label="Time series results">
        {series.length === 0 ? (
          <p className={styles.emptyState}>{emptyMessage}</p>
        ) : (
          series.map((item) => {
            const isSelected = selectedIds.has(item.externalId);

            return (
              <div
                key={item.externalId}
                className={styles.resultRow}
                role="listitem"
                data-selected={isSelected}
              >
                <Checkbox
                  id={`query-editor-ts-${item.externalId}`}
                  value={isSelected}
                  label={item.name}
                  description={`${item.externalId} · ${item.unit}`}
                  onChange={(event) => onToggleSeries(item.externalId, event.currentTarget.checked)}
                />
                <p className={styles.resultDescription}>{item.description}</p>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

interface SelectedTimeSeriesPanelProps {
  selectedIds: Set<string>;
  aggregations: Map<string, AggregationMethod>;
  onAggregationChange: (externalId: string, aggregation: AggregationMethod) => void;
}

function SelectedTimeSeriesPanel({
  selectedIds,
  aggregations,
  onAggregationChange,
}: SelectedTimeSeriesPanelProps) {
  const styles = useStyles2(getStyles);
  const sortedIds = useMemo(() => [...selectedIds].sort(), [selectedIds]);

  if (sortedIds.length === 0) {
    return null;
  }

  return (
    <div className={styles.selectedPanel}>
      <div className={styles.selectedPanelHeader}>Selected time series</div>
      <div className={styles.selectedList}>
        {sortedIds.map((externalId) => {
          const series = timeSeriesById.get(externalId);
          const aggregation = aggregations.get(externalId) ?? DEFAULT_AGGREGATION;

          return (
            <div key={externalId} className={styles.selectedRow}>
              <div className={styles.selectedRowInfo}>
                <span className={styles.selectedRowName}>{series?.name ?? externalId}</span>
                <span className={styles.selectedRowMeta}>{externalId}</span>
              </div>
              <InlineField label="Aggregation" labelWidth={14}>
                <Select
                  inputId={`query-editor-aggregation-${externalId}`}
                  options={aggregationOptions}
                  value={aggregation}
                  onChange={(option) => {
                    if (option.value) {
                      onAggregationChange(externalId, option.value);
                    }
                  }}
                  width={22}
                />
              </InlineField>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SearchTabProps {
  selectedIds: Set<string>;
  onToggleSeries: (externalId: string, checked: boolean) => void;
}

function SearchTab({ selectedIds, onToggleSeries }: SearchTabProps) {
  const [viewId, setViewId] = useState(PLACEHOLDER_VIEWS[0].id);
  const [search, setSearch] = useState('');
  const [filtersByView, setFiltersByView] = useState<Record<string, SearchFilters>>({});

  const filters = filtersByView[viewId] ?? DEFAULT_SEARCH_FILTERS;

  const filteredTimeSeries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return PLACEHOLDER_TIME_SERIES.filter((series) => {
      if (series.viewId !== viewId) {
        return false;
      }

      if (!matchesSearchFilters(series, filters)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [series.name, series.externalId, series.description, series.unit]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [filters, search, viewId]);

  const selectedView = PLACEHOLDER_VIEWS.find((view) => view.id === viewId);

  const onViewChange = (option: SelectableValue<string>) => {
    if (option.value) {
      setViewId(option.value);
    }
  };

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const onFiltersChange = (nextFilters: SearchFilters) => {
    setFiltersByView((current) => ({ ...current, [viewId]: nextFilters }));
  };

  return (
    <Stack direction="column" gap={1}>
      <DocumentationBlock testId="query-editor-documentation" />

      <InlineField label="View" labelWidth={12}>
        <Select
          inputId="query-editor-view"
          options={viewOptions}
          value={viewId}
          onChange={onViewChange}
          width={28}
        />
      </InlineField>

      <InlineField label="Search" labelWidth={12}>
        <Input
          id="query-editor-search"
          aria-label="Search time series"
          placeholder="Search by name, ID, or description…"
          value={search}
          onChange={onSearchChange}
          width={40}
        />
      </InlineField>

      <SearchFiltersPanel viewId={viewId} filters={filters} onFiltersChange={onFiltersChange} />

      <TimeSeriesList
        series={filteredTimeSeries}
        selectedIds={selectedIds}
        onToggleSeries={onToggleSeries}
        emptyMessage="No time series match your search or filters."
        contextLabel={`in ${selectedView?.label ?? 'view'}`}
      />
    </Stack>
  );
}

interface EquipmentTabProps {
  selectedIds: Set<string>;
  onToggleSeries: (externalId: string, checked: boolean) => void;
}

function EquipmentTab({ selectedIds, onToggleSeries }: EquipmentTabProps) {
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
        onToggleSeries={onToggleSeries}
        emptyMessage="No time series linked to this equipment."
        contextLabel={`for ${selectedEquipment?.name ?? 'equipment'}`}
      />
    </Stack>
  );
}

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const [activeTab, setActiveTab] = useState<SelectionTab>('search');

  const { selectedIds, aggregations } = useMemo(
    () => parseQueryState(query.queryText),
    [query.queryText]
  );

  const persistQueryState = useCallback(
    (nextSelected: Set<string>, nextAggregations: Map<string, AggregationMethod>) => {
      const queryText = serializeQueryState(nextSelected, nextAggregations);
      onChange({ ...query, queryText });
      if (queryText) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery, query]
  );

  const onToggleSeries = (externalId: string, checked: boolean) => {
    const nextSelected = new Set(selectedIds);
    const nextAggregations = new Map(aggregations);

    if (checked) {
      nextSelected.add(externalId);
      if (!nextAggregations.has(externalId)) {
        nextAggregations.set(externalId, DEFAULT_AGGREGATION);
      }
    } else {
      nextSelected.delete(externalId);
      nextAggregations.delete(externalId);
    }

    persistQueryState(nextSelected, nextAggregations);
  };

  const onAggregationChange = (externalId: string, aggregation: AggregationMethod) => {
    const nextAggregations = new Map(aggregations);
    nextAggregations.set(externalId, aggregation);
    persistQueryState(selectedIds, nextAggregations);
  };

  return (
    <Stack direction="column" gap={1}>
      <TabsBar>
        <Tab
          label="Search"
          active={activeTab === 'search'}
          onChangeTab={() => setActiveTab('search')}
        />
        <Tab
          label="Equipment"
          active={activeTab === 'equipment'}
          onChangeTab={() => setActiveTab('equipment')}
        />
      </TabsBar>

      {activeTab === 'search' ? (
        <SearchTab selectedIds={selectedIds} onToggleSeries={onToggleSeries} />
      ) : (
        <EquipmentTab selectedIds={selectedIds} onToggleSeries={onToggleSeries} />
      )}

      <SelectedTimeSeriesPanel
        selectedIds={selectedIds}
        aggregations={aggregations}
        onAggregationChange={onAggregationChange}
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
  resultsHeader: css({
    alignItems: 'center',
    color: theme.colors.text.secondary,
    display: 'flex',
    fontSize: theme.typography.bodySmall.fontSize,
    justifyContent: 'space-between',
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
    '&[data-selected="true"]': {
      background: theme.colors.action.selected,
    },
  }),
  resultDescription: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    margin: theme.spacing(0.5, 0, 0, 3.5),
  }),
  emptyState: css({
    color: theme.colors.text.secondary,
    margin: theme.spacing(2),
    textAlign: 'center',
  }),
  selectedPanel: css({
    borderTop: `1px solid ${theme.colors.border.weak}`,
    marginTop: theme.spacing(0.5),
    paddingTop: theme.spacing(1),
  }),
  selectedPanelHeader: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    marginBottom: theme.spacing(1),
  }),
  selectedList: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  }),
  selectedRow: css({
    alignItems: 'flex-start',
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
    padding: theme.spacing(1, 1.5),
  }),
  selectedRowInfo: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.25),
    minWidth: '200px',
  }),
  selectedRowName: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
  }),
  selectedRowMeta: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
});
