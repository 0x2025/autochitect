# Running Autochitect with Podman

To run the architectural analyzer against any repository using Podman, use the following command. This assumes you are in the `poc_agent_runner` directory.

### Standard Run Command

```bash
# Set your environment variables first
export GOOGLE_API_KEY="your_key"
export TARGET_REPO_URL="https://github.com/org/repo.git"

podman run --rm -it \
  --name autochitect-run \
  -e GOOGLE_API_KEY \
  -e TARGET_REPO_URL \
  -e GCS_BUCKET_NAME \
  -v ./moat:/app/cli/moat:Z \
  -v ./registry.json:/app/registry.json:Z \
  -v ./workspace:/tmp/autochitect:Z \
  sangcungoc/autochitect:latest
```

### Explanation of Flags:

| Flag | Description |
| :--- | :--- |
| `--rm` | Automatically remove the container after it exits. |
| `-it` | Interactive terminal (allows you to see the real-time logs). |
| `-e` | Sets environment variables (API Key and Target Repo are mandatory). |
| `-v ...:Z` | Mounts local volumes. The `:Z` is critical for SELinux systems to allow Podman write access to local files. |
| `sangcungoc/autochitect:latest` | The localized production image. |

### Volume Breakdown:
1.  **`moat`**: Mount this directory to `/app/cli/moat` so the agent can read and *write* repository-specific architectural lessons (stored as `[repo-id].json`) and global lessons (`global.json`) back to your local machine.
2.  **`registry.json`**: Mount this if you want to test new Expert definitions without rebuilding the image.
3.  **`workspace`**: Temporary space where the agent clones and analyzes the code.

### Troubleshooting No-Access (Podman Rootless)
If you encounter permission denied errors on the mounted volumes, ensure the local directories have the correct ownership or use:
```bash
podman unshare chown -R 1000:1000 ./moat ./workspace
```
*(UID 1000 is the `node` user inside the container)*.
