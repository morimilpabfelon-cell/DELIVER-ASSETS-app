# DELIVER ASSETS Sync Hub

Servidor local de desarrollo para sincronizar Customer, Business, Rider y Control mediante el puerto `9090`.

```powershell
node services\sync-hub\server.mjs
adb reverse tcp:9090 tcp:9090
```

No expone el puerto a la red local: por defecto escucha solo en `127.0.0.1`. El teléfono accede mediante `adb reverse`.

Rutas:

- `GET /health`
- `GET /v1/state`
- `POST /v1/sync`
- `POST /v1/reset`

El estado se guarda en `services/sync-hub/data/hub-state.json` y se escribe atómicamente.
