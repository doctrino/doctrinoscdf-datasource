package cdf

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

type TokenProvider interface {
	Token(ctx context.Context) (string, error)
}

type StaticTokenProvider struct {
	token string
}

func (p *StaticTokenProvider) Token(_ context.Context) (string, error) {
	return p.token, nil
}

type ClientCredentialsProvider struct {
	tokenURL     string
	clientID     string
	clientSecret string
	scopes       []string

	/*
		These implement token caching with thread safety. Without them, every API call would fetch a new token from the IDP — slow and wasteful.
		cached — stores the last fetched access token
		expiry — when it expires (so you know when to refresh)
		mu sync.Mutex — protects against race conditions when multiple goroutines call Token() simultaneously
	*/
	mu     sync.Mutex
	cached string
	expiry time.Time
}

func (p *ClientCredentialsProvider) Token(ctx context.Context) (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Return cached token if still valid
	if p.cached != "" && time.Now().Before(p.expiry) {
		return p.cached, nil
	}

	// Otherwise fetch a new one from the IDP...
	// p.cached = newToken
	// p.expiry = time.Now().Add(expiresIn)
	return p.cached, nil
}

type DeviceCodeProvider struct {
	AuthorityURL string
	ClientID     string
	Scopes       []string
	Audience     string
}

func (p *DeviceCodeProvider) Token(ctx context.Context) (string, error) {
	return "", errors.New("not implemented")
}

func newClientCredentialsEntra(tenantID, clientId, clientSecret, cdfCluster string) *ClientCredentialsProvider {
	return &ClientCredentialsProvider{
		tokenURL:     fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", tenantID),
		clientID:     clientId,
		clientSecret: clientSecret,
		scopes:       []string{fmt.Sprintf("https://%s.cognitedata.com/.default", cdfCluster)},
	}
}

func newClientCredentialsCDF(clientID, clientSecret string) *ClientCredentialsProvider {
	return &ClientCredentialsProvider{
		tokenURL:     "https://auth.cognite.com/oauth2/token",
		clientID:     clientID,
		clientSecret: clientSecret,
		scopes:       []string{},
	}
}

func newTokenProviderFromSettings(settings *CDFSettings) (TokenProvider, error) {
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
			AuthorityURL: fmt.Sprintf("https://login.microsoftonline.com/%s", settings.IdpTenantID),
			ClientID:     "fb9d503b-ac25-44c7-a75d-8fbcd3a206bd",
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
