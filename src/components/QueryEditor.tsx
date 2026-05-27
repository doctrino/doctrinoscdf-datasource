import React, { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import {
  Button,
  Checkbox,
  InlineField,
  Input,
  Select,
  Stack,
  useStyles2,
} from '@grafana/ui';
import { GrafanaTheme2, QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { CDFLoginOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, CDFLoginOptions>;

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

const DOCUMENTATION_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

const viewOptions: Array<SelectableValue<string>> = PLACEHOLDER_VIEWS.map((view) => ({
  label: view.label,
  value: view.id,
}));

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

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const styles = useStyles2(getStyles);
  const [viewId, setViewId] = useState(PLACEHOLDER_VIEWS[0].id);
  const [search, setSearch] = useState('');
  const [showDocumentation, setShowDocumentation] = useState(false);

  const selectedIds = useMemo(() => parseSelectedIds(query.queryText), [query.queryText]);

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

  const onViewChange = (option: SelectableValue<string>) => {
    if (option.value) {
      setViewId(option.value);
    }
  };

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

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
      <Stack gap={1} wrap="wrap">
        <InlineField label="View" labelWidth={12}>
          <Select
            inputId="query-editor-view"
            options={viewOptions}
            value={viewId}
            onChange={onViewChange}
            width={28}
          />
        </InlineField>
        <InlineField>
          <Button
            variant="secondary"
            onClick={() => setShowDocumentation((open) => !open)}
            aria-expanded={showDocumentation}
          >
            {showDocumentation ? 'Hide documentation' : 'Show documentation'}
          </Button>
        </InlineField>
      </Stack>

      {showDocumentation && (
        <div className={styles.documentation} data-testid="query-editor-documentation">
          {DOCUMENTATION_TEXT}
        </div>
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

      <div className={styles.resultsHeader}>
        <span>
          {filteredTimeSeries.length} time series in {selectedView?.label ?? 'view'}
        </span>
        <span>{selectedIds.size} selected for panel</span>
      </div>

      <div className={styles.resultsList} role="list" aria-label="Time series results">
        {filteredTimeSeries.length === 0 ? (
          <p className={styles.emptyState}>No time series match your search.</p>
        ) : (
          filteredTimeSeries.map((series) => {
            const isSelected = selectedIds.has(series.externalId);

            return (
              <div
                key={series.externalId}
                className={styles.resultRow}
                role="listitem"
                data-selected={isSelected}
              >
                <Checkbox
                  id={`query-editor-ts-${series.externalId}`}
                  value={isSelected}
                  label={series.name}
                  description={`${series.externalId} · ${series.unit}`}
                  onChange={(event) => onToggleSeries(series.externalId, event.currentTarget.checked)}
                />
                <p className={styles.resultDescription}>{series.description}</p>
              </div>
            );
          })
        )}
      </div>
    </Stack>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  documentation: css({
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    padding: theme.spacing(1.5, 2),
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
