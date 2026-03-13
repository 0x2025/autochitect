podman build -t autochitect-local .
podman run -d \
  --name autochitect-local \
  -p 3000:3000 \
  -e GOOGLE_API_KEY=AIzaSyBkO8YjkkoCCOZdH78q22mqhYTRB7dfFLk \
  -e FORCE_LOCAL=true \
  autochitect-local
