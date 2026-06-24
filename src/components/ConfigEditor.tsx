import React, { ChangeEvent, useEffect } from 'react';
import { FieldSet, InlineField, Input, SecretInput, Select } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { CDFLoginOptions, LoginFlow, LoginMode, IdpProvider, CDFSecureLoginOptions } from '../types';
import { DeviceCodeLogin } from './DeviceCodeLogin';

interface Props extends DataSourcePluginOptionsEditorProps<CDFLoginOptions, CDFSecureLoginOptions> {}

const loginFlowOptions = [
  { label: 'Device Code', value: 'deviceCode' as const },
  { label: 'Client Credentials', value: 'clientCredentials' as const },
  { label: 'Token', value: 'token' as const },
];

const loginModeOptions = [
  { label: 'Guided', value: 'guided' as const },
  { label: 'Manual', value: 'manual' as const },
];

const loginProviderOptions: Array<{ label: string; value: IdpProvider }> = [
  { label: 'Microsoft Entra', value: 'entra' },
  { label: 'Auth0', value: 'auth0' },
  { label: 'CDF', value: 'cdf' },
  { label: 'Other', value: 'other' },
]

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;
  const mode = jsonData.mode ?? 'guided';
  const loginFlow = jsonData.loginFlow ?? 'deviceCode';
  const idpProvider = jsonData.idpProvider ?? 'entra';

  // Persist defaults back to Grafana if they were missing
  useEffect(() => {
    if (!jsonData.mode || !jsonData.loginFlow || !jsonData.idpProvider) {
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          mode,
          loginFlow,
          idpProvider,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onJsonDataChange = <K extends keyof CDFLoginOptions>(key: K, value: CDFLoginOptions[K]) => {
    if (jsonData[key] === value) {
      return;
    }
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, [key]: value },
    });
  };

  const onSecureChange = (key: keyof CDFSecureLoginOptions, value: string) => {
    onOptionsChange({
      ...options,
      secureJsonData: { ...secureJsonData, [key]: value },
    });
  };

  const onResetSecret = (key: keyof CDFSecureLoginOptions) => {
    onOptionsChange({
      ...options,
      secureJsonFields: { ...secureJsonFields, [key]: false },
      secureJsonData: { ...secureJsonData, [key]: '' },
    });
  };

  return (
    <>
      <InlineField label="Input mode" labelWidth={14}>
        <Select
          inputId="config-editor-login-helper-mode"
          options={loginModeOptions}
          value={mode}
          onChange={(opt) => {
            onJsonDataChange('mode', opt.value as LoginMode);
          }}
          width={40}
        />
      </InlineField>
      <FieldSet label="Project">
        {/* Shared fields go here, rendered for all flows */}
        <InlineField label="Project" labelWidth={14}>
          <Input
            id="config-editor-project"
            value={jsonData.cdfProject ?? ''}
            placeholder="Enter your CDF project"
            width={40}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('cdfProject', e.target.value)}
            required={true}
          />
        </InlineField>
        {mode === 'guided' && (
          <InlineField label="CDF Cluster" labelWidth={14}>
            <Input
              id="config-editor-cluster"
              value={jsonData.cdfCluster ?? ''}
              placeholder="Enter your CDF cluster (e.g. us-west-2)"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('cdfCluster', e.target.value)}
              required={true}
            />
          </InlineField>
        )}
        {mode === 'manual' && (
          <InlineField label="CDF URL" labelWidth={14}>
            <Input
              id="config-editor-cdf-url"
              value={jsonData.cdfUrl ?? ''}
              placeholder="Enter your CDF URL (e.g. https://us-west-2.cognite.com)"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('cdfUrl', e.target.value)}
            />
          </InlineField>
        )}
      </FieldSet>
      <FieldSet label="Authentication">
        <InlineField label="Login Flow" labelWidth={14}>
          <Select
            inputId="config-editor-login-flow"
            options={loginFlowOptions}
            value={loginFlow}
            onChange={(opt) => {
              onJsonDataChange('loginFlow', opt.value as LoginFlow);
            }}
            width={40}
          />
        </InlineField>
        {loginFlow === 'token' && (
          <InlineField label="Token" labelWidth={14}>
            <SecretInput
              id="config-editor-token"
              isConfigured={secureJsonFields.token ?? false}
              value={secureJsonData?.token ?? ''}
              placeholder="Enter your CDF token"
              width={40}
              onReset={() => onResetSecret('token')}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onSecureChange('token', e.target.value)}
              required={true}
            />
          </InlineField>
        )}
        {mode === 'guided' && loginFlow !== 'token' && (
          <InlineField label="IDP Provider" labelWidth={14}>
            <Select
              inputId="config-editor-idp-provider"
              options={loginProviderOptions}
              value={idpProvider}
              onChange={(opt) => onJsonDataChange('idpProvider', opt.value as IdpProvider)}
              width={40}
            />
          </InlineField>
        )}
        {mode === 'guided' && idpProvider === 'entra' && loginFlow !== 'token' && (
          <InlineField label="Tenant ID" labelWidth={14}>
            <Input
              id="config-editor-tenant"
              value={jsonData.idpTenantID ?? ''}
              placeholder="Enter your Entra tenant ID"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('idpTenantID', e.target.value)}
            />
          </InlineField>
        )}
        {!(mode === 'guided' && ['entra', 'cdf'].includes(idpProvider ?? '')) && loginFlow !== 'token' && (
          <InlineField label="IDP Token URL" labelWidth={14}>
            <Input
              id="config-editor-idp-token-url"
              value={jsonData.idpTokenURL ?? ''}
              placeholder="Enter your IDP token URL"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('idpTokenURL', e.target.value)}
            />
          </InlineField>
        )}
        {loginFlow === 'deviceCode' && (mode === 'manual' || idpProvider !== 'entra') && (
          <InlineField label="DeviceCodeURL" labelWidth={14}>
            <Input
              id="config-editor-idp-device-code-url"
              value={jsonData.idpDeviceCodeURL ?? ''}
              placeholder="Enter your IDP device authorization endpoint"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('idpDeviceCodeURL', e.target.value)}
            />
          </InlineField>
        )}
        {loginFlow !== 'token' && (mode === 'manual' || (idpProvider !== 'entra' && loginFlow === 'deviceCode')) && (
          <InlineField label="Scopes" labelWidth={14}>
            <Input
              id="config-editor-idp-scopes"
              value={jsonData.idpScopes ?? ''}
              placeholder="Space-separated scopes"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('idpScopes', e.target.value)}
            />
          </InlineField>
        )}
        {(loginFlow === 'clientCredentials' || (loginFlow === 'deviceCode' && mode === 'manual')) && (
          <InlineField label="Client ID" labelWidth={14}>
            <Input
              id="config-editor-client-id"
              value={jsonData.clientId ?? ''}
              placeholder="Enter your Client ID"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('clientId', e.target.value)}
              required={true}
            />
          </InlineField>
        )}
        {loginFlow === 'clientCredentials' && (
          <InlineField label="Client Secret" labelWidth={14}>
            <SecretInput
              aria-label="Client Secret"
              isConfigured={secureJsonFields.clientSecret ?? false}
              value={secureJsonData?.clientSecret ?? ''}
              placeholder="Enter your Client Secret"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onSecureChange('clientSecret', e.target.value)}
              onReset={() => onResetSecret('clientSecret')}
              required={true}
            />
          </InlineField>
        )}
        {loginFlow === 'deviceCode' && <DeviceCodeLogin options={options} onOptionsChange={onOptionsChange} />}
      </FieldSet>
    </>
  );
}
