import React, { ChangeEvent } from 'react';
import { InlineField, Input, SecretInput, Combobox } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { CDFLoginOptions, LoginFlow, LoginMode, CDFSecureLoginOptions } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<CDFLoginOptions, CDFSecureLoginOptions> {}

const loginFlowOptions = [
  { label: 'Token', value: 'token' as const },
  { label: 'Client Credentials', value: 'clientCredentials' as const },
  { label: 'Device Code', value: 'deviceCode' as const },
];

const loginModeOptions = [
  { label: 'Guided', value: 'guided' as const },
  { label: 'Manual', value: 'manual' as const },
];

type InternalFlow =
  | 'token'
  | 'clientCredentialsGuided'
  | 'clientCredentialsManual'
  | 'deviceCodeGuided'
  | 'deviceCodeManual';

function resolveInternalFlow(loginFlow: LoginFlow, mode?: LoginMode): InternalFlow {
  if (loginFlow === 'token') {
    return 'token';
  }
  return `${loginFlow}${mode === 'manual' ? 'Manual' : 'Guided'}` as InternalFlow;
}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const onJsonDataChange = <K extends keyof CDFLoginOptions>(key: K, value: CDFLoginOptions[K]) => {
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

  const { loginFlow, mode } = jsonData;
  const internalFlow = resolveInternalFlow(loginFlow, mode);

  const renderFlowFields = () => {
    switch (internalFlow) {
      case 'token':
        return (
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
        );
      case 'clientCredentialsGuided':
      case 'deviceCodeGuided':
        return (
          <InlineField label="IDP Provider" labelWidth={14}>
            <Input
              id="config-editor-idp-provider"
              value={jsonData.idpProvider ?? ''}
              placeholder="e.g. microsoft, auth0"
              width={40}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJsonDataChange('idpProvider', e.target.value)}
            />
          </InlineField>
        );
      case 'clientCredentialsManual':
      case 'deviceCodeManual':
        return null; // add manual fields here
      default:
        return null;
    }
  };

  return (
    <>
      <InlineField label="Login Flow" labelWidth={14}>
        <Combobox
          options={loginFlowOptions}
          value={loginFlow}
          onChange={(opt) => onJsonDataChange('loginFlow', opt.value as LoginFlow)}
          width={40}
        />
      </InlineField>
      {loginFlow !== 'token' && (
        <InlineField label="Mode" labelWidth={14}>
          <Combobox
            options={loginModeOptions}
            value={mode}
            onChange={(opt) => onJsonDataChange('mode', opt.value as LoginMode)}
            width={40}
          />
        </InlineField>
      )}
      {renderFlowFields()}
    </>
  );
}
