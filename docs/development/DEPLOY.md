# 🚀 Deployment Guide: Multiplayer AI Orchestration

> **Deploy your changes to production with confidence**

---

## 🎯 **Overview**

This guide covers **deployment strategies** for the **Multiplayer AI Orchestration** project, including:
- **Deployment options** (Vercel, Railway, Docker, etc.).
- **Environment configuration** (staging vs. production).
- **CI/CD pipelines** (GitHub Actions).
- **Monitoring and scaling** (logging, metrics, auto-scaling).

---

## 🌐 **Deployment Options**

| **Option** | **Frontend** | **Backend** | **Database** | **Real-Time** | **Best For** |
|------------|--------------|-------------|--------------|---------------|--------------|
| **Vercel + Railway** | Vercel | Railway | Supabase/Railway | Railway | **Recommended** (easiest, serverless) |
| **AWS** | S3 + CloudFront | ECS/Fargate | RDS | API Gateway + WebSockets | Enterprise, high scalability |
| **Google Cloud** | Firebase Hosting | Cloud Run | Cloud SQL | Cloud Pub/Sub | GCP users |
| **Docker (Self-Hosted)** | Nginx | Docker Compose | PostgreSQL | Socket.io | Full control, on-prem |
| **Heroku** | Heroku | Heroku | Heroku Postgres | Heroku WebSockets | Quick prototypes |

---

## 🛠 **Option 1: Vercel (Frontend) + Railway (Backend)** *(Recommended)*

### **Why This Stack?**
✅ **Fully managed** (no server maintenance).
✅ **Auto-scaling** (handles traffic spikes).
✅ **Free tier available** (great for startups).
✅ **Easy CI/CD** (GitHub integration).

---

### **Step 1: Deploy Frontend to Vercel**

#### **1.1. Install Vercel CLI**
```bash
npm install -g vercel
```

#### **1.2. Configure `vercel.json`**
Create a `vercel.json` file in the root of your project:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": { "installCommand": "npm install" }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "http://your-railway-backend:3001/api/$1",
      "headers": { "Access-Control-Allow-Origin": "*" }
    },
    {
      "src": "/socket.io/(.*)",
      "dest": "http://your-railway-backend:3001/socket.io/$1",
      "headers": { "Access-Control-Allow-Origin": "*" }
    }
  ]
}
```

#### **1.3. Set Environment Variables in Vercel**
1. Go to your Vercel project dashboard.
2. Navigate to **Settings > Environment Variables**.
3. Add the following variables:
   ```
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-secret-key
   NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
   ```

#### **1.4. Deploy to Vercel**
```bash
# Deploy for the first time
vercel

# Or deploy without prompts
vercel --prod
```

#### **1.5. Configure Domain (Optional)**
1. Go to your Vercel project dashboard.
2. Navigate to **Settings > Domains**.
3. Add a custom domain (e.g., `app.yourdomain.com`).

---

### **Step 2: Deploy Backend to Railway**

#### **2.1. Install Railway CLI**
```bash
npm install -g @railway/cli
```

#### **2.2. Configure `railway.json`**
Create a `railway.json` file in the root of your project:
```json
{
  "services": [
    {
      "name": "backend",
      "start": "npm run start:backend",
      "build": "npm install && npx prisma generate",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3001
      }
    }
  ]
}
```

#### **2.3. Set Environment Variables in Railway**
1. Go to your Railway project dashboard.
2. Navigate to **Variables**.
3. Add the following variables:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   NODE_ENV=production
   PORT=3001
   SOCKET_IO_CORS_ORIGIN=https://your-app.vercel.app
   ANTHROPIC_API_KEY=your-anthropic-key
   OPENAI_API_KEY=your-openai-key
   ```

#### **2.4. Deploy to Railway**
```bash
# Deploy for the first time
railway up

# Or deploy without prompts
railway up --service backend
```

