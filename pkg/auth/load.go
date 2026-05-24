package auth

import (
	"errors"
	"fmt"
	"strings"
)

func NewTokenProviderFromSettings(settings *Settings) (TokenProvider, error) {
	switch settings.LoginFlow {
	case loginFlowToken:
		if settings.Token == "" {
			return nil, errors.New("token is required for token login flow")
		}
		static := &staticTokenProvider{token: settings.Token}
		return static, nil
	case loginFlowDeviceCode:
		return newDeviceCodeProviderFromSettings(settings)
	case loginFlowClientCredentials:
		return newClientCredentialsFromSettings(settings)
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

	if settings.Mode == guided {
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
	} else if settings.Mode == manual {
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
	} else {
		return nil, fmt.Errorf("invalid settings mode")
	}

	return &DeviceCodeProvider{
		deviceCodeURL: deviceCodeURL,
		tokenURL:      tokenURL,
		clientID:      clientID,
		scopes:        scopes,
		accessToken:   settings.Token,
		refreshToken:  settings.RefreshToken,
		expiry:        settings.Expiry,
	}, nil
}

func newClientCredentialsFromSettings(settings *Settings) (*clientCredentialsProvider, error) {
	var tokenURL string
	var scopes []string
	if settings.ClientId == "" {
		return nil, errors.New("client ID should not be set in client credentials flow")
	}
	if settings.ClientSecret == "" {
		return nil, errors.New("client secret should not be set in client credentials flow")
	}

	if settings.Mode == guided {
		switch settings.IdpProvider {
		case "entra":
			if settings.IdpTenantID == "" {
				return nil, fmt.Errorf("idp tenant id is required for guided Entra mode")
			}
			tokenURL = fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", settings.IdpTenantID)
			scopes = []string{fmt.Sprintf("https://%s.cognitedata.com/.default", settings.CdfCluster)}
		case "cdf":
			tokenURL = "https://auth.cognite.com/oauth2/token"
		case "auth0":
			if settings.IdpTokenURL == "" {
				return nil, fmt.Errorf("idp token URL is required in guided Auth0 mode")
			}
			scopes = []string{"IDENTITY", "user_impersonation"}
			tokenURL = settings.IdpTokenURL
		}
	} else if settings.Mode == manual {
		if settings.IdpTokenURL == "" {
			return nil, fmt.Errorf("idp token URL is required in manual mode")
		}
		tokenURL = settings.IdpTokenURL
		if settings.IdpScopes != "" {
			scopes = splitScopes(settings.IdpScopes)
		}
	} else {
		return nil, fmt.Errorf("unsupported input mode: %q", settings.Mode)
	}

	return &clientCredentialsProvider{
		tokenURL:     tokenURL,
		clientID:     settings.ClientId,
		clientSecret: settings.ClientSecret,
		scopes:       scopes,
	}, nil
}
