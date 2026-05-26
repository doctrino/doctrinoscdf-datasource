package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)


func TestToken_Inspect(t *testing.T) {
	ctx := context.Background()
	resp, err := testClient.Token.Inspect(ctx)
	require.NoError(t, err)
	require.NotNil(t, resp)
}
