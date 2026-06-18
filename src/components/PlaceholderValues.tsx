import {
  AggregationMethod,
  QueryEditorTimeSeriesState,
} from '../types';

export const DEFAULT_AGGREGATION: AggregationMethod = 'average';
export const DEFAULT_LABEL = 'name';
export const DEFAULT_SERIES_CONFIG: QueryEditorTimeSeriesState = {
  aggregation: DEFAULT_AGGREGATION,
  label: DEFAULT_LABEL,
  labelOptions: [DEFAULT_LABEL],
};
export const DOCUMENTATION_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
export const FILTER_LABEL_WIDTH = 16;
