import React, { useEffect, useMemo, useState } from 'react';
import { GrafanaTheme2, QueryVariableModel, SelectableValue, BusEventBase } from '@grafana/data';
import { Alert, Button, Card, IconButton, InlineField, Input, Select, Stack, Tag, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getAppEvents, getTemplateSrv} from '@grafana/runtime';
import {
  EquipmentVariableQuery,
  QueryEditorTimeSeriesState,
  TimeSeries,
  ViewContainerPropResponse,
  ViewDirectNodeRelation,
  ViewEdgeConnectionResponse, ViewId,
  ViewPropResponse,
  ViewReverseDirectRelationResponse,
} from '../types';
import { DocumentationBlock } from './DocumentationBlock';
import { DataSource } from '../datasource';
import { instanceIdAsString, versionedIdAsString, versionedStringAsId } from '../utils';



// Grafana publishes this on the app event bus whenever a dashboard variable changes.
// Not exported from @grafana/runtime in your version, so we declare a local stand-in.
class VariablesChangedEvent extends BusEventBase {
  static type = 'variables-changed';
}

interface EquipmentTabProps {
  datasource: DataSource;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (timeseries: TimeSeries) => void;
}

type ConnectionKind =
  | 'direct_relation'
  | 'edge_connection'
  | 'reverse_direct_relation';

interface ViewConnectionFrontEnd {
  propertyId: string;
  displayName: string;
  description?: string;
  isList: boolean;
  kind: ConnectionKind;
  targetView: ViewId;
  raw: ViewPropResponse;
}

function isContainerProp(p: ViewPropResponse): p is ViewContainerPropResponse {
  return (p as ViewContainerPropResponse).containerPropertyIdentifier !== undefined;
}
function isEdgeProp(p: ViewPropResponse): p is ViewEdgeConnectionResponse {
  const c = (p as ViewEdgeConnectionResponse).connectionType;
  return c === 'multi_edge_connection' || c === 'single_edge_connection';
}
function isReverseProp(p: ViewPropResponse): p is ViewReverseDirectRelationResponse {
  const c = (p as ViewReverseDirectRelationResponse).connectionType;
  return c === 'multi_reverse_direct_relation' || c === 'single_reverse_direct_relation';
}

function asFrontEndConnection(propertyId: string, prop: ViewPropResponse): ViewConnectionFrontEnd | null {
  if (isContainerProp(prop)) {
    // Only direct-relation container props can connect to time series
    if (prop.type.type !== 'direct') {
      return null;
    }
    const direct = prop.type as ViewDirectNodeRelation;
    return {
      propertyId,
      displayName: prop.name ?? propertyId,
      description: prop.description,
      isList: direct.list === true,
      kind: 'direct_relation',
      raw: prop,
      targetView: prop.type.source as ViewId,
    };
  }
  if (isEdgeProp(prop)) {
    return {
      propertyId,
      displayName: prop.name ?? propertyId,
      description: prop.description,
      isList: prop.connectionType === 'multi_edge_connection',
      kind: 'edge_connection',
      raw: prop,
      targetView: prop.source,
    };
  }
  if (isReverseProp(prop)) {
    return {
      propertyId,
      displayName: prop.name ?? propertyId,
      description: prop.description,
      isList: prop.connectionType === 'multi_reverse_direct_relation',
      kind: 'reverse_direct_relation',
      raw: prop,
      targetView: prop.source,
    };
  }
  return null;
}

function readCurrentValue(variableName: string): string | null {
  const variable =  getTemplateSrv()
    .getVariables()
    .find((v) => v.name === variableName);
  if (!variable) {
    return null;
  }
  const currentValue = (variable as QueryVariableModel).current?.text;
  if (typeof currentValue === 'string') {
    return currentValue;
  }
  if (Array.isArray(currentValue)) {
    return currentValue.join(' ');
  }
  return null
}

function useVariableCurrentValue(variableName: string | null): string  | null {
  const [value, setValue] = useState<string | null>(() => variableName ? readCurrentValue(variableName) : null);

  useEffect(() => {
    const updateValue = () => {
      setValue(variableName ? readCurrentValue(variableName) : null);
      if (!variableName) {
        return;
      }
      const sub = getAppEvents().subscribe(VariablesChangedEvent, () => {
        setValue(readCurrentValue(variableName));
      });
      return () => sub.unsubscribe();
    }
    return updateValue();
  }, [variableName])
  return value
}


