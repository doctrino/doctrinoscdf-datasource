import { Button, InlineField, Input, Select, useStyles2 } from '@grafana/ui';
import { getStyles } from './utils';
import React, { ChangeEvent } from 'react';
import { SelectableValue } from '@grafana/data';

const PAGINATION_LABEL_WIDTH = 14;
const PAGE_SIZE_OPTIONS: Array<SelectableValue<number>> = [
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
];

interface ResultsPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ResultsPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: ResultsPaginationProps) {
  const styles = useStyles2(getStyles);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  const onPageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPage = Number.parseInt(event.currentTarget.value, 10);
    if (!Number.isNaN(nextPage)) {
      onPageChange(Math.min(totalPages, Math.max(1, nextPage)));
    }
  };

  return (
    <div className={styles.paginationBar}>
      <span className={styles.paginationRange}>
        {totalItems === 0 ? 'No results' : `Showing ${rangeStart}–${rangeEnd} of ${totalItems.toLocaleString()}`}
      </span>
      <div className={styles.paginationControls}>
        <InlineField label="Per page" labelWidth={PAGINATION_LABEL_WIDTH} className={styles.paginationField}>
          <Select
            inputId="query-editor-page-size"
            options={PAGE_SIZE_OPTIONS}
            value={pageSize}
            onChange={(option) => {
              if (option.value) {
                onPageSizeChange(option.value);
              }
            }}
            width={12}
          />
        </InlineField>
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(1)}>
          First
        </Button>
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <InlineField label="Page" labelWidth={PAGINATION_LABEL_WIDTH} className={styles.paginationField}>
          <Input
            id="query-editor-page"
            type="number"
            min={1}
            max={totalPages}
            value={String(page)}
            onChange={onPageInputChange}
            width={10}
          />
        </InlineField>
        <span className={styles.paginationTotalPages}>of {totalPages.toLocaleString()}</span>
        <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
          Last
        </Button>
      </div>
    </div>
  );
}
