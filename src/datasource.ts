import { CoreApp, DataSourceInstanceSettings, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import {
  CDFLoginOptions,
  ContainerInspectResult,
  DEFAULT_QUERY,
  FilterField,
  InstanceId,
  InstanceResponse,
  SelectedTimeSeriesQuery,
  TimeSeries, ViewContainerPropResponse,
  ViewId,
  ViewItemResponses,
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

  async searchTimeSeries(view: ViewId, query?: string, filter?: Record<string, any>, limit?: number): Promise<TimeSeries[]> {
    const body: Record<string, unknown> = { view: {
      type: 'view',
      ...view
      } };
    if (query !== undefined && query !== null) {
      body['query'] = query;
    }
    if (filter !== undefined && filter !== null) {
      body['filter'] = filter;
    }
    if (limit !== undefined) {
      body['limit'] = limit;
    }

    const response: InstanceResponse[] = await this.postResource('instances/search', body);
    return response.map((instance) => {
      const spaceProperties = Object.values(instance.properties)[0] as Record<string, any>;
      const properties: Record<string, any> = Object.values(spaceProperties)[0];
      const unit = properties['unit'] as InstanceId | undefined;
      const stringProperties = Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => typeof value === 'string') as Array<[string, string]>
      );

      return {
        space: instance.space,
        externalId: instance.externalId,
        ...(typeof properties['name'] === 'string' && { name: properties['name'] }),
        ...(typeof properties['description'] === 'string' && { description: properties['description'] }),
        ...(unit && typeof unit.externalId === 'string' && { unit: unit.externalId }),
        stringProperties: stringProperties,
      };
    });
  }

  async getFilterFields(viewId: ViewId): Promise<FilterField[]> {
    const response: ViewItemResponses = await this.postResource('views/retrieve', { items: [viewId] });
    if (response.items.length !== 1) {
      throw new Error(`Expected 1 view, got ${response.items.length}`);
    }

    return Object.entries(response.items[0].properties)
      .filter((entry): entry is [string, ViewContainerPropResponse] => 'container' in entry[1]
    ).map(([key, prop]) => {
      return {
        propertyID: key,
        label: prop.name ?? key,
        type: prop.type.type,
      };
    });
  }
}
