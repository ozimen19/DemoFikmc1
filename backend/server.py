from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
SECRET_KEY = "ultra_modern_film_site_secret_key_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app
app = FastAPI(title="Ultra Modern Film Site API")

# Security
security = HTTPBearer()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Movie(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    genre: str
    release_year: int
    rating: float = Field(ge=0, le=10)
    video_url: Optional[str] = None
    video_file: Optional[str] = None
    thumbnail: Optional[str] = None
    featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MovieCreate(BaseModel):
    title: str
    description: str
    genre: str
    release_year: int
    rating: float = Field(ge=0, le=10)
    video_url: Optional[str] = None
    featured: bool = False

class MovieUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    genre: Optional[str] = None
    release_year: Optional[int] = None
    rating: Optional[float] = Field(None, ge=0, le=10)
    video_url: Optional[str] = None
    featured: Optional[bool] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    role: str = "user"  # "user" or "admin"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    password: str

class SiteSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    site_name: str = "Ultra Cinema"
    theme_color: str = "#1a1a1a"
    accent_color: str = "#e50914"
    featured_movies_count: int = 6
    allow_user_registration: bool = True
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str

# Helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Auth routes
@api_router.post("/admin/login", response_model=Token)
async def admin_login(login_data: AdminLogin):
    # Simple admin password check (in production, use proper user management)
    if login_data.password != "1653":
        raise HTTPException(status_code=401, detail="Invalid admin password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "admin", "role": "admin"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/register", response_model=dict)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    await db.users.insert_one(user.dict())
    return {"message": "User registered successfully"}

@api_router.post("/login", response_model=Token)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Movie routes
@api_router.get("/movies", response_model=List[Movie])
async def get_movies(featured_only: bool = False):
    query = {"featured": True} if featured_only else {}
    movies = await db.movies.find(query).to_list(1000)
    return [Movie(**movie) for movie in movies]

@api_router.get("/movies/{movie_id}", response_model=Movie)
async def get_movie(movie_id: str):
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return Movie(**movie)

@api_router.post("/admin/movies", response_model=Movie)
async def create_movie(movie_data: MovieCreate, token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    movie = Movie(**movie_data.dict())
    await db.movies.insert_one(movie.dict())
    return movie

@api_router.put("/admin/movies/{movie_id}", response_model=Movie)
async def update_movie(movie_id: str, movie_data: MovieUpdate, token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    update_data = {k: v for k, v in movie_data.dict().items() if v is not None}
    if update_data:
        await db.movies.update_one({"id": movie_id}, {"$set": update_data})
    
    updated_movie = await db.movies.find_one({"id": movie_id})
    return Movie(**updated_movie)

@api_router.delete("/admin/movies/{movie_id}")
async def delete_movie(movie_id: str, token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.movies.delete_one({"id": movie_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Movie not found")
    return {"message": "Movie deleted successfully"}

@api_router.post("/admin/movies/{movie_id}/upload-video")
async def upload_video(movie_id: str, video: UploadFile = File(...), token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Save video file
    file_extension = video.filename.split(".")[-1]
    video_filename = f"{movie_id}_video.{file_extension}"
    video_path = UPLOAD_DIR / video_filename
    
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    # Update movie with video file path
    await db.movies.update_one({"id": movie_id}, {"$set": {"video_file": video_filename}})
    
    return {"message": "Video uploaded successfully", "filename": video_filename}

@api_router.post("/admin/movies/{movie_id}/upload-thumbnail")
async def upload_thumbnail(movie_id: str, thumbnail: UploadFile = File(...), token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    # Save thumbnail file
    file_extension = thumbnail.filename.split(".")[-1]
    thumbnail_filename = f"{movie_id}_thumb.{file_extension}"
    thumbnail_path = UPLOAD_DIR / thumbnail_filename
    
    with open(thumbnail_path, "wb") as buffer:
        shutil.copyfileobj(thumbnail.file, buffer)
    
    # Update movie with thumbnail file path
    await db.movies.update_one({"id": movie_id}, {"$set": {"thumbnail": thumbnail_filename}})
    
    return {"message": "Thumbnail uploaded successfully", "filename": thumbnail_filename}

# File serving routes
@api_router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# Site settings routes
@api_router.get("/settings", response_model=SiteSettings)
async def get_settings():
    settings = await db.settings.find_one()
    if not settings:
        # Create default settings
        default_settings = SiteSettings()
        await db.settings.insert_one(default_settings.dict())
        return default_settings
    return SiteSettings(**settings)

@api_router.put("/admin/settings", response_model=SiteSettings)
async def update_settings(settings_data: SiteSettings, token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings_data.updated_at = datetime.utcnow()
    await db.settings.delete_many({})  # Remove old settings
    await db.settings.insert_one(settings_data.dict())
    return settings_data

# Search route
@api_router.get("/search", response_model=List[Movie])
async def search_movies(q: str):
    movies = await db.movies.find({
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"genre": {"$regex": q, "$options": "i"}}
        ]
    }).to_list(1000)
    return [Movie(**movie) for movie in movies]

# Include the router in the main app
app.include_router(api_router)

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()