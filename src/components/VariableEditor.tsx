import React, { useEffect, useState } from 'react';
import { InlineField, InlineFieldRow, Select } from '@grafana/ui';
import { EquipmentVariableQuery } from '../types';
import {SelectableValue} from "@grafana/data";
import {DataSource} from "../datasource";
import {versionedIdAsString} from "../utils";

interface VariableQueryProps {
  query: EquipmentVariableQuery;
  onChange: (query: EquipmentVariableQuery, definition: string) => void;
  datasource: DataSource;
}

export const VariableQueryEditor = ({ query, onChange, datasource }: VariableQueryProps) => {
  // const [variableQuery, setVariableQuery] = useState<EquipmentVariableQuery>(query);
    // Todo: Handle Errors in loading data models/ views.
  const [dataModelOptions, setDataModelOptions] = useState<Array<SelectableValue<string>>>([]);
  const [dataModelId, setDataModelId] = useState<string>('');
  
  // Load Data Models
  useEffect(() => {
      let cancelled = false;
      const loadDataModels = async () => {
          try {
              const dataModels = await datasource.getTimeSeriesDataModels();
              if (cancelled) {
                  return;
              }
              const options = dataModels.map((model) => ({label: versionedIdAsString(model), value: versionedIdAsString(model)}))
              setDataModelOptions(options);
          } catch (err) {
              console.error(err);
          } finally {
                if (!cancelled) {

                }
          }
      }
      loadDataModels();
      return () => {
          cancelled = true;
      }
  }, [datasource])

  const onDataModelChange = (option: SelectableValue<string>)=> {
      if (option.value) {
          setDataModelId(option.value);
      }
  }


  return (
    <>
      <InlineFieldRow>
        <InlineField label="Data Model" labelWidth={20}>
          <Select
            id="variable-editor-data-model"
            options={dataModelOptions}
            value={dataModelId}
            onChange={onDataModelChange}
            width={28}
          />
        </InlineField>
      </InlineFieldRow>
    </>
  );
};

