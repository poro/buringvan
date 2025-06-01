# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the AI-Powered Social Media Management System using Kustomize.

## Architecture Overview

The application is deployed as a microservices architecture with the following components:

- **API Gateway** - Central entry point and request routing
- **Auth Service** - User authentication and authorization
- **Content Service** - Content management and workflow
- **AI Service** - AI-powered content generation
- **Social Service** - Social media platform integrations
- **Analytics Service** - Performance metrics and reporting
- **Notification Service** - Multi-channel notifications
- **Web Application** - React frontend
- **MongoDB** - Primary database
- **Redis** - Caching and session storage

## Directory Structure

```
k8s/
├── base/                          # Base Kubernetes manifests
│   ├── infrastructure.yaml       # MongoDB, Redis, API Gateway, Auth Service
│   ├── services.yaml             # Application services
│   ├── secrets.yaml              # Secrets and ConfigMaps
│   └── kustomization.yaml        # Base Kustomize configuration
└── overlays/                     # Environment-specific configurations
    ├── development/              # Development environment
    │   └── kustomization.yaml    # Dev-specific patches
    ├── staging/                  # Staging environment
    │   └── kustomization.yaml    # Staging-specific patches
    └── production/               # Production environment
        ├── kustomization.yaml    # Production-specific patches
        └── hpa.yaml             # Auto-scaling configurations
```

## Prerequisites

1. **Kubernetes Cluster** (v1.24+)
   - Minikube (for local development)
   - EKS, GKE, AKS (for cloud deployment)
   - Self-managed cluster

2. **Tools Required**
   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   
   # Install kustomize
   curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
   
   # Install helm (optional, for monitoring)
   curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar xz
   ```

3. **Container Registry**
   - Docker Hub
   - AWS ECR
   - Google Container Registry
   - Azure Container Registry

## Building and Pushing Images

First, build and push the Docker images:

```bash
# Set your container registry
export REGISTRY="your-registry.com"
export TAG="v1.0.0"

# Build all services
docker build -t $REGISTRY/social-media-ai/api-gateway:$TAG ./server/api-gateway
docker build -t $REGISTRY/social-media-ai/auth-service:$TAG ./server/auth-service
docker build -t $REGISTRY/social-media-ai/content-service:$TAG ./server/content-service
docker build -t $REGISTRY/social-media-ai/ai-service:$TAG ./server/ai-service
docker build -t $REGISTRY/social-media-ai/social-service:$TAG ./server/social-service
docker build -t $REGISTRY/social-media-ai/analytics-service:$TAG ./server/analytics-service
docker build -t $REGISTRY/social-media-ai/notification-service:$TAG ./server/notification-service
docker build -t $REGISTRY/social-media-ai/web-app:$TAG ./client/web

# Push all images
docker push $REGISTRY/social-media-ai/api-gateway:$TAG
docker push $REGISTRY/social-media-ai/auth-service:$TAG
docker push $REGISTRY/social-media-ai/content-service:$TAG
docker push $REGISTRY/social-media-ai/ai-service:$TAG
docker push $REGISTRY/social-media-ai/social-service:$TAG
docker push $REGISTRY/social-media-ai/analytics-service:$TAG
docker push $REGISTRY/social-media-ai/notification-service:$TAG
docker push $REGISTRY/social-media-ai/web-app:$TAG
```

Or use the build script:

```bash
# Make the script executable
chmod +x scripts/build-images.sh

