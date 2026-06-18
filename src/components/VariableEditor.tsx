import React, { useEffect, useState } from 'react';
import { FieldSet, InlineField, Select, Spinner } from '@grafana/ui';
import { DataModelId, EquipmentVariableQuery, ViewIdWithTimeSeries } from '../types';
import {SelectableValue} from "@grafana/data";
import {DataSource} from "../datasource";
import { versionedIdAsString} from '../utils';

interface VariableQueryProps {
  query: EquipmentVariableQuery;
  onChange: (query: EquipmentVariableQuery, definition: string) => void;
  datasource: DataSource;
}

export const VariableQueryEditor = ({ query, onChange, datasource }: VariableQueryProps) => {
    //
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [loadModelError, setLoadModelError] = useState('');
  const [dataModelOptions, setDataModelOptions] = useState<Array<SelectableValue<DataModelId>>>([]);
  const [dataModelId, setDataModelId] = useState<DataModelId | null>(null);

  const [isLoadingView, setIsLoadingView] = useState(true);
  const [loadViewError, setLoadViewError] = useState('');
  const [viewOptions, setViewOptions] = useState<Array<SelectableValue<ViewIdWithTimeSeries>>>([]);
  const [viewId, setViewId] = useState<ViewIdWithTimeSeries | null>(null);


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
              const options = dataModels.map((model) => ({label: versionedIdAsString(model), value: model}))
              setDataModelOptions(options);
          } catch (err) {
              setLoadModelError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
          } finally {
                if (!cancelled) {
                    setIsLoadingModel(false);
                }
          }
      }
      void loadDataModels();
      return () => {
          cancelled = true;
      }
  }, [datasource])

  const onDataModelChange = async  (option: SelectableValue<DataModelId>)=> {
      if (!option.value) {
          return
      }
      setDataModelId(option.value);
      setIsLoadingView(true);
      try {
        const oneHopTimeSeriesViews = await datasource.getOneHopTimeSeriesViews(option.value);
        const viewOptions = oneHopTimeSeriesViews.map((view) =>( {label: versionedIdAsString(view), value: view }))
        setViewOptions(viewOptions);
          const updated: EquipmentVariableQuery = {
            ...query,
            dataModelId: option.value,
          };
          onChange(updated, `DataModel: ${JSON.stringify(option.value)}`);
       } catch (err) {
          setLoadViewError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
      } finally {
          setIsLoadingView(false);
      }
  }

  const onViewChange = async (option: SelectableValue<ViewIdWithTimeSeries>) => {
    if (!option.value) {
      return;
    }
    setViewId(option.value);
    const updated: EquipmentVariableQuery = {
      ...query,
      viewIdWithTimeSeries: option.value,
    };
    onChange(updated, `View: ${JSON.stringify(option.value)}`);
  };

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
              value={dataModelId ? {label: versionedIdAsString(dataModelId), value: dataModelId} : null}
              onChange={onDataModelChange}
              width={42}
            />
          </InlineField>
        )}
        {isLoadingView && (
          <span>
            <Spinner />
            Loading views for {dataModelId ? versionedIdAsString(dataModelId) : 'selected data model'}...
          </span>
        )}
        {!isLoadingView && loadViewError && (
          <div>
            Error loading views for {dataModelId ? versionedIdAsString(dataModelId) : 'selected data model'}: {loadViewError}
          </div>
        )}
        {!isLoadingView && !loadViewError && (
          <InlineField label="View" labelWidth={20} tooltip="Select the view to use as basis for the variable">
            <Select
                id="variable-editor-view"
                options={viewOptions}
                value={viewId ? {label: versionedIdAsString(viewId), value: viewId} : null}
                onChange={onViewChange}
                width={42}
            />
          </InlineField>
        )}
      </FieldSet>
    </>
  );
};

