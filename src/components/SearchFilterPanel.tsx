import { Checkbox, InlineField, Spinner, InlineSwitch, Input, Select, Stack, useStyles2  } from '@grafana/ui';
import { getStyles } from './utils';
import React from 'react';
import { FilterField,  } from '../types';
import { FILTER_LABEL_WIDTH } from './PlaceholderValues';


function propertyTypeToInputType(propType: 'float32' | 'float64' | 'int32' | 'int64' | 'date' | 'timestamp'): string {
  switch (propType) {
    case 'date':
      return 'date';
    case 'timestamp':
      return 'datetime-local';
    case 'float32':
    case 'float64':
    case 'int32':
    case 'int64':
      return 'number';
    default:
      return 'number';
  }
}

function FilterFieldInput({ field, value, onChange }: {
  field: FilterField;
  value: any;
  onChange: (value: any) => void;
}) {
  const styles = useStyles2(getStyles);
  switch (field.type) {
    case 'text':
      return (
        <Input value={value ?? ''} placeholder="Prefix…" onChange={(e) => onChange(e.currentTarget.value)} width={20} />
      );
    case 'boolean':
      return <Checkbox value={value ?? false} onChange={(e) => onChange(e.currentTarget.checked)} />;
    case 'enum':
      return (
        <Select
          options={field.options}
          value={value ?? null}
          placeholder="Equals…"
          onChange={(option) => onChange(option?.value ?? null)}
          width={20}
          isClearable={true}
        />
      );
    case 'float32':
    case 'float64':
    case 'int32':
    case 'int64':
    case 'date':
    case 'timestamp':
      const inputType = propertyTypeToInputType(field.type);
      const inputWidth = (field.type === 'date' || field.type === 'timestamp') ? undefined : 10;
      return (
        <div className={styles.rangeInputs}>
          <span className={styles.rangeSeparator}>From</span>
          <Input
            type={inputType}
            placeholder="Min"
            onChange={(e) => onChange([e.currentTarget.value, value?.[1] ?? null])}
            value={value?.[0] ?? ''}
            width={inputWidth}
          />
          <span className={styles.rangeSeparator}>to</span>
          <Input
            type={inputType}
            placeholder="Max"
            onChange={(e) => onChange([value?.[0] ?? null, e.currentTarget.value])}
            value={value?.[1] ?? ''}
            width={inputWidth}
          />
        </div>
      );
    default:
      return null;
  }
}


interface SearchFiltersPanelProps {
  showFilters: boolean;
  onShowFiltersChange: (showFilters: boolean) => void;
  filterSchema: FilterField[];
  filterValues: Record<string, any>;
  onFilterValuesChange: (filter: Partial<Record<string, any>>) => void;
  isLoading: boolean;
}

export function SearchFiltersPanel({ showFilters, onShowFiltersChange, filterSchema, filterValues, onFilterValuesChange, isLoading }: SearchFiltersPanelProps) {
  const styles = useStyles2(getStyles);

  return (
    <Stack direction="column" gap={0.5}>
      <InlineSwitch
        id="query-editor-show-filters"
        label="Use filters"
        showLabel
        value={showFilters}
        onChange={(event) => onShowFiltersChange(event.currentTarget.checked)}
      />
      {showFilters && isLoading && (
        <Stack direction="row" alignItems="center" gap={1}>
          <Spinner /> Loading filter properties…
        </Stack>
      )}
      {showFilters && filterSchema.length === 0 && !isLoading && (
        <div>No properties for filtering available for the selected view.</div>
      )}

      {showFilters && filterSchema.length > 0 && (
        <div className={styles.filtersGrid}>
          {filterSchema.map((field) => (
            <InlineField
              label={field.label}
              labelWidth={FILTER_LABEL_WIDTH}
              className={
                field.type === 'timestamp' || field.type === 'date' ? styles.filterFieldWide : styles.filterField
              }
              key={field.propertyID}
            >
              <FilterFieldInput
                field={field}
                value={filterValues[field.propertyID]}
                onChange={(value) => onFilterValuesChange({ [field.propertyID]: value })}
              />
            </InlineField>
          ))}
        </div>
      )}
    </Stack>
  );
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
