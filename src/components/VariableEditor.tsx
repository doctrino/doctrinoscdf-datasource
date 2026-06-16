import React, { useEffect, useState } from 'react';
import { FieldSet, InlineField, Select, Spinner } from '@grafana/ui';
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
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [loadModelError, setLoadModelError] = useState('');
  const [dataModelOptions, setDataModelOptions] = useState<Array<SelectableValue<string>>>([]);
  const [dataModelId, setDataModelId] = useState<string>('');
  
  // Load Data Models
  useEffect(() => {
      let cancelled = false;

      const loadDataModels = async () => {
          setIsLoadingModel(true);
          setLoadModelError('');
          try {
              const dataModels = await datasource.getTimeSeriesDataModels();
              if (cancelled) {
                  return;
              }
              const options = dataModels.map((model) => ({label: versionedIdAsString(model), value: versionedIdAsString(model)}))
              setDataModelOptions(options);
          } catch (err) {
              setLoadModelError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
          } finally {
                if (!cancelled) {
                    setIsLoadingModel(false);
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
        <FieldSet label="Equipment/Asset Variable Selection">
          { isLoadingModel && (
              <span><Spinner /> Loading data models with timeseries...</span>
          )
          }
          { !isLoadingModel && loadModelError && (
                <div>Error loading data models: {loadModelError}</div>
              )
          }
          {!isLoadingModel && !loadModelError && (
        <InlineField label="Data Model" labelWidth={20} tooltip="Select data model containing your equipment/assets. Note only data models that have time series are shown.">
          <Select
            id="variable-editor-data-model"
            options={dataModelOptions}
            value={dataModelId}
            onChange={onDataModelChange}
            width={28}
          />
        </InlineField>
        )}
        </FieldSet>
    </>
  );
};

