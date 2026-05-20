package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/cognite/doctrino-s-cdf-source/pkg/cdf"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

// deviceCodeSession tracks a pending device code login.
type deviceCodeSession struct {
	provider  *cdf.DeviceCodeProvider
	response  *cdf.DeviceCodeResponse
	createdAt time.Time
}

// deviceCodeStore manages active device code sessions keyed by datasource UID.
type deviceCodeStore struct {
	mu       sync.Mutex
	sessions map[string]*deviceCodeSession
}

var globalDeviceCodeStore = &deviceCodeStore{
	sessions: make(map[string]*deviceCodeSession),
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

// NewResourceHandler creates the HTTP mux for CallResource endpoints.
func NewResourceHandler() backend.CallResourceHandler {
	mux := http.NewServeMux()
	mux.HandleFunc("/device-code/start", handleDeviceCodeStart)
	mux.HandleFunc("/device-code/poll", handleDeviceCodePoll)
	return httpadapter.New(mux)
}

// CallResource delegates to the shared resource handler mux.
func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	return resourceHandler.CallResource(ctx, req, sender)
}

var resourceHandler = NewResourceHandler()

func handleDeviceCodeStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pluginCtx := httpadapter.PluginConfigFromContext(r.Context())
	dsSettings := pluginCtx.DataSourceInstanceSettings
	if dsSettings == nil {
		http.Error(w, "missing datasource settings", http.StatusBadRequest)
		return
	}

	settings, err := cdf.LoadCDFSettings(*dsSettings)
	if err != nil {
		http.Error(w, fmt.Sprintf("load settings: %v", err), http.StatusInternalServerError)
		return
	}

	// Build a DeviceCodeProvider from settings
	provider, err := buildDeviceCodeProvider(settings)
	if err != nil {
		http.Error(w, fmt.Sprintf("invalid config: %v", err), http.StatusBadRequest)
		return
	}

	// Start the device code flow
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	dcResp, err := provider.StartDeviceCodeFlow(ctx)
	if err != nil {
		log.DefaultLogger.Error("device code start failed", "error", err)
		http.Error(w, fmt.Sprintf("device code start: %v", err), http.StatusBadGateway)
		return
	}

	// Store session
	globalDeviceCodeStore.set(dsSettings.UID, &deviceCodeSession{
		provider:  provider,
		response:  dcResp,
		createdAt: time.Now(),
	})

	resp := DeviceCodeStartResponse{
		UserCode:        dcResp.UserCode,
		VerificationURI: dcResp.VerificationURI,
		ExpiresIn:       dcResp.ExpiresIn,
		Interval:        dcResp.Interval,
		Message:         dcResp.Message,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleDeviceCodePoll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pluginCtx := httpadapter.PluginConfigFromContext(r.Context())
	dsSettings := pluginCtx.DataSourceInstanceSettings
	if dsSettings == nil {
		http.Error(w, "missing datasource settings", http.StatusBadRequest)
		return
	}

	session, ok := globalDeviceCodeStore.get(dsSettings.UID)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(DeviceCodePollResponse{
			Status: "expired",
			Error:  "no active device code session, please start again",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	tokenResp, err := session.provider.PollForToken(ctx, session.response.DeviceCode)
	if err != nil {
		if errors.Is(err, cdf.ErrAuthorizationPending) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(DeviceCodePollResponse{Status: "pending"})
			return
		}
		if errors.Is(err, cdf.ErrSlowDown) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(DeviceCodePollResponse{Status: "pending"})
			return
		}
		if errors.Is(err, cdf.ErrDeviceCodeExpired) {
			globalDeviceCodeStore.delete(dsSettings.UID)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(DeviceCodePollResponse{
				Status: "expired",
				Error:  "device code expired, please start again",
			})
			return
		}
		// Other error
		globalDeviceCodeStore.delete(dsSettings.UID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(DeviceCodePollResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}

	// Success — clean up session and return tokens
	globalDeviceCodeStore.delete(dsSettings.UID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(DeviceCodePollResponse{
		Status:       "complete",
		AccessToken:  tokenResp.AccessToken,
		RefreshToken: tokenResp.RefreshToken,
		ExpiresIn:    tokenResp.ExpiresIn,
	})
}

func buildDeviceCodeProvider(settings *cdf.CDFSettings) (*cdf.DeviceCodeProvider, error) {
	if settings.IdpProvider != "entra" {
		return nil, fmt.Errorf("device code flow only supports entra provider")
	}
	if settings.IdpTenantID == "" {
		return nil, fmt.Errorf("idp tenant id is required")
	}
	if settings.CdfCluster == "" {
		return nil, fmt.Errorf("cdf cluster is required")
	}
	return &cdf.DeviceCodeProvider{
		AuthorityURL: fmt.Sprintf("https://login.microsoftonline.com/%s", settings.IdpTenantID),
		ClientID:     "fb9d503b-ac25-44c7-a75d-8fbcd3a206bd",
		Scopes: []string{
			fmt.Sprintf("https://%s.cognitedata.com/IDENTITY", settings.CdfCluster),
			fmt.Sprintf("https://%s.cognitedata.com/user_impersonation", settings.CdfCluster),
			"profile",
			"openid",
		},
		Audience: fmt.Sprintf("https://%s.cognitedata.com", settings.CdfCluster),
	}, nil
}


