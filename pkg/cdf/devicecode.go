package cdf

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DeviceCodeResponse is returned from the IDP when initiating a device code flow.
type DeviceCodeResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
	Message         string `json:"message"`
}

// DeviceCodeTokenResponse is the token response after successful device code exchange.
type DeviceCodeTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
}

// DeviceCodeErrorResponse is returned by the IDP token endpoint while polling.
type DeviceCodeErrorResponse struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

// StartDeviceCodeFlow initiates the device code flow against the Entra /devicecode endpoint.
func (p *DeviceCodeProvider) StartDeviceCodeFlow(ctx context.Context) (*DeviceCodeResponse, error) {
	endpoint := fmt.Sprintf("%s/oauth2/v2.0/devicecode", p.AuthorityURL)

	form := url.Values{}
	form.Set("client_id", p.ClientID)
	form.Set("scope", strings.Join(p.Scopes, " "))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("device code request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("device code request failed (%d): %s", resp.StatusCode, string(body))
	}

	var result DeviceCodeResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal device code response: %w", err)
	}
	return &result, nil
}

// PollForToken polls the token endpoint using the device code grant type.
// Returns the token response on success, or an error.
// The caller should check for ErrAuthorizationPending and ErrSlowDown to continue polling.
func (p *DeviceCodeProvider) PollForToken(ctx context.Context, deviceCode string) (*DeviceCodeTokenResponse, error) {
	endpoint := fmt.Sprintf("%s/oauth2/v2.0/token", p.AuthorityURL)

	form := url.Values{}
	form.Set("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
	form.Set("client_id", p.ClientID)
	form.Set("device_code", deviceCode)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token poll request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	// Success
	if resp.StatusCode == http.StatusOK {
		var tokenResp DeviceCodeTokenResponse
		if err := json.Unmarshal(body, &tokenResp); err != nil {
			return nil, fmt.Errorf("unmarshal token response: %w", err)
		}
		return &tokenResp, nil
	}

	// Error response — check if it's a known polling error
	var errResp DeviceCodeErrorResponse
	if err := json.Unmarshal(body, &errResp); err != nil {
		return nil, fmt.Errorf("token endpoint error (%d): %s", resp.StatusCode, string(body))
	}

	switch errResp.Error {
	case "authorization_pending":
		return nil, ErrAuthorizationPending
	case "slow_down":
		return nil, ErrSlowDown
	case "expired_token":
		return nil, ErrDeviceCodeExpired
	case "access_denied":
		return nil, fmt.Errorf("access denied: %s", errResp.ErrorDescription)
	default:
		return nil, fmt.Errorf("token error (%s): %s", errResp.Error, errResp.ErrorDescription)
	}
}

// Sentinel errors for device code polling.
var (
	ErrAuthorizationPending = fmt.Errorf("authorization_pending")
	ErrSlowDown             = fmt.Errorf("slow_down")
	ErrDeviceCodeExpired    = fmt.Errorf("device_code_expired")
)



