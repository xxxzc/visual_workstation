from sanic import Sanic
from sanic import response
from sanic_cors import CORS

from pathlib import Path

import json

app = Sanic("mock")
CORS(app)

@app.get("data")
def get_data(r):
    with open("data.json", "r", encoding="utf-8") as f:
        return response.json(json.load(f))


@app.post("save")
def save_data(r):
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(r.json, f, indent=4)
    return response.text("ok")


@app.get("models")
def get_models(r):
    return response.json(['model/' + p.name for p in Path('public/model').glob('*')])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, dev=True)