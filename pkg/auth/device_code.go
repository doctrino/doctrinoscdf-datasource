package auth

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

type DeviceCodeProvider struct {
	DeviceCodeURL string
	TokenURL      string
	ClientID      string
	Scopes        []string
	Audience      string
}

func (p *DeviceCodeProvider) Token(ctx context.Context) (string, error) {
	return "", errors.New("not implemented")
}

// deviceCodeSession tracks a pending device code login.
type deviceCodeSession struct {
	provider  *DeviceCodeProvider
	response  *DeviceCodeResponse
	createdAt time.Time
}

// deviceCodeStore manages active device code sessions keyed by datasource UID.
type deviceCodeStore struct {
	mu       sync.Mutex
	sessions map[string]*deviceCodeSession
}

func (s *deviceCodeStore) set(dsUID string, session *deviceCodeSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[dsUID] = session
}

func (s *deviceCodeStore) get(dsUID string) (*deviceCodeSession, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[dsUID]
	if !ok {
		return nil, false
	}
	// Check expiry
	if time.Since(sess.createdAt) > time.Duration(sess.response.ExpiresIn)*time.Second {
		delete(s.sessions, dsUID)
		return nil, false
	}
	return sess, true
}

func (s *deviceCodeStore) delete(dsUID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, dsUID)
}

// DeviceCodeStartResponse is the JSON returned to the frontend on /device-code/start.
type DeviceCodeStartResponse struct {
	UserCode        string `json:"userCode"`
	VerificationURI string `json:"verificationUri"`
	ExpiresIn       int    `json:"expiresIn"`
	Interval        int    `json:"interval"`
	Message         string `json:"message"`
}

// DeviceCodePollResponse is the JSON returned to the frontend on /device-code/poll.
type DeviceCodePollResponse struct {
	Status       string `json:"status"` // "pending", "complete", "expired", "error"
	AccessToken  string `json:"accessToken,omitempty"`
	RefreshToken string `json:"refreshToken,omitempty"`
	ExpiresIn    int    `json:"expiresIn,omitempty"`
	Error        string `json:"error,omitempty"`
}

func buildDeviceCodeProvider(settings *auth.CDFSettings) (*auth.DeviceCodeProvider, error) {
	var deviceCodeURL, tokenURL, clientID string
	var scopes []string
	var audience string

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
			audience = fmt.Sprintf("https://%s.cognitedata.com", settings.CdfCluster)
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
		audience = settings.IdpAudienceURL

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

	return &auth.DeviceCodeProvider{
		DeviceCodeURL: deviceCodeURL,
		TokenURL:      tokenURL,
		ClientID:      clientID,
		Scopes:        scopes,
		Audience:      audience,
	}, nil
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
