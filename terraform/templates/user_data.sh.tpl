#!/bin/bash
set -euo pipefail

# --- System setup ---
dnf update -y
dnf install -y git

# Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

npm install -g pm2

# --- CloudWatch agent ---
dnf install -y amazon-cloudwatch-agent
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'CWCONFIG'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/cloudnotes/backend/app.log",
            "log_group_name": "/${project_name}/app",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
CWCONFIG
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# --- Application ---
sudo -u ec2-user git clone ${github_repo_url} /home/ec2-user/cloudnotes
cd /home/ec2-user/cloudnotes/backend
sudo -u ec2-user npm install --omit=dev

cat > /home/ec2-user/cloudnotes/backend/.env <<ENVFILE
PORT=${app_port}
NODE_ENV=production
AWS_REGION=${aws_region}
S3_BUCKET_NAME=${s3_bucket_name}
PGSSL=true
USE_SECRETS_MANAGER=true
SECRETS_MANAGER_SECRET_NAME=${secret_name}
ENVFILE
chown ec2-user:ec2-user /home/ec2-user/cloudnotes/backend/.env

# One-time schema setup (safe to re-run, uses CREATE TABLE IF NOT EXISTS)
sudo -u ec2-user bash -c "cd /home/ec2-user/cloudnotes/backend && npm run initdb"

# Start the app under pm2, and make pm2 survive reboots
sudo -u ec2-user bash -c "cd /home/ec2-user/cloudnotes/backend && pm2 start server.js --name cloudnotes --log /home/ec2-user/cloudnotes/backend/app.log"
sudo -u ec2-user pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
