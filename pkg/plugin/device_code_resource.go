package plugin

import (
	"context"
	"encoding/json"
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
	provider, err := auth.NewDeviceCodeProviderFromSettings(settings)
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

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(dcResp)
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

	pluginCtx := httpadapter.PluginConfigFromContext(r.Context())
	dsSettings := pluginCtx.DataSourceInstanceSettings
	if dsSettings == nil {
		http.Error(w, "missing datasource settings", http.StatusBadRequest)
		return
	}
	provider, ok := d.client.Token.Provider.(*auth.DeviceCodeProvider)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(auth.DeviceCodePollResponse{
			Status: "expired",
			Error:  "no active device code session, please start again",
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
		err = json.NewEncoder(w).Encode(auth.DeviceCodePollResponse{
			Status: "error",
			Error:  err.Error(),
		})
		if err != nil {
			log.DefaultLogger.Error("failed to encode device code poll response", "error", err)
		}
		return
	}
	err = json.NewEncoder(w).Encode(tokenResp)
	if err != nil {
		log.DefaultLogger.Error("encoding device code poll response", "error", err)
		http.Error(w, fmt.Sprintf("encoding device code poll response: %v", err), http.StatusInternalServerError)
	}

}
