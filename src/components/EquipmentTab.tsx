import React, { useState } from 'react';
import { SelectableValue, QueryVariableModel } from '@grafana/data';
import { InlineField, Input, Select, Stack } from '@grafana/ui';
import { EquipmentVariableQuery, QueryEditorTimeSeriesState, TimeSeries } from '../types';
import { DocumentationBlock } from './DocumentationBlock';
import { DataSource } from '../datasource';
import { versionedIdAsString } from '../utils';

interface EquipmentTabProps {
  datasource: DataSource;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (timeseries: TimeSeries) => void;
}

export function EquipmentTab({ datasource, seriesState, onAddSeries }: EquipmentTabProps) {
  const [selectedVariable, setSelectedVariable] = useState<QueryVariableModel | null>(null);
  const [selectedDataModelId, setSelectedDataModelId] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);


  const variableOptions = datasource.listQueryVariables().map((variable) => ({
    label: variable.name,
    value: variable,
  }));

  const onVariableChange = (option: SelectableValue<QueryVariableModel>)=> {
    if (!option.value) {
      return;
      }
    setSelectedVariable(option.value);
    const query = option.value.query as EquipmentVariableQuery;
    setSelectedDataModelId(versionedIdAsString(query.dataModelId));
    setSelectedViewId(versionedIdAsString(query.viewId));
  }

  // const equipmentOptions: Array<SelectableValue<string>> = PLACEHOLDER_EQUIPMENT.map((item) => ({
  //   label: item.name,
  //   value: item.id,
  // }));
  //
  // const equipmentTimeSeries = useMemo(() => {
  //   const equipment = PLACEHOLDER_EQUIPMENT.find((item) => item.id === equipmentId);
  //   if (!equipment) {
  //     return [];
  //   }
  //
  //   return equipment.timeSeriesIds
  //     .map((id) => timeSeriesById.get(id))
  //     .filter((series): series is PlaceholderTimeSeries => series !== undefined);
  // }, [equipmentId]);
  //
  // const onEquipmentChange = (option: SelectableValue<string>) => {
  //   if (option.value) {
  //     setEquipmentId(option.value);
  //   }
  // };

  return (
    <Stack direction="column" gap={1}>
      <DocumentationBlock testId="query-editor-equipment-documentation" />
      <InlineField label="Query Variable" labelWidth={15}>
        <Select
          id="query-editor-equipment-variable"
          value={selectedVariable ? { label: selectedVariable.name, value: selectedVariable } : null}
          options={variableOptions}
          onChange={onVariableChange}
          width={32}
        />
      </InlineField>
      <InlineField label="Data Model" labelWidth={16} tooltip={'Selected data model for query variable'}>
        <Input width={42} readOnly value={selectedDataModelId ?? 'Given by selected variable'} />
      </InlineField>
      <InlineField label="View" labelWidth={16} tooltip={'Selected view for query variable'}>
        <Input width={42} readOnly value={selectedViewId ?? 'Given by selected variable'} />
      </InlineField>

      {/*<InlineField label="Equipment" labelWidth={12}>*/}
      {/*  <Select*/}
      {/*    inputId="query-editor-equipment"*/}
      {/*    options={equipmentOptions}*/}
      {/*    value={equipmentId}*/}
      {/*    onChange={onEquipmentChange}*/}
      {/*    width={32}*/}
      {/*  />*/}
      {/*</InlineField>*/}

      {/*<TimeSeriesList*/}
      {/*  series={equipmentTimeSeries}*/}
      {/*  seriesState={seriesState}*/}
      {/*  onAddSeries={onAddSeries}*/}
      {/*  emptyMessage="No time series linked to this equipment."*/}
      {/*  contextLabel={`for ${selectedEquipment?.name ?? 'equipment'}`}*/}
      {/*  listResetKey={equipmentId}*/}
      {/*/>*/}
    </Stack>
  );
}
