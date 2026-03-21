import uvicorn
from backend.app import app
from fastapi.routing import APIRoute

if __name__ == "__main__":
    for route in app.routes:
        if isinstance(route, APIRoute):
            print(
                f"{route.path}  methods={sorted(route.methods)}  name={route.name}  endpoint={route.endpoint.__name__}"
            )

    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
