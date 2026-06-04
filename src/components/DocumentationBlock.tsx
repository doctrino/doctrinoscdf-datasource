import { useStyles2 } from '@grafana/ui';
import { getStyles } from './utils';
import React, { useState } from 'react';
import { DOCUMENTATION_TEXT } from './PlaceholderValues';

export function DocumentationBlock({ testId }: { testId?: string }) {
  const styles = useStyles2(getStyles);
  const [showDocumentation, setShowDocumentation] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.documentationToggle}
        onClick={() => setShowDocumentation((open) => !open)}
        aria-expanded={showDocumentation}
      >
        {showDocumentation ? 'Hide documentation' : 'Documentation'}
      </button>
      {showDocumentation && (
        <p className={styles.documentation} data-testid={testId}>
          {DOCUMENTATION_TEXT}
        </p>
      )}
    </>
  );
}
