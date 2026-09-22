# `infra/` — OctoCAT Azure deployment

This directory defines the Azure Container Apps deployment used by the GitHub
Actions workflow in `.github/workflows/deploy.yml`.

## Intended topology

Azure **Container Apps** as the compute target:

```
        Azure Container Registry (ACR)
                 │  (holds api + frontend images)
                 ▼
   ┌──────────── Container Apps Environment ────────────┐
   │                                                    │
   │   frontend (nginx)            api (Node/Express)   │
   │   external ingress :80  ────► ingress :3000        │
   │   proxies /api via nginx      (internal OR external)│
   │                                                    │
   └────────────────────┬───────────────────────────────┘
                        │ logs
                        ▼
             Log Analytics workspace
```

- **ACR** — stores the two images the apps pull.
- **Log Analytics workspace** — a hard dependency of the Container Apps
  environment; provisioned first.
- **Container Apps Environment** — the shared boundary both apps run in. Apps in
  the same environment can address each other by app name (service discovery).
- **`api` Container App** — target port **3000** (matches `src/api-ts/Dockerfile`,
  which `EXPOSE`s 3000 and runs `npm start`).
- **`frontend` Container App** — external ingress on port **80** (matches
  `src/frontend/Dockerfile`, nginx). Its runtime configuration points the
  browser at the public API FQDN over HTTPS.

## How the Bicep maps to the two Dockerfiles

| Dockerfile | Port | Container App | Notes |
| --- | --- | --- | --- |
| `src/api-ts/Dockerfile` | `EXPOSE 3000` | `<prefix>-<env>-api` | `targetPort: 3000`. Ingress internal-vs-external is a **TODO** decision. |
| `src/frontend/Dockerfile` | `EXPOSE 80` | `<prefix>-<env>-frontend` | `targetPort: 80`, external. Gets `API_HOST` = the public API FQDN and `API_PORT` = `443`. |

The workflow builds each image from its own context (`src/api-ts` and
`src/frontend`) and pushes to ACR; the Bicep then references those image tags.

## Files

| File | Purpose |
| --- | --- |
| `main.bicep` | `targetScope = 'resourceGroup'`. Wires ACR, Log Analytics, the environment, and the two apps by calling the modules. Declares parameters + outputs. |
| `modules/registry.bicep` | ACR (stub — SKU/admin/network are TODO). |
| `modules/loganalytics.bicep` | Log Analytics workspace (stub — retention/SKU TODO). |
| `modules/containerapp-env.bicep` | Container Apps managed environment. |
| `modules/containerapp.bicep` | Generic app module, reused for **both** api and frontend. |
| `main.parameters.json` | Placeholder parameter values with TODO comments. |

## What's provided vs. deliberately left as `TODO`

**Provided (so you don't start from a blank page):**

- Module structure and the wiring between them.
- Sensible parameters (`location`, `namePrefix`, `environmentName`, image
  references, `minReplicas` / `maxReplicas`) and outputs (ACR login server,
  frontend URL, api FQDN).
- The port mapping (api `3000`, frontend `80`) and browser-facing API runtime
  configuration.
- OIDC-based CI/CD plumbing in the workflow (no long-lived secrets).

**Left as `TODO` (the decisions that make this a real deploy — do these):**

- **SKUs** — ACR tier, Log Analytics retention, container CPU/memory.
- **api ingress visibility** — public (its own URL, easy debugging) vs.
  internal-only (reached solely by the frontend inside the environment).
- **Database / storage strategy** — the api ships with an in-container
  **SQLite** DB. In Container Apps that is **ephemeral** (it resets on every
  revision/scale event). Choose one: keep it ephemeral for a demo, mount an
  **Azure Files** volume to persist it, or move to a **managed DB**
  (Azure SQL / PostgreSQL) and inject a connection string. *Not decided for you.*
- **Registry auth** — the scaffold defaults to ACR **admin credentials** for a
  fast first deploy; the preferred approach is a **user-assigned managed
  identity** with the `AcrPull` role (no secrets). Swap it in.
- **Additional env vars / secrets** — the OpenAI key is wired through a
  Container Apps secret, but other production configuration still needs an
  explicit strategy.
- **Scaling rules** — replica counts are set, but add real scale triggers
  (HTTP concurrency, CPU, ...).
- **Service discovery** — confirm the frontend→api wiring works with whichever
  ingress visibility you pick.

## Deploy it manually

```bash
# 1. Sanity-check the template compiles
az bicep build --file infra/main.bicep        # or: bicep build infra/main.bicep

# 2. Create a resource group
az group create --name <rg-name> --location <region>

# 3. Deploy (fill in the image references — see main.parameters.json TODOs)
az deployment group create \
  --resource-group <rg-name> \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters \
      apiImage="<acr>.azurecr.io/api:<tag>" \
      frontendImage="<acr>.azurecr.io/frontend:<tag>" \
      openAiApiKey="$OPENAI_API_KEY"

# 4. Read the outputs (e.g. the public frontend URL)
az deployment group show -g <rg-name> -n main \
  --query properties.outputs.frontendUrl.value -o tsv
```

> **Chicken-and-egg note:** the images live in the ACR this template creates, so
> on a first run either point `apiImage` / `frontendImage` at a temporary public
> placeholder image, deploy once to create the ACR, then build/push and redeploy
> — **or** split provisioning: create the ACR first, push images, then deploy the
> apps. The workflow leaves this ordering as a TODO for you to decide.

## Deploy via GitHub Actions

The workflow checks out `main`, installs dependencies, builds and tests the
application, creates the resource group and ACR when needed, builds and pushes
both images, deploys this Bicep, and verifies the frontend and API URLs.

Required GitHub **secrets**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
`AZURE_SUBSCRIPTION_ID`, and `OPENAI_API_KEY`. Required **variables**: `AZURE_RESOURCE_GROUP`,
`AZURE_LOCATION` should be a region with available Container Apps capacity.
Optional variables `AZURE_NAME_PREFIX` and
`AZURE_ENVIRONMENT_NAME` control globally unique resource names; set a prefix
that is unique to your subscription when the default `octocat` name is taken.
The Azure identity needs `Contributor` on the target resource
group and a federated credential whose subject matches
`repo:<owner>/<repo>:ref:refs/heads/main`. No client secret is stored.

The Bicep template stores `OPENAI_API_KEY` as the `openai-api-key` Container
Apps secret and references it only from the API container. It is intentionally
absent from `main.parameters.json`; pass it at deployment time or through the
GitHub Actions secret. The frontend container and browser runtime configuration
never receive this value.

## Tooling note

The repo's `.vscode/mcp.json` preconfigures an **Azure MCP Server**
(`@azure/mcp`). You can use it during the challenge to explore/verify Azure
resources — it's handy but not required by this scaffold.
