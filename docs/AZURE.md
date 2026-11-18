# Hosting the backend on Azure

Supabase (database + login) stays where it is. Azure runs the ADUF server (the part Vercel runs today) and, optionally, the AI model.
The repo ships a `Dockerfile`, `.github/workflows/deploy-azure.yml` and `.github/workflows/daily-cron.yml`.
**These files were not run against a real Azure account** (I can't reach one); the Docker build itself (node-server preset) was
built and the server answered `/api/health` locally. Expect to fix small things on first deploy.

## One-time setup (Azure Container Apps, covered by student credit)
1. Azure Portal > create a **Resource group** (e.g. `aduf-rg`).
2. Create a **Container Registry** (Basic tier) and a **Container Apps environment + app** (`aduf`), ingress **external**, target port **8080**.
3. Create a service principal for GitHub: `az ad sp create-for-rbac --name aduf-deploy --role contributor --scopes /subscriptions/<id>/resourceGroups/aduf-rg --json-auth`
   and save the JSON as GitHub secret `AZURE_CREDENTIALS`.
4. Let the container app pull from your registry (once): `az acr update -n <registry> --admin-enabled true` then
   `az containerapp registry set -n aduf -g <group> --server <registry>.azurecr.io --username <registry> --password "$(az acr credential show -n <registry> --query 'passwords[0].value' -o tsv)"`.
   Until a real image is deployed the app shows `{"error":"App port is not ready"}`: that is Azure's placeholder image listening on port 80.
5. GitHub repo secrets: `ACR_NAME`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and (optional) `VITE_SENTRY_DSN`, `VITE_DD_APPLICATION_ID`, `VITE_DD_CLIENT_TOKEN`, `APP_URL`, `CRON_SECRET`.
   Repo variables: `AZURE_RESOURCE_GROUP`, `AZURE_CONTAINER_APP`, `VITE_DD_SITE`.
6. In the Container App, add **secrets/env vars** for everything in `.env.example` that has no `VITE_` prefix (Supabase service key, `CRON_SECRET`, `PAYSTACK_SECRET_KEY`, `COMPOSIO_API_KEY`, `APP_URL`, `SENTRY_DSN`, `DD_API_KEY`...). Use "secret" type for keys.
7. Push to `main`: the workflow builds the image in Azure, rolls it out, and the container health check hits `/api/health`.
8. Point the Paystack webhook and Supabase auth redirect URLs at the new address.

## Scheduled jobs
Vercel Cron doesn't exist on Azure. `daily-cron.yml` calls `/api/cron/daily` every day at 06:00 UTC using `APP_URL` + `CRON_SECRET`. Remove `vercel.json`'s cron if you stop using Vercel.

## Azure OpenAI (optional AI provider)
1. Create an **Azure OpenAI / AI Foundry** resource and **deploy a model**; note the deployment name.
2. Set `AZURE_OPENAI_ENDPOINT` (e.g. `https://my-resource.openai.azure.com`) and `AZURE_OPENAI_DEPLOYMENT` on the server.
3. Open Settings: "Azure OpenAI" now appears in the model list. Paste the resource key there (stored encrypted like the others).
Uses Azure's v1 chat API with the `api-key` header. Student credit is limited, so watch spend in Azure Cost Management.

## Other Azure services worth adding later (not built)
- **Key Vault**: keep secrets out of Container App settings. - **Application Insights**: overlaps with Datadog; skip unless you want Azure-native logs.
- **Blob Storage**: for large uploads/exports. - **Container Apps scale rules**: min replicas 1 avoids cold starts.
I kept these out because each adds cost/setup and ADUF doesn't need them yet.
