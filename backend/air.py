
from fastapi import FastAPI
from pydantic import BaseModel
import json
import os

app = FastAPI()

FILE_NAME = "data.json"


class Data(BaseModel):
    message: str


@app.post("/write")
def write_data(data: Data):
    # Read existing data
    if os.path.exists(FILE_NAME):
        with open(FILE_NAME, "r") as file:
            saved_data = json.load(file)
    else:
        saved_data = []

    # Add new data
    saved_data.append(data.model_dump())

    # Write data to file
    with open(FILE_NAME, "w") as file:
        json.dump(saved_data, file, indent=4)

    return {"message": "Data saved successfully"}


@app.get("/read")
def read_data():
    if not os.path.exists(FILE_NAME):
        return {"data": []}

    with open(FILE_NAME, "r") as file:
        saved_data = json.load(file)

    return {"data": saved_data}


