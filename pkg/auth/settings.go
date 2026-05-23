package auth

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type LoginFlow string

const (
	LoginFlowToken             LoginFlow = "token"
	LoginFlowClientCredentials LoginFlow = "clientCredentials"
	LoginFlowDeviceCode        LoginFlow = "deviceCode"
)

type InputMode string

const (
	Manual InputMode = "manual"
	Guided InputMode = "guided"
)

type Settings struct {
	LoginFlow        LoginFlow `json:"loginFlow"`
	Mode             InputMode `json:"mode"`
	CdfCluster       string    `json:"cdfCluster"`
	CdfProject       string    `json:"cdfProject"`
	CdfUrl           string    `json:"cdfUrl"`
	ClientId         string    `json:"clientId"`
	IdpProvider      string    `json:"idpProvider"`
	IdpTokenURL      string    `json:"idpTokenURL"`
	IdpTenantID      string    `json:"idpTenantID"`
	IdpDeviceCodeURL string    `json:"idpDeviceCodeURL"`
	IdpScopes        string    `json:"idpScopes"`
	IdpAudienceURL   string    `json:"idpAudienceURL"`

	// Secrets (from DecryptedSecureJSONData)
	Token        string        `json:"-"`
	ClientSecret string        `json:"-"`
	RefreshToken string        `json:"-"`
	ExpiresIn    time.Duration `json:"-"`
	CreatedAt    time.Time     `json:"-"`
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
	if v, err := strconv.Atoi(source.DecryptedSecureJSONData["expiresIn"]); err == nil {
		settings.ExpiresIn = time.Duration(v) * time.Second
	}
	if v, err := strconv.ParseInt(source.DecryptedSecureJSONData["createdAt"], 10, 64); err == nil {
		settings.CreatedAt = time.Unix(v, 0)
	}

	return &settings, nil
}
