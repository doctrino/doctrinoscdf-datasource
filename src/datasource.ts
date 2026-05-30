import { DataSourceInstanceSettings, CoreApp, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { MyQuery, CDFLoginOptions, DEFAULT_QUERY, ViewId, ContainerInspectResult } from './types';

export interface DeviceCodeStartResponse {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  message: string;
}

export interface DeviceCodePollResponse {
  status: 'pending' | 'complete' | 'expired' | 'error';
  accessToken?: string;
  refreshToken?: string;
  expiry?: number;
  error?: string;
}

export class DataSource extends DataSourceWithBackend<MyQuery, CDFLoginOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<CDFLoginOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(_: CoreApp): Partial<MyQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: MyQuery, scopedVars: ScopedVars) {
    return {
      ...query,
      queryText: getTemplateSrv().replace(query.queryText, scopedVars),
    };
  }

  filterQuery(query: MyQuery): boolean {
    // if no query has been provided, prevent the query from being executed
    return !!query.queryText;
  }

  async getTimeSeriesViews(): Promise<ViewId[]> {
    const response: ContainerInspectResult[] = await this.postResource('containers/inspect', {
      items: [
        {
          space: 'cdf_cdm',
          externalId: 'CogniteTimeSeries',
        },
      ],
    });
    return response[0].inspectionResults.involvedViews
  }
}