// ---------- Placeholder data generators (replace with backend calls later) ----------

function placeholderSingleTimeSeries(propertyId: string): TimeSeries {
  return {
    space: 'placeholder_space',
    externalId: `${propertyId}_single_ts`,
    name: `${propertyId} (single)`,
    description: `Placeholder time series for single connection "${propertyId}"`,
    unit: 'unit',
    stringProperties: {},
  };
}

// ---------- Sub-components ----------

interface SinglePropertyRowProps {
  property: ViewConnectionFrontEnd;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (ts: TimeSeries) => void;
}

function SinglePropertyRow({ property, seriesState, onAddSeries }: SinglePropertyRowProps) {
  const ts = useMemo(() => placeholderSingleTimeSeries(property.propertyId), [property.propertyId]);
  const inPanel = seriesState.has(instanceIdAsString(ts.space, ts.externalId));

  return (
    <Card>
      <Card.Heading>{property.displayName}</Card.Heading>
      <Card.Meta>
        {['Single', kindLabel(property.kind), ts.externalId]}
      </Card.Meta>
      {property.description && <Card.Description>{property.description}</Card.Description>}
      <Card.Actions>
        {inPanel ? (
          <Tag name="In panel" colorIndex={5} />
        ) : (
          <Button size="sm" variant="secondary" icon="plus" onClick={() => onAddSeries(ts)}>
            Add to panel
          </Button>
        )}
      </Card.Actions>
    </Card>
  );
}

interface ListPropertyRowProps {
  property: ViewConnectionFrontEnd;
  viewId: ViewId;
  datasource: DataSource;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (ts: TimeSeries) => void;
}

function ListPropertyRow({ property, viewId, datasource, seriesState, onAddSeries }: ListPropertyRowProps) {
  const styles = useStyles2(getStyles);
  const [expanded, setExpanded] = useState(false);
  const [identifierOptions, setIdentifierOptions] = useState<Array<SelectableValue<string>>>([]);
  const [isIdentifierLoading, setIsIdentifierLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      setIsIdentifierLoading(true);
      setIdentifierError(null);
      try {
        const textProperties = await datasource.getTextProperties(viewId);
        if (cancelled) {
          return;
        }
        const options = textProperties.map(([key, prop], _) => ({
          label: prop.name ?? key,
          value: key
        }))
        setIdentifierOptions(options);
        if (identifier === null && options.some(o => o.value === "name")){
          setIdentifier("name");
        }
      } catch (err) {
        setIdentifierError(err instanceof Error ? err.message : JSON.stringify(err, null, 2));
      } finally {
        if (!cancelled) {
          setIsIdentifierLoading(false);
        }
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  },[datasource, identifier, viewId])


  return (
    <Card>
      <Card.Heading>

        <div className={styles.listHeader}>
          <span>{property.displayName} ({kindLabel(property.kind)})</span>
          <IconButton
            name={expanded ? 'angle-up' : 'angle-down'}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={() => setExpanded((v) => !v)}
          />
        </div>
      </Card.Heading>
      <Card.Meta>{property.description}</Card.Meta>

      {expanded && (
        <Card.Description>
          <Stack direction="column" gap={1}>
            {identifierError && (
              <Alert severity="error" title="Failed to load view">
                {identifierError}
              </Alert>
            )}
            {!identifierError && (
            <InlineField label="Identify by" labelWidth={14} tooltip="Pick a property to identify by">
              <Select
                options={identifierOptions}
                value={identifier}
                onChange={(opt) => {
                  setIdentifier(opt.value ?? null);
                }}
                isLoading={isIdentifierLoading}
                placeholder="Select property…"
                width={32}
              />
            </InlineField>
            )}

            {/*{identifier && (*/}
            {/*  <div className={styles.categoryRow}>*/}
            {/*    {categories.map((cat) => (*/}
            {/*      <Button*/}
            {/*        key={cat}*/}
            {/*        size="sm"*/}
            {/*        onClick={() => setActiveCategory(cat)}*/}
            {/*      >*/}
            {/*        {cat}*/}
            {/*      </Button>*/}
            {/*    ))}*/}
            {/*  </div>*/}
            {/*)}*/}

            {/*{identifier && activeCategory && (*/}
            {/*  <TimeSeriesList*/}
            {/*    series={categorySeries}*/}
            {/*    seriesState={seriesState}*/}
            {/*    onAddSeries={onAddSeries}*/}
            {/*    emptyMessage={`No time series in ${activeCategory}.`}*/}
            {/*    contextLabel={`in ${property.displayName} · ${activeCategory}`}*/}
            {/*    listResetKey={`${property.propertyId}|${identifier}|${activeCategory}`}*/}
            {/*  />*/}
            {/*)}*/}
          </Stack>
        </Card.Description>
      )}
    </Card>
  );
}

