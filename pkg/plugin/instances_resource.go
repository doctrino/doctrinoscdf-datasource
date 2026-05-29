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

func (d *Datasource) handleInstancesAggregate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	w.Header().Set("Content-Type", "application/json")
	var request cdf.InstanceAggregateRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	response, err := d.client.Instances.Aggregate(ctx, request)
	if err != nil {
		log.DefaultLogger.Error("Instances aggregate", "error", err)
		http.Error(w, fmt.Sprintf("Instances aggregate: %v", err), http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(response)
	if err != nil {
		log.DefaultLogger.Error("Instances aggregate", "error", err)
		http.Error(w, fmt.Sprintf("Instances aggregate: %v", err), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(data)
	if err != nil {
		log.DefaultLogger.Error("Instances aggregate", "error", err)
	}
}

func (d *Datasource) handleInstancesSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	w.Header().Set("Content-Type", "application/json")
	var request cdf.InstanceSearchRequest

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	response, err := d.client.Instances.Search(ctx, request)
	if err != nil {
		log.DefaultLogger.Error("Instances search", "error", err)
		http.Error(w, fmt.Sprintf("Instances search: %v", err), http.StatusInternalServerError)
	}
	data, err := json.Marshal(response)
	if err != nil {
		http.Error(w, fmt.Sprintf("Instances search: %v", err), http.StatusInternalServerError)
	}
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(data)
	if err != nil {
		log.DefaultLogger.Error("Write response", "error", err)
	}
}
