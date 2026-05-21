package auth

import (
	"errors"
	"fmt"
	"strings"
)

func NewTokenProviderFromSettings(settings *Settings) (TokenProvider, error) {
	switch settings.LoginFlow {
	case LoginFlowToken:
		if settings.Token == "" {
			return nil, errors.New("token is required for token login flow")
		}
		static := &StaticTokenProvider{token: settings.Token}
		return static, nil
	case LoginFlowDeviceCode:
		return newDeviceCodeProviderFromSettings(settings)
	}

	return nil, fmt.Errorf("not implemented")
}

func splitScopes(s string) []string {
	var scopes []string
	for _, scope := range strings.Split(s, " ") {
		scope = strings.TrimSpace(scope)
		if scope != "" {
			scopes = append(scopes, scope)
		}
	}
	return scopes
}

func newDeviceCodeProviderFromSettings(settings *Settings) (*DeviceCodeProvider, error) {
	var deviceCodeURL, tokenURL, clientID string
	var scopes []string

	if settings.Mode == "guided" {
		// Guided mode: derive URLs from provider + cluster + tenant
		switch settings.IdpProvider {
		case "entra":
			if settings.IdpTenantID == "" {
				return nil, fmt.Errorf("idp tenant id is required for guided Entra mode")
			}
			if settings.CdfCluster == "" {
				return nil, fmt.Errorf("cdf cluster is required for guided mode")
			}
			deviceCodeURL = fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/devicecode", settings.IdpTenantID)
			tokenURL = fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", settings.IdpTenantID)
			clientID = "fb9d503b-ac25-44c7-a75d-8fbcd3a206bd"
			scopes = []string{
				fmt.Sprintf("https://%s.cognitedata.com/IDENTITY", settings.CdfCluster),
				fmt.Sprintf("https://%s.cognitedata.com/user_impersonation", settings.CdfCluster),
				"profile",
				"openid",
			}
		default:
			return nil, fmt.Errorf("guided device code flow is only supported for entra provider, got %q", settings.IdpProvider)
		}
	} else {
		// Manual mode: user provides URLs directly
		deviceCodeURL = settings.IdpDeviceCodeURL
		tokenURL = settings.IdpTokenURL
		clientID = settings.ClientId
		if settings.IdpScopes != "" {
			scopes = splitScopes(settings.IdpScopes)
		}

		if deviceCodeURL == "" {
			return nil, fmt.Errorf("device code URL is required in manual mode")
		}
		if tokenURL == "" {
			return nil, fmt.Errorf("token URL is required in manual mode")
		}
		if clientID == "" {
			return nil, fmt.Errorf("client ID is required in manual mode")
		}
	}

	return &DeviceCodeProvider{
		deviceCodeURL: deviceCodeURL,
		tokenURL:      tokenURL,
		clientID:      clientID,
		scopes:        scopes,
		accessToken:   settings.Token,
		refreshToken:  settings.RefreshToken,
		ExpiresIn:     settings.ExpiresIn,
		createdAt:     settings.CreatedAt,
	}, nil
}