#### **2.5. Configure Database in Railway**
1. Go to your Railway project dashboard.
2. Click **"New Service" > "PostgreSQL"**.
3. Attach the PostgreSQL service to your backend.
4. Update the `DATABASE_URL` environment variable with the new connection string.

---

### **Step 3: Configure CORS and WebSockets**

#### **3.1. Update CORS in Backend**
In `src/server/index.ts`, update the CORS settings:
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://your-app.vercel.app",
      "http://localhost:3000", // For local development
    ],
    methods: ["GET", "POST"],
  },
});
```

#### **3.2. Test WebSocket Connection**
1. Open your deployed frontend.
2. Open the browser’s **Developer Tools > Network > WS (WebSocket)**.
3. Verify that the WebSocket connection is established to your Railway backend.

---

### **Step 4: Set Up CI/CD with GitHub Actions**

#### **4.1. Create `.github/workflows/deploy.yml`**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run build:frontend
      - uses: vercel/action@v2
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npx prisma generate
      - uses: railwayapp/railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

#### **4.2. Add GitHub Secrets**
1. Go to your GitHub repository **Settings > Secrets > Actions**.
2. Add the following secrets:
   - `VERCEL_TOKEN`: Your Vercel API token (from [Vercel Account Settings](https://vercel.com/account/tokens)).
   - `VERCEL_ORG_ID`: Your Vercel organization ID.
   - `VERCEL_PROJECT_ID`: Your Vercel project ID.
   - `RAILWAY_TOKEN`: Your Railway API token (from [Railway Account Settings](https://railway.app/account/tokens)).

---

## 🌐 **Option 2: AWS Deployment**

### **Why AWS?**
✅ **Highly scalable** (handles millions of users).
✅ **Global infrastructure** (low latency worldwide).
✅ **Enterprise-grade security** (compliance certifications).

---

### **Step 1: Deploy Frontend to AWS S3 + CloudFront**

#### **1.1. Install AWS CLI**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region, and output format.
```

#### **1.2. Build the Frontend**
```bash
npm run build:frontend
```

#### **1.3. Deploy to S3**
1. Create an S3 bucket:
   ```bash
   aws s3 mb s3://your-app-bucket --region us-east-1
   ```
2. Enable static website hosting:
   ```bash
   aws s3 website s3://your-app-bucket --index-document index.html --error-document error.html
   ```
3. Upload the build files:
   ```bash
   aws s3 sync out/ s3://your-app-bucket --delete
   ```
