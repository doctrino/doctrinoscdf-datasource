package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type clientCredentialsProvider struct {
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

func (p *clientCredentialsProvider) Token(ctx context.Context) (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Return cached token if still valid (with 30s buffer)
	if p.cached != "" && time.Now().Before(p.expiry) {
		return p.cached, nil
	}

	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("client_id", p.clientID)
	form.Set("client_secret", p.clientSecret)
	form.Set("scope", strings.Join(p.scopes, " "))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokenResp IDPTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("unmarshal token response: %w", err)
	}

	p.cached = tokenResp.AccessToken
	p.expiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn)*time.Second - 30*time.Second)

	return p.cached, nil
}
