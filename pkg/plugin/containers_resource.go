package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/cognite/doctrino-s-cdf-source/pkg/cdf"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

func (d *Datasource) handleContainerInspect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	w.Header().Set("Content-Type", "application/json")
	var request cdf.ContainersInspectRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	response, err := d.client.Containers.Inspect(ctx, request)
	if err != nil {
		log.DefaultLogger.Error("Containers inspect", "error", err)
		http.Error(w, fmt.Sprintf("Containers inspect: %v", err), http.StatusBadGateway)
		return
	}

	data, err := json.Marshal(response)
	if err != nil {
		http.Error(w, fmt.Sprintf("Containers inspect: %v", err), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(data)
	if err != nil {
		log.DefaultLogger.Error("Write response", "error", err)
		return
	}
}
