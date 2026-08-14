@echo off
setlocal EnableExtensions

set "TARGET_REGION=asia-northeast1"
set "TARGET_SERVICE=novora-japan-ai-gateway"

if not defined GOOGLE_CLOUD_PROJECT (
  echo ERROR: Set GOOGLE_CLOUD_PROJECT to the Japan-controlled Google Cloud project ID.
  exit /b 2
)
if not defined OPENAI_IMAGE_MODEL (
  echo ERROR: Set OPENAI_IMAGE_MODEL to the approved OpenAI image model name.
  exit /b 2
)
if not defined OPENAI_API_KEY_SECRET (
  echo ERROR: Set OPENAI_API_KEY_SECRET to the Secret Manager secret name. Do not set the secret value here.
  exit /b 2
)
if not defined NOVORA_GATEWAY_TOKEN_SECRET (
  echo ERROR: Set NOVORA_GATEWAY_TOKEN_SECRET to the Secret Manager secret name. Do not set the secret value here.
  exit /b 2
)

where gcloud >nul 2>nul
if errorlevel 1 (
  echo ERROR: Google Cloud CLI was not found. Install or open a prepared environment with gcloud, then sign in.
  exit /b 3
)

pushd "%~dp0.."
if not exist "Dockerfile" (
  echo ERROR: Run this helper from the prepared Gateway source package containing Dockerfile.
  popd
  exit /b 4
)

echo Deploying %TARGET_SERVICE% from source to %TARGET_REGION% using Google Cloud Build.
echo Local Docker and Docker Desktop are not used.

gcloud run deploy "%TARGET_SERVICE%" ^
  --source . ^
  --project "%GOOGLE_CLOUD_PROJECT%" ^
  --region "%TARGET_REGION%" ^
  --allow-unauthenticated ^
  --set-env-vars="AI_PROVIDER=openai,OPENAI_IMAGE_MODEL=%OPENAI_IMAGE_MODEL%" ^
  --set-secrets="OPENAI_API_KEY=%OPENAI_API_KEY_SECRET%:latest,NOVORA_GATEWAY_TOKEN=%NOVORA_GATEWAY_TOKEN_SECRET%:latest"

set "DEPLOY_EXIT_CODE=%ERRORLEVEL%"
popd

if not "%DEPLOY_EXIT_CODE%"=="0" (
  echo ERROR: Cloud Run source deployment failed with exit code %DEPLOY_EXIT_CODE%.
  exit /b %DEPLOY_EXIT_CODE%
)

echo Deployment completed. Copy the Gateway URL printed by Cloud Run, then run deploy\cloud-run-verify.cmd with that URL.
exit /b 0
