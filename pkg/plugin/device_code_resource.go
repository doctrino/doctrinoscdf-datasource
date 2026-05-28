package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/cognite/doctrino-s-cdf-source/pkg/auth"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

type deviceCodeStartResponse struct {
	UserCode        string `json:"userCode"`
	VerificationURI string `json:"verificationUri"`
	ExpiresIn       int    `json:"expiresIn,omitempty"`
	Interval        int    `json:"interval,omitempty"`
	Message         string `json:"message"`
}

type deviceCodePollResponse struct {
	Status       string `json:"status"` // "pending", "complete", "expired", "error"
	AccessToken  string `json:"accessToken,omitempty"`
	RefreshToken string `json:"refreshToken,omitempty"`
	Expiry       int64  `json:"expiry,omitempty"`
	Error        string `json:"error,omitempty"`
}

// newDeviceCodeResourceHandler creates the HTTP mux for CallResource endpoints, bound to the datasource instance.
func newDeviceCodeResourceHandler(d *Datasource) backend.CallResourceHandler {
	mux := http.NewServeMux()
	mux.HandleFunc("/device-code/start", d.handleDeviceCodeStart)
	mux.HandleFunc("/device-code/poll", d.handleDeviceCodePoll)
	return httpadapter.New(mux)
}

// CallResource delegates to the per-instance resource handler mux.
func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	return d.deviceCodeResourceHandler.CallResource(ctx, req, sender)
}

func (d *Datasource) handleDeviceCodeStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	deviceCodeProvider := d.deviceCodeProvider
	if deviceCodeProvider == nil {
		var err error
		deviceCodeProvider, err = auth.NewDeviceCodeProviderFromSettings(d.settings)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(deviceCodePollResponse{
				Status: "error",
				Error:  fmt.Sprintf("Failed to configure device code provider: %v", err),
			}); err != nil {
				log.DefaultLogger.Error("failed to encode device code poll response", "error", err)
			}
			return
		}
		d.deviceCodeProvider = deviceCodeProvider
	}

	// Start the device code flow
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	dcResp, err := deviceCodeProvider.StartDeviceCodeFlow(ctx)
	if err != nil {
		log.DefaultLogger.Error("device code start failed", "error", err)
		http.Error(w, fmt.Sprintf("device code start: %v", err), http.StatusBadGateway)
		return
	}

	// Convert to frontend response that use camelCase.
	response := deviceCodeStartResponse{
		UserCode:        dcResp.UserCode,
		VerificationURI: dcResp.VerificationURI,
		ExpiresIn:       dcResp.ExpiresIn,
		Interval:        dcResp.Interval,
		Message:         dcResp.Message,
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		log.DefaultLogger.Error("encoding device code start response", "error", err)
		http.Error(w, fmt.Sprintf("encoding device code start: %v", err), http.StatusInternalServerError)
		return
	}
}

func (d *Datasource) handleDeviceCodePoll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	provider := d.deviceCodeProvider
	if provider == nil {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(deviceCodePollResponse{
			Status: "error",
			Error:  "device code provider not configured, please start the device code flow first.",
		}); err != nil {
			log.DefaultLogger.Error("failed to encode device code poll response", "error", err)
		}
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	tokenResp, err := provider.PollForToken(ctx)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		var resp deviceCodePollResponse
		switch {
		case errors.Is(err, auth.ErrDeviceCodeAuthorizationPending):
			resp = deviceCodePollResponse{Status: "pending"}
		case errors.Is(err, auth.ErrDeviceCodeExpired):
			resp = deviceCodePollResponse{Status: "expired", Error: "device code expired, please start again"}
		default:
			resp = deviceCodePollResponse{Status: "error", Error: err.Error()}
		}
		err = json.NewEncoder(w).Encode(resp)
		if err != nil {
			log.DefaultLogger.Error("failed to encode device code poll response", "error", err)
		}
		return
	}
	err = json.NewEncoder(w).Encode(deviceCodePollResponse{
		Status:       "complete",
		AccessToken:  tokenResp.AccessToken,
		RefreshToken: tokenResp.RefreshToken,
		Expiry:       time.Now().Add(time.Duration(tokenResp.ExpiresIn)*time.Second - 30*time.Second).Unix(),
	})
	if err != nil {
		log.DefaultLogger.Error("encoding device code poll response", "error", err)
		http.Error(w, fmt.Sprintf("encoding device code poll response: %v", err), http.StatusInternalServerError)
	}
}
