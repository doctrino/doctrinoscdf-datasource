import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  queryText?: string;
  constant: number;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  constant: 6.5,
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

export type LoginFlow = 'token' | 'clientCredentials' | 'deviceCode'
export type LoginMode = 'manual' | 'guided'
/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  loginFlow: LoginFlow;
  mode:  LoginMode;
  cdfCluster?: string;
  cdfProject?: string;
  cdfUrl?: string;
  clientId?: string;
  idpProvider?: string;
  idpTokenURL?: string;
  idpTenantID?: string;
  idpScopes?: string[];
  idpDiscoveryURL?: string;
  idpAudienceURL?: string;
  idpAuthorityURL?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  token?: string;
  clientSecret?: string;
}