function kindLabel(kind: ConnectionKind): string {
  switch (kind) {
    case 'direct_relation':
      return 'direct relation';
    case 'edge_connection':
      return 'edge';
    case 'reverse_direct_relation':
      return 'reverse direct relation';
  }
}

// ---------- Main component ----------

export function EquipmentTab({ datasource, seriesState, onAddSeries }: EquipmentTabProps) {
  const [selectedVariable, setSelectedVariable] = useState<QueryVariableModel | null>(null);
  const [selectedDataModelId, setSelectedDataModelId] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);

  const currentVariableValue = useVariableCurrentValue(selectedVariable?.name ?? null);

  const [tsProperties, setTsProperties] = useState<Record<string, ViewPropResponse>>({});

  const variableOptions = datasource.listQueryVariables().map((variable) => ({
    label: variable.name,
    value: variable,
  }));

  const onVariableChange = (option: SelectableValue<QueryVariableModel>) => {
    if (!option.value) {
      return;
    }
    setSelectedVariable(option.value);
    const query = option.value.query as EquipmentVariableQuery;
    setSelectedDataModelId(versionedIdAsString(query.dataModelId));
    setSelectedViewId(versionedIdAsString(query.viewIdWithTimeSeries));
    setTsProperties(query.viewIdWithTimeSeries.timeseriesProperties ?? {});
  };

  const connectionProperty = Object.entries(tsProperties)
  .map(([id, prop]) => asFrontEndConnection(id, prop))
  .filter((p): p is ViewConnectionFrontEnd => p !== null);

  const singleConnections = connectionProperty.filter((p) => !p.isList);
  const listConnections = connectionProperty.filter((p) => p.isList);

  return (
    <Stack direction="column" gap={1}>
      <DocumentationBlock testId="query-editor-equipment-documentation" />
      <InlineField label="Query Variable" labelWidth={15}>
        <Select
          id="query-editor-equipment-variable"
          value={selectedVariable ? { label: selectedVariable.name, value: selectedVariable } : null}
          options={variableOptions}
          onChange={onVariableChange}
          width={32}
        />
      </InlineField>
      <InlineField label="Data Model" labelWidth={22} tooltip={'Selected data model for query variable'}>
        <Input width={42} readOnly value={selectedDataModelId ?? 'Given by selected variable'} />
      </InlineField>
      <InlineField label="View" labelWidth={22} tooltip={'Selected view for query variable'}>
        <Input width={42} readOnly value={selectedViewId ?? 'Given by selected variable'} />
      </InlineField>
      <InlineField label="Currently selected" labelWidth={22} tooltip="Change by editing the variable on the dashboard">
        <Input width={32} readOnly value={currentVariableValue ?? 'Given by selected variable'} />
      </InlineField>

      {selectedVariable && connectionProperty.length === 0 && (
        <p>The view {selectedViewId} does not have any time series properties</p>
      )}
      {selectedVariable && connectionProperty.length > 0 && <h5>Time series properties for {selectedViewId}</h5>}

      {singleConnections.length > 0 && (
        <>
          {singleConnections.map((p) => (
            <SinglePropertyRow key={p.propertyId} property={p} seriesState={seriesState} onAddSeries={onAddSeries} />
          ))}
        </>
      )}

      {listConnections.length > 0 && (
        <>
          {listConnections.map((p) => (
            <ListPropertyRow
              key={p.propertyId}
              property={p}
              viewId={p.targetView}
              datasource={datasource}
              seriesState={seriesState}
              onAddSeries={onAddSeries}
            />
          ))}
        </>
      )}
    </Stack>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  listHeader: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: theme.spacing(1),
  }),
  categoryRow: css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  }),
});

