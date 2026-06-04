import React, { useCallback, useMemo, useState } from 'react';
import { Stack, Tab, TabsBar } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import {
  AggregationMethod,
  CDFLoginOptions,
  SelectedTimeSeriesItem,
  SelectedTimeSeriesQuery,
  SeriesConfig,
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


function parseQueryState(items: SelectedTimeSeriesItem[]): {
  selectedIds: Set<string>;
  seriesConfig: Map<string, SeriesConfig>;
} {
  if (!items) {
    return { selectedIds: new Set(), seriesConfig: new Map() };
  }
  const selectedIds = new Set(items.map((item) => instanceIdAsString(item.space, item.externalId)));
  const seriesConfig = new Map<string, SeriesConfig>(
    items.map((item) => {
      const id = instanceIdAsString(item.space, item.externalId);
      const config = { aggregation: item.aggregation as AggregationMethod, label: item.label ?? DEFAULT_LABEL };
      return [id, config];
    })
  );

  return { selectedIds, seriesConfig };
}

function serializeQueryState(
  selectedIds: Set<string>,
  seriesConfig: Map<string, SeriesConfig>
): SelectedTimeSeriesItem[] {
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
    });
  }

  return selectedTimeSeriesItems;
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
