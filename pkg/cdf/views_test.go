package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestViews_Retrieve(t *testing.T) {
	ctx := context.Background()
	viewId := ViewId{"", "cdf_cdm", "CogniteTimeSeries", "v1"}
	resp, err := testClient.Views.Retrieve(ctx, ViewRetrieveRequest{[]ViewId{viewId}})
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Greater(t, len(resp), 0)
}
