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

export type SupportedFilterType = 'boolean' | 'float32' | 'float64' | 'int32' | 'int64' | 'timestamp' | 'date' | 'text' | 'enum'
export const SUPPORTED_FILTER_TYPES = [
  'boolean',
  'float32',
  'float64',
  'int32',
  'int64',
  'timestamp',
  'date',
  'text',
  'enum',
] as const satisfies readonly SupportedFilterType[];
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

export interface ContainerId {
  space: string;
  externalId: string;
}

export type ConstraintStatus = "current" | "pending"  | "failed"

export interface ConstraintState {
  nullability: ConstraintStatus
  maxListSize: ConstraintStatus
  maxTextSize: ConstraintStatus
}

export interface TextProperty {
  type: 'text';
  list?: boolean;
  maxListSize?: number;
  maxTextSize?: number;
  collation?: string;
}

export interface Unit {
  externalId: string;
  sourceUnit?: string;
}

export interface PrimitiveProperty {
  type: "boolean" |"float32" |"float64" |"int32" |"int64" |"timestamp"| "date"| "json";
  unit?: Unit
  list?: boolean
  maxListSize?: number
}

export interface CDFExternalIdReference {
  type: "timeseries" | "file" |"sequence";
  list?: boolean;
  maxListSize?: number;
}

export interface ViewDirectNodeRelation {
  type: 'direct';
  container: ContainerId;
  list?: boolean;
  maxListSize?: number;
  source?: ViewId;
}

export interface EnumValue {
  name?: string;
  description?: string;
}

export interface EnumProperty {
  type: 'enum';
  unknownValue?: string;
  values: Record<string, EnumValue>
}

export type ContainerProperty = TextProperty | PrimitiveProperty | CDFExternalIdReference | ViewDirectNodeRelation | EnumProperty;


export interface ViewContainerPropResponse {
  container: ContainerId;
  containerPropertyIdentifier: string;
  type: ContainerProperty;
  constraintState: ConstraintState;
  immutable?: boolean;
  nullable?: boolean;
  autoIncrement?: boolean;
  defaultValue?: string | number | boolean | object;
  description?: string;
  name?: string;
}

export interface ViewEdgeConnectionResponse {
  connectionType: 'multi_edge_connection' | 'single_edge_connection';
  name?: string;
  description?: string;
  type: InstanceId;
  source: ViewId;
  edgeSource?: ViewId;
  direction?: "outwards" | "inwards"
}

export interface ViewPropertyId extends ViewId {
  source: ViewId;
  identifier: string;
}

export interface ViewReverseDirectRelationResponse {
  connectionType: 'multi_reverse_direct_relation' | 'single_reverse_direct_relation';
  name?: string;
  description?: string;
  source: ViewId;
  through: ViewPropertyId;
  targetsList: boolean;
}

export type ViewPropResponse =
  | ViewContainerPropResponse
  | ViewEdgeConnectionResponse
  | ViewReverseDirectRelationResponse;

export interface ViewResponse {
  space: string;
  externalId: string;
  version: string;
  createdTime: number;
  lastUpdateTime: number;
  writable: boolean;
  queryable: boolean;
  usedFor: 'node' | 'edge' | 'record' | 'all';
  isGlobal: boolean;
  properties: Record<string, ViewPropResponse>;
  mappedContainers: ContainerId[];
  name?: string;
  description?: string;
  filter?: Record<string, any>;
  implements?: ViewId[];
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
  propertyID: string;
  propertyKey: string[];
  label: string; // display name
  type: SupportedFilterType;
  options?: Array<{ label: string; value: string }>; // for enum types
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

export interface SpaceStatisticsResponse {
  space: string;
  containers: number;
  views: number;
  dataModels: number;
  edges: number;
  nodes: number;
  softDeletedEdges: number;
  softDeletedNodes: number;
  containerProperties?: number;
  recordsOnlyContainers?: number;
  recordsOnlyContainerProperties?: number;
}
