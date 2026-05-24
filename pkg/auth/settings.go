package auth

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

const (
	loginFlowToken             string = "token"
	loginFlowClientCredentials string = "clientCredentials"
	loginFlowDeviceCode        string = "deviceCode"
)

const (
	manual string = "manual"
	guided string = "guided"
)

type Settings struct {
	LoginFlow        string `json:"loginFlow"`
	Mode             string `json:"mode"`
	CdfCluster       string `json:"cdfCluster"`
	CdfProject       string `json:"cdfProject"`
	CdfUrl           string `json:"cdfUrl"`
	ClientId         string `json:"clientId"`
	IdpProvider      string `json:"idpProvider"`
	IdpTokenURL      string `json:"idpTokenURL"`
	IdpTenantID      string `json:"idpTenantID"`
	IdpDeviceCodeURL string `json:"idpDeviceCodeURL"`
	IdpScopes        string `json:"idpScopes"`
	IdpAudienceURL   string `json:"idpAudienceURL"`

	// Secrets (from DecryptedSecureJSONData)
	Token        string    `json:"-"`
	ClientSecret string    `json:"-"`
	RefreshToken string    `json:"-"`
	Expiry       time.Time `json:"-"`
}

func LoadSettings(source backend.DataSourceInstanceSettings) (*Settings, error) {
	settings := Settings{}
	err := json.Unmarshal(source.JSONData, &settings)
	if err != nil {
		return nil, fmt.Errorf("could not unmarshal PluginSettings json: %w", err)
	}

	settings.Token = source.DecryptedSecureJSONData["token"]
	settings.ClientSecret = source.DecryptedSecureJSONData["clientSecret"]
	settings.RefreshToken = source.DecryptedSecureJSONData["refreshToken"]
	if v, err := strconv.ParseInt(source.DecryptedSecureJSONData["expiry"], 10, 64); err == nil {
		settings.Expiry = time.Unix(v, 0)
	}

	return &settings, nil
}
