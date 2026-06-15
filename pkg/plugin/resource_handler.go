package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

// resourceHandler creates an http.HandlerFunc that decodes a JSON request body,
// calls the given function, and encodes the response as JSON. This eliminates
// repetitive boilerplate across CDF proxy endpoints.
func resourceHandler[Req any, Resp any](
	name string,
	call func(ctx context.Context, req Req) (Resp, error),
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		var req Req
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		resp, err := call(ctx, req)
		if err != nil {
			log.DefaultLogger.Error(name, "error", err)
			http.Error(w, fmt.Sprintf("%s: %v", name, err), http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.DefaultLogger.Error(name, "error", err)
		}
	}
}

func resourceHandlerGet[Req any, Resp any](
	name string,
	call func(ctx context.Context, req Req) (Resp, error),
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		var req Req
		params := r.URL.Query()
		paramMap := make(map[string]json.RawMessage, len(params))
		for k, v := range params {
			if len(v) > 0 {
				val := v[0]
				if val == "true" || val == "false" {
					paramMap[k] = json.RawMessage(val)
				} else {
					quoted, _ := json.Marshal(val)
					paramMap[k] = quoted
				}
			}
		}
		raw, err := json.Marshal(paramMap)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := json.Unmarshal(raw, &req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		resp, err := call(ctx, req)
		if err != nil {
			log.DefaultLogger.Error(name, "error", err)
			http.Error(w, fmt.Sprintf("%s: %v", name, err), http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.DefaultLogger.Error(name, "error", err)
		}
	}
}
