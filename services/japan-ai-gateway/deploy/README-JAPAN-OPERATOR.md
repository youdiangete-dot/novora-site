# Japan Operator: Cloud Run Source Deployment

This package deploys the prepared NOVORA Japan AI Gateway from source:

`NOVORA source package -> Google Cloud source deployment -> Cloud Build remote container build -> Cloud Run Tokyo -> Japan Gateway -> OpenAI`

You do not need to write code, edit TypeScript, install Docker, install Docker Desktop, or understand Node.js. Google Cloud Build uses the included `Dockerfile` remotely.

## Fixed deployment target

- Cloud Run region: `asia-northeast1` (Tokyo)
- Cloud Run service: `novora-japan-ai-gateway`
- Deployment method: `gcloud run deploy --source .`
- Health check: `GET /healthz` only

The Cloud Run URL is publicly reachable so NOVORA can call the Gateway. The Gateway's `POST /v1/first-preview` route still requires its separate Bearer credential. Never put that credential in this package or in a browser.

## Preparation checklist

Ask a Google Cloud administrator for help with the permissions items if needed.

1. Use a Japan-controlled Google account.
2. Create or select a Japan-controlled Google Cloud project.
3. Enable billing for that project.
4. Enable the Cloud Run API.
5. Enable the Cloud Build API.
6. Enable Artifact Registry and allow source deployment to create/use the regional `cloud-run-source-deploy` repository when it does not already exist.
7. Enable Secret Manager. Grant the deployer the required source-deploy permissions and permission to make the service publicly reachable. Grant the build service account Cloud Run Builder and grant the Cloud Run service identity access only to the two required secrets.
8. Confirm the target is Tokyo: `asia-northeast1`.
9. Use a Japan-controlled OpenAI API account/project with API billing and spending controls configured.
10. Create the Japan-controlled `OPENAI_API_KEY`, but enter its value only as a new version of the corresponding Google Cloud Secret Manager secret.

The standard source-deploy roles are Cloud Run Source Developer and Service Usage Consumer for the deployer, Service Account User on the Cloud Run service identity, and Cloud Run Builder for the build service account. Making the service publicly reachable also requires `run.services.setIamPolicy`, normally supplied by Cloud Run Admin. A project administrator should grant the narrowest suitable access.

## Secret setup boundary

Create two Secret Manager secrets in the Japan-controlled project:

- one holding the actual `OPENAI_API_KEY`;
- one holding the actual `NOVORA_GATEWAY_TOKEN` shared only with the authorized NOVORA server.

The Cloud Run service identity needs Secret Manager Secret Accessor for these two secrets. Do not paste either secret value into a command file, configuration file, documentation, source file, `.env` file, chat message, or email. The deployment helper receives only the non-secret Secret Manager resource names.

The intended Cloud Run runtime state is:

- `AI_PROVIDER=openai`
- `OPENAI_API_KEY` from the Japan-controlled Secret Manager secret
- `NOVORA_GATEWAY_TOKEN` from the Gateway Secret Manager secret
- `OPENAI_IMAGE_MODEL` set to the approved configured model
- `PORT` supplied automatically by Cloud Run; do not set it manually

## Deployment procedure

1. Sign in to the Japan-controlled Google account.
2. Complete the Google Cloud preparation checklist above.
3. Complete OpenAI API billing/key preparation and place the key only in Secret Manager.
4. On the prepared Windows computer, install/sign in to the Google Cloud CLI if it is not already available. Docker is not needed.
5. Open Command Prompt in `services\japan-ai-gateway` and authenticate:

   ```cmd
   gcloud auth login
   ```

6. Set only these non-secret values in that Command Prompt. Use `deploy\cloud-run-config.example` as the name reference:

   ```cmd
   set "GOOGLE_CLOUD_PROJECT=REPLACE_WITH_GOOGLE_CLOUD_PROJECT_ID"
   set "OPENAI_IMAGE_MODEL=REPLACE_WITH_APPROVED_OPENAI_IMAGE_MODEL"
   set "OPENAI_API_KEY_SECRET=REPLACE_WITH_OPENAI_API_KEY_SECRET_NAME"
   set "NOVORA_GATEWAY_TOKEN_SECRET=REPLACE_WITH_GATEWAY_TOKEN_SECRET_NAME"
   ```

   Replace every placeholder. Secret names are safe configuration; secret values are not.

7. Run the prepared source-deployment helper:

   ```cmd
   deploy\cloud-run-deploy.cmd
   ```

   Cloud Build performs the remote image build using the included `Dockerfile`. The helper does not require local Docker.

8. Copy the Gateway URL shown by the successful Cloud Run deployment.
9. Run exactly the prepared health check:

   ```cmd
   deploy\cloud-run-verify.cmd "https://REPLACE_WITH_GATEWAY_URL"
   ```

10. Return the Gateway URL and health-check result to the NOVORA Owner through the approved secure handoff channel. Do not send either secret value.

This verification checks only `GET /healthz`. It does not call OpenAI and does not prove real Provider generation. Real Provider verification is a separate Owner-approved gate.
