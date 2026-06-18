import React, { useMemo, useState } from 'react';
import { GrafanaTheme2, QueryVariableModel, SelectableValue } from '@grafana/data';
import { Button, Card, IconButton, InlineField, Input, Select, Stack, Tag, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import {
  EquipmentVariableQuery,
  QueryEditorTimeSeriesState,
  TimeSeries,
  ViewContainerPropResponse,
  ViewDirectNodeRelation,
  ViewEdgeConnectionResponse,
  ViewPropResponse,
  ViewReverseDirectRelationResponse,
} from '../types';
import { DocumentationBlock } from './DocumentationBlock';
import { DataSource } from '../datasource';
import { instanceIdAsString, versionedIdAsString } from '../utils';
import { TimeSeriesList } from './TimeSeriesList';

interface EquipmentTabProps {
  datasource: DataSource;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (timeseries: TimeSeries) => void;
}

// ---------- Classification helpers ----------

type ConnectionKind =
  | 'direct_relation'
  | 'edge_connection'
  | 'reverse_direct_relation';

interface ClassifiedProperty {
  propertyId: string; // key in timeseriesProperties
  displayName: string;
  description?: string;
  isList: boolean;
  kind: ConnectionKind;
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

function classifyProperty(propertyId: string, prop: ViewPropResponse): ClassifiedProperty | null {
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
    };
  }
  return null;
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

/** Property keys (on the connected TimeSeries) that the user can group by. */
function placeholderGroupingOptions(propertyId: string): Array<SelectableValue<string>> {
  return [
    { label: 'measurement type', value: 'measurement_type' },
    { label: 'location', value: 'location' },
    { label: 'source system', value: 'source_system' },
  ].map((o) => ({ ...o, description: `Group "${propertyId}" by ${o.label}` }));
}

/** Unique category values once a grouping property is chosen. */
function placeholderCategories(propertyId: string, groupBy: string): string[] {
  return ['power', 'flow', 'voltage', 'temperature'].map((c) => `${c}__${groupBy}`);
}

/** Time series belonging to one (groupBy, category) bucket. */
function placeholderListTimeSeries(propertyId: string, groupBy: string, category: string): TimeSeries[] {
  return Array.from({ length: 6 }).map((_, i) => ({
    space: 'placeholder_space',
    externalId: `${propertyId}_${category}_${i}`,
    name: `${propertyId} · ${category} #${i + 1}`,
    description: `Placeholder ts grouped by ${groupBy}=${category}`,
    unit: 'unit',
    stringProperties: { [groupBy]: category },
  }));
}

// ---------- Sub-components ----------

interface SinglePropertyRowProps {
  property: ClassifiedProperty;
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
  property: ClassifiedProperty;
  seriesState: Map<string, QueryEditorTimeSeriesState>;
  onAddSeries: (ts: TimeSeries) => void;
}

function ListPropertyRow({ property, seriesState, onAddSeries }: ListPropertyRowProps) {
  const styles = useStyles2(getStyles);
  const [expanded, setExpanded] = useState(false);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const groupingOptions = useMemo(() => placeholderGroupingOptions(property.propertyId), [property.propertyId]);
  const categories = useMemo(
    () => (groupBy ? placeholderCategories(property.propertyId, groupBy) : []),
    [property.propertyId, groupBy]
  );
  const categorySeries = useMemo(
    () =>
      groupBy && activeCategory
        ? placeholderListTimeSeries(property.propertyId, groupBy, activeCategory)
        : [],
    [property.propertyId, groupBy, activeCategory]
  );

  return (
    <Card>
      <Card.Heading>
        <div className={styles.listHeader}>
          <span>{property.displayName}</span>
          <IconButton
            name={expanded ? 'angle-up' : 'angle-down'}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={() => setExpanded((v) => !v)}
          />
        </div>
      </Card.Heading>
      <Card.Meta>{['List', kindLabel(property.kind)]}</Card.Meta>
      {property.description && <Card.Description>{property.description}</Card.Description>}

      {expanded && (
        <Card.Description>
          <Stack direction="column" gap={1}>
            <InlineField label="Group by" labelWidth={14} tooltip="Pick a property to categorize the time series">
              <Select
                options={groupingOptions}
                value={groupBy}
                onChange={(opt) => {
                  setGroupBy(opt.value ?? null);
                  setActiveCategory(null);
                }}
                placeholder="Select property…"
                width={32}
              />
            </InlineField>

            {groupBy && (
              <div className={styles.categoryRow}>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={activeCategory === cat ? 'primary' : 'secondary'}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            )}

            {groupBy && activeCategory && (
              <TimeSeriesList
                series={categorySeries}
                seriesState={seriesState}
                onAddSeries={onAddSeries}
                emptyMessage={`No time series in ${activeCategory}.`}
                contextLabel={`in ${property.displayName} · ${activeCategory}`}
                listResetKey={`${property.propertyId}|${groupBy}|${activeCategory}`}
              />
            )}
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

  const classified = useMemo<ClassifiedProperty[]>(() => {
    return Object.entries(tsProperties)
      .map(([id, prop]) => classifyProperty(id, prop))
      .filter((p): p is ClassifiedProperty => p !== null);
  }, [tsProperties]);

  const singles = classified.filter((p) => !p.isList);
  const lists = classified.filter((p) => p.isList);

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
      <InlineField label="Data Model" labelWidth={16} tooltip={'Selected data model for query variable'}>
        <Input width={42} readOnly value={selectedDataModelId ?? 'Given by selected variable'} />
      </InlineField>
      <InlineField label="View" labelWidth={16} tooltip={'Selected view for query variable'}>
        <Input width={42} readOnly value={selectedViewId ?? 'Given by selected variable'} />
      </InlineField>

      {selectedVariable && classified.length === 0 && (
        <p>No time-series connections exposed by this view.</p>
      )}

      {singles.length > 0 && (
        <>
          <h5>Single connections</h5>
          {singles.map((p) => (
            <SinglePropertyRow
              key={p.propertyId}
              property={p}
              seriesState={seriesState}
              onAddSeries={onAddSeries}
            />
          ))}
        </>
      )}

      {lists.length > 0 && (
        <>
          <h5>List connections</h5>
          {lists.map((p) => (
            <ListPropertyRow
              key={p.propertyId}
              property={p}
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

