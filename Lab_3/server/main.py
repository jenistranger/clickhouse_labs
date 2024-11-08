from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, DateTime, func, select
from clickhouse_sqlalchemy import make_session, types, engines
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins, or specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

DATABASE_URL = "clickhouse+http://default:quick@localhost:8123/grebomas"
engine = create_engine(DATABASE_URL)
metadata = MetaData()

mouse_movements = Table(
    'mouse_movements', metadata,
    Column('id', Integer, primary_key=True),
    Column('x', Integer),
    Column('y', Integer),
    Column('deltaX', Integer),
    Column('deltaY', Integer),
    Column('clientTimeStamp', DateTime),
    Column('button', Integer),
    Column('target', String),
    engines.MergeTree(order_by=['id'])
)

metadata.create_all(engine)
session = make_session(engine)

class MouseMovement(BaseModel):
    x: int
    y: int
    deltaX: int
    deltaY: int
    clientTimeStamp: str
    button: int
    target: str

@app.post("/upload-mouse-movement")
async def upload_mouse_movement(data: MouseMovement):
    try:
        
        timestamp = datetime.strptime(data.clientTimeStamp, "%Y-%m-%d %H:%M:%S")

        with engine.begin() as conn:
            result = conn.execute(select(func.max(mouse_movements.c.id)))
            max_id = result.scalar() or 0
            new_id = max_id + 1

            insert_query = mouse_movements.insert().values(
                id=new_id,
                x=data.x,
                y=data.y,
                deltaX=data.deltaX,
                deltaY=data.deltaY,
                clientTimeStamp=timestamp,
                button=data.button,
                target=data.target
            )

            conn.execute(insert_query)

        return {"status": "Data inserted successfully"}

    except Exception as e:
        # Обработка ошибок
        raise HTTPException(status_code=500, detail=f"Failed to insert data: {str(e)}")
