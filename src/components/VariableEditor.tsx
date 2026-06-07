import React, { useState } from 'react';
import { InlineField, InlineFieldRow, Input } from '@grafana/ui';
import { EquipmentVariableQuery } from '../types';

interface VariableQueryProps {
  query: EquipmentVariableQuery;
  onChange: (query: EquipmentVariableQuery, definition: string) => void;
}

export const VariableQueryEditor = ({ query, onChange }: VariableQueryProps) => {
  const [state, setState] = useState<EquipmentVariableQuery>({
    ...query,
    namespace: query.namespace ?? '',
    rawQuery: query.rawQuery ?? '',
  });

  const saveQuery = () => {
    // Second argument is the human-readable label shown in the variable list
    const definition = `${state.rawQuery} (${state.namespace})`;
    onChange(state, definition);
  };

  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;

    const next = {
      ...state,
      [name]: value,
    };

    setState(next);
  };

  return (
    <>
      <InlineFieldRow>
        <InlineField label="Namespace" labelWidth={20}>
          <Input
            name="namespace"
            type="text"
            aria-label="Namespace selector"
            placeholder="Enter namespace"
            value={state.namespace}
            onChange={handleChange}
            onBlur={saveQuery}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Query" labelWidth={20}>
          <Input
            name="rawQuery"
            type="text"
            aria-label="Query selector"
            placeholder="Enter query"
            value={state.rawQuery}
            onChange={handleChange}
            onBlur={saveQuery}
          />
        </InlineField>
      </InlineFieldRow>
    </>
  );
};

