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

# Настройки подключения к ClickHouse
DATABASE_URL = "clickhouse+http://default:quick@localhost:8123/grebomas"
engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Определение таблицы mouse_movements в SQLAlchemy
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
    # Указываем движок MergeTree для ClickHouse
    engines.MergeTree(order_by=['id'])
)

# Создаем сессию для работы с ClickHouse
metadata.create_all(engine)
session = make_session(engine)

# Модель данных для валидации входных данных
class MouseMovement(BaseModel):
    x: int
    y: int
    deltaX: int
    deltaY: int
    clientTimeStamp: str  # Передаем временную метку как строку
    button: int
    target: str

@app.post("/upload-mouse-movement")
async def upload_mouse_movement(data: MouseMovement):
    try:
        # Преобразование временной метки из строки в datetime
        timestamp = datetime.strptime(data.clientTimeStamp, "%Y-%m-%d %H:%M:%S")

        # Получаем максимальный id из таблицы и прибавляем 1 для нового значения
        with engine.begin() as conn:
            result = conn.execute(select(func.max(mouse_movements.c.id)))
            max_id = result.scalar() or 0
            new_id = max_id + 1

            # Создаем запрос на вставку данных с новым id
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

            # Выполняем вставку данных
            conn.execute(insert_query)

        return {"status": "Data inserted successfully"}

    except Exception as e:
        # Обработка ошибок
        raise HTTPException(status_code=500, detail=f"Failed to insert data: {str(e)}")