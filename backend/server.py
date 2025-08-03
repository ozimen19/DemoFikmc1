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
import re

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
SECRET_KEY = "ultra_modern_film_site_secret_key_2025_tr"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720  # 12 hours

# Create the main app
app = FastAPI(title="Ultra Sinema API")

# Security
security = HTTPBearer()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to extract YouTube video ID
def extract_youtube_id(url):
    """Extract YouTube video ID from various YouTube URL formats"""
    if not url:
        return None
    
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
        r'youtube\.com/watch\?.*v=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

# Models
class Movie(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    baslik: str  # Title
    aciklama: str  # Description
    tur: str  # Genre
    yil: int  # Year
    puan: float = Field(ge=0, le=10)  # Rating
    sure: Optional[int] = None  # Duration in minutes
    yonetmen: Optional[str] = None  # Director
    oyuncular: Optional[str] = None  # Cast
    ulke: Optional[str] = None  # Country
    dil: Optional[str] = None  # Language
    video_url: Optional[str] = None  # Video URL
    youtube_url: Optional[str] = None  # YouTube URL
    imdb_url: Optional[str] = None  # IMDB URL
    video_file: Optional[str] = None  # Uploaded video file
    kapak_resmi: Optional[str] = None  # Cover image file
    kapak_resmi_url: Optional[str] = None  # Cover image URL
    arkaplan_resmi: Optional[str] = None  # Background image file
    arkaplan_resmi_url: Optional[str] = None  # Background image URL
    fragman_url: Optional[str] = None  # Trailer URL
    ozel: bool = False  # Featured
    premium: bool = False  # Premium content
    yaş_siniri: Optional[str] = None  # Age rating
    olusturulma_tarihi: datetime = Field(default_factory=datetime.utcnow)

class MovieCreate(BaseModel):
    baslik: str
    aciklama: str
    tur: str
    yil: int
    puan: float = Field(ge=0, le=10)
    sure: Optional[int] = None
    yonetmen: Optional[str] = None
    oyuncular: Optional[str] = None
    ulke: Optional[str] = None
    dil: Optional[str] = None
    video_url: Optional[str] = None
    youtube_url: Optional[str] = None
    imdb_url: Optional[str] = None
    fragman_url: Optional[str] = None
    kapak_resmi_url: Optional[str] = None  # Cover image URL
    arkaplan_resmi_url: Optional[str] = None  # Background image URL
    ozel: bool = False
    premium: bool = False
    yaş_siniri: Optional[str] = None

class MovieUpdate(BaseModel):
    baslik: Optional[str] = None
    aciklama: Optional[str] = None
    tur: Optional[str] = None
    yil: Optional[int] = None
    puan: Optional[float] = Field(None, ge=0, le=10)
    sure: Optional[int] = None
    yonetmen: Optional[str] = None
    oyuncular: Optional[str] = None
    ulke: Optional[str] = None
    dil: Optional[str] = None
    video_url: Optional[str] = None
    youtube_url: Optional[str] = None
    imdb_url: Optional[str] = None
    fragman_url: Optional[str] = None
    ozel: Optional[bool] = None
    premium: Optional[bool] = None
    yaş_siniri: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kullanici_adi: str  # Username
    email: str
    sifre_hash: str  # Password hash
    rol: str = "kullanici"  # Role: "kullanici" or "admin"
    premium: bool = False  # Premium membership
    olusturulma_tarihi: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    kullanici_adi: str
    email: str
    sifre: str

class UserLogin(BaseModel):
    kullanici_adi: str
    sifre: str

class AdminLogin(BaseModel):
    sifre: str

class SiteSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    site_adi: str = "Ultra Sinema"
    site_aciklamasi: str = "En yeni filmleri izleyin"
    tema_rengi: str = "#0a0a0a"
    vurgu_rengi: str = "#e50914"
    ikinci_renk: str = "#ff6b35"
    ozel_filmler_sayisi: int = 8
    kullanici_kayit_acik: bool = True
    premium_ozellik: bool = True
    sosyal_medya_facebook: Optional[str] = None
    sosyal_medya_twitter: Optional[str] = None
    sosyal_medya_instagram: Optional[str] = None
    iletişim_email: Optional[str] = None
    guncelleme_tarihi: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str

class Genre(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ad: str  # Name
    aciklama: Optional[str] = None  # Description
    resim: Optional[str] = None  # Image
    aktif: bool = True

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
        kullanici_adi: str = payload.get("sub")
        if kullanici_adi is None:
            raise HTTPException(status_code=401, detail="Geçersiz kimlik doğrulama bilgileri")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Geçersiz kimlik doğrulama bilgileri")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Auth routes
@api_router.post("/admin/giris", response_model=Token)
async def admin_login(login_data: AdminLogin):
    if login_data.sifre != "1653":
        raise HTTPException(status_code=401, detail="Geçersiz admin şifresi")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": "admin", "rol": "admin"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/kayit", response_model=dict)
async def register_user(user_data: UserCreate):
    existing_user = await db.users.find_one({"kullanici_adi": user_data.kullanici_adi})
    if existing_user:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kayıtlı")
    
    user = User(
        kullanici_adi=user_data.kullanici_adi,
        email=user_data.email,
        sifre_hash=hash_password(user_data.sifre)
    )
    await db.users.insert_one(user.dict())
    return {"mesaj": "Kullanıcı başarıyla kaydedildi"}

@api_router.post("/giris", response_model=Token)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"kullanici_adi": login_data.kullanici_adi})
    if not user or not verify_password(login_data.sifre, user["sifre_hash"]):
        raise HTTPException(status_code=401, detail="Geçersiz kullanıcı adı veya şifre")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["kullanici_adi"], "rol": user["rol"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Movie routes
@api_router.get("/filmler", response_model=List[Movie])
async def get_movies(ozel_sadece: bool = False, tur: Optional[str] = None, limit: int = 50):
    query = {}
    if ozel_sadece:
        query["ozel"] = True
    if tur:
        query["tur"] = {"$regex": tur, "$options": "i"}
    
    movies = await db.movies.find(query).limit(limit).to_list(limit)
    return [Movie(**movie) for movie in movies]

@api_router.get("/filmler/{movie_id}", response_model=Movie)
async def get_movie(movie_id: str):
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Film bulunamadı")
    return Movie(**movie)

@api_router.post("/admin/filmler", response_model=Movie)
async def create_movie(movie_data: MovieCreate, token_data: dict = Depends(verify_token)):
    if token_data.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin erişimi gerekli")
    
    movie = Movie(**movie_data.dict())
    await db.movies.insert_one(movie.dict())
    return movie

@api_router.put("/admin/filmler/{movie_id}", response_model=Movie)
async def update_movie(movie_id: str, movie_data: MovieUpdate, token_data: dict = Depends(verify_token)):
    if token_data.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin erişimi gerekli")
    
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Film bulunamadı")
    
    update_data = {k: v for k, v in movie_data.dict().items() if v is not None}
    if update_data:
        await db.movies.update_one({"id": movie_id}, {"$set": update_data})
    
    updated_movie = await db.movies.find_one({"id": movie_id})
    return Movie(**updated_movie)

@api_router.delete("/admin/filmler/{movie_id}")
async def delete_movie(movie_id: str, token_data: dict = Depends(verify_token)):
    if token_data.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin erişimi gerekli")
    
    result = await db.movies.delete_one({"id": movie_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Film bulunamadı")
    return {"mesaj": "Film başarıyla silindi"}

@api_router.post("/admin/filmler/{movie_id}/video-yukle")
async def upload_video(movie_id: str, video: UploadFile = File(...), token_data: dict = Depends(verify_token)):
    if token_data.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin erişimi gerekli")
    
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Film bulunamadı")
    
    file_extension = video.filename.split(".")[-1]
    video_filename = f"{movie_id}_video.{file_extension}"
    video_path = UPLOAD_DIR / video_filename
    
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    await db.movies.update_one({"id": movie_id}, {"$set": {"video_file": video_filename}})
    
    return {"mesaj": "Video başarıyla yüklendi", "dosya_adi": video_filename}

@api_router.post("/admin/filmler/{movie_id}/kapak-yukle")
async def upload_cover(movie_id: str, kapak: UploadFile = File(...), token_data: dict = Depends(verify_token)):
    if token_data.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin erişimi gerekli")
    
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Film bulunamadı")
    
    file_extension = kapak.filename.split(".")[-1]
    cover_filename = f"{movie_id}_kapak.{file_extension}"
    cover_path = UPLOAD_DIR / cover_filename
    
    with open(cover_path, "wb") as buffer:
        shutil.copyfileobj(kapak.file, buffer)
    
    await db.movies.update_one({"id": movie_id}, {"$set": {"kapak_resmi": cover_filename}})
    
    return {"mesaj": "Kapak resmi başarıyla yüklendi", "dosya_adi": cover_filename}

@api_router.post("/admin/filmler/{movie_id}/arkaplan-yukle")
async def upload_background(movie_id: str, arkaplan: UploadFile = File(...), token_data: dict = Depends(verify_token)):
    if token_data.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin erişimi gerekli")
    
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Film bulunamadı")
    
    file_extension = arkaplan.filename.split(".")[-1]
    bg_filename = f"{movie_id}_arkaplan.{file_extension}"
    bg_path = UPLOAD_DIR / bg_filename
    
    with open(bg_path, "wb") as buffer:
        shutil.copyfileobj(arkaplan.file, buffer)
    
    await db.movies.update_one({"id": movie_id}, {"$set": {"arkaplan_resmi": bg_filename}})
    
    return {"mesaj": "Arkaplan resmi başarıyla yüklendi", "dosya_adi": bg_filename}

# File serving routes
@api_router.get("/dosyalar/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(file_path)

# YouTube embed route
@api_router.get("/youtube-embed/{video_id}")
async def get_youtube_embed_url(video_id: str):
    return {"embed_url": f"https://www.youtube.com/embed/{video_id}"}

# Site settings routes
@api_router.get("/ayarlar", response_model=SiteSettings)
async def get_settings():
    settings = await db.settings.find_one()
    if not settings:
        default_settings = SiteSettings()
        await db.settings.insert_one(default_settings.dict())
        return default_settings
    return SiteSettings(**settings)

@api_router.put("/admin/ayarlar", response_model=SiteSettings)
async def update_settings(settings_data: SiteSettings, token_data: dict = Depends(verify_token)):
    if token_data.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin erişimi gerekli")
    
    settings_data.guncelleme_tarihi = datetime.utcnow()
    await db.settings.delete_many({})
    await db.settings.insert_one(settings_data.dict())
    return settings_data

# Search route
@api_router.get("/ara", response_model=List[Movie])
async def search_movies(q: str, limit: int = 20):
    movies = await db.movies.find({
        "$or": [
            {"baslik": {"$regex": q, "$options": "i"}},
            {"aciklama": {"$regex": q, "$options": "i"}},
            {"tur": {"$regex": q, "$options": "i"}},
            {"yonetmen": {"$regex": q, "$options": "i"}},
            {"oyuncular": {"$regex": q, "$options": "i"}}
        ]
    }).limit(limit).to_list(limit)
    return [Movie(**movie) for movie in movies]

# Genres route
@api_router.get("/turler", response_model=List[dict])
async def get_genres():
    genres = await db.movies.distinct("tur")
    genre_counts = []
    for genre in genres:
        count = await db.movies.count_documents({"tur": genre})
        genre_counts.append({"ad": genre, "sayi": count})
    return sorted(genre_counts, key=lambda x: x["sayi"], reverse=True)

# Popular movies
@api_router.get("/populer-filmler", response_model=List[Movie])
async def get_popular_movies(limit: int = 10):
    movies = await db.movies.find().sort("puan", -1).limit(limit).to_list(limit)
    return [Movie(**movies) for movies in movies]

# Recent movies
@api_router.get("/yeni-filmler", response_model=List[Movie])
async def get_recent_movies(limit: int = 10):
    movies = await db.movies.find().sort("olusturulma_tarihi", -1).limit(limit).to_list(limit)
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