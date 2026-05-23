package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTokenProviderFromSettings(t *testing.T) {
	tests := []struct {
		name     string
		settings *Settings
		wantType interface{}
		wantErr  string
	}{
		{
			name:     "static token",
			settings: &Settings{LoginFlow: LoginFlowToken, Token: "my-token"},
			wantType: &staticTokenProvider{},
		},
		{
			name:     "token flow missing token",
			settings: &Settings{LoginFlow: LoginFlowToken},
			wantErr:  "token is required",
		},
		{
			name: "device code guided entra",
			settings: &Settings{
				LoginFlow:   LoginFlowDeviceCode,
				Mode:        "guided",
				IdpProvider: "entra",
				IdpTenantID: "my-tenant",
				CdfCluster:  "my-cluster",
			},
			wantType: &DeviceCodeProvider{},
		},
		{
			name: "device code manual missing token URL",
			settings: &Settings{
				LoginFlow:        LoginFlowDeviceCode,
				Mode:             "manual",
				IdpDeviceCodeURL: "https://example.com/devicecode",
				ClientId:         "client-123",
			},
			wantErr: "token URL is required",
		},
		{
			name: "client credentials guided entra",
			settings: &Settings{
				LoginFlow:    LoginFlowClientCredentials,
				Mode:         "guided",
				IdpProvider:  "entra",
				IdpTenantID:  "my-tenant",
				CdfCluster:   "my-cluster",
				ClientId:     "client-123",
				ClientSecret: "secret",
			},
			wantType: &clientCredentialsProvider{},
		},
		{
			name:     "unsupported login flow",
			settings: &Settings{LoginFlow: "unknown"},
			wantErr:  "not implemented",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewTokenProviderFromSettings(tt.settings)

			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				return
			}

			require.NoError(t, err)
			assert.IsType(t, tt.wantType, got)
		})
	}
}
