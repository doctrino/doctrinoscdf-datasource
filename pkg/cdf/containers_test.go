package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestContainers_InspectNoArgs(t *testing.T) {
	ctx := context.Background()
	containerId := ContainerId{"cdf_cdm", "CogniteTimeSeries"}
	request := ContainersInspectRequest{[]ContainerId{containerId}, nil}
	resp, err := testClient.Containers.Inspect(ctx, request)
	require.NoError(t, err)
	require.NotNil(t, resp)
}

func TestContainers_InspectWithArgs(t *testing.T) {
	ctx := context.Background()
	containerId := ContainerId{"cdf_cdm", "CogniteTimeSeries"}
	request := ContainersInspectRequest{[]ContainerId{containerId}, &InspectionOperations{
		InvolvedViews:          InvolvedViewsFilter{true},
		TotalInvolvedViewCount: TotalInvolvedViewCountFilter{true, false},
	}}
	resp, err := testClient.Containers.Inspect(ctx, request)
	require.NoError(t, err)
	require.NotNil(t, resp)
}
