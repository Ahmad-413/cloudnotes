# CloudNotes

A simple notes app with image attachments, built to demonstrate a full AWS deployment:
compute, object storage, managed database, networking, IAM, secrets, and monitoring —
provisioned with Terraform and deployed via GitHub Actions.

**Stack:** Node.js/Express API + vanilla HTML/JS frontend + PostgreSQL (RDS) + S3

---

## Architecture

```
Browser ──> EC2 (Express app, via pm2)
                │
                ├──> RDS PostgreSQL (notes data, private subnet)
                ├──> S3 bucket (note images)
                ├──> Secrets Manager (DB credentials)
                └──> CloudWatch Logs (app logs)
      (all access controlled via an IAM Instance Profile — no hardcoded keys)
```

---

## 1. Run it locally first

```bash
cd backend
cp .env.example .env
# Edit .env with a local or test Postgres connection string
npm install
npm run initdb   # creates the notes table
npm start
```

Visit `http://localhost:8080`.

---

## 2. Provision AWS resources with Terraform

Everything — VPC, subnets, security groups, RDS, S3, Secrets Manager, the IAM role,
and the EC2 instance — is defined in `terraform/`. No manual console clicking required.

### One-time prerequisites
```bash
# 1. An EC2 key pair (needed for SSH / GitHub Actions deploys)
aws ec2 create-key-pair --key-name cloudnotes-key \
  --query 'KeyMaterial' --output text > cloudnotes-key.pem
chmod 400 cloudnotes-key.pem

# 2. Push this repo to GitHub first — the EC2 instance clones it on first boot
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/your-username/cloudnotes.git
git push -u origin main
```
Also install [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
and configure AWS credentials locally (`aws configure`).

### Deploy the infrastructure
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: set key_pair_name, github_repo_url, and ideally
# restrict ssh_allowed_cidr to your own IP

terraform init
terraform plan     # review what will be created
terraform apply    # type "yes" to confirm
```

This one `apply` creates:

| Resource | Purpose |
|---|---|
| VPC + 2 public + 2 private subnets | Networking isolation |
| Internet Gateway + public route table | Public subnet internet access |
| Security groups (app, db) | App SG allows 80/8080/22; DB SG allows 5432 **only from the app SG** |
| RDS PostgreSQL (private subnet) | Notes database, not publicly accessible, password auto-generated |
| S3 bucket | Image uploads, public read scoped to the `notes/*` prefix only |
| Secrets Manager secret | Holds the DB connection string |
| IAM role + instance profile | Least-privilege access to just that S3 bucket and that secret |
| CloudWatch log group | Receives shipped application logs |
| EC2 instance + Elastic IP | Runs the app under `pm2`, bootstrapped via `user_data` |

When it finishes:
```bash
terraform output
```
gives you `app_url`, `app_public_ip`, `rds_endpoint`, and more. The `user_data`
boot script automatically installs Node.js, clones your repo, writes a `.env` file
pointing at Secrets Manager (no hardcoded credentials anywhere), runs the schema
setup, and starts the app with `pm2` so it survives reboots.

To tear everything down when you're done (avoid ongoing charges):
```bash
terraform destroy
```

---

## 3. CI/CD with GitHub Actions

Two workflows live in `.github/workflows/`:

- **`deploy.yml`** — runs automatically on every push to `main` that touches
  `backend/` or `frontend/`. It syntax-checks the code, then SSHes into the EC2
  instance, pulls the latest commit, reinstalls dependencies, restarts the app
  with `pm2`, and verifies `/health` responds.
- **`terraform.yml`** — runs `terraform plan` automatically on any pull request
  touching `terraform/**`, and lets you manually trigger `plan`/`apply`/`destroy`
  from the Actions tab. Infra changes are kept manual/reviewed rather than
  auto-applied on every push, since they can affect billing and availability.

### Required GitHub Secrets
Add these under **Settings → Secrets and variables → Actions**:

| Secret | Used by | Value |
|---|---|---|
| `EC2_HOST` | deploy.yml | The `app_public_ip` output from `terraform output` |
| `EC2_SSH_PRIVATE_KEY` | deploy.yml | Contents of `cloudnotes-key.pem` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | terraform.yml | Credentials for a dedicated CI IAM user (not your root account) with permission to manage the resources above |
| `TF_VAR_KEY_PAIR_NAME` | terraform.yml | `cloudnotes-key` |
| `TF_VAR_GITHUB_REPO_URL` | terraform.yml | `https://github.com/your-username/cloudnotes.git` |

> For anything beyond this module, swap the long-lived AWS keys in `terraform.yml`
> for **OIDC federation** (`aws-actions/configure-aws-credentials` supports this)
> so GitHub Actions never holds static AWS credentials at all.

### Typical workflow after initial setup
1. Run `terraform apply` once (locally or via the `terraform.yml` workflow) to stand up infrastructure.
2. Copy the resulting `app_public_ip` into the `EC2_HOST` secret.
3. From then on, just `git push` to `main` — `deploy.yml` ships your code changes automatically.

---

## 4. Monitoring

- The CloudWatch agent runs on the instance (installed via `user_data`) and ships
  the app's log file to the `/cloudnotes/app` CloudWatch log group.
- The app logs structured JSON per request and logs all errors to that same file.
- `GET /health` is a lightweight endpoint for uptime checks — the deploy workflow
  also pings it after every deploy to confirm success.
- Set a CloudWatch Alarm on the instance's CPU utilization, and a **Billing Alarm**
  (e.g. alert at $5) so nothing surprises you.

---

## 5. Resource quotas / cost control

- RDS: `db.t3.micro`, 20GB storage (fits the AWS free tier for the first 12 months).
- EC2: `t3.micro` is plenty for a demo.
- S3: negligible cost for small images; a lifecycle rule (disabled by default) can
  auto-expire old uploads after 90 days.
- Remember to run `terraform destroy` when you're done testing to avoid ongoing charges.

---

## Project structure

```
cloudnotes/
├── backend/
│   ├── server.js               # Express app entrypoint
│   ├── db.js                   # Postgres connection pool
│   ├── secrets.js              # Secrets Manager / env var resolution
│   ├── s3.js                   # S3 client + multer upload config
│   ├── schema.sql              # Database schema
│   ├── routes/notes.js         # CRUD API routes
│   ├── scripts/initdb.js       # One-time schema setup script
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── infra/
│   └── iam-policy.json         # Reference copy of the IAM policy (Terraform generates the real one)
├── terraform/
│   ├── main.tf                 # Provider + Terraform version constraints
│   ├── variables.tf            # All configurable inputs
│   ├── vpc.tf                  # VPC, public/private subnets, routing
│   ├── security_groups.tf      # App SG and DB SG
│   ├── rds.tf                  # PostgreSQL instance
│   ├── s3.tf                   # Upload bucket + scoped public-read policy
│   ├── secrets.tf              # Secrets Manager secret for DB credentials
│   ├── iam.tf                  # IAM role + instance profile for the app
│   ├── ec2.tf                  # App instance + Elastic IP + CloudWatch log group
│   ├── templates/user_data.sh.tpl  # Boot script: installs Node, clones repo, starts pm2
│   ├── outputs.tf               # app_url, rds_endpoint, etc.
│   └── terraform.tfvars.example
└── .github/workflows/
    ├── deploy.yml                # Auto-deploys app code to EC2 on push to main
    └── terraform.yml             # Plans on PR; manual apply/destroy for infra changes
```
