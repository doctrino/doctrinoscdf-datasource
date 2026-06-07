import { CoreApp, DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import {
  CDFLoginOptions,
  ContainerInspectResult,
  DEFAULT_QUERY,
  EnumProperty,
  FilterField,
  InstanceId,
  InstanceResponse,
  MyVariableQuery,
  SelectedTimeSeriesQuery,
  SpaceStatisticsResponse,
  SUPPORTED_FILTER_TYPES,
  SupportedFilterType,
  TimeSeries,
  ViewContainerPropResponse,
  ViewId,
  ViewResponse,
} from './types';
import {MyVariableSupport} from "./variableSupport";

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
  private instanceSpaces: Promise<string[]> | null = null;
  constructor(instanceSettings: DataSourceInstanceSettings<CDFLoginOptions>) {
    super(instanceSettings);

    this.variables = new MyVariableSupport(this);
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

  async metricFindQuery(variableQuery: MyVariableQuery | string, options?: any): Promise<MetricFindValue[]> {
    if (typeof variableQuery === 'string') {
      const interpolated = getTemplateSrv().replace(variableQuery);
      const response = await this.fetchVariableValues({ rawQuery: interpolated });
      return response.map((name) => ({ text: name }));
    }

    // If using MyVariableQuery model:
    const namespace = getTemplateSrv().replace(variableQuery.namespace);
    const rawQuery = getTemplateSrv().replace(variableQuery.rawQuery);

    const response = await this.fetchMetricNames(namespace, rawQuery);

    // Adapt this to match your backend response
    return response.data.map((item: any) => ({
      text: item.name,
      // optional: value: item.id,
    }));
  }

  private async fetchMetricNames(namespace: string, rawQuery: string) {
    // call backend/API and return data in a consistent shape
  }

  private async fetchVariableValues(args: { rawQuery: string }) {
    // simplified variant if using a simple string-based query
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

  async searchTimeSeries(
    view: ViewId,
    query?: string,
    filter?: Record<string, any>,
    limit?: number
  ): Promise<TimeSeries[]> {
    const body: Record<string, unknown> = {
      view: {
        type: 'view',
        ...view,
      },
    };
    if (query !== undefined && query !== null) {
      body['query'] = query;
    }
    if (filter !== undefined && filter !== null && Object.keys(filter).length > 0) {
      body['filter'] = {
        and: Object.values(filter),
      };
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
    const response: ViewResponse[] = await this.postResource('views/retrieve', { items: [viewId] });
    if (response.length !== 1) {
      throw new Error(`Expected 1 view, got ${response.length}`);
    }
    const filterFields = Object.entries(response[0].properties)
      .filter(
        (entry): entry is [string, ViewContainerPropResponse] =>
          'container' in entry[1] &&
          SUPPORTED_FILTER_TYPES.includes(entry[1].type.type as SupportedFilterType) &&
          (entry[1].type.type === 'enum' || !(entry[1].type.list ?? false))
      )
      .map(([key, prop]) => {
        let options: Array<{ label: string; value: string }> | undefined = undefined;
        if (prop.type.type === 'enum') {
          const enumProp = prop.type as EnumProperty;
          options = Object.entries(enumProp.values).map(([valueId, enumVal]) => {
            return { label: enumVal.name ?? valueId, value: valueId };
          });
        }

        return {
          propertyID: key,
          propertyKey: [viewId.space, `${viewId.externalId}/${viewId.version}`, key],
          label: prop.name ?? key,
          type: prop.type.type as SupportedFilterType,
          options: options,
        } as FilterField;
      });
    const spaceOptions = await this.getInstanceSpaces();
    return [
      {
        propertyID: 'space',
        propertyKey: ['node', 'space'],
        label: 'Space',
        type: 'enum' as SupportedFilterType,
        options: spaceOptions.map((space) => ({ label: space, value: space })),
      },
      {
        propertyID: 'externalId',
        propertyKey: ['node', 'externalId'],
        label: 'External Id',
        type: 'text' as SupportedFilterType,
      },
      ...filterFields,
    ];
  }

  async getInstanceSpaces(): Promise<string[]> {
    if (!this.instanceSpaces) {
      const allSpaces: SpaceStatisticsResponse[] = await this.getResource('spaces/statistics');
      this.instanceSpaces = Promise.resolve(
        allSpaces.filter((space) => space.nodes + space.edges > 0).map((space) => space.space)
      );
    }
    return this.instanceSpaces;
  }
}
