package plugin

import (
	"fmt"
)

// granularityToString converts a granularity in milliseconds to a CDF granularity string.
// It picks the largest unit that divides evenly, respecting the API constraints:
// - second (s) and minute (m): multiple must be 1-120
// - hour (h), day (d): multiple must be 1-100000
func granularityToString(granularityMS int64) string {
	if granularityMS < 1000 {
		return "1s"
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
			return fmt.Sprintf("%d%s", multiple, u.symbol)
		}
	}

	return "1s" // Fallback, should not reach here due to initial check.
}