# Build and push all images
./scripts/build-images.sh
```

## Deployment Instructions

### Development Environment

1. **Update Image References**
   ```bash
   # Edit k8s/overlays/development/kustomization.yaml
   # Update image names to point to your registry
   ```

2. **Create Namespace**
   ```bash
   kubectl create namespace social-media-ai-dev
   ```

3. **Deploy Application**
   ```bash
   # Deploy using kustomize
   kubectl apply -k k8s/overlays/development
   
   # Verify deployment
   kubectl get pods -n social-media-ai-dev
   kubectl get services -n social-media-ai-dev
   ```

4. **Access Application**
   ```bash
   # Get LoadBalancer external IP
   kubectl get service dev-api-gateway -n social-media-ai-dev
   kubectl get service dev-web-app -n social-media-ai-dev
   
   # For local development with minikube
   minikube service dev-api-gateway -n social-media-ai-dev
   minikube service dev-web-app -n social-media-ai-dev
   ```

### Production Environment

1. **Configure Secrets**
   ```bash
   # Create production secrets (use external secret management in real production)
   kubectl create secret generic mongodb-secret \
     --from-literal=username=prodadmin \
     --from-literal=password=secure-production-password \
     -n social-media-ai-prod
   
   kubectl create secret generic redis-secret \
     --from-literal=password=secure-redis-password \
     -n social-media-ai-prod
   
   kubectl create secret generic app-secrets \
     --from-literal=jwt-secret=super-secure-jwt-secret \
     --from-literal=jwt-refresh-secret=super-secure-refresh-secret \
     -n social-media-ai-prod
   
   kubectl create secret generic ai-secrets \
     --from-literal=openai-api-key=your-openai-api-key \
     -n social-media-ai-prod
   
   kubectl create secret generic social-secrets \
     --from-literal=linkedin-client-id=your-linkedin-client-id \
     --from-literal=linkedin-client-secret=your-linkedin-client-secret \
     --from-literal=twitter-client-id=your-twitter-client-id \
     --from-literal=twitter-client-secret=your-twitter-client-secret \
     --from-literal=instagram-client-id=your-instagram-client-id \
     --from-literal=instagram-client-secret=your-instagram-client-secret \
     -n social-media-ai-prod
   
   kubectl create secret generic notification-secrets \
     --from-literal=sendgrid-api-key=your-sendgrid-api-key \
     --from-literal=twilio-account-sid=your-twilio-account-sid \
     --from-literal=twilio-auth-token=your-twilio-auth-token \
     --from-literal=firebase-server-key=your-firebase-server-key \
     -n social-media-ai-prod
   ```

2. **Deploy Application**
   ```bash
   # Create namespace
   kubectl create namespace social-media-ai-prod
   
   # Deploy using kustomize
   kubectl apply -k k8s/overlays/production
   
   # Deploy auto-scaling
   kubectl apply -f k8s/overlays/production/hpa.yaml
   
   # Verify deployment
   kubectl get pods -n social-media-ai-prod
   kubectl get hpa -n social-media-ai-prod
   ```

3. **Configure Load Balancer**
   ```bash
   # Get external IP
   kubectl get service prod-api-gateway -n social-media-ai-prod
   kubectl get service prod-web-app -n social-media-ai-prod
   
   # Configure DNS records to point to these IPs
   ```

## Configuration Management

### Environment Variables

Each service supports the following environment variables:

**Common Variables:**
- `NODE_ENV` - Environment (development, staging, production)
- `PORT` - Service port
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret

**Service-Specific Variables:**
- AI Service: `OPENAI_API_KEY`, `OPENAI_MODEL`
- Social Service: `LINKEDIN_CLIENT_ID`, `TWITTER_CLIENT_ID`, etc.
- Notification Service: `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, etc.

### Secrets Management

For production deployments, use external secret management:

1. **AWS Secrets Manager**
   ```bash
   # Install External Secrets Operator
   helm repo add external-secrets https://charts.external-secrets.io
   helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
   ```

2. **HashiCorp Vault**
   ```bash
   # Install Vault
   helm repo add hashicorp https://helm.releases.hashicorp.com
   helm install vault hashicorp/vault
   ```

3. **Azure Key Vault**
   ```bash
   # Install Azure Key Vault Provider
   helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
   helm install csi-secrets-store-provider-azure csi-secrets-store-provider-azure/csi-secrets-store-provider-azure
   ```

## Monitoring and Observability

### Install Prometheus and Grafana

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Default credentials: admin/prom-operator
```

### Custom Metrics

Each service exposes metrics at `/metrics` endpoint:

- Request/response metrics
- Database connection metrics
- Custom business metrics
- Error rates and latencies

### Logging

Configure centralized logging:

```bash
# Install ELK Stack
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
helm install filebeat elastic/filebeat -n logging
```

## Scaling and Performance

### Horizontal Pod Autoscaling

Production environment includes HPA configurations:

```yaml
# Automatic scaling based on CPU and memory
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80
```

### Vertical Pod Autoscaling

```bash
# Install VPA
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/download/vertical-pod-autoscaler-0.13.0/vpa-release-0.13.0.yaml

