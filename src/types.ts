import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface SelectedTimeSeriesItem {
  space: string;
  externalId: string;
  aggregation: string;
  label: string;
}

export interface SelectedTimeSeriesQuery extends DataQuery {
  queryText?: string;
  constant: number;
  items: SelectedTimeSeriesItem[];
}

export const DEFAULT_QUERY: Partial<SelectedTimeSeriesQuery> = {
  constant: 6.5,
  items: [],
};

export type LoginFlow = 'token' | 'clientCredentials' | 'deviceCode';
export type LoginMode = 'manual' | 'guided';
export type IdpProvider = 'entra' | 'auth0' | 'cdf' | 'other';

/**
 * These are options configured for each DataSource instance
 */
export interface CDFLoginOptions extends DataSourceJsonData {
  loginFlow: LoginFlow;
  mode: LoginMode;
  cdfCluster?: string;
  cdfProject?: string;
  cdfUrl?: string;
  clientId?: string;
  idpProvider?: string;
  idpTokenURL?: string;
  idpDeviceCodeURL?: string;
  idpTenantID?: string;
  idpScopes?: string;
  idpDiscoveryURL?: string;
  idpAudienceURL?: string;
  idpAuthorityURL?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface CDFSecureLoginOptions {
  token?: string;
  clientSecret?: string;
  refreshToken?: string;
  expiry?: string;
}

export interface ViewId {
  space: string;
  externalId: string;
  version: string;
}

export interface InspectionResult {
  involvedViewCount: number;
  involvedViews: ViewId[];
}

export interface ContainerInspectResult {
  space: string;
  externalId: string;
  inspectionResults: InspectionResult;
}

export interface InstanceId {
  space: string;
  externalId: string;
}

export interface InstanceResponse {
  instanceType: string;
  version: number;
  space: string;
  externalId: string;
  type?: InstanceId;
  createdTime: number;
  lastUpdateTime: number;
  deletedTime?: number;
  properties: Map<string, Map<string, any>>;
}

export interface TimeSeries {
  space: string;
  externalId: string;
  name?: string;
  description?: string;
  unit?: string;
  stringProperties: Record<string, string>;
}

export type TimeSeriesType = 'string' | 'numeric' | 'state';
export type AggregationMethod = 'average' | 'max' | 'maxDatapoint' | 'min' | 'minDatapoint' | 'count' | 'sum';

export interface QueryEditorTimeSeriesState {
  aggregation: AggregationMethod;
  /** Property key (name, externalId, …) or custom label text. */
  label: string;
  labelOptions: string[];
}


export interface SearchFilters {
  space: string;
  externalIdPrefix: string;
  type: TimeSeriesType | '';
  isStep: boolean;
  heightMin: string;
  heightMax: string;
  createdTimeMin: string;
  createdTimeMax: string;
}

export interface FilterField {
  propertyID: string
  label: string; // display name
  type: 'string' | 'number' | 'boolean' | 'enum' | 'datetime';
  options?: Array<{ label: string; value: string }>; // for enum types
  range?: boolean; // true → render min/max pair
}

export interface PlaceholderView {
  id: string;
  label: string;
}

export interface PlaceholderTimeSeries {
  space: string;
  externalId: string;
  name: string;
  description: string;
  unit: string;
  viewId: string;
  type: TimeSeriesType;
  isStep: boolean;
  height: number;
  createdTime: string;
  stringProperties: Record<string, string>;
}

export interface PlaceholderEquipment {
  id: string;
  name: string;
  timeSeriesIds: string[];
}

