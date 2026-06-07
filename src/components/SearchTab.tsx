import { DataSource } from '../datasource';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { SelectableValue } from '@grafana/data';
import { FilterField, QueryEditorTimeSeriesState, TimeSeries, ViewId } from '../types';
import { viewIdAsString, viewStringAsId } from './utils';
import { Alert, InlineField, Input, Select, Stack } from '@grafana/ui';
import { DocumentationBlock } from './DocumentationBlock';
import { TimeSeriesList } from './TimeSeriesList';
import { SearchFiltersPanel } from './SearchFilterPanel';

function buildAPIFilter(filterValues: Record<string, any>, filterSchema: FilterField[]): Record<string, any> | undefined {
  const result: Record<string, any> = {};
  for (const field of filterSchema) {
    const val = filterValues[field.propertyID];
    if (val === undefined || val === '' || val === null) {continue;}

    switch (field.type) {
      case 'text':
        result[field.propertyID] = { prefix: { property: field.propertyKey, value: val } };
        break;
      case 'boolean':
      case 'enum':
        result[field.propertyID] = { equals: { property: field.propertyKey, value: val } };
        break;
      case 'float32':
      case 'float64':
      case 'int32':
      case 'int64':
        result[field.propertyID] = {
          range: {
            property: field.propertyKey,
            ...(!isNaN(Number(val[0])) && { gte: Number(val[0]) }),
            ...(!isNaN(Number(val[1])) && { lte: Number(val[1]) }),
          },
        };
        break;
      case 'date':
        result[field.propertyID] = {
          range: {
            property: field.propertyKey,
            ...(!isNaN(Date.parse(val[0])) && { gte: val[0] }),
            ...(!isNaN(Date.parse(val[1])) && { lte: val[1] }),
          },
        };
        break;
      case 'timestamp':
        result[field.propertyID] = {
          range: {
            property: field.propertyKey,
            ...(!isNaN(Date.parse(val[0])) && { gte: new Date(val[0]).toISOString() }),
            ...(!isNaN(Date.parse(val[1])) && { lte: new Date(val[1]).toISOString() }),
          },
        };
        break;

    }
  }
  return result ?? undefined;
}


interface SearchTabProps {
  datasource: DataSource;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (timeseries: TimeSeries) => void;
}

export function SearchTab({ datasource, seriesState, onAddSeries }: SearchTabProps) {
  const [viewOptions, setViewOptions] = useState<Array<SelectableValue<string>>>([]);
  const [isViewsLoading, setIsViewsLoading] = useState(true);
  const [viewsError, setViewsError] = useState<string | null>(null);
  const cogniteTimeSeries: ViewId = { space: 'cdf_cdm', externalId: 'CogniteTimeSeries', version: 'v1' };
  const [viewId, setViewId] = useState<string>(viewIdAsString(cogniteTimeSeries));

  const [searchQuery, setSearchQuery] = useState<string | undefined>('');

  const [searchResults, setSearchResults] = useState<TimeSeries[]>([]);

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isFilterSchemaLoading, setIsFilterSchemaLoading] = useState(false);
  const [filterSchema, setFilterSchema] = useState<FilterField[] | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, any> | undefined>(undefined);

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
    let cancelled = false;

    const searchTimeSeries = async () => {
      try {
        console.log("Filter values are ", filterValues);
        const apiFilter = filterSchema && filterValues ? buildAPIFilter(filterValues, filterSchema) :undefined
        console.log("Built API filter is ", apiFilter);
        const searchResults = await datasource.searchTimeSeries(viewStringAsId(viewId), searchQuery, apiFilter, 1000);
        if (cancelled) {
          return;
        }
        setSearchResults(searchResults);
      } catch (err) {
        if (!cancelled) {
          setSearchResults([]);
        }
      }
    };
    void searchTimeSeries();
    return () => {
      cancelled = true;
    };
  }, [viewId, searchQuery, filterValues, filterSchema, datasource]);

  const loadFilterSchema = async (newViewId: string) => {
    setIsFilterSchemaLoading(true);
    setFilterSchema(null);
    setFilterValues(undefined);
    try {
      const fields = await datasource.getFilterFields(viewStringAsId(newViewId));
      setFilterSchema(fields);
    } catch (err) {
      console.error('Failed to load filter schema', err);
      setFilterSchema(null);
    } finally {
      setIsFilterSchemaLoading(false);
    }
  };

  const onViewChange = (option: SelectableValue<string>) => {
    if (option.value) {
      setViewId(option.value);
      if (showFilters) {
        void loadFilterSchema(option.value);
      }
    }
  };

  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const onFilterValuesChange = (update: Partial<Record<string, any>>) => {
    setFilterValues((prev) => ({ ...prev, ...update }));
  }

  const onShowFiltersChange = async (nextValue: boolean) => {
    setShowFilters(nextValue);
    if (!nextValue) {
      setFilterSchema(null)
      setFilterValues(undefined);
      return;
    }
    await loadFilterSchema(viewId);
  };

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
        </InlineField>
      )}

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

      {
        <SearchFiltersPanel
          showFilters={showFilters}
          onShowFiltersChange={onShowFiltersChange}
          filterSchema={filterSchema ?? []}
          filterValues={filterValues ?? {}}
          onFilterValuesChange={onFilterValuesChange}
          isLoading={isFilterSchemaLoading}
        />
      }

      <TimeSeriesList
        series={searchResults}
        seriesState={seriesState}
        onAddSeries={onAddSeries}
        emptyMessage="No time series match your search or filters."
        contextLabel={`in ${viewId ?? 'view'}`}
        listResetKey={`${viewId}|${searchQuery}`}
        // listResetKey={`${viewId}|${searchQuery}|${filters.space}|${filters.externalIdPrefix}|${filters.type}|${filters.isStep}|${filters.heightMin}|${filters.heightMax}|${filters.createdTimeMin}|${filters.createdTimeMax}`}
      />
    </Stack>
  );
}
