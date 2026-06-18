import { CoreApp, DataSourceInstanceSettings, MetricFindValue, QueryVariableModel } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import {
  CDFLoginOptions,
  ContainerInspectResult,
  DEFAULT_QUERY,
  EnumProperty,
  FilterField,
  InstanceId,
  InstanceResponse,
  EquipmentVariableQuery,
  SelectedTimeSeriesQuery,
  SpaceStatisticsResponse,
  SUPPORTED_FILTER_TYPES,
  SupportedFilterType,
  TimeSeries,
  ViewContainerPropResponse,
  ViewId,
  ViewResponse,
  DataModelId,
  DataModelResponse,
  DataModelFullResponse,
  ViewPropResponse,
  ViewIdWithTimeSeries,
} from './types';
import {EquipmentVariableSelection} from "./equipmentVariableSelection";
import { instanceIdAsString, versionedIdAsString } from './utils';
import {COGNITE_TIMESERIES} from "./const";

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

    this.variables = new EquipmentVariableSelection(this);
  }

  getDefaultQuery(_: CoreApp): Partial<SelectedTimeSeriesQuery> {
    return DEFAULT_QUERY;
  }

  filterQuery(query: SelectedTimeSeriesQuery): boolean {
    // if no query has been provided, prevent the query from being executed
    return true;
  }

  listQueryVariables(): QueryVariableModel[] {
    return getTemplateSrv()
      .getVariables()
      .filter((variable) => variable.type === 'query');
  }

  async createEquipmentVariableDropdown(query: EquipmentVariableQuery): Promise<MetricFindValue[]> {
    const viewId = {
      space: query.viewIdWithTimeSeries.space,
      externalId: query.viewIdWithTimeSeries.externalId,
      version: query.viewIdWithTimeSeries.version,
    };
    const result = await this.searchTimeSeries(viewId);
    return result.map((item) => ({
      text: item.name ?? instanceIdAsString(item.space, item.externalId),
      value: instanceIdAsString(item.space, item.externalId),
    }));
  }

  async getTimeSeriesDataModels(): Promise<DataModelId[]> {
    const timeSeriesViews = await this.getTimeSeriesViews();
    const allDataModels: DataModelResponse[] = await this.getResource('/dataModels/list', {
      includeGlobal: true,
    });
    const timeSeriesViewSet = new Set(timeSeriesViews.map(versionedIdAsString));
    return allDataModels
      .filter((model) => (model.views ?? []).some((view) => timeSeriesViewSet.has(versionedIdAsString(view))))
      .map((model) => ({
        space: model.space,
        externalId: model.externalId,
        version: model.version,
      }));
  }

  async getTimeSeriesViews(): Promise<ViewId[]> {
    const response: ContainerInspectResult[] = await this.postResource('containers/inspect', {
      items: [COGNITE_TIMESERIES],
    });
    return response[0].inspectionResults.involvedViews;
  }

  async getOneHopTimeSeriesViews(dataModelId: DataModelId): Promise<ViewIdWithTimeSeries[]> {
    const response: DataModelFullResponse[] = await this.postResource('/dataModels/retrieve', {
      items: [dataModelId],
    });
    if (response.length !== 1) {
      throw new Error(
        `Expected exactly one data model for ${versionedIdAsString(dataModelId)}, got ${response.length}`
      );
    }
    const dataModel = response[0];
    const timeSeriesViews = new Set(
      (dataModel.views ?? [])
        .filter((view) =>
          view.mappedContainers.some(
            (container) =>
              container.space === COGNITE_TIMESERIES.space && container.externalId === COGNITE_TIMESERIES.externalId
          )
        )
        .map((view) => versionedIdAsString({ space: view.space, externalId: view.externalId, version: view.version }))
    );
    return (dataModel.views ?? [])
      .map((view) => {
        return { space: view.space, externalId: view.externalId, version: view.version, timeseriesProperties: filterConnections(view.properties, timeSeriesViews)
      }}).filter((view) => view.timeseriesProperties && Object.keys(view.timeseriesProperties).length > 0);
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

function filterConnections(properties: Record<string, ViewPropResponse>, targetViews: Set<string>): Record<string, ViewPropResponse> {
  const result: Record<string, ViewPropResponse> = {}
  for (const [propertyID, property] of Object.entries(properties)) {
    if ('source' in property && property.source !== undefined) {
      // Edge and reverse connection
      const sourceKey = versionedIdAsString({
        space: property.source.space,
        externalId: property.source.externalId,
        version: property.source.version,
      });
      if (targetViews.has(sourceKey)) {
        result[propertyID] = property;
      }
    } else if ("type" in property && "source" in property.type && property.type.source !== undefined) {
      const sourceKey = versionedIdAsString({space: property.type.source.space, externalId: property.type.source.externalId, version: property.type.source.version})
      // Direct relation connection
      if (targetViews.has(sourceKey)) {
        result[propertyID] = property
      }
    }
  }
  return result;
}
