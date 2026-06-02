package plugin

import "testing"

func TestGranularityToString(t *testing.T) {
	tests := []struct {
		name     string
		inputMS  int64
		expected string
	}{
		{"1 second", 1000, "1s"},
		{"30 seconds", 30_000, "30s"},
		{"1 minute", 60_000, "1m"},
		{"5 minutes", 300_000, "5m"},
		{"90 seconds as 1m (integer division)", 90_000, "1m"},
		{"120 minutes", 120 * 60_000, "2h"},
		{"1 hour", 3_600_000, "1h"},
		{"2 hours", 7_200_000, "2h"},
		{"1 day", 86_400_000, "1d"},
		{"7 days", 7 * 86_400_000, "7d"},
		{"120 seconds", 120_000, "2m"},
		{"121 seconds clamps to 2m (integer division)", 121_000, "2m"},
		{"max seconds 120s", 120 * 1000, "2m"},
		{"max minutes 120m as 2h", 120 * 60_000, "2h"},
		{"very large ms clamps day to 100000d", 200_000 * 86_400_000, "100000d"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := granularityToString(tt.inputMS)
			if err != nil {
				t.Fatalf("granularityToString(%d) returned unexpected error: %v", tt.inputMS, err)
			}
			if result != tt.expected {
				t.Errorf("granularityToString(%d) = %q, want %q", tt.inputMS, result, tt.expected)
			}
		})
	}
}

func TestGranularityToStringError(t *testing.T) {
	tests := []struct {
		name    string
		inputMS int64
	}{
		{"zero", 0},
		{"negative", -100},
		{"sub-second 500ms", 500},
		{"sub-second 999ms", 999},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := granularityToString(tt.inputMS)
			if err == nil {
				t.Errorf("granularityToString(%d) expected error, got nil", tt.inputMS)
			}
		})
	}
}

