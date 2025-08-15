#!/bin/bash

# VPR Tracker Deployment Script

echo "🔧 VPR Vulnerability Tracker Deployment"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p ./data
chmod 755 ./data

# Function to deploy with Docker Compose
deploy_compose() {
    echo "🚀 Deploying with Docker Compose..."
    $COMPOSE_CMD up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo ""
        echo "🌐 Access your VPR Tracker at:"
        echo "   Main App: http://localhost:8080"
        echo "   Data Server: http://localhost:8081"
        echo ""
        echo "📝 To view logs: $COMPOSE_CMD logs -f"
        echo "🛑 To stop: $COMPOSE_CMD down"
        echo "🔄 To restart: $COMPOSE_CMD restart"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
}

# Function to deploy with Docker only
deploy_docker() {
    echo "🚀 Deploying with Docker..."
    
    # Build the image
    echo "🔨 Building Docker image..."
    docker build -t vpr-tracker .
    
    if [ $? -ne 0 ]; then
        echo "❌ Docker build failed!"
        exit 1
    fi
    
    # Stop existing container if running
    docker stop vpr-tracker 2>/dev/null || true
    docker rm vpr-tracker 2>/dev/null || true
    
    # Run the container
    echo "🏃 Starting container..."
    docker run -d \
        --name vpr-tracker \
        -p 8080:80 \
        -v "$(pwd)/data:/usr/share/nginx/html/data" \
        vpr-tracker
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo ""
        echo "🌐 Access your VPR Tracker at: http://localhost:8080"
        echo ""
        echo "📝 To view logs: docker logs -f vpr-tracker"
        echo "🛑 To stop: docker stop vpr-tracker"
        echo "🔄 To restart: docker restart vpr-tracker"
    else
        echo "❌ Deployment failed!"
        exit 1
    fi
}

# Main menu
echo ""
echo "Choose deployment method:"
echo "1) Docker Compose (recommended)"
echo "2) Docker only"
echo "3) Exit"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        deploy_compose
        ;;
    2)
        deploy_docker
        ;;
    3)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Happy vulnerability tracking!"
