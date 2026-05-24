import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Button, InlineField, Input, FieldSet } from '@grafana/ui';
import { getBackendSrv } from '@grafana/runtime';
import { DeviceCodeStartResponse, DeviceCodePollResponse } from '../datasource';
import { CDFLoginOptions, CDFSecureLoginOptions } from '../types';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';

interface Props {
  options: DataSourcePluginOptionsEditorProps<CDFLoginOptions, CDFSecureLoginOptions>['options'];
  onOptionsChange: DataSourcePluginOptionsEditorProps<CDFLoginOptions, CDFSecureLoginOptions>['onOptionsChange'];
}

type FlowState = 'idle' | 'started' | 'polling' | 'complete' | 'error' | 'expired';

export function DeviceCodeLogin({ options, onOptionsChange }: Props) {
  const [state, setState] = useState<FlowState>('idle');
  const [deviceInfo, setDeviceInfo] = useState<DeviceCodeStartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dsUid = options.uid;

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startLogin = async () => {
    setError(null);
    setState('started');
    try {
      const resp: DeviceCodeStartResponse = await getBackendSrv().post(
        `/api/datasources/uid/${dsUid}/resources/device-code/start`,
        {}
      );
      setDeviceInfo(resp);
      setState('polling');
      startPolling(resp.interval);
    } catch (e: unknown) {
      setState('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const startPolling = (interval: number) => {
    cleanup();
    const pollInterval = Math.max(interval, 5) * 1000;
    pollTimerRef.current = setInterval(async () => {
      try {
        const resp: DeviceCodePollResponse = await getBackendSrv().post(
          `/api/datasources/uid/${dsUid}/resources/device-code/poll`,
          {}
        );
        switch (resp.status) {
          case 'complete':
            cleanup();
            setState('complete');
            // Write tokens to secureJsonData so user can Save
            onOptionsChange({
              ...options,
              secureJsonData: {
                ...options.secureJsonData,
                token: resp.accessToken ?? '',
                refreshToken: resp.refreshToken ?? '',
                expiry: resp.expiry !== undefined ? String(resp.expiry) : undefined,
              },
              secureJsonFields: {
                ...options.secureJsonFields,
                token: true,
                refreshToken: true,
                expiry: true,
              },
            });
            break;
          case 'expired':
            cleanup();
            setState('expired');
            setError(resp.error ?? 'Device code expired');
            break;
          case 'error':
            cleanup();
            setState('error');
            setError(resp.error ?? 'Unknown error');
            break;
          case 'pending':
            // continue polling
            break;
        }
      } catch (e: unknown) {
        cleanup();
        setState('error');
        setError(e instanceof Error ? e.message : String(e));
      }
    }, pollInterval);
  };

  return (
    <FieldSet label="Device Code Login">
      {state === 'idle' && (
        <Button onClick={startLogin} variant="primary">
          Sign in with device code
        </Button>
      )}

      {state === 'started' && <p>Starting device code flow...</p>}

      {state === 'polling' && deviceInfo && (
        <>
          <Alert title="Sign in required" severity="info">
            <p>
              Go to{' '}
              <a href={deviceInfo.verificationUri} target="_blank" rel="noopener noreferrer">
                {deviceInfo.verificationUri}
              </a>{' '}
              and enter the code:
            </p>
            <InlineField label="Code" labelWidth={8}>
              <Input value={deviceInfo.userCode} readOnly width={20} />
            </InlineField>
            <p style={{ marginTop: 8 }}>Waiting for sign-in... (expires in {deviceInfo.expiresIn}s)</p>
          </Alert>
        </>
      )}

      {state === 'complete' && (
        <Alert title="Signed in" severity="success">
          Authentication successful. Click <strong>Save &amp; Test</strong> to persist credentials.
        </Alert>
      )}

      {(state === 'error' || state === 'expired') && (
        <>
          <Alert title="Authentication failed" severity="error">
            {error}
          </Alert>
          <Button onClick={startLogin} variant="secondary" style={{ marginTop: 8 }}>
            Try again
          </Button>
        </>
      )}
    </FieldSet>
  );
}



