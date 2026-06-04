import React, {  useMemo, useState } from 'react';
import { Stack, Tab, TabsBar } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import {
  AggregationMethod,
  CDFLoginOptions,
  SelectedTimeSeriesItem,
  SelectedTimeSeriesQuery,
  QueryEditorTimeSeriesState,
  TimeSeries,
} from '../types';
import { instanceIdAsString } from './utils';
import { SeriesPanel } from './SeriesPanel';
import { SearchTab } from './SearchTab';
import { EquipmentTab } from './EquipmentTab';
import { DEFAULT_AGGREGATION} from './PlaceholderValues';

type Props = QueryEditorProps<DataSource, SelectedTimeSeriesQuery, CDFLoginOptions>;

type SelectionTab = 'search' | 'equipment';


export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const [activeTab, setActiveTab] = useState<SelectionTab>('search');

  const[labelOptionsCache, setLabelOptionsCache] = useState<Map<string, string[]>>(new Map());

  const seriesState = useMemo(() => {
    if (!query.items) {
      return new Map<string, QueryEditorTimeSeriesState>();
    }
    return new Map<string, QueryEditorTimeSeriesState>(
      query.items.map((item) => {
        const id = instanceIdAsString(item.space, item.externalId);
        // Use cached labelOptions if available, otherwise fallback to externalId
        const cachedOptions = labelOptionsCache.get(id) ?? [item.externalId];
        // Ensure that custom selections are included in the options.
        if (item.label && !cachedOptions.includes(item.label)) {
          cachedOptions.push(item.label);
        }

        const config: QueryEditorTimeSeriesState = {
          aggregation: item.aggregation as AggregationMethod,
          label: item.label ?? item.externalId,
          labelOptions: cachedOptions,
        };
        return [id, config];
      })
    );
  }, [query.items, labelOptionsCache]);

  // const persistQueryState = useCallback(
  //     (nextSeriesState: Map<string, QueryEditorTimeSeriesState>) => {
  //     const timeSeriesItems = serializeQueryState(nextSeriesState);
  //     onChange({ ...query, items: timeSeriesItems });
  //     if (timeSeriesItems) {
  //       onRunQuery();
  //     }
  //   },
  //   [onChange, onRunQuery, query]
  // );

  const onAddSeries = (timeseries: TimeSeries) => {
    const identifier = instanceIdAsString(timeseries.space, timeseries.externalId)
    if (seriesState.has(identifier)) {
      return;
    }
    const labelOptions = [timeseries.externalId, ...Object.values(timeseries.stringProperties)].sort();
    setLabelOptionsCache((prev) => new Map(prev).set(identifier, labelOptions));
    const nextItems: SelectedTimeSeriesItem[] = [
      ...(query.items ?? []),
      {
        space: timeseries.space,
        externalId: timeseries.externalId,
        aggregation: DEFAULT_AGGREGATION,
        label: timeseries.name ?? timeseries.externalId,
      },
    ];
    onChange({ ...query, items: nextItems });
    onRunQuery();

  };

  const onRemoveSeries = (identifier: string) => {
    setLabelOptionsCache((prev) => {
      const next = new Map(prev);
      next.delete(identifier);
      return next;
    });

    const nextItems = (query.items ?? []).filter(
        (item) => instanceIdAsString(item.space, item.externalId) !== identifier
    );
    onChange({ ...query, items: nextItems });
    onRunQuery();
  };

  const onSeriesConfigChange = (identifier: string, patch: Partial<QueryEditorTimeSeriesState>) => {
    const nextItems = query.items.map((item) => {
      if (instanceIdAsString(item.space, item.externalId) === identifier) {
        return {
          ...item,
          aggregation: patch.aggregation ?? item.aggregation,
          label: patch.label ?? item.label,
        };
      }
      return item;
    });

    onChange({ ...query, items: nextItems });
    onRunQuery();
  };

  return (
    <Stack direction="column" gap={1}>
      <TabsBar>
        <Tab label="Search" active={activeTab === 'search'} onChangeTab={() => setActiveTab('search')} />
        <Tab label="Equipment" active={activeTab === 'equipment'} onChangeTab={() => setActiveTab('equipment')} />
      </TabsBar>

      {activeTab === 'search' ? (
        <SearchTab datasource={datasource} seriesState={seriesState} onAddSeries={onAddSeries} />
      ) : (
        <EquipmentTab seriesState={seriesState} onAddSeries={onAddSeries} />
      )}

      <SeriesPanel
        seriesState={seriesState}
        onRemoveSeries={onRemoveSeries}
        onSeriesConfigChange={onSeriesConfigChange}
      />
    </Stack>
  );
}
