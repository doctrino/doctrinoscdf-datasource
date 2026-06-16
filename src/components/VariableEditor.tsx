import React, { useEffect, useState } from 'react';
import { FieldSet, InlineField, Select, Spinner } from '@grafana/ui';
import { EquipmentVariableQuery } from '../types';
import {SelectableValue} from "@grafana/data";
import {DataSource} from "../datasource";
import { versionedIdAsString, versionedStringAsId } from '../utils';

interface VariableQueryProps {
  query: EquipmentVariableQuery;
  onChange: (query: EquipmentVariableQuery, definition: string) => void;
  datasource: DataSource;
}

export const VariableQueryEditor = ({ query, onChange, datasource }: VariableQueryProps) => {
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [loadModelError, setLoadModelError] = useState('');
  const [dataModelOptions, setDataModelOptions] = useState<Array<SelectableValue<string>>>([]);
  const [dataModelId, setDataModelId] = useState<string>('');

  const [isLoadingView, setIsLoadingView] = useState(true);
  const [loadViewError, setLoadViewError] = useState('');
  const [viewOptions, setViewOptions] = useState<Array<SelectableValue<string>>>([]);
  const [viewId, setViewId] = useState<string>('');


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

  const onDataModelChange = async  (option: SelectableValue<string>)=> {
      if (!option.value) {
          return
      }
      setDataModelId(option.value);
      const updated: EquipmentVariableQuery = {
        ...query,
        dataModelId: versionedStringAsId(option.value),
      };
      onChange(updated, `DataModel: ${option.value}`);
      setIsLoadingView(true);
      try {
        const oneHopTimeSeriesViews = await datasource.getOneHopTimeSeriesViews(versionedStringAsId(option.value));
        const viewOptions = oneHopTimeSeriesViews.map((view) =>( {label: versionedIdAsString(view), value: versionedIdAsString(view) }))
        setViewOptions(viewOptions);
       } catch (err) {
          setLoadViewError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));

      } finally {
          setIsLoadingView(false);
      }
  }

  const onViewChange = async (option: SelectableValue<string>) => {
      if (!option.value) {
          return
      }
      setViewId(option.value);
      const updated: EquipmentVariableQuery = {
        ...query,
        viewId: versionedStringAsId(option.value),
      };
      onChange(updated, `View: ${option.value}`);
  }

  return (
    <>
      <FieldSet label="Equipment/Asset Variable Selection">
        {isLoadingModel && (
          <span>
            <Spinner /> Loading data models with timeseries...
          </span>
        )}
        {!isLoadingModel && loadModelError && <div>Error loading data models: {loadModelError}</div>}
        {!isLoadingModel && !loadModelError && (
          <InlineField
            label="Data Model"
            labelWidth={20}
            tooltip="Select data model containing your equipment/assets. Note only data models that have time series are shown."
          >
            <Select
              id="variable-editor-data-model"
              options={dataModelOptions}
              value={dataModelId}
              onChange={onDataModelChange}
              width={42}
            />
          </InlineField>
        )}
        {isLoadingView && (
          <span>
            <Spinner />
            Loading views for {dataModelId}
          </span>
        )}
        {!isLoadingView && loadViewError && (
          <div>
            Error loading views for {dataModelId}: {loadViewError}
          </div>
        )}
        {!isLoadingView && !loadViewError && (
          <InlineField label="View" labelWidth={20} tooltip="Select the view to use as basis for the variable">
            <Select
                id="variable-editor-view"
                options={viewOptions}
                value={viewId}
                onChange={onViewChange}
                width={42}
            />
          </InlineField>
        )}
      </FieldSet>
    </>
  );
};

