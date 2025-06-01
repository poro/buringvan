#!/bin/bash

# AI-Powered Social Media Management System - Build and Deploy Script
# This script builds Docker images and deploys the application to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${REGISTRY:-your-registry.com}"
TAG="${TAG:-latest}"
ENVIRONMENT="${ENVIRONMENT:-development}"
NAMESPACE="${NAMESPACE:-social-media-ai-${ENVIRONMENT}}"

# Service list
SERVICES=(
    "api-gateway"
    "auth-service"
    "content-service"
    "ai-service"
    "social-service"
    "analytics-service"
    "notification-service"
)

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              AI-Powered Social Media Management               ║"
    echo "║                   Build and Deploy Script                    ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check kustomize
    if ! command -v kustomize &> /dev/null; then
        print_warning "kustomize not found, using kubectl apply -k instead"
    fi
    
    # Check if registry is accessible
    if [ "$REGISTRY" = "your-registry.com" ]; then
        print_warning "Using default registry placeholder. Please set REGISTRY environment variable."
        print_info "Example: export REGISTRY=your-actual-registry.com"
    fi
    
    print_info "Prerequisites check completed"
}

build_backend_services() {
    print_step "Building backend services..."
    
    for service in "${SERVICES[@]}"; do
        print_info "Building $service..."
        
        # Build the Docker image
        docker build \
            -t "${REGISTRY}/social-media-ai/${service}:${TAG}" \
            -f "server/${service}/Dockerfile" \
            "server/${service}/"
        
        if [ $? -eq 0 ]; then
            print_info "✓ Built ${service}"
        else
            print_error "✗ Failed to build ${service}"
            exit 1
        fi
    done
}

build_frontend() {
    print_step "Building frontend application..."
    
    # Build web application
    docker build \
        -t "${REGISTRY}/social-media-ai/web-app:${TAG}" \
        -f "client/web/Dockerfile" \
        "client/web/"
    
    if [ $? -eq 0 ]; then
        print_info "✓ Built web-app"
    else
        print_error "✗ Failed to build web-app"
        exit 1
    fi
}

push_images() {
    print_step "Pushing images to registry..."
    
    # Push backend services
    for service in "${SERVICES[@]}"; do
        print_info "Pushing ${service}..."
        docker push "${REGISTRY}/social-media-ai/${service}:${TAG}"
        
        if [ $? -eq 0 ]; then
            print_info "✓ Pushed ${service}"
        else
            print_error "✗ Failed to push ${service}"
            exit 1
        fi
    done
    
    # Push frontend
    print_info "Pushing web-app..."
    docker push "${REGISTRY}/social-media-ai/web-app:${TAG}"
    
    if [ $? -eq 0 ]; then
        print_info "✓ Pushed web-app"
    else
        print_error "✗ Failed to push web-app"
        exit 1
    fi
}

setup_namespace() {
    print_step "Setting up Kubernetes namespace..."
    
    # Create namespace if it doesn't exist
    kubectl get namespace "$NAMESPACE" &> /dev/null || \
        kubectl create namespace "$NAMESPACE"
    
    print_info "✓ Namespace $NAMESPACE ready"
}

deploy_to_kubernetes() {
    print_step "Deploying to Kubernetes..."
    
    # Update image tags in kustomization
    if [ -f "k8s/overlays/${ENVIRONMENT}/kustomization.yaml" ]; then
        # Create temporary kustomization with correct image tags
        cp "k8s/overlays/${ENVIRONMENT}/kustomization.yaml" \
           "k8s/overlays/${ENVIRONMENT}/kustomization.yaml.bak"
        
        # Update image tags
        for service in "${SERVICES[@]}"; do
            sed -i.tmp "s|newTag:.*|newTag: ${TAG}|g" \
                "k8s/overlays/${ENVIRONMENT}/kustomization.yaml"
        done
        sed -i.tmp "s|newTag:.*|newTag: ${TAG}|g" \
            "k8s/overlays/${ENVIRONMENT}/kustomization.yaml"
        
        # Apply the configuration
        if command -v kustomize &> /dev/null; then
            kustomize build "k8s/overlays/${ENVIRONMENT}" | kubectl apply -f -
        else
            kubectl apply -k "k8s/overlays/${ENVIRONMENT}"
        fi
        
        if [ $? -eq 0 ]; then
            print_info "✓ Deployment applied successfully"
        else
            print_error "✗ Failed to apply deployment"
            # Restore backup
            mv "k8s/overlays/${ENVIRONMENT}/kustomization.yaml.bak" \
               "k8s/overlays/${ENVIRONMENT}/kustomization.yaml"
            exit 1
        fi
        
        # Clean up temporary files
        rm -f "k8s/overlays/${ENVIRONMENT}/kustomization.yaml.tmp"
        rm -f "k8s/overlays/${ENVIRONMENT}/kustomization.yaml.bak"
    else
        print_error "Kustomization file not found for environment: $ENVIRONMENT"
        exit 1
    fi
}

