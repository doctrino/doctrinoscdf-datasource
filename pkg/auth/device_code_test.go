package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDeviceCodeFlow_StartPollPendingPollSuccess(t *testing.T) {
	var pollCount atomic.Int32

	deviceCodeResp := IDPDeviceCodeResponse{
		DeviceCode:      "test-device-code",
		UserCode:        "ABCD-1234",
		VerificationURI: "https://example.com/device",
		ExpiresIn:       900,
		Interval:        5,
		Message:         "Go to https://example.com/device and enter ABCD-1234",
	}

	tokenResp := IDPTokenResponse{
		AccessToken:  "test-access-token",
		RefreshToken: "test-refresh-token",
		ExpiresIn:    3600,
		TokenType:    "Bearer",
		Scope:        "openid",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, r.ParseForm())

		var err error
		switch r.Form.Get("grant_type") {
		case "": // device code initiation has no grant_type
			w.Header().Set("Content-Type", "application/json")
			err = json.NewEncoder(w).Encode(deviceCodeResp)
		case "urn:ietf:params:oauth:grant-type:device_code":
			count := pollCount.Add(1)
			if count == 1 {
				// First poll: authorization_pending
				w.WriteHeader(http.StatusBadRequest)
				err = json.NewEncoder(w).Encode(iDPDeviceCodeTokenErrorResponse{
					Error:            "authorization_pending",
					ErrorDescription: "user has not yet authenticated",
				})
			} else {
				// Second poll: success
				w.Header().Set("Content-Type", "application/json")
				err = json.NewEncoder(w).Encode(tokenResp)
			}
		default:
			t.Fatalf("unexpected grant_type: %s", r.Form.Get("grant_type"))
		}
		require.NoError(t, err)
	}))
	defer server.Close()

	provider := &DeviceCodeProvider{
		deviceCodeURL: server.URL,
		tokenURL:      server.URL,
		clientID:      "test-client",
		scopes:        []string{"openid"},
	}

	ctx := context.Background()

	// Step 1: Start device code flow
	dcResp, err := provider.StartDeviceCodeFlow(ctx)
	require.NoError(t, err)
	assert.Equal(t, "test-device-code", dcResp.DeviceCode)
	assert.Equal(t, "ABCD-1234", dcResp.UserCode)

	// Step 2: Poll — expect authorization_pending
	_, err = provider.PollForToken(ctx)
	assert.ErrorIs(t, err, ErrDeviceCodeAuthorizationPending)

	// Step 3: Poll — expect success
	tkResp, err := provider.PollForToken(ctx)
	require.NoError(t, err)
	assert.Equal(t, "test-access-token", tkResp.AccessToken)
	assert.Equal(t, "test-refresh-token", tkResp.RefreshToken)

}

func TestDeviceCodeFlow_Token(t *testing.T) {
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

	provider := &DeviceCodeProvider{
		tokenURL:     server.URL,
		clientID:     "test-client-id",
		accessToken:  "expired",
		refreshToken: "test-refresh-token",
		expiry:       time.Now().Add(-time.Minute), // expired token
		scopes:       []string{"openid"},
	}

	ctx := context.Background()

	token, err := provider.Token(ctx)
	require.NoError(t, err)
	require.Equal(t, "test-access-token", token)
}
