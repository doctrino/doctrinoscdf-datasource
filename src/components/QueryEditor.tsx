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
}

interface PlaceholderEquipment {
  id: string;
  name: string;
  timeSeriesIds: string[];
}

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
  },
  {
    externalId: 'ts-pump-01-flow',
    name: 'Pump 01 – flow rate',
    description: 'Volumetric flow from pump 01.',
    unit: 'm³/h',
    viewId: 'asset_hierarchy',
  },
  {
    externalId: 'ts-pump-02-pressure',
    name: 'Pump 02 – discharge pressure',
    description: 'Discharge pressure on standby pump.',
    unit: 'bar',
    viewId: 'asset_hierarchy',
  },
  {
    externalId: 'ts-compressor-power',
    name: 'Compressor – active power',
    description: 'Electrical active power draw.',
    unit: 'kW',
    viewId: 'equipment',
  },
  {
    externalId: 'ts-compressor-vibration',
    name: 'Compressor – vibration RMS',
    description: 'Overall vibration level at bearing.',
    unit: 'mm/s',
    viewId: 'equipment',
  },
  {
    externalId: 'ts-tank-level',
    name: 'Storage tank – level',
    description: 'Product level in storage tank T-401.',
    unit: '%',
    viewId: 'equipment',
  },
  {
    externalId: 'ts-motor-temp',
    name: 'Motor M-12 – winding temperature',
    description: 'Stator winding temperature.',
    unit: '°C',
    viewId: 'maintenance',
  },
  {
    externalId: 'ts-filter-dp',
    name: 'Filter F-03 – differential pressure',
    description: 'Inlet/outlet differential pressure.',
    unit: 'kPa',
    viewId: 'maintenance',
  },
  {
    externalId: 'ts-valve-position',
    name: 'Control valve CV-07 – position',
    description: 'Valve stem position feedback.',
    unit: '%',
    viewId: 'maintenance',
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

const timeSeriesById = new Map(PLACEHOLDER_TIME_SERIES.map((series) => [series.externalId, series]));

function parseSelectedIds(queryText: string | undefined): Set<string> {
  if (!queryText?.trim()) {
    return new Set();
  }
  return new Set(
    queryText
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function selectedIdsToQueryText(selectedIds: Set<string>): string {
  return [...selectedIds].sort().join(',');
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

interface SearchTabProps {
  selectedIds: Set<string>;
  onToggleSeries: (externalId: string, checked: boolean) => void;
}

function SearchTab({ selectedIds, onToggleSeries }: SearchTabProps) {
  const styles = useStyles2(getStyles);
  const [viewId, setViewId] = useState(PLACEHOLDER_VIEWS[0].id);
  const [search, setSearch] = useState('');
  const [showDocumentation, setShowDocumentation] = useState(false);

  const filteredTimeSeries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return PLACEHOLDER_TIME_SERIES.filter((series) => {
      if (series.viewId !== viewId) {
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
  }, [search, viewId]);

  const selectedView = PLACEHOLDER_VIEWS.find((view) => view.id === viewId);

  const onViewChange = (option: SelectableValue<string>) => {
    if (option.value) {
      setViewId(option.value);
    }
  };

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <Stack direction="column" gap={1}>
      <div className={styles.searchToolbar}>
        <InlineField label="View" labelWidth={12}>
          <Select
            inputId="query-editor-view"
            options={viewOptions}
            value={viewId}
            onChange={onViewChange}
            width={28}
          />
        </InlineField>
        <button
          type="button"
          className={styles.documentationToggle}
          onClick={() => setShowDocumentation((open) => !open)}
          aria-expanded={showDocumentation}
        >
          {showDocumentation ? 'Hide documentation' : 'Documentation'}
        </button>
      </div>

      {showDocumentation && (
        <p className={styles.documentation} data-testid="query-editor-documentation">
          {DOCUMENTATION_TEXT}
        </p>
      )}

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

      <TimeSeriesList
        series={filteredTimeSeries}
        selectedIds={selectedIds}
        onToggleSeries={onToggleSeries}
        emptyMessage="No time series match your search."
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

  const selectedIds = useMemo(() => parseSelectedIds(query.queryText), [query.queryText]);

  const updateSelection = useCallback(
    (nextSelected: Set<string>) => {
      const queryText = selectedIdsToQueryText(nextSelected);
      onChange({ ...query, queryText });
      if (queryText) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery, query]
  );

  const onToggleSeries = (externalId: string, checked: boolean) => {
    const nextSelected = new Set(selectedIds);
    if (checked) {
      nextSelected.add(externalId);
    } else {
      nextSelected.delete(externalId);
    }
    updateSelection(nextSelected);
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
    </Stack>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  searchToolbar: css({
    alignItems: 'flex-end',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
  }),
  documentationToggle: css({
    background: 'none',
    border: 'none',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    fontSize: theme.typography.bodySmall.fontSize,
    margin: theme.spacing(0, 0, 1.25, 0),
    padding: 0,
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
    margin: 0,
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
});
