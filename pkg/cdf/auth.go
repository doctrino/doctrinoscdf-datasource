package cdf

import (
	"context"
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

type ClientCredentialsProvider struct {
	tokenURL     string
	clientID     string
	clientSecret string
	scopes       []string

	mu     sync.Mutex
	cached string
	expiry time.Time
}

func NewClientCredentialsEntra(tenantID, clientId, clientSecret, cdfCluster string) *ClientCredentialsProvider {
	return &ClientCredentialsProvider{
		tokenURL:     fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", tenantID),
		clientID:     clientId,
		clientSecret: clientSecret,
		scopes:       []string{fmt.Sprintf("https://%s.cognitedata.com/.default", cdfCluster)},
	}
}

func NewClientCredentialsCDF(clientID, clientSecret string) *ClientCredentialsProvider {
	return &ClientCredentialsProvider{
		tokenURL:     "https://auth.cognite.com/oauth2/token",
		clientID:     clientID,
		clientSecret: clientSecret,
		scopes:       []string{},
	}
}
