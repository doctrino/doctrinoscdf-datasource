import React, { useMemo, useState } from 'react';
import { SelectableValue } from '@grafana/data';
import { InlineField, Select, Stack } from '@grafana/ui';
import { PLACEHOLDER_EQUIPMENT } from './PlaceholderValues';
import { PlaceholderTimeSeries, QueryEditorTimeSeriesState, TimeSeries } from '../types';
import { DocumentationBlock } from './DocumentationBlock';
import { TimeSeriesList } from './TimeSeriesList';
import { timeSeriesById } from './SeriesPanel';
import { DataSource } from '../datasource';

interface EquipmentTabProps {
  datasource: DataSource;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (timeseries: TimeSeries) => void;
}

export function EquipmentTab({ datasource, seriesState, onAddSeries }: EquipmentTabProps) {
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
        seriesState={seriesState}
        onAddSeries={onAddSeries}
        emptyMessage="No time series linked to this equipment."
        contextLabel={`for ${selectedEquipment?.name ?? 'equipment'}`}
        listResetKey={equipmentId}
      />
    </Stack>
  );
}
