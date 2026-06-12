package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDataModels_List(t *testing.T) {
	ctx := context.Background()
	resp, err := testClient.DataModels.List(ctx, nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Greater(t, len(resp), 0, "There should be at least one model")
}
