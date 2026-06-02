package plugin

import (
	"fmt"
)

// granularityToString converts a granularity in milliseconds to a CDF granularity string.
// It picks the largest unit that divides evenly, respecting the API constraints:
// - second (s) and minute (m): multiple must be 1-120
// - hour (h), day (d): multiple must be 1-100000
// Returns an error if granularityMS is less than 1000 (sub-second granularity is not supported).
func granularityToString(granularityMS int64) (string, error) {
	if granularityMS < 1000 {
		return "", fmt.Errorf("granularity must be at least 1000ms (1s), got %dms", granularityMS)
	}

	const (
		msPerSecond = int64(1000)
		msPerMinute = int64(60 * 1000)
		msPerHour   = int64(60 * 60 * 1000)
		msPerDay    = int64(24 * 60 * 60 * 1000)
	)

	type unit struct {
		ms       int64
		symbol   string
		maxMulti int64
	}

	units := []unit{
		{msPerDay, "d", 100000},
		{msPerHour, "h", 100000},
		{msPerMinute, "m", 120},
		{msPerSecond, "s", 120},
	}

	for _, u := range units {
		if granularityMS >= u.ms {
			multiple := granularityMS / u.ms
			if multiple > u.maxMulti {
				multiple = u.maxMulti
			}
			return fmt.Sprintf("%d%s", multiple, u.symbol), nil
		}
	}

	return "", fmt.Errorf("granularity must be at least 1000ms (1s), got %dms", granularityMS)
}


