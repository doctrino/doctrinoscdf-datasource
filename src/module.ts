import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { SelectedTimeSeriesQuery, CDFLoginOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, SelectedTimeSeriesQuery, CDFLoginOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor)
;