# Create VPA for services
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: auth-service-vpa
  namespace: social-media-ai-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: prod-auth-service
  updatePolicy:
    updateMode: "Auto"
EOF
```

### Database Scaling

**MongoDB Scaling:**
```bash
# Scale MongoDB to replica set
kubectl patch statefulset mongodb -p '{"spec":{"replicas":3}}' -n social-media-ai-prod

# Add read replicas
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: mongodb-read
  namespace: social-media-ai-prod
spec:
  selector:
    app: mongodb
    role: secondary
  ports:
  - port: 27017
EOF
```

**Redis Scaling:**
```bash
# Deploy Redis Cluster
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install redis-cluster bitnami/redis-cluster \
  --set password=secure-redis-password \
  --set cluster.nodes=6 \
  --set cluster.replicas=1 \
  -n social-media-ai-prod
```

## Security

### Network Policies

Production includes network policies to restrict traffic:

```yaml
# Only allow necessary inter-service communication
ingress:
- from:
  - podSelector:
      matchLabels:
        app.kubernetes.io/name: social-media-ai
```

### Pod Security Standards

```bash
# Apply pod security standards
kubectl label namespace social-media-ai-prod \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

### RBAC

```yaml
# Create service account with minimal permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: social-media-ai-sa
  namespace: social-media-ai-prod
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: social-media-ai-role
  namespace: social-media-ai-prod
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
```

## Backup and Disaster Recovery

### Database Backups

```bash
# Create backup job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: social-media-ai-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: mongodb-backup
            image: mongo:7
            command:
            - /bin/bash
            - -c
            - |
              mongodump --host mongodb:27017 \
                --authenticationDatabase admin \
                --username \$MONGO_USERNAME \
                --password \$MONGO_PASSWORD \
                --gzip \
                --archive=/backup/backup-\$(date +%Y%m%d_%H%M%S).gz
              # Upload to cloud storage (AWS S3, GCS, etc.)
            env:
            - name: MONGO_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: username
            - name: MONGO_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: password
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
EOF
```

### Application Backup

```bash
# Backup Kubernetes resources
kubectl get all,configmap,secret -o yaml -n social-media-ai-prod > backup-$(date +%Y%m%d).yaml

# Use Velero for comprehensive backup
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts/
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.provider=aws \
  --set configuration.backupStorageLocation.bucket=your-backup-bucket
```

## Troubleshooting

### Common Issues

1. **Pods stuck in Pending state**
   ```bash
   kubectl describe pod <pod-name> -n <namespace>
   # Check resource requests, node capacity, and PVC availability
   ```

2. **Services not accessible**
   ```bash
   kubectl get endpoints <service-name> -n <namespace>
   kubectl describe service <service-name> -n <namespace>
   # Verify selectors and pod labels
   ```

3. **Database connection issues**
   ```bash
   kubectl logs <pod-name> -n <namespace>
   kubectl exec -it <pod-name> -n <namespace> -- env | grep MONGO
   # Check connection strings and credentials
   ```

4. **Auto-scaling not working**
   ```bash
   kubectl describe hpa <hpa-name> -n <namespace>
   kubectl top pods -n <namespace>
   # Ensure metrics server is running
   ```

### Debugging Commands

```bash
# Check pod logs
kubectl logs -f <pod-name> -n <namespace>

# Shell into pod
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# Check resource usage
kubectl top pods -n <namespace>
kubectl top nodes

# Network debugging
kubectl run netshoot --rm -i --tty --image nicolaka/netshoot -- /bin/bash

# Database connectivity
kubectl run mongodb-client --rm -i --tty --image mongo:7 -- mongosh mongodb://mongodb:27017
```

## Cleanup

```bash
# Remove application
kubectl delete -k k8s/overlays/production
kubectl delete -k k8s/overlays/development

# Remove namespaces
kubectl delete namespace social-media-ai-prod
kubectl delete namespace social-media-ai-dev

# Remove persistent volumes (if needed)
kubectl delete pv --all
```

## Cost Optimization

1. **Use Spot Instances** (for non-critical workloads)
2. **Right-size resources** based on actual usage
3. **Implement cluster autoscaling**
4. **Use reserved instances** for predictable workloads
5. **Monitor and optimize storage usage**

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Security Best Practices](https://kubernetes.io/docs/concepts/security/)
