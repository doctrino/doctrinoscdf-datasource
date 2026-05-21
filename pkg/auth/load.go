package auth

import (
	"errors"
	"fmt"
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
		if settings.IdpProvider != "entra" {
			return nil, errors.New("idp provider must be entra")
		}
		if settings.IdpTenantID == "" {
			return nil, errors.New("idp tenant id is required")
		}
		if settings.CdfCluster == "" {
			return nil, errors.New("cdf cluster is required")
		}
		deviceCode := &DeviceCodeProvider{
			DeviceCodeURL: fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/devicecode", settings.IdpTenantID),
			TokenURL:      fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", settings.IdpTenantID),
			ClientID:      "fb9d503b-ac25-44c7-a75d-8fbcd3a206bd",
			Scopes: []string{
				fmt.Sprintf("https://%s.cognitedata.com/IDENTITY", settings.CdfCluster),
				fmt.Sprintf("https://%s.cognitedata.com/user_impersonation", settings.CdfCluster),
				"profile",
				"openid",
			},
			Audience: fmt.Sprintf("https://%s.cognitedata.com", settings.CdfCluster),
		}
		return deviceCode, nil
	}

	return nil, fmt.Errorf("not implemented")
}
