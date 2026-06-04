import { TimeSeries } from '../types';
import { Button, useStyles2 } from '@grafana/ui';
import { getStyles, instanceIdAsString } from './utils';
import React, { useMemo, useState } from 'react';
import { ResultsPagination } from './ResultsPagination';

interface TimeSeriesListProps {
  series: TimeSeries[];
  selectedIds: Set<string>;
  onAddSeries: (externalId: string) => void;
  emptyMessage: string;
  contextLabel: string;
  listResetKey: string;
}

export function  TimeSeriesList({
  series,
  selectedIds,
  onAddSeries,
  emptyMessage,
  contextLabel,
  listResetKey,
}: TimeSeriesListProps) {
  const styles = useStyles2(getStyles);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [prevResetKey, setPrevResetKey] = useState(listResetKey);

  if (prevResetKey !== listResetKey) {
    setPrevResetKey(listResetKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(series.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedSeries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return series.slice(start, start + pageSize);
  }, [currentPage, pageSize, series]);

  const onPageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  return (
    <>
      <div className={styles.resultsHeader}>
        <span>
          {series.length.toLocaleString()} time series {contextLabel}
        </span>
        <span>{selectedIds.size} in panel</span>
      </div>

      {series.length > 0 && (
        <ResultsPagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={series.length}
          onPageChange={setPage}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      <div className={styles.resultsList} role="list" aria-label="Time series results">
        {series.length === 0 ? (
          <p className={styles.emptyState}>{emptyMessage}</p>
        ) : (
          paginatedSeries.map((item) => {
            const identifier = instanceIdAsString(item.space, item.externalId);
            const inPanel = selectedIds.has(identifier);
            const displayName = item.name ?? item.externalId;
            return (
              <div key={identifier} className={styles.resultRow} role="listitem" data-in-panel={inPanel}>
                <div className={styles.resultRowMain}>
                  <div className={styles.resultRowText}>
                    <span className={styles.resultRowName}>{displayName}</span>
                    <span className={styles.resultRowMeta}>
                      {item.space} · {item.externalId}
                      {item.unit ? ` · ${item.unit}` : ''}
                    </span>
                    <p className={styles.resultDescription}>{item.description}</p>
                  </div>
                  {inPanel ? (
                    <span className={styles.inPanelBadge}>In panel</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="plus"
                      onClick={() => onAddSeries(identifier)}
                      aria-label={`Add ${displayName} to panel`}
                    >
                      Add
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
