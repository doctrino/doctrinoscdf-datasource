package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// IDPDeviceCodeResponse is returned from the IDP when initiating a device code flow.
type IDPDeviceCodeResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
	Message         string `json:"message"`
}

// IDPDeviceCodeTokenResponse is the token response after successful device code exchange.
type IDPDeviceCodeTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
}

// IDPDeviceCodeTokenErrorResponse is returned by the IDP token endpoint while polling.
type IDPDeviceCodeTokenErrorResponse struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

// FrontendDeviceCodePollResponse is the JSON returned to the frontend on /device-code/poll.
// Todo Move these back to the device_code_resource
type FrontendDeviceCodePollResponse struct {
	Status       string `json:"status"` // "pending", "complete", "expired", "error"
	AccessToken  string `json:"accessToken,omitempty"`
	RefreshToken string `json:"refreshToken,omitempty"`
	ExpiresIn    int    `json:"expiresIn,omitempty"`
	CreatedAt    int64  `json:"createdAt,omitempty"`
	Error        string `json:"error,omitempty"`
}

type DeviceCodeProvider struct {
	mu            sync.Mutex
	deviceCodeURL string
	tokenURL      string
	clientID      string
	scopes        []string

	deviceCode   string
	accessToken  string
	refreshToken string
	expiresIn    time.Duration
	createdAt    time.Time
}

func (p *DeviceCodeProvider) Token(ctx context.Context) (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.accessToken == "" {
		return "", errors.New("no access token available. Please complete the device code flow first")
	}

	// Return cached token if still valid (with 30s buffer)
	if time.Now().Before(p.createdAt.Add(p.expiresIn - 30*time.Second)) {
		return p.accessToken, nil
	}

	// Refresh the token
	if p.refreshToken == "" {
		return "", errors.New("access token expired and no refresh token available")
	}

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("client_id", p.clientID)
	form.Set("refresh_token", p.refreshToken)
	form.Set("scope", strings.Join(p.scopes, " "))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("create refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("refresh token request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read refresh response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("refresh token failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokenResp IDPDeviceCodeTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("unmarshal refresh response: %w", err)
	}

	p.accessToken = tokenResp.AccessToken
	if tokenResp.RefreshToken != "" {
		p.refreshToken = tokenResp.RefreshToken
	}
	p.expiresIn = time.Duration(tokenResp.ExpiresIn) * time.Second
	p.createdAt = time.Now()

	return p.accessToken, nil
}

// StartDeviceCodeFlow initiates the device code flow against the IDP device authorization endpoint.
func (p *DeviceCodeProvider) StartDeviceCodeFlow(ctx context.Context) (*IDPDeviceCodeResponse, error) {
	form := url.Values{}
	form.Set("client_id", p.clientID)
	form.Set("scope", strings.Join(p.scopes, " "))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.deviceCodeURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("device code request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("device code request failed (%d): %s", resp.StatusCode, string(body))
	}

	var result IDPDeviceCodeResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal device code response: %w", err)
	}
	p.deviceCode = result.DeviceCode
	return &result, nil
}

// PollForToken polls the token endpoint using the device code grant type.
// Returns the token response on success, or an error.
// The caller should check for ErrAuthorizationPending and ErrSlowDown to continue polling.
func (p *DeviceCodeProvider) PollForToken(ctx context.Context) (*FrontendDeviceCodePollResponse, error) {
	if p.deviceCode == "" {
		return nil, errors.New("no active device code session. Please start the device code flow first")
	}
	form := url.Values{}
	form.Set("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
	form.Set("client_id", p.clientID)
	form.Set("device_code", p.deviceCode)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token poll request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	// Success
	if resp.StatusCode == http.StatusOK {
		var tokenResp IDPDeviceCodeTokenResponse
		if err := json.Unmarshal(body, &tokenResp); err != nil {
			return nil, fmt.Errorf("unmarshal token response: %w", err)
		}
		p.accessToken = tokenResp.AccessToken
		p.refreshToken = tokenResp.RefreshToken
		p.expiresIn = time.Duration(tokenResp.ExpiresIn) * time.Second
		now := time.Now()
		p.createdAt = now

		return &FrontendDeviceCodePollResponse{
			Status:       "complete",
			AccessToken:  tokenResp.AccessToken,
			RefreshToken: tokenResp.RefreshToken,
			ExpiresIn:    tokenResp.ExpiresIn,
			CreatedAt:    now.Unix(),
		}, nil
	}

	// Error response — check if it's a known polling error
	var errResp IDPDeviceCodeTokenErrorResponse
	if err := json.Unmarshal(body, &errResp); err != nil {
		return nil, fmt.Errorf("token endpoint error (%d): %s", resp.StatusCode, string(body))
	}

	switch errResp.Error {
	case "authorization_pending":
		return &FrontendDeviceCodePollResponse{Status: "pending"}, nil
	case "slow_down":
		return &FrontendDeviceCodePollResponse{Status: "pending"}, nil
	case "expired_token":
		return &FrontendDeviceCodePollResponse{
			Status: "expired",
			Error:  "device code expired, please start again",
		}, nil
	case "access_denied":
		return nil, fmt.Errorf("access denied: %s", errResp.ErrorDescription)
	default:
		return nil, fmt.Errorf("token error (%s): %s", errResp.Error, errResp.ErrorDescription)
	}
}
