import { IconButton, InlineField, Select, useStyles2 } from '@grafana/ui';
import { getStyles } from './utils';
import React, { useMemo } from 'react';
import { AggregationMethod,  QueryEditorTimeSeriesState } from '../types';
import {
  DEFAULT_SERIES_CONFIG,
  FILTER_LABEL_WIDTH,
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

export const timeSeriesById = new Map(PLACEHOLDER_TIME_SERIES.map((series) => [series.externalId, series]));


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
            const timeseriesState = seriesState.get(identifier) ?? DEFAULT_SERIES_CONFIG;
            const displayLabel = timeseriesState ? timeseriesState.label : identifier;
            const labelStrings = (timeseriesState ? timeseriesState.labelOptions : []);
            const labelOptions: Array<SelectableValue<string>> = labelStrings.map((label) => ({ label, value: label }));

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
                        value={timeseriesState.aggregation}
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
                        value={timeseriesState.label}
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
