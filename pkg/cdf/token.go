package cdf

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// InspectResponse is the JSON body from GET /token/inspect.
type InspectResponse struct {
	Subject      string           `json:"subject"`
	Projects     []InspectProject `json:"projects"`
	Capabilities []Capability     `json:"capabilities"`
}

type InspectProject struct {
	ProjectURLName string  `json:"projectUrlName"`
	Groups         []int64 `json:"groups"`
}

type ProjectScope struct {
	AllProjects map[string]any `json:"allProjects,omitempty"`
	Projects    []struct {
		URLName string `json:"urlName"`
	} `json:"projects,omitempty"`
}

type ResourceACL struct {
	Actions []string        `json:"actions"`
	Scope   json.RawMessage `json:"scope"`
}

// Capability is one resolved capability for the token: a project scope plus exactly one ACL.
// JSON keys match Cognite API / cognite-sdk-python capability names. New ACL keys from the API
// are ignored until a matching field is added here.
type Capability struct {
	ProjectScope *ProjectScope `json:"projectScope,omitempty"`

	AgentsAcl                  *ResourceACL `json:"agentsAcl,omitempty"`
	AnalyticsAcl               *ResourceACL `json:"analyticsAcl,omitempty"`
	AnnotationsAcl             *ResourceACL `json:"annotationsAcl,omitempty"`
	AppConfigAcl               *ResourceACL `json:"appConfigAcl,omitempty"`
	AssetsAcl                  *ResourceACL `json:"assetsAcl,omitempty"`
	AuditlogAcl                *ResourceACL `json:"auditlogAcl,omitempty"`
	CogUnitsAcl                *ResourceACL `json:"cogUnitsAcl,omitempty"`
	DataModelInstancesAcl      *ResourceACL `json:"dataModelInstancesAcl,omitempty"`
	DataModelsAcl              *ResourceACL `json:"dataModelsAcl,omitempty"`
	DatasetsAcl                *ResourceACL `json:"datasetsAcl,omitempty"`
	DiagramParsingAcl          *ResourceACL `json:"diagramParsingAcl,omitempty"`
	DigitalTwinAcl             *ResourceACL `json:"digitalTwinAcl,omitempty"`
	DocumentFeedbackAcl        *ResourceACL `json:"documentFeedbackAcl,omitempty"`
	DocumentPipelinesAcl       *ResourceACL `json:"documentPipelinesAcl,omitempty"`
	EntitymatchingAcl          *ResourceACL `json:"entitymatchingAcl,omitempty"`
	EventsAcl                  *ResourceACL `json:"eventsAcl,omitempty"`
	ExperimentAcl              *ResourceACL `json:"experimentAcl,omitempty"`
	ExtractionConfigsAcl       *ResourceACL `json:"extractionConfigsAcl,omitempty"`
	ExtractionPipelinesAcl     *ResourceACL `json:"extractionPipelinesAcl,omitempty"`
	ExtractionRunsAcl          *ResourceACL `json:"extractionRunsAcl,omitempty"`
	FilePipelinesAcl           *ResourceACL `json:"filePipelinesAcl,omitempty"`
	FilesAcl                   *ResourceACL `json:"filesAcl,omitempty"`
	FunctionsAcl               *ResourceACL `json:"functionsAcl,omitempty"`
	GenericsAcl                *ResourceACL `json:"genericsAcl,omitempty"`
	GeospatialAcl              *ResourceACL `json:"geospatialAcl,omitempty"`
	GeospatialCrsAcl           *ResourceACL `json:"geospatialCrsAcl,omitempty"`
	GroupsAcl                  *ResourceACL `json:"groupsAcl,omitempty"`
	HostedExtractorsAcl        *ResourceACL `json:"hostedExtractorsAcl,omitempty"`
	IlainstancesAcl            *ResourceACL `json:"ilainstancesAcl,omitempty"`
	LabelsAcl                  *ResourceACL `json:"labelsAcl,omitempty"`
	LimitsAcl                  *ResourceACL `json:"limitsAcl,omitempty"`
	LocationFiltersAcl         *ResourceACL `json:"locationFiltersAcl,omitempty"`
	ModelHostingAcl            *ResourceACL `json:"modelHostingAcl,omitempty"`
	MonitoringTasksAcl         *ResourceACL `json:"monitoringTasksAcl,omitempty"`
	NotificationsAcl           *ResourceACL `json:"notificationsAcl,omitempty"`
	PipelinesAcl               *ResourceACL `json:"pipelinesAcl,omitempty"`
	PostgresGatewayAcl         *ResourceACL `json:"postgresGatewayAcl,omitempty"`
	ProjectsAcl                *ResourceACL `json:"projectsAcl,omitempty"`
	RawAcl                     *ResourceACL `json:"rawAcl,omitempty"`
	RelationshipsAcl           *ResourceACL `json:"relationshipsAcl,omitempty"`
	RoboticsAcl                *ResourceACL `json:"roboticsAcl,omitempty"`
	SapWritebackAcl            *ResourceACL `json:"sapWritebackAcl,omitempty"`
	SapWritebackRequestsAcl    *ResourceACL `json:"sapWritebackRequestsAcl,omitempty"`
	ScheduledCalculationsAcl   *ResourceACL `json:"scheduledCalculationsAcl,omitempty"`
	SecurityCategoriesAcl      *ResourceACL `json:"securityCategoriesAcl,omitempty"`
	SeismicAcl                 *ResourceACL `json:"seismicAcl,omitempty"`
	SequencesAcl               *ResourceACL `json:"sequencesAcl,omitempty"`
	SessionsAcl                *ResourceACL `json:"sessionsAcl,omitempty"`
	SimulatorsAcl              *ResourceACL `json:"simulatorsAcl,omitempty"`
	StreamRecordsAcl           *ResourceACL `json:"streamRecordsAcl,omitempty"`
	StreamsAcl                 *ResourceACL `json:"streamsAcl,omitempty"`
	SubscribeSignalsAcl        *ResourceACL `json:"subscribeSignalsAcl,omitempty"`
	TemplateGroupsAcl          *ResourceACL `json:"templateGroupsAcl,omitempty"`
	TemplateInstancesAcl       *ResourceACL `json:"templateInstancesAcl,omitempty"`
	ThreedAcl                  *ResourceACL `json:"threedAcl,omitempty"`
	TimeSeriesAcl              *ResourceACL `json:"timeSeriesAcl,omitempty"`
	TimeSeriesSubscriptionsAcl *ResourceACL `json:"timeSeriesSubscriptionsAcl,omitempty"`
	TransformationsAcl         *ResourceACL `json:"transformationsAcl,omitempty"`
	TypesAcl                   *ResourceACL `json:"typesAcl,omitempty"`
	UserProfilesAcl            *ResourceACL `json:"userProfilesAcl,omitempty"`
	VisionModelAcl             *ResourceACL `json:"visionModelAcl,omitempty"`
	WellsAcl                   *ResourceACL `json:"wellsAcl,omitempty"`
	WorkflowOrchestrationAcl   *ResourceACL `json:"workflowOrchestrationAcl,omitempty"`
}

type token struct {
	apiClient *apiClient
}

// Inspect calls GET /token/inspect. Pass a non-nil client, or ensure the token is bound to a client (see NewCogniteClient).
func (t *token) Inspect(ctx context.Context) (*InspectResponse, error) {
	if t.apiClient == nil {
		return nil, fmt.Errorf("api client not initialized")
	}
	resp, err := t.apiClient.Get(ctx, "/token/inspect")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("cdf: token inspect: read body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cdf: token inspect: %s: %s", resp.Status, truncateInspectBody(body, 512))
	}

	var out InspectResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("cdf: token inspect: decode json: %w", err)
	}
	return &out, nil
}

func truncateInspectBody(b []byte, max int) string {
	s := string(b)
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
