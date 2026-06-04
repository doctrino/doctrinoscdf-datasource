import { GrafanaTheme2 } from '@grafana/data';
import { css } from '@emotion/css';
import { InstanceId, ViewId } from '../types';


export function instanceStringAsId(instanceId: string): InstanceId {
  const index = instanceId.indexOf(':');
  const space = instanceId.slice(0, index);
  const externalId = instanceId.slice(index + 1);
  return { space: space, externalId: externalId };
}

export function viewIdAsString(view: ViewId) {
  return `${view.space}:${view.externalId}(version=${view.version})`;
}

export function viewStringAsId(viewString: string): ViewId {
  const colonIndex = viewString.indexOf(':');
  const space = viewString.slice(0, colonIndex);
  const rest = viewString.slice(colonIndex + 1);
  const parenIndex = rest.indexOf('(version=');
  const externalId = rest.slice(0, parenIndex);
  const versionWithParen = rest.slice(parenIndex + '(version='.length);
  const version = versionWithParen.endsWith(')') ? versionWithParen.slice(0, -1) : versionWithParen;
  return { space, externalId, version };
}

export const getStyles = (theme: GrafanaTheme2) => ({
  documentationToggle: css({
    background: 'none',
    border: 'none',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    fontSize: theme.typography.bodySmall.fontSize,
    padding: 0,
    textAlign: 'left',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    '&:hover': {
      color: theme.colors.text.primary,
    },
  }),
  documentation: css({
    color: theme.colors.text.disabled,
    fontSize: theme.typography.bodySmall.fontSize,
    lineHeight: theme.typography.bodySmall.lineHeight,
    margin: theme.spacing(0, 0, 0.5, 0),
  }),
  filtersGrid: css({
    display: 'grid',
    gap: theme.spacing(0.5, 2),
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    width: '100%',
  }),
  filterField: css({
    marginBottom: 0,
    minWidth: 0,
  }),
  filterFieldWide: css({
    gridColumn: '1 / -1',
    marginBottom: 0,
    minWidth: 0,
  }),
  rangeInputs: css({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5, 1),
  }),
  rangeSeparator: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  paginationField: css({
    flexShrink: 0,
    marginBottom: 0,
  }),
  panelControlField: css({
    marginBottom: 0,
    minWidth: 0,
    width: '100%',
  }),
  resultsHeader: css({
    alignItems: 'center',
    color: theme.colors.text.secondary,
    display: 'flex',
    fontSize: theme.typography.bodySmall.fontSize,
    justifyContent: 'space-between',
  }),
  paginationBar: css({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
  }),
  paginationRange: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  paginationControls: css({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
  }),
  paginationTotalPages: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    marginRight: theme.spacing(0.5),
  }),
  resultsList: css({
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    maxHeight: '280px',
    overflowY: 'auto',
  }),
  resultRow: css({
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    padding: theme.spacing(1, 1.5),
    '&:last-child': {
      borderBottom: 'none',
    },
    '&[data-in-panel="true"]': {
      background: theme.colors.action.hover,
    },
  }),
  resultRowMain: css({
    alignItems: 'flex-start',
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
  }),
  resultRowText: css({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: theme.spacing(0.25),
    minWidth: 0,
  }),
  resultRowName: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
  }),
  resultRowMeta: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  resultDescription: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    margin: theme.spacing(0.25, 0, 0, 0),
  }),
  inPanelBadge: css({
    color: theme.colors.text.secondary,
    flexShrink: 0,
    fontSize: theme.typography.bodySmall.fontSize,
    fontStyle: 'italic',
    padding: theme.spacing(0.5, 0, 0, 0),
  }),
  emptyState: css({
    color: theme.colors.text.secondary,
    margin: theme.spacing(2),
    textAlign: 'center',
  }),
  seriesPanel: css({
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    marginTop: theme.spacing(0.5),
    overflow: 'hidden',
    padding: theme.spacing(1, 1.5),
  }),
  seriesPanelHeader: css({
    alignItems: 'baseline',
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  }),
  seriesPanelTitle: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  seriesPanelCount: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  seriesPanelEmpty: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    margin: 0,
  }),
  seriesPanelList: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.75),
  }),
  seriesPanelRow: css({
    alignItems: 'flex-start',
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    display: 'flex',
    gap: theme.spacing(0.5),
    minWidth: 0,
    overflow: 'hidden',
    padding: theme.spacing(0.75, 1),
  }),
  seriesPanelRemove: css({
    flexShrink: 0,
    marginTop: theme.spacing(0.25),
  }),
  seriesPanelRowMain: css({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: theme.spacing(1),
    minWidth: 0,
    width: '100%',
  }),
  seriesPanelRowInfo: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.25),
    minWidth: '160px',
  }),
  seriesPanelRowLabel: css({
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  seriesPanelRowMeta: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  seriesPanelRowControls: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    minWidth: 0,
    width: '100%',
  }),
});
export function instanceIdAsString(space: string, externalId: string) {
  return `${space}:${externalId}`;
}