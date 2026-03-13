#!/bin/bash
podman stop autochitect-local || true
podman rm autochitect-local || true
podman build -t autochitect-local .
podman run -d \
  --name autochitect-local \
  -p 3000:3000 \
  -e GOOGLE_API_KEY=$GOOGLE_API_KEY \
  -e FORCE_LOCAL=true \
  autochitect-local
