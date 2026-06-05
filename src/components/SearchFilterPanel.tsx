import { Checkbox, InlineField, InlineSwitch, Input, Select, Stack, useStyles2 } from '@grafana/ui';
import { getStyles } from './utils';
import { useState } from 'react';
import { FILTER_LABEL_WIDTH } from './PlaceholderValues';
import { TimeSeriesType } from '../types';
import { SelectableValue } from '@grafana/data';


const typeFilterOptions: Array<SelectableValue<TimeSeriesType | ''>> = [
  { label: 'Any type', value: '' },
  { label: 'String', value: 'string' },
  { label: 'Numeric', value: 'numeric' },
  { label: 'State', value: 'state' },
];

interface SearchFilters {
  space: string;
  externalIdPrefix: string;
  type: TimeSeriesType | '';
  isStep: boolean;
  heightMin: string;
  heightMax: string;
  createdTimeMin: string;
  createdTimeMax: string;
}

const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  space: '',
  externalIdPrefix: '',
  type: '',
  isStep: false,
  heightMin: '',
  heightMax: '',
  createdTimeMin: '',
  createdTimeMax: '',
};

interface SearchFiltersPanelProps {
  viewId: string;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export function SearchFiltersPanel({ viewId, filters, onFiltersChange }: SearchFiltersPanelProps) {
  const styles = useStyles2(getStyles);
  const [showFilters, setShowFilters] = useState(false);
  const spaceOptions = PLACEHOLDER_SPACES_BY_VIEW[viewId] ?? [{ label: 'All spaces', value: '' }];

  const updateFilters = (patch: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <Stack direction="column" gap={0.5}>
      <InlineSwitch
        id="query-editor-show-filters"
        label="Show filters"
        showLabel
        value={showFilters}
        onChange={(event) => setShowFilters(event.currentTarget.checked)}
      />

      {showFilters && (
        <div className={styles.filtersGrid}>
          <InlineField label="Space" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterField}>
            <Select
              inputId="query-editor-filter-space"
              options={spaceOptions}
              value={filters.space}
              onChange={(option) => updateFilters({ space: option.value ?? '' })}
              width={20}
            />
          </InlineField>
          <InlineField
            label="External ID"
            labelWidth={FILTER_LABEL_WIDTH}
            tooltip="Filter by external ID prefix"
            className={styles.filterField}
          >
            <Input
              id="query-editor-filter-external-id"
              placeholder="Prefix…"
              value={filters.externalIdPrefix}
              onChange={(event) => updateFilters({ externalIdPrefix: event.currentTarget.value })}
              width={20}
            />
          </InlineField>
          <InlineField label="Type" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterField}>
            <Select
              inputId="query-editor-filter-type"
              options={typeFilterOptions}
              value={filters.type}
              onChange={(option) => updateFilters({ type: option.value ?? '' })}
              width={20}
            />
          </InlineField>
          <InlineField label="Is step" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterField}>
            <Checkbox
              id="query-editor-filter-is-step"
              value={filters.isStep}
              label="Step only"
              onChange={(event) => updateFilters({ isStep: event.currentTarget.checked })}
            />
          </InlineField>
          <InlineField label="Height" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterFieldWide}>
            <div className={styles.rangeInputs}>
              <Input
                id="query-editor-filter-height-min"
                type="number"
                step="any"
                placeholder="Min"
                aria-label="Minimum height"
                value={filters.heightMin}
                onChange={(event) => updateFilters({ heightMin: event.currentTarget.value })}
                width={12}
              />
              <span className={styles.rangeSeparator}>to</span>
              <Input
                id="query-editor-filter-height-max"
                type="number"
                step="any"
                placeholder="Max"
                aria-label="Maximum height"
                value={filters.heightMax}
                onChange={(event) => updateFilters({ heightMax: event.currentTarget.value })}
                width={12}
              />
            </div>
          </InlineField>
          <InlineField label="Created" labelWidth={FILTER_LABEL_WIDTH} className={styles.filterFieldWide}>
            <div className={styles.rangeInputs}>
              <Input
                id="query-editor-filter-created-min"
                type="datetime-local"
                aria-label="Created after"
                value={filters.createdTimeMin}
                onChange={(event) => updateFilters({ createdTimeMin: event.currentTarget.value })}
                width={22}
              />
              <span className={styles.rangeSeparator}>to</span>
              <Input
                id="query-editor-filter-created-max"
                type="datetime-local"
                aria-label="Created before"
                value={filters.createdTimeMax}
                onChange={(event) => updateFilters({ createdTimeMax: event.currentTarget.value })}
                width={22}
              />
            </div>
          </InlineField>
        </div>
      )}
    </Stack>
  );
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

  const heightMin = parseOptionalNumber(filters.heightMin);
  if (heightMin !== null && series.height < heightMin) {
    return false;
  }

  const heightMax = parseOptionalNumber(filters.heightMax);
  if (heightMax !== null && series.height > heightMax) {
    return false;
  }

  const createdTimeMin = parseOptionalDate(filters.createdTimeMin);
  if (createdTimeMin !== null && new Date(series.createdTime) < createdTimeMin) {
    return false;
  }

  const createdTimeMax = parseOptionalDate(filters.createdTimeMax);
  if (createdTimeMax !== null && new Date(series.createdTime) > createdTimeMax) {
    return false;
  }

  return true;
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalDate(value: string): Date | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
