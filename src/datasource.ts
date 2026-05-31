import { CoreApp, DataSourceInstanceSettings, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import {
  CDFLoginOptions,
  ContainerInspectResult,
  DEFAULT_QUERY,
  InstanceId,
  InstanceResponse,
  SelectedTimeSeriesQuery,
  TimeSeries,
  ViewId,
} from './types';

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

export class DataSource extends DataSourceWithBackend<SelectedTimeSeriesQuery, CDFLoginOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<CDFLoginOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(_: CoreApp): Partial<SelectedTimeSeriesQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: SelectedTimeSeriesQuery, scopedVars: ScopedVars) {
    return {
      ...query,
      queryText: getTemplateSrv().replace(query.queryText, scopedVars),
    };
  }

  filterQuery(query: SelectedTimeSeriesQuery): boolean {
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
    return response[0].inspectionResults.involvedViews;
  }

  async searchTimeSeries(view: ViewId, query?: string, limit?: number): Promise<TimeSeries[]> {
    const body: Record<string, unknown> = { view: {
      type: 'view',
      ...view
      } };
    if (query !== undefined && query !== null) {
      body['query'] = query;
    }
    if (limit !== undefined) {
      body['limit'] = limit;
    }

    const response: InstanceResponse[] = await this.postResource('instances/search', body);
    return response.map((instance) => {
      const spaceProperties = Object.values(instance.properties)[0] as Record<string, any>;
      const properties: Record<string, any> = Object.values(spaceProperties)[0];
      const unit = properties['unit'] as InstanceId | undefined;
      return {
        space: instance.space,
        externalId: instance.externalId,
        ...(typeof properties['name'] === 'string' && { name: properties['name'] }),
        ...(typeof properties['description'] === 'string' && { description: properties['description'] }),
        ...(unit && typeof unit.externalId === 'string' && { unit: unit.externalId }),
      };
    });
  }
}
