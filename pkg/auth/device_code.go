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

// IDPDeviceCodeErrorResponse is returned by the IDP token endpoint while polling.
type IDPDeviceCodeErrorResponse struct {
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
	Error        string `json:"error,omitempty"`
}

type FrontendStartResponse struct {
	UserCode        string `json:"userCode"`
	VerificationURI string `json:"verificationUri"`
	ExpiresIn       int    `json:"expiresIn,omitempty"`
	Interval        int    `json:"interval,omitempty"`
	Message         string `json:"message"`
}

type DeviceCodeProvider struct {
	deviceCodeURL string
	tokenURL      string
	clientID      string
	scopes        []string

	deviceCode   string
	accessToken  string
	refreshToken string
	ExpiresIn    time.Duration
	createdAt    time.Time
}

func (p *DeviceCodeProvider) Token(ctx context.Context) (string, error) {
	return "", errors.New("not implemented")
}

// StartDeviceCodeFlow initiates the device code flow against the IDP device authorization endpoint.
func (p *DeviceCodeProvider) StartDeviceCodeFlow(ctx context.Context) (*FrontendStartResponse, error) {
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
	defer resp.Body.Close()

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
	return &FrontendStartResponse{
		UserCode:        result.UserCode,
		VerificationURI: result.VerificationURI,
		ExpiresIn:       result.ExpiresIn,
		Interval:        result.Interval,
		Message:         result.Message,
	}, nil
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
	defer resp.Body.Close()

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
		p.ExpiresIn = time.Duration(tokenResp.ExpiresIn) * time.Second
		p.createdAt = time.Now()

		return &FrontendDeviceCodePollResponse{
			Status:       "complete",
			AccessToken:  tokenResp.AccessToken,
			RefreshToken: tokenResp.RefreshToken,
			ExpiresIn:    tokenResp.ExpiresIn,
		}, nil
	}

	// Error response — check if it's a known polling error
	var errResp IDPDeviceCodeErrorResponse
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
