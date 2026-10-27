import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VERTEX_TRIAL_ELIGIBILITY_MATRIX,
  resolveVertexModelName,
  resolveVertexConfig,
  classifyVertexProbeError,
  buildAiCapabilityRegistry,
} from './vertexAiRouter';

test('VERTEX_TRIAL_ELIGIBILITY_MATRIX separates trial-eligible study endpoints from paid/Developer-API media endpoints', () => {
  const vertexEligible = VERTEX_TRIAL_ELIGIBILITY_MATRIX.filter(
    (item) => item.targetProvider === 'vertex_ai_eligible'
  );
  const devOnly = VERTEX_TRIAL_ELIGIBILITY_MATRIX.filter(
    (item) => item.targetProvider === 'developer_api_only'
  );

  assert.equal(vertexEligible.length, 9);
  assert.ok(vertexEligible.every((item) => item.trialCreditsEligible === true));
  assert.ok(
    vertexEligible.every((item) => item.billingService.includes('aiplatform.googleapis.com'))
  );

  const devEndpoints = devOnly.map((d) => d.endpoint);
  assert.ok(devEndpoints.includes('POST /api/create/visualize'));
  assert.ok(devEndpoints.includes('POST /api/create/video-lesson'));
  assert.ok(devEndpoints.includes('POST /api/create/lofi-music'));
  assert.ok(devEndpoints.includes('WS /api/live'));
  assert.ok(devOnly.every((item) => item.trialCreditsEligible === false));
});

test('resolveVertexModelName normalizes -latest aliases for Vertex AI publisher endpoints', () => {
  assert.equal(resolveVertexModelName('gemini-flash-latest'), 'gemini-3.1-flash-lite');
  assert.equal(resolveVertexModelName('gemini-3.8-flash'), 'gemini-3.8-flash');
  assert.equal(resolveVertexModelName('gemini-3.1-flash-lite'), 'gemini-3.1-flash-lite');
});

test('resolveVertexConfig enforces ADC-only authentication without service account JSON keys', () => {
  const adcConfig = resolveVertexConfig({
    env: {},
    fallbackProjectId: 'cs-project-wsjgygls',
  });
  assert.equal(adcConfig.mode, 'auto');
  assert.equal(adcConfig.projectId, 'cs-project-wsjgygls');
  assert.equal(adcConfig.location, 'us-central1');
  assert.equal(adcConfig.authMethod, 'application_default_credentials');
  assert.equal(adcConfig.orgPolicyKeyCreationDisabled, true);

  const explicitConfig = resolveVertexConfig({
    env: {
      GOOGLE_GENAI_USE_VERTEXAI: 'true',
      GOOGLE_CLOUD_PROJECT: 'cs-project-wsjgygls',
      GOOGLE_CLOUD_LOCATION: 'asia-northeast1',
    },
  });
  assert.equal(explicitConfig.mode, 'enabled');
  assert.equal(explicitConfig.projectId, 'cs-project-wsjgygls');
  assert.equal(explicitConfig.location, 'asia-northeast1');
  assert.equal(explicitConfig.authMethod, 'application_default_credentials');
  assert.equal(explicitConfig.configError, undefined);
});

test('classifyVertexProbeError diagnoses IAM_PERMISSION_DENIED with keyless ADC remediation steps', () => {
  const iamErr = classifyVertexProbeError({
    error: Object.assign(
      new Error(
        `Permission 'aiplatform.endpoints.predict' denied on resource '//aiplatform.googleapis.com/projects/cs-project-wsjgygls/locations/us-central1/publishers/google/models/gemini-3.1-flash-lite'`
      ),
      { status: 403 }
    ),
    projectId: 'cs-project-wsjgygls',
    location: 'us-central1',
    runtimeIdentityHint: 'ais-sandbox@ais-asia-northeast1-00df85c10e.iam.gserviceaccount.com',
  });

  assert.equal(iamErr.status, 'iam_permission_denied');
  assert.equal(iamErr.httpStatus, 403);
  assert.ok(iamErr.errorReason.includes('aiplatform.endpoints.predict'));
  assert.ok(iamErr.remediationSteps.some((s) => s.includes('roles/aiplatform.user')));
  assert.ok(
    iamErr.remediationSteps.every((s) => !s.includes('GOOGLE_VERTEX_CREDENTIALS_JSON'))
  );
});

test('buildAiCapabilityRegistry reports honest BLOCKED_BY_BILLING status for paid media when credits are depleted', () => {
  const registry = buildAiCapabilityRegistry({
    vertexProbe: {
      checkedAt: new Date().toISOString(),
      status: 'iam_permission_denied',
      readyForMigration: false,
      activeProvider: 'developer_api',
      billingService: 'Vertex AI API',
      billingApiEndpoint: 'https://us-central1-aiplatform.googleapis.com',
      trialCreditsEligible: true,
      projectId: 'cs-project-wsjgygls',
      location: 'us-central1',
      authMethod: 'application_default_credentials',
      modelTested: 'gemini-3.1-flash-lite',
      latencyMs: 120,
      httpStatus: 403,
      errorReason: 'IAM_PERMISSION_DENIED',
      remediationSteps: [],
    },
    hasDeveloperApiKey: true,
    developerApiBillingDepleted: true,
  });

  assert.equal(registry.length, 11);
  const videoCap = registry.find((c) => c.id === 'video_generation')!;
  assert.equal(videoCap.verificationStatus, 'BLOCKED_BY_BILLING');
  assert.equal(
    videoCap.userFacingNotice,
    'AI media generation requires configuration or paid model access.'
  );

  const textCap = registry.find((c) => c.id === 'text_generation')!;
  assert.equal(textCap.verificationStatus, 'WORKING_WITH_NON_AI_FALLBACK');
});