4. Set bucket policy to allow public access:
   ```bash
   aws s3api put-bucket-policy --bucket your-app-bucket --policy file://s3-policy.json
   ```
   Create `s3-policy.json`:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-app-bucket/*"
       }
     ]
   }
   ```

#### **1.4. Set Up CloudFront**
1. Create a CloudFront distribution:
   ```bash
   aws cloudfront create-distribution --origin-domain-name your-app-bucket.s3.amazonaws.com --default-root-object index.html
   ```
2. Wait for the distribution to deploy (can take ~15 minutes).
3. Update your DNS to point to the CloudFront distribution.

---

### **Step 2: Deploy Backend to AWS ECS**

#### **2.1. Create an ECR Repository**
```bash
# Create a repository for the backend
aws ecr create-repository --repository-name multiplayer-ai-backend

# Get the login command
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
```

#### **2.2. Build and Push the Docker Image**
```bash
# Build the Docker image
docker build -t multiplayer-ai-backend -f Dockerfile.server .

# Tag the image
docker tag multiplayer-ai-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/multiplayer-ai-backend:latest

# Push the image
docker push YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/multiplayer-ai-backend:latest
```

#### **2.3. Create an ECS Cluster**
1. Create a cluster:
   ```bash
   aws ecs create-cluster --cluster-name multiplayer-ai-cluster
   ```
2. Create a task definition (`ecs-task-definition.json`):
   ```json
   {
     "family": "multiplayer-ai-backend",
     "networkMode": "awsvpc",
     "executionRoleArn": "ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "multiplayer-ai-backend",
         "image": "YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/multiplayer-ai-backend:latest",
         "essential": true,
         "portMappings": [
           {
             "containerPort": 3001,
             "hostPort": 3001,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "DATABASE_URL",
             "value": "your-postgres-connection-string"
           },
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/multiplayer-ai-backend",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ],
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512"
   }
   ```
3. Register the task definition:
   ```bash
   aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
   ```

#### **2.4. Create a Service**
```bash
# Create a service
aws ecs create-service --cluster multiplayer-ai-cluster --service-name multiplayer-ai-backend --task-definition multiplayer-ai-backend:1 --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

#### **2.5. Set Up Load Balancer**
1. Create an Application Load Balancer (ALB):
   ```bash
   aws elbv2 create-load-balancer --name multiplayer-ai-alb --subnets subnet-12345 subnet-67890 --security-groups sg-12345
   ```
2. Create a target group:
   ```bash
   aws elbv2 create-target-group --name multiplayer-ai-target-group --protocol HTTP --port 3001 --vpc-id vpc-12345
   ```
3. Register the ECS service with the target group:
   ```bash
   aws elbv2 register-targets --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/multiplayer-ai-target-group/1234567890 --targets Id=ecs-instance-id,Port=3001
   ```
4. Create a listener:
   ```bash
   aws elbv2 create-listener --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/multiplayer-ai-alb/1234567890 --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/multiplayer-ai-target-group/1234567890
   ```

---

### **Step 3: Deploy Database to AWS RDS**

#### **3.1. Create a PostgreSQL Database**
```bash
# Create a DB instance
aws rds create-db-instance --db-instance-identifier multiplayer-ai-db --db-instance-class db.t3.micro --engine postgres --engine-version 15.3 --allocated-storage 20 --master-username postgres --master-user-password yourpassword --vpc-security-group-ids sg-12345 --availability-zone us-east-1a
```

#### **3.2. Configure Database Connection**
1. Once the database is created, note the **endpoint** (e.g., `multiplayer-ai-db.123456789012.us-east-1.rds.amazonaws.com`).
2. Update the `DATABASE_URL` in your ECS task definition:
   ```
   DATABASE_URL=postgresql://postgres:yourpassword@multiplayer-ai-db.123456789012.us-east-1.rds.amazonaws.com:5432/postgres
   ```

---

### **Step 4: Set Up WebSockets on AWS**

#### **4.1. Use API Gateway WebSockets**
1. Create a WebSocket API:
   ```bash
   aws apigatewayv2 create-api --name MultiplayerAIWebSocket --protocol-type WEBSOCKET --route-key '$default'
   ```
2. Set up routes to your ECS service:
   ```bash
   aws apigatewayv2 create-route --api-id YOUR_API_ID --route-key '$connect' --target "integrations/YOUR_INTEGRATION_ID"
   ```
3. Deploy the API:
   ```bash
   aws apigatewayv2 create-deployment --api-id YOUR_API_ID --stage-name prod
   ```

#### **4.2. Update Frontend to Use WebSocket API**
In your frontend, update the WebSocket URL to point to the API Gateway:
```typescript
// lib/yjs.ts
const websocketUrl = 'wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod';
```

---

## 🐳 **Option 3: Docker (Self-Hosted)**

### **Why Self-Hosted?**
✅ **Full control** over infrastructure.
✅ **On-prem deployment** (for security-conscious organizations).
✅ **No vendor lock-in**.

---

### **Step 1: Set Up a Server**
1. **Cloud Server**: Use a VPS (e.g., DigitalOcean, Linode, AWS EC2).
2. **Bare Metal**: Use your own hardware.
3. **Requirements**:
   - **OS**: Ubuntu 22.04 LTS (recommended).
   - **RAM**: 4GB+ (for development), 8GB+ (for production).
   - **CPU**: 2+ cores.
   - **Storage**: 50GB+ SSD.

---

### **Step 2: Install Dependencies**

#### **2.1. Install Docker and Docker Compose**
```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### **2.2. Install PostgreSQL (Optional)**
If you’re not using Docker for the database:
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

### **Step 3: Configure `docker-compose.yml`**

Create a `docker-compose.yml` file for production:

```yaml
version: '3.8'

services:
  # Postgres Database
  db:
    image: postgres:15
    container_name: multiplayer-ai-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: multiplayer_ai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis (for caching and rate limiting)
  redis:
    image: redis:7
    container_name: multiplayer-ai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # Backend Server
  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    container_name: multiplayer-ai-server
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/multiplayer_ai
      NODE_ENV: production
      PORT: 3001
      REDIS_URL: redis://redis:6379
      SOCKET_IO_CORS_ORIGIN: ${FRONTEND_URL}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  # Frontend App
  client:
    build:
      context: .
      dockerfile: Dockerfile.client
    container_name: multiplayer-ai-client
    environment:
      NEXTAUTH_URL: ${FRONTEND_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXT_PUBLIC_API_URL: http://server:3001
    ports:
      - "3000:3000"
    depends_on:
      - server
    restart: unless-stopped

  # Nginx (Reverse Proxy)
  nginx:
    image: nginx:1.25
    container_name: multiplayer-ai-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - client
      - server
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

### **Step 4: Configure Nginx**

Create an `nginx.conf` file:

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # Frontend (Next.js)
    server {
        listen 80;
        server_name yourdomain.com;
        
        location / {
            proxy_pass http://client:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Backend API
        location /api/ {
            proxy_pass http://server:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # WebSocket
        location /socket.io/ {
            proxy_pass http://server:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
    }
    
    # SSL Configuration (if using HTTPS)
    server {
        listen 443 ssl;
        server_name yourdomain.com;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        location / {
            proxy_pass http://client:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /api/ {
            proxy_pass http://server:3001;
            proxy_set_header Host $host;
        }
        
        location /socket.io/ {
            proxy_pass http://server:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

---

### **Step 5: Set Up SSL (HTTPS)**

#### **5.1. Get SSL Certificates**
Use **Let’s Encrypt** to get free SSL certificates:

```bash
# Install Certbot
sudo apt install -y certbot

# Stop Nginx temporarily
sudo systemctl stop nginx

# Request certificates
sudo certbot certonly --standalone -d yourdomain.com

# Start Nginx
sudo systemctl start nginx
```

#### **5.2. Configure SSL in Nginx**
1. Copy the certificates to your project:
   ```bash
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
   sudo chmod 600 ./ssl/privkey.pem
   ```
2. Update `nginx.conf` to use SSL (see above).

---

### **Step 6: Create `.env` File**

Create a `.env` file for Docker:

```env
# Database
POSTGRES_PASSWORD=your-postgres-password

# Frontend
FRONTEND_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key

# Backend
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

---

### **Step 7: Start the Containers**

```bash
# Build and start all services
docker-compose -f docker-compose.yml up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

### **Step 8: Set Up CI/CD with GitHub Actions**

Create `.github/workflows/deploy-selfhosted.yml`:

```yaml
name: Deploy to Self-Hosted

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install SSH Key
        uses: shimataro/ssh-key-action@v2
        with:
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          known_hosts: ${{ secrets.KNOWN_HOSTS }}
      
      - name: Copy Files to Server
        run: |
          rsync -avz --delete ./ user@your-server:/path/to/app/
      
      - name: Restart Containers
        run: |
          ssh user@your-server "cd /path/to/app && docker-compose down && docker-compose -f docker-compose.yml up --build -d"
```

---

## 📊 **Monitoring and Logging**

### **1. Logging**

#### **Frontend Logging**
- Use `console.log`, `console.error`, etc.
- For production, use a logging service like **Sentry** or **LogRocket**.

#### **Backend Logging**
- The backend uses **Winston** for structured logging.
- Logs are stored in `logs/server.log`.
- For production, use a logging service like **Papertrail** or **Datadog**.

#### **Database Logging**
- PostgreSQL logs are stored in `/var/log/postgresql/postgresql-15-main.log` (on the host).
- Use `pgBadger` to analyze PostgreSQL logs:
  ```bash
  pgbadger /var/log/postgresql/postgresql-15-main.log -o pgbadger-report.html
  ```

---

### **2. Metrics**

#### **Prometheus + Grafana**
1. **Install Prometheus and Grafana**:
   ```bash
   # Add Prometheus and Grafana to docker-compose.yml
   services:
     prometheus:
       image: prom/prometheus
       ports:
         - "9090:9090"
       volumes:
         - ./prometheus.yml:/etc/prometheus/prometheus.yml
     
     grafana:
       image: grafana/grafana
       ports:
         - "3002:3000"
       volumes:
         - grafana_data:/var/lib/grafana
   ```

2. **Configure Prometheus** (`prometheus.yml`):
   ```yaml
   global:
     scrape_interval: 15s
   
   scrape_configs:
     - job_name: 'nodejs'
       static_configs:
         - targets: ['server:3001']
     
     - job_name: 'postgres'
       static_configs:
         - targets: ['db:9187']
   ```

3. **Add Prometheus Client to Backend**:
   ```bash
   npm install prom-client
   ```
   ```typescript
   // server/index.ts
   import express from 'express';
   import client from 'prom-client';
   
   const app = express();
   
   // Prometheus metrics
   const collectDefaultMetrics = client.collectDefaultMetrics;
   collectDefaultMetrics({ timeout: 5000 });
   
   // Custom metrics
   const httpRequestDurationMicroseconds = new client.Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'code'],
     buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
   });
   
   // Middleware to track request duration
   app.use((req, res, next) => {
     const end = httpRequestDurationMicroseconds.startTimer();
     res.on('finish', () => {
       end({ method: req.method, route: req.route?.path, code: res.statusCode });
     });
     next();
   });
   
   // Prometheus metrics endpoint
   app.get('/metrics', async (req, res) => {
     res.set('Content-Type', client.register.contentType);
     res.end(await client.register.metrics());
   });
   ```

4. **Access Grafana**:
   - Open [http://your-server:3002](http://your-server:3002) in your browser.
   - Log in (default: `admin/admin`).
   - Add Prometheus as a data source (`http://prometheus:9090`).
   - Create dashboards for **request rates, error rates, latency, etc.**

---

### **3. Alerting**

#### **Slack Alerts**
1. **Set up Slack Incoming Webhook**:
   - Go to your Slack workspace **Settings > Apps > Incoming WebHooks**.
   - Add a new webhook and copy the URL.

2. **Add Alerting to Backend**:
   ```typescript
   // server/utils/alerts.ts
   import axios from 'axios';
   
   const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
   
   export const sendSlackAlert = async (message: string) => {
     if (!SLACK_WEBHOOK_URL) return;
     
     try {
       await axios.post(SLACK_WEBHOOK_URL, {
         text: `🚨 Multiplayer AI Alert: ${message}`,
       });
     } catch (error) {
       console.error('Failed to send Slack alert:', error);
     }
   };
   ```

3. **Trigger Alerts on Errors**:
   ```typescript
   // server/middleware/errorHandler.ts
   import { sendSlackAlert } from '../utils/alerts';
   
   export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
     console.error(err);
     sendSlackAlert(`Error: ${err.message}`);
     res.status(500).json({ error: 'Internal server error' });
   };
   ```

---

## 📈 **Scaling**

### **1. Horizontal Scaling**

#### **Frontend**
- **Vercel**: Auto-scales by default.
- **AWS S3 + CloudFront**: Scales automatically with traffic.
- **Self-Hosted**: Use **Nginx load balancing** across multiple frontend instances.

#### **Backend**
- **Railway**: Auto-scales based on CPU/memory usage.
- **AWS ECS**: Configure **auto-scaling groups** based on CPU/memory.
- **Self-Hosted**: Use **Docker Swarm** or **Kubernetes** for orchestration.

#### **Database**
- **PostgreSQL**: Use **read replicas** for read-heavy workloads.
- **Connection Pooling**: Use `pg-pool` to manage database connections.

#### **Real-Time (WebSockets)**
- **Socket.io + Redis**: Use Redis for **horizontal scaling** of WebSocket connections.
  ```typescript
  // server/index.ts
  import { createAdapter } from '@socket.io/redis-adapter';
  import { Server } from 'socket.io';
  import { createClient } from 'redis';
  
  const io = new Server();
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  
  io.adapter(createAdapter(pubClient, subClient));
  ```

---

### **2. Vertical Scaling**

| **Component** | **Scaling Strategy** | **Tools** |
|---------------|----------------------|-----------|
| **Frontend** | Increase CPU/RAM | Vercel, AWS EC2 |
| **Backend** | Increase CPU/RAM | Railway, AWS ECS |
| **Database** | Upgrade instance size | AWS RDS, Supabase |
| **Redis** | Increase memory | AWS ElastiCache, Railway |

---

### **3. Database Optimization**

#### **Indexing**
Add indexes to frequently queried columns:
```prisma
// prisma/schema.prisma
model Session {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  
  // Add index for faster lookups
  @@index([createdAt])
  @@index([name])
}
```

#### **Query Optimization**
- Use **`select`** to fetch only needed fields:
  ```typescript
  // Bad: Fetches all fields
  const session = await prisma.session.findUnique({ where: { id } });
  
  // Good: Fetches only needed fields
  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, name: true, createdAt: true },
  });
  ```
- Use **pagination** for large datasets:
  ```typescript
  const sessions = await prisma.session.findMany({
    take: 10,
    skip: 0,
    orderBy: { createdAt: 'desc' },
  });
  ```

#### **Connection Pooling**
Configure Prisma to use connection pooling:
```typescript
// server/index.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
      pool: {
        max: 20, // Maximum number of connections
        min: 5,  // Minimum number of connections
        idleTimeout: 30000, // Idle timeout in ms
        createTimeout: 3000, // Connection creation timeout in ms
      },
    },
  },
});
```

---

## 🔄 **Rolling Back Deployments**

### **Vercel**
1. Go to your Vercel project dashboard.
2. Navigate to **Deployments**.
3. Click **"Rollback"** on the deployment you want to revert to.

### **Railway**
1. Go to your Railway project dashboard.
2. Navigate to **Deployments**.
3. Click **"Rollback"** on the deployment you want to revert to.

### **AWS**
1. **ECS**: Deploy a previous task definition:
   ```bash
   aws ecs update-service --cluster multiplayer-ai-cluster --service multiplayer-ai-backend --task-definition multiplayer-ai-backend:PREVIOUS_VERSION
   ```
2. **S3**: Revert to a previous version of the frontend:
   ```bash
   aws s3 sync s3://your-app-bucket-backup/ s3://your-app-bucket --delete
   ```

### **Self-Hosted**
1. Roll back to a previous Git commit:
   ```bash
   git checkout PREVIOUS_COMMIT_HASH
   docker-compose -f docker-compose.yml up --build -d
   ```

---

## 📅 **Maintenance Tasks**

### **1. Database Backups**

#### **Automated Backups**
- **Railway**: Automatic backups are included.
- **AWS RDS**: Enable **automated backups** in the RDS console.
- **Self-Hosted**: Use `pg_dump`:
  ```bash
  # Daily backup cron job
  0 3 * * * pg_dump -U postgres -d multiplayer_ai > /backups/multiplayer-ai-$(date +\%Y-\%m-\%d).sql
  
  # Compress backups
  0 4 * * * gzip /backups/multiplayer-ai-*.sql
  
  # Delete backups older than 30 days
  0 5 * * * find /backups -name "*.sql.gz" -mtime +30 -delete
  ```

#### **Restore from Backup**
```bash
# Restore from a backup file
psql -U postgres -d multiplayer_ai < /backups/multiplayer-ai-2024-01-01.sql
```

---

### **2. Log Rotation**

Configure log rotation to prevent logs from filling up disk space:

```bash
# Install logrotate
sudo apt install -y logrotate

# Create logrotate config (/etc/logrotate.d/multiplayer-ai)
/path/to/your/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 youruser yourgroup
}
```

---

### **3. Dependency Updates**

#### **Automated Updates**
Use **Dependabot** or **Renovate** to automate dependency updates:

1. **Dependabot**:
   - Create `.github/dependabot.yml`:
     ```yaml
     version: 2
     updates:
       - package-ecosystem: "npm"
         directory: "/"
         schedule:
           interval: "daily"
         open-pull-requests-limit: 10
     ```

2. **Renovate**:
   - Install the [Renovate GitHub App](https://github.com/apps/renovate).

#### **Manual Updates**
```bash
# Update all dependencies
npm update

# Check for outdated dependencies
npm outdated

# Update a specific dependency
npm install package@latest
```

---

## 🎯 **Checklist Before Deployment**

| **Task** | **Done?** | **Notes** |
|----------|-----------|-----------|
| ✅ All tests pass | | Run `npm test` |
| ✅ No console.logs in production | | Use proper logging |
| ✅ Environment variables configured | | Check `.env` |
| ✅ Database migrations applied | | Run `npx prisma migrate deploy` |
| ✅ Build succeeds | | Run `npm run build` |
| ✅ WebSocket CORS configured | | Update `SOCKET_IO_CORS_ORIGIN` |
| ✅ Agent API keys set | | Check agent integrations |
| ✅ Monitoring configured | | Prometheus, Grafana, etc. |
| ✅ Alerting configured | | Slack, PagerDuty, etc. |
| ✅ Backups configured | | Automated backups |
| ✅ SSL configured (if HTTPS) | | Let’s Encrypt, etc. |
| ✅ CI/CD pipeline configured | | GitHub Actions |

---

## 🚀 **Next Steps**

1. **Choose a deployment option** (Vercel + Railway recommended).
2. **Set up monitoring and logging** (Prometheus + Grafana).
3. **Configure CI/CD** (GitHub Actions).
4. **Deploy and test** your changes.
5. **Monitor performance** and scale as needed.

---

## 📞 **Need Help?**

If you encounter any issues:
1. Check the **[Troubleshooting](#-troubleshooting)** section below.
2. Open an **issue** in the [GitHub repository](https://github.com/Ashuyadav96/om).
3. Reach out to the **project lead** ([Ashuyadav96](https://github.com/Ashuyadav96)).

---

### **Troubleshooting**

| **Issue** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| **`Error: Database connection failed`** | Incorrect `DATABASE_URL` | Check `.env` and database credentials. |
| **`Error: WebSocket connection failed`** | CORS or network issue | Check `SOCKET_IO_CORS_ORIGIN` and network connectivity. |
| **`Error: Port already in use`** | Port conflict | Change the port or kill the existing process. |
| **`Error: Agent API key missing`** | Missing API key | Add the key to `.env`. |
| **Frontend not loading** | Build failed | Check `npm run build` logs. |
| **Backend not starting** | Missing dependency | Run `npm install`. |
| **WebSocket not working** | Incorrect WebSocket URL | Check frontend WebSocket configuration. |
| **Database migrations pending** | Migrations not applied | Run `npx prisma migrate deploy`. |

---

**Happy deploying!** 🚀
