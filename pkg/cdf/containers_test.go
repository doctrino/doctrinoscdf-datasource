package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestContainers_Inspect(t *testing.T) {
	ctx := context.Background()
	containerId := ContainerId{"cdf_cdm", "CogniteTimeSeries"}
	resp, err := testClient.Containers.Inspect(ctx, []ContainerId{containerId}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
}