wait_for_deployment() {
    print_step "Waiting for deployment to be ready..."
    
    # Wait for all deployments to be ready
    local deployments=(
        "api-gateway"
        "auth-service"
        "content-service"
        "ai-service"
        "social-service"
        "analytics-service"
        "notification-service"
        "web-app"
    )
    
    for deployment in "${deployments[@]}"; do
        print_info "Waiting for ${deployment} to be ready..."
        
        # Add environment prefix if not development
        if [ "$ENVIRONMENT" != "development" ]; then
            deployment="${ENVIRONMENT:0:4}-${deployment}"
        else
            deployment="dev-${deployment}"
        fi
        
        kubectl wait --for=condition=available \
            --timeout=300s \
            "deployment/${deployment}" \
            -n "$NAMESPACE"
        
        if [ $? -eq 0 ]; then
            print_info "✓ ${deployment} is ready"
        else
            print_warning "⚠ ${deployment} is not ready within timeout"
        fi
    done
}

show_status() {
    print_step "Deployment status..."
    
    echo ""
    print_info "Pods:"
    kubectl get pods -n "$NAMESPACE"
    
    echo ""
    print_info "Services:"
    kubectl get services -n "$NAMESPACE"
    
    echo ""
    print_info "Ingresses:"
    kubectl get ingress -n "$NAMESPACE" 2>/dev/null || echo "No ingresses found"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo ""
        print_info "Horizontal Pod Autoscalers:"
        kubectl get hpa -n "$NAMESPACE"
    fi
}

show_access_info() {
    print_step "Access Information"
    
    # Get service external IPs
    API_GATEWAY_IP=$(kubectl get service -n "$NAMESPACE" -o jsonpath='{.items[?(@.metadata.name=="'${ENVIRONMENT:0:4}'-api-gateway")].status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    WEB_APP_IP=$(kubectl get service -n "$NAMESPACE" -o jsonpath='{.items[?(@.metadata.name=="'${ENVIRONMENT:0:4}'-web-app")].status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    
    if [ "$ENVIRONMENT" = "development" ]; then
        API_GATEWAY_IP=$(kubectl get service -n "$NAMESPACE" -o jsonpath='{.items[?(@.metadata.name=="dev-api-gateway")].status.loadBalancer.ingress[0].ip}' 2>/dev/null)
        WEB_APP_IP=$(kubectl get service -n "$NAMESPACE" -o jsonpath='{.items[?(@.metadata.name=="dev-web-app")].status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    fi
    
    echo ""
    if [ -n "$API_GATEWAY_IP" ] && [ "$API_GATEWAY_IP" != "null" ]; then
        print_info "API Gateway: http://${API_GATEWAY_IP}"
    else
        print_info "API Gateway: Use 'kubectl port-forward' to access"
        print_info "kubectl port-forward svc/dev-api-gateway 3000:80 -n $NAMESPACE"
    fi
    
    if [ -n "$WEB_APP_IP" ] && [ "$WEB_APP_IP" != "null" ]; then
        print_info "Web Application: http://${WEB_APP_IP}"
    else
        print_info "Web Application: Use 'kubectl port-forward' to access"
        print_info "kubectl port-forward svc/dev-web-app 8080:80 -n $NAMESPACE"
    fi
    
    echo ""
    print_info "Default admin credentials:"
    print_info "Email: admin@socialmedia.ai"
    print_info "Password: admin123"
}

cleanup() {
    print_step "Cleaning up temporary files..."
    
    # Remove any temporary files
    find k8s/overlays/ -name "*.tmp" -delete 2>/dev/null || true
    find k8s/overlays/ -name "*.bak" -delete 2>/dev/null || true
    
    print_info "✓ Cleanup completed"
}

main() {
    print_banner
    
    print_info "Configuration:"
    print_info "Registry: $REGISTRY"
    print_info "Tag: $TAG"
    print_info "Environment: $ENVIRONMENT"
    print_info "Namespace: $NAMESPACE"
    echo ""
    
    # Trap to ensure cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    
    # Parse command line arguments
    case "${1:-all}" in
        "build")
            build_backend_services
            build_frontend
            ;;
        "push")
            push_images
            ;;
        "deploy")
            setup_namespace
            deploy_to_kubernetes
            wait_for_deployment
            ;;
        "all")
            build_backend_services
            build_frontend
            push_images
            setup_namespace
            deploy_to_kubernetes
            wait_for_deployment
            ;;
        "status")
            show_status
            show_access_info
            exit 0
            ;;
        "clean")
            print_step "Cleaning up deployment..."
            kubectl delete namespace "$NAMESPACE" --ignore-not-found=true
            print_info "✓ Namespace $NAMESPACE deleted"
            exit 0
            ;;
        *)
            echo "Usage: $0 [build|push|deploy|all|status|clean]"
            echo ""
            echo "Commands:"
            echo "  build   - Build Docker images"
            echo "  push    - Push images to registry"
            echo "  deploy  - Deploy to Kubernetes"
            echo "  all     - Build, push, and deploy (default)"
            echo "  status  - Show deployment status"
            echo "  clean   - Remove deployment"
            echo ""
            echo "Environment variables:"
            echo "  REGISTRY    - Container registry (default: your-registry.com)"
            echo "  TAG         - Image tag (default: latest)"
            echo "  ENVIRONMENT - Target environment (default: development)"
            exit 1
            ;;
    esac
    
    show_status
    show_access_info
    
    print_step "Deployment completed successfully! 🎉"
}

# Run main function
main "$@"
