#!/bin/bash
sudo docker run -d \
  --name evolution-api \
  --restart always \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=beace2024 \
  -e AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true \
  -e DATABASE_ENABLED=false \
  -e DATABASE_PROVIDER=sqlite \
  atendai/evolution-api:v1.8.2
