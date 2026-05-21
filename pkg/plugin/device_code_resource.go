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

	pluginCtx := httpadapter.PluginConfigFromContext(r.Context())
	dsSettings := pluginCtx.DataSourceInstanceSettings
	if dsSettings == nil {
		http.Error(w, "missing datasource settings", http.StatusBadRequest)
		return
	}

	settings, err := auth.LoadSettings(*dsSettings)
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
	d.store.set(dsSettings.UID, &deviceCodeSession{
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

func (d *Datasource) handleDeviceCodePoll(w http.ResponseWriter, r *http.Request) {
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

	session, ok := d.store.get(dsSettings.UID)
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
		if errors.Is(err, auth.ErrAuthorizationPending) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(DeviceCodePollResponse{Status: "pending"})
			return
		}
		if errors.Is(err, auth.ErrSlowDown) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(DeviceCodePollResponse{Status: "pending"})
			return
		}
		if errors.Is(err, auth.ErrDeviceCodeExpired) {
			d.store.delete(dsSettings.UID)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(DeviceCodePollResponse{
				Status: "expired",
				Error:  "device code expired, please start again",
			})
			return
		}
		// Other error
		d.store.delete(dsSettings.UID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(DeviceCodePollResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}

	// Success — clean up session and return tokens
	d.store.delete(dsSettings.UID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(DeviceCodePollResponse{
		Status:       "complete",
		AccessToken:  tokenResp.AccessToken,
		RefreshToken: tokenResp.RefreshToken,
		ExpiresIn:    tokenResp.ExpiresIn,
	})
}
