import { IconButton, InlineField, Select, useStyles2 } from '@grafana/ui';
import { getStyles } from './utils';
import React, { useMemo } from 'react';
import { AggregationMethod, PlaceholderTimeSeries,  QueryEditorTimeSeriesState } from '../types';
import {
  DEFAULT_SERIES_CONFIG,
  FILTER_LABEL_WIDTH,
  LABEL_PROPERTY_VALUES,
  PLACEHOLDER_TIME_SERIES,
} from './PlaceholderValues';
import { SelectableValue } from '@grafana/data';

const aggregationOptions: Array<SelectableValue<AggregationMethod>> = [
  { label: 'Average', value: 'average' },
  { label: 'Max', value: 'max' },
  { label: 'Max datapoint', value: 'maxDatapoint' },
  { label: 'Min', value: 'min' },
  { label: 'Min datapoint', value: 'minDatapoint' },
  { label: 'Count', value: 'count' },
  { label: 'Sum', value: 'sum' },
];
type LabelProperty =
  | 'name'
  | 'externalId'
  | 'description'
  | 'unit'
  | 'space'
  | 'type'
  | 'nameWithUnit'
  | 'externalIdWithName'
  | 'nameWithSpace';
export const timeSeriesById = new Map(PLACEHOLDER_TIME_SERIES.map((series) => [series.externalId, series]));

function getSeriesLabel(series: PlaceholderTimeSeries, labelProperty: LabelProperty): string {
  switch (labelProperty) {
    case 'externalId':
      return series.externalId;
    case 'description':
      return series.description;
    case 'unit':
      return series.unit || '—';
    case 'space':
      return series.space;
    case 'type':
      return series.type;
    case 'nameWithUnit':
      return series.unit ? `${series.name} (${series.unit})` : series.name;
    case 'externalIdWithName':
      return `${series.externalId} — ${series.name}`;
    case 'nameWithSpace':
      return `${series.name} · ${series.space}`;
    default:
      return series.name;
  }
}

function isLabelProperty(value: string): value is LabelProperty {
  return LABEL_PROPERTY_VALUES.has(value);
}

function resolveSeriesDisplayLabel(series: PlaceholderTimeSeries, label: string): string {
  if (isLabelProperty(label)) {
    return getSeriesLabel(series, label);
  }

  return label;
}

function getLabelOptionsForSeries(series: PlaceholderTimeSeries): Array<SelectableValue<string>> {
  const nameWithUnit = series.unit ? `${series.name} (${series.unit})` : series.name;
  const externalIdWithName = `${series.externalId} — ${series.name}`;
  const nameWithSpace = `${series.name} · ${series.space}`;

  return [
    { label: `Name — ${series.name}`, value: 'name' },
    { label: `External ID — ${series.externalId}`, value: 'externalId' },
    { label: `Description — ${series.description}`, value: 'description' },
    { label: `Unit — ${series.unit || '—'}`, value: 'unit' },
    { label: `Space — ${series.space}`, value: 'space' },
    { label: `Type — ${series.type}`, value: 'type' },
    { label: `Name + unit — ${nameWithUnit}`, value: 'nameWithUnit' },
    { label: `ID + name — ${externalIdWithName}`, value: 'externalIdWithName' },
    { label: `Name + space — ${nameWithSpace}`, value: 'nameWithSpace' },
  ];
}


interface SeriesPanelProps {
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onRemoveSeries: (externalId: string) => void;
  onSeriesConfigChange: (externalId: string, patch: Partial<QueryEditorTimeSeriesState>) => void;
}

export function SeriesPanel({ seriesState, onRemoveSeries, onSeriesConfigChange }: SeriesPanelProps) {
  const styles = useStyles2(getStyles);
  const sortedIds = useMemo(() => [...seriesState.keys()].sort(), [seriesState]);

  return (
    <div className={styles.seriesPanel}>
      <div className={styles.seriesPanelHeader}>
        <span className={styles.seriesPanelTitle}>Panel</span>
        <span className={styles.seriesPanelCount}>
          {sortedIds.length === 0 ? 'Empty' : `${sortedIds.length} timeseries`}
        </span>
      </div>

      {sortedIds.length === 0 ? (
        <p className={styles.seriesPanelEmpty}>Add time series from the list above.</p>
      ) : (
        <div className={styles.seriesPanelList}>
          {sortedIds.map((identifier) => {
            const series = timeSeriesById.get(identifier);
            const config = seriesState.get(identifier) ?? DEFAULT_SERIES_CONFIG;
            const displayLabel = series ? resolveSeriesDisplayLabel(series, config.label) : identifier;
            const labelOptions = series ? getLabelOptionsForSeries(series) : [];

            return (
              <div key={identifier} className={styles.seriesPanelRow}>
                <IconButton
                  name="trash-alt"
                  variant="destructive"
                  size="md"
                  tooltip="Remove from panel"
                  onClick={() => onRemoveSeries(identifier)}
                  className={styles.seriesPanelRemove}
                />
                <div className={styles.seriesPanelRowMain}>
                  <div className={styles.seriesPanelRowInfo}>
                    <span className={styles.seriesPanelRowLabel}>{displayLabel}</span>
                    <span className={styles.seriesPanelRowMeta}>{identifier}</span>
                  </div>
                  <div className={styles.seriesPanelRowControls}>
                    <InlineField
                      label="Aggregation"
                      labelWidth={FILTER_LABEL_WIDTH}
                      className={styles.panelControlField}
                      grow
                    >
                      <Select
                        inputId={`query-editor-aggregation-${identifier}`}
                        options={aggregationOptions}
                        value={config.aggregation}
                        onChange={(option) => {
                          if (option.value) {
                            onSeriesConfigChange(identifier, { aggregation: option.value });
                          }
                        }}
                      />
                    </InlineField>
                    <InlineField
                      label="Label"
                      labelWidth={FILTER_LABEL_WIDTH}
                      className={styles.panelControlField}
                      grow
                    >
                      <Select
                        inputId={`query-editor-label-${identifier}`}
                        options={labelOptions}
                        value={config.label}
                        allowCustomValue
                        placeholder="Select property or type custom label"
                        onChange={(option) => {
                          if (option.value !== undefined && option.value !== '') {
                            onSeriesConfigChange(identifier, { label: String(option.value) });
                          }
                        }}
                        onCreateOption={(value) => onSeriesConfigChange(identifier, { label: value })}
                      />
                    </InlineField>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
