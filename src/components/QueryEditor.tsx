import React, { useCallback, useMemo, useState } from 'react';
import { Stack, Tab, TabsBar } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import {
  AggregationMethod,
  CDFLoginOptions,
  SelectedTimeSeriesItem,
  SelectedTimeSeriesQuery,
  QueryEditorTimeSeriesState,
} from '../types';
import { instanceIdAsString, instanceStringAsId } from './utils';
import { SeriesPanel } from './SeriesPanel';
import { SearchTab } from './SearchTab';
import { EquipmentTab } from './EquipmentTab';
import {
  DEFAULT_LABEL,
  DEFAULT_SERIES_CONFIG,
} from './PlaceholderValues';

type Props = QueryEditorProps<DataSource, SelectedTimeSeriesQuery, CDFLoginOptions>;

type SelectionTab = 'search' | 'equipment';


function parseQueryState(items: SelectedTimeSeriesItem[]): Map<string, QueryEditorTimeSeriesState> {
  if (!items) {
    return new Map();
  }
  return new Map<string, QueryEditorTimeSeriesState>(
    items.map((item) => {
      const id = instanceIdAsString(item.space, item.externalId);
      const config = { aggregation: item.aggregation as AggregationMethod, label: item.label ?? DEFAULT_LABEL };
      return [id, config];
    })
  );
}

function serializeQueryState(
  seriesState: Map<string, QueryEditorTimeSeriesState>
): SelectedTimeSeriesItem[] {
  const selectedTimeSeriesItems: SelectedTimeSeriesItem[] = [];
  for (const [id, config] of seriesState.entries()) {
    const instanceId = instanceStringAsId(id);
    selectedTimeSeriesItems.push({
      space: instanceId.space,
      externalId: instanceId.externalId,
      aggregation: config.aggregation as AggregationMethod,
      label: config.label,
    });
  }
  return selectedTimeSeriesItems;
}

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const [activeTab, setActiveTab] = useState<SelectionTab>('search');

  const seriesState = useMemo(() => parseQueryState(query.items), [query.items]);

  const persistQueryState = useCallback(
      (nextSeriesState: Map<string, QueryEditorTimeSeriesState>) => {
      const timeSeriesItems = serializeQueryState(nextSeriesState);
      onChange({ ...query, items: timeSeriesItems });
      if (timeSeriesItems) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery, query]
  );

  const onAddSeries = (identifier: string) => {
    if (seriesState.has(identifier)) {
      return;
    }

    const nextSeriesState = new Map(seriesState);

    nextSeriesState.set(identifier, { ...DEFAULT_SERIES_CONFIG });

    persistQueryState(nextSeriesState);
  };

  const onRemoveSeries = (identifier: string) => {
    const nextSeriesState = new Map(seriesState);

    nextSeriesState.delete(identifier);

    persistQueryState(nextSeriesState);
  };

  const onSeriesConfigChange = (identifier: string, patch: Partial<QueryEditorTimeSeriesState>) => {
    const nextSeriesState = new Map(seriesState);
    const current = nextSeriesState.get(identifier) ?? DEFAULT_SERIES_CONFIG;

    nextSeriesState.set(identifier, { ...current, ...patch });
    persistQueryState(nextSeriesState);
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
