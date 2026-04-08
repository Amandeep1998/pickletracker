# pickletracker

## API / Google sign-in (production)

The **frontend** (e.g. Vercel) and **backend** (e.g. `api.pickletracker.in`) deploy separately.  
If you see **“Google sign-in is not configured on the server”**, the **API** process does not have Firebase Admin credentials.

On the host that runs `backend` (Node/Express), set **one** of:

| Variable | Use case |
|----------|----------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service account JSON as a single line |
| `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` | Same JSON file, base64-encoded (often easiest in hosting UIs) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to JSON file on disk (typical for local dev only) |

Then restart the API. See `backend/.env.example`.

Generate base64 on macOS/Linux:

```bash
base64 -i path/to/serviceAccountKey.json | tr -d '\n'
```

Paste the output into `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` in your hosting provider’s environment variables.

