package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestClientCredentialsProvider_Token(t *testing.T) {
	tokenResp := IDPTokenResponse{
		AccessToken: "test-access-token",
		ExpiresIn:   3600,
		TokenType:   "Bearer",
		Scope:       "openid",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, r.ParseForm())

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		err := json.NewEncoder(w).Encode(tokenResp)
		require.NoError(t, err)
	}))
	defer server.Close()

	provider := &clientCredentialsProvider{
		tokenURL:     server.URL,
		clientID:     "test-client-id",
		clientSecret: "test-client-secret",
		scopes:       []string{"openid"},
	}

	ctx := context.Background()

	token, err := provider.Token(ctx)
	require.NoError(t, err)
	require.Equal(t, "test-access-token", token)
}
