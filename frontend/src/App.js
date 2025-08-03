import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { 
  Play, 
  Star, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Settings,
  Film,
  User,
  LogOut,
  Menu,
  X,
  Clock,
  Calendar,
  Users,
  Award,
  Globe,
  Heart,
  BookOpen,
  Zap,
  TrendingUp,
  Eye,
  Youtube,
  ExternalLink,
  Image,
  Video,
  Sparkles
} from 'lucide-react';
import './App.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// API functions
const api = {
  get: (url) => axios.get(`${API_BASE}${url}`),
  post: (url, data, config = {}) => axios.post(`${API_BASE}${url}`, data, config),
  put: (url, data, config = {}) => axios.put(`${API_BASE}${url}`, data, config),
  delete: (url, config = {}) => axios.delete(`${API_BASE}${url}`, config),
};

// Turkish genres
const TURLER = [
  'Aksiyon', 'Macera', 'Animasyon', 'Biyografi', 'Komedi', 'Suç', 'Belgesel',
  'Drama', 'Aile', 'Fantastik', 'Tarih', 'Korku', 'Müzik', 'Gizem', 'Romantik',
  'Bilim Kurgu', 'Spor', 'Gerilim', 'Savaş', 'Western'
];

const YAS_SINIRLARI = ['Genel İzleyici', '7+', '13+', '16+', '18+'];
const DILLER = ['Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'İspanyolca', 'İtalyanca', 'Rusça', 'Japonca', 'Korece'];
const ULKELER = ['Türkiye', 'ABD', 'İngiltere', 'Almanya', 'Fransa', 'İtalya', 'İspanya', 'Rusya', 'Japonya', 'Güney Kore'];

// Auth context
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = (newToken, userData = null) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// YouTube Player Component
function YouTubePlayer({ videoId, onClose }) {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
      >
        <X size={32} />
      </button>
      <div className="w-full h-full max-w-7xl max-h-full p-4">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        />
      </div>
    </div>
  );
}

// Video Player Component
function VideoPlayer({ movie, onClose }) {
  const [playerType, setPlayerType] = useState('video');
  const [youtubeId, setYoutubeId] = useState(null);

  useEffect(() => {
    if (movie.youtube_url) {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];
      
      for (const pattern of patterns) {
        const match = movie.youtube_url.match(pattern);
        if (match) {
          setYoutubeId(match[1]);
          setPlayerType('youtube');
          return;
        }
      }
    }
    
    if (movie.video_file || movie.video_url) {
      setPlayerType('video');
    }
  }, [movie]);

  if (playerType === 'youtube' && youtubeId) {
    return <YouTubePlayer videoId={youtubeId} onClose={onClose} />;
  }

  const videoSrc = movie.video_file 
    ? `${API_BASE}/api/dosyalar/${movie.video_file}`
    : movie.video_url;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
      >
        <X size={32} />
      </button>
      <div className="w-full h-full max-w-7xl max-h-full p-4">
        <video
          controls
          autoPlay
          className="w-full h-full object-contain rounded-lg"
          src={videoSrc}
        >
          Tarayıcınız video etiketi desteklemiyor.
        </video>
      </div>
    </div>
  );
}

// Movie Card Component
function MovieCard({ movie, isAdmin = false, onEdit, onDelete, onPlay }) {
  const kapakSrc = movie.kapak_resmi 
    ? `${API_BASE}/api/dosyalar/${movie.kapak_resmi}`
    : `https://via.placeholder.com/400x600/1a1a1a/ffffff?text=${encodeURIComponent(movie.baslik)}`;

  return (
    <Card className="group overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700 hover:border-red-500 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={kapakSrc}
          alt={movie.baslik}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
          <Button
            onClick={() => onPlay(movie)}
            className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-red-600 hover:bg-red-700 transform scale-90 group-hover:scale-100"
            size="lg"
          >
            <Play className="mr-2" size={24} />
            İzle
          </Button>
        </div>
        {movie.ozel && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold">
            <Sparkles className="mr-1" size={16} />
            Özel
          </Badge>
        )}
        {movie.premium && (
          <Badge className="absolute top-3 left-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white font-bold">
            <Award className="mr-1" size={16} />
            Premium
          </Badge>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center text-white text-sm space-x-2">
            {movie.sure && (
              <div className="flex items-center bg-black bg-opacity-50 rounded-full px-2 py-1">
                <Clock size={12} className="mr-1" />
                {movie.sure} dk
              </div>
            )}
            <div className="flex items-center bg-black bg-opacity-50 rounded-full px-2 py-1">
              <Calendar size={12} className="mr-1" />
              {movie.yil}
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <CardTitle className="text-white text-lg mb-2 truncate font-bold">{movie.baslik}</CardTitle>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Star className="text-yellow-500 mr-1" size={16} />
            <span className="text-yellow-500 font-semibold">{movie.puan}</span>
          </div>
          {movie.yaş_siniri && (
            <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
              {movie.yaş_siniri}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="mb-2 border-red-500 text-red-400">{movie.tur}</Badge>
        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{movie.aciklama}</p>
        
        {movie.yonetmen && (
          <div className="text-xs text-gray-500 mb-2">
            <span className="font-semibold">Yönetmen:</span> {movie.yonetmen}
          </div>
        )}
        
        <div className="flex items-center space-x-2 mb-3">
          {movie.youtube_url && (
            <Badge className="bg-red-600 text-white text-xs">
              <Youtube size={12} className="mr-1" />
              YouTube
            </Badge>
          )}
          {movie.video_url && (
            <Badge className="bg-blue-600 text-white text-xs">
              <ExternalLink size={12} className="mr-1" />
              Link
            </Badge>
          )}
          {movie.video_file && (
            <Badge className="bg-green-600 text-white text-xs">
              <Video size={12} className="mr-1" />
              Dosya
            </Badge>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => onEdit(movie)} className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white">
              <Edit size={16} />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(movie.id)}>
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hero Section Component
function HeroSection({ featuredMovie, onPlay }) {
  if (!featuredMovie) return null;

  const arkaplanSrc = featuredMovie.arkaplan_resmi 
    ? `${API_BASE}/api/dosyalar/${featuredMovie.arkaplan_resmi}`
    : featuredMovie.kapak_resmi 
      ? `${API_BASE}/api/dosyalar/${featuredMovie.kapak_resmi}`
      : `https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=${encodeURIComponent(featuredMovie.baslik)}`;

  return (
    <section className="relative h-[70vh] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
      <img
        src={arkaplanSrc}
        alt={featuredMovie.baslik}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-4 mb-4">
              <Badge className="bg-red-600 text-white font-bold px-3 py-1">
                <Sparkles className="mr-1" size={16} />
                ÖNE ÇIKAN
              </Badge>
              <div className="flex items-center text-yellow-500">
                <Star className="mr-1" size={20} />
                <span className="text-2xl font-bold">{featuredMovie.puan}</span>
              </div>
            </div>
            <h1 className="text-6xl font-black mb-6 text-white leading-tight">{featuredMovie.baslik}</h1>
            <div className="flex items-center space-x-6 mb-6 text-gray-300">
              <div className="flex items-center">
                <Calendar className="mr-2" size={20} />
                <span className="text-lg">{featuredMovie.yil}</span>
              </div>
              {featuredMovie.sure && (
                <div className="flex items-center">
                  <Clock className="mr-2" size={20} />
                  <span className="text-lg">{featuredMovie.sure} dakika</span>
                </div>
              )}
              <Badge className="bg-gray-800 text-white px-3 py-1 text-lg">
                {featuredMovie.tur}
              </Badge>
            </div>
            <p className="text-xl mb-8 text-gray-300 leading-relaxed max-w-xl">{featuredMovie.aciklama}</p>
            <div className="flex space-x-4">
              <Button 
                onClick={() => onPlay(featuredMovie)}
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg font-bold"
              >
                <Play className="mr-3" size={28} />
                Şimdi İzle
              </Button>
              {featuredMovie.fragman_url && (
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg font-bold"
                >
                  <Eye className="mr-3" size={28} />
                  Fragman
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Home Page Component
function HomePage() {
  const [movies, setMovies] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [settings, setSettings] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('');

  useEffect(() => {
    fetchMovies();
    fetchFeaturedMovies();
    fetchPopularMovies();
    fetchRecentMovies();
    fetchGenres();
    fetchSettings();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await api.get('/api/filmler');
      setMovies(response.data);
    } catch (error) {
      console.error('Filmler yüklenirken hata:', error);
    }
  };

  const fetchFeaturedMovies = async () => {
    try {
      const response = await api.get('/api/filmler?ozel_sadece=true');
      setFeaturedMovies(response.data);
    } catch (error) {
      console.error('Öne çıkan filmler yüklenirken hata:', error);
    }
  };

  const fetchPopularMovies = async () => {
    try {
      const response = await api.get('/api/populer-filmler');
      setPopularMovies(response.data);
    } catch (error) {
      console.error('Popüler filmler yüklenirken hata:', error);
    }
  };

  const fetchRecentMovies = async () => {
    try {
      const response = await api.get('/api/yeni-filmler');
      setRecentMovies(response.data);
    } catch (error) {
      console.error('Yeni filmler yüklenirken hata:', error);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await api.get('/api/turler');
      setGenres(response.data);
    } catch (error) {
      console.error('Türler yüklenirken hata:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/ayarlar');
      setSettings(response.data);
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMovies();
      return;
    }
    try {
      const response = await api.get(`/api/ara?q=${encodeURIComponent(searchQuery)}`);
      setMovies(response.data);
    } catch (error) {
      console.error('Arama sırasında hata:', error);
    }
  };

  const handleGenreFilter = async (genre) => {
    setSelectedGenre(genre);
    if (!genre) {
      fetchMovies();
      return;
    }
    try {
      const response = await api.get(`/api/filmler?tur=${encodeURIComponent(genre)}`);
      setMovies(response.data);
    } catch (error) {
      console.error('Tür filtreleme sırasında hata:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-40 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Film className="text-red-600" size={40} />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                  {settings?.site_adi || 'Ultra Sinema'}
                </h1>
                <p className="text-xs text-gray-400">{settings?.site_aciklamasi || 'En yeni filmleri izleyin'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Film ara..."
                  className="pl-10 bg-gray-800 border-gray-600 text-white w-80 focus:border-red-500"
                />
              </div>
              <Button onClick={handleSearch} className="bg-red-600 hover:bg-red-700">
                <Search size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {featuredMovies.length > 0 && (
        <HeroSection 
          featuredMovie={featuredMovies[0]} 
          onPlay={setSelectedMovie}
        />
      )}

      {/* Genre Filter */}
      {genres.length > 0 && (
        <section className="py-6 bg-gray-900">
          <div className="container mx-auto px-6">
            <div className="flex items-center space-x-4 overflow-x-auto pb-2">
              <Button
                onClick={() => handleGenreFilter('')}
                variant={selectedGenre === '' ? "default" : "outline"}
                className={selectedGenre === '' ? "bg-red-600 hover:bg-red-700" : "border-gray-600 text-gray-300 hover:border-red-500"}
              >
                Tümü
              </Button>
              {genres.slice(0, 10).map((genre) => (
                <Button
                  key={genre.ad}
                  onClick={() => handleGenreFilter(genre.ad)}
                  variant={selectedGenre === genre.ad ? "default" : "outline"}
                  className={selectedGenre === genre.ad ? "bg-red-600 hover:bg-red-700" : "border-gray-600 text-gray-300 hover:border-red-500"}
                >
                  {genre.ad} ({genre.sayi})
                </Button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Movies */}
      {featuredMovies.length > 1 && (
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="flex items-center mb-8">
              <Sparkles className="text-red-500 mr-3" size={32} />
              <h2 className="text-4xl font-black">Öne Çıkan Filmler</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {featuredMovies.slice(1).map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPlay={setSelectedMovie}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Movies */}
      {popularMovies.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="flex items-center mb-8">
              <TrendingUp className="text-yellow-500 mr-3" size={32} />
              <h2 className="text-4xl font-black">Popüler Filmler</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {popularMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPlay={setSelectedMovie}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Movies */}
      {recentMovies.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="flex items-center mb-8">
              <Zap className="text-green-500 mr-3" size={32} />
              <h2 className="text-4xl font-black">Yeni Eklenen Filmler</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {recentMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPlay={setSelectedMovie}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Movies */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center mb-8">
            <Film className="text-blue-500 mr-3" size={32} />
            <h2 className="text-4xl font-black">
              {searchQuery ? `"${searchQuery}" için arama sonuçları` : selectedGenre ? `${selectedGenre} Filmleri` : 'Tüm Filmler'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onPlay={setSelectedMovie}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Video Player Modal */}
      {selectedMovie && (
        <VideoPlayer
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Film className="text-red-600" size={32} />
                <h3 className="text-2xl font-bold">{settings?.site_adi || 'Ultra Sinema'}</h3>
              </div>
              <p className="text-gray-400">{settings?.site_aciklamasi || 'En yeni filmleri izleyin'}</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Kategoriler</h4>
              <ul className="space-y-2">
                {genres.slice(0, 5).map((genre) => (
                  <li key={genre.ad}>
                    <button 
                      onClick={() => handleGenreFilter(genre.ad)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {genre.ad}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Hızlı Erişim</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => handleGenreFilter('')} className="hover:text-white transition-colors">Tüm Filmler</button></li>
                <li><button className="hover:text-white transition-colors">Popüler</button></li>
                <li><button className="hover:text-white transition-colors">Yeni Eklenenler</button></li>
                <li><button className="hover:text-white transition-colors">Öne Çıkanlar</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">İletişim</h4>
              <p className="text-gray-400 mb-2">© 2025 {settings?.site_adi || 'Ultra Sinema'}</p>
              <p className="text-gray-400">Tüm hakları saklıdır.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Admin Login Component
function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = React.useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await api.post('/api/admin/giris', { sifre: password });
      login(response.data.access_token, { rol: 'admin' });
      navigate('/admin/panel');
    } catch (error) {
      alert('Geçersiz admin şifresi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Film className="text-red-600" size={64} />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <CardTitle className="text-white text-3xl font-black">Admin Paneli</CardTitle>
          <CardDescription className="text-gray-400">Devam etmek için admin şifresini girin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="password" className="text-white text-lg">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white text-lg py-3 focus:border-red-500"
                placeholder="Admin şifresini girin"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-3 font-bold"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// File Upload Component
function FileUploadSection({ movieId, onUploadComplete }) {
  const [uploading, setUploading] = useState({});

  const handleFileUpload = async (type, file) => {
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [type]: true }));
    
    const formData = new FormData();
    formData.append(type === 'video' ? 'video' : type === 'kapak' ? 'kapak' : 'arkaplan', file);
    
    try {
      const endpoint = type === 'video' ? 'video-yukle' : type === 'kapak' ? 'kapak-yukle' : 'arkaplan-yukle';
      await api.post(`/api/admin/filmler/${movieId}/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`${type === 'video' ? 'Video' : type === 'kapak' ? 'Kapak resmi' : 'Arkaplan resmi'} başarıyla yüklendi`);
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      console.error(`${type} yükleme hatası:`, error);
      alert(`${type === 'video' ? 'Video' : type === 'kapak' ? 'Kapak resmi' : 'Arkaplan resmi'} yüklenirken hata oluştu`);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <div>
        <Label className="text-white mb-2 block">Video Dosyası</Label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleFileUpload('video', e.target.files[0])}
          className="w-full text-white bg-gray-800 border border-gray-600 rounded p-2"
          disabled={uploading.video}
        />
        {uploading.video && <p className="text-blue-400 text-sm mt-1">Video yükleniyor...</p>}
      </div>
      
      <div>
        <Label className="text-white mb-2 block">Kapak Resmi</Label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload('kapak', e.target.files[0])}
          className="w-full text-white bg-gray-800 border border-gray-600 rounded p-2"
          disabled={uploading.kapak}
        />
        {uploading.kapak && <p className="text-blue-400 text-sm mt-1">Kapak resmi yükleniyor...</p>}
      </div>
      
      <div>
        <Label className="text-white mb-2 block">Arkaplan Resmi</Label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload('arkaplan', e.target.files[0])}
          className="w-full text-white bg-gray-800 border border-gray-600 rounded p-2"
          disabled={uploading.arkaplan}
        />
        {uploading.arkaplan && <p className="text-blue-400 text-sm mt-1">Arkaplan resmi yükleniyor...</p>}
      </div>
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard() {
  const [movies, setMovies] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showMovieDialog, setShowMovieDialog] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [movieForm, setMovieForm] = useState({
    baslik: '',
    aciklama: '',
    tur: 'Aksiyon',
    yil: new Date().getFullYear(),
    puan: 5.0,
    sure: 120,
    yonetmen: '',
    oyuncular: '',
    ulke: 'Türkiye',
    dil: 'Türkçe',
    video_url: '',
    youtube_url: '',
    imdb_url: '',
    fragman_url: '',
    ozel: false,
    premium: false,
    yaş_siniri: 'Genel İzleyici'
  });
  const { logout } = React.useContext(AuthContext);

  useEffect(() => {
    fetchMovies();
    fetchSettings();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await api.get('/api/filmler');
      setMovies(response.data);
    } catch (error) {
      console.error('Filmler yüklenirken hata:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/ayarlar');
      setSettings(response.data);
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    }
  };

  const handleMovieSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingMovie) {
        await api.put(`/api/admin/filmler/${editingMovie.id}`, movieForm);
      } else {
        await api.post('/api/admin/filmler', movieForm);
      }
      
      setShowMovieDialog(false);
      setEditingMovie(null);
      resetMovieForm();
      fetchMovies();
    } catch (error) {
      console.error('Film kaydetme hatası:', error);
      alert('Film kaydetme sırasında hata oluştu');
    }
  };

  const resetMovieForm = () => {
    setMovieForm({
      baslik: '',
      aciklama: '',
      tur: 'Aksiyon',
      yil: new Date().getFullYear(),
      puan: 5.0,
      sure: 120,
      yonetmen: '',
      oyuncular: '',
      ulke: 'Türkiye',
      dil: 'Türkçe',
      video_url: '',
      youtube_url: '',
      imdb_url: '',
      fragman_url: '',
      ozel: false,
      premium: false,
      yaş_siniri: 'Genel İzleyici'
    });
  };

  const handleDeleteMovie = async (movieId) => {
    if (window.confirm('Bu filmi silmek istediğinizden emin misiniz?')) {
      try {
        await api.delete(`/api/admin/filmler/${movieId}`);
        fetchMovies();
      } catch (error) {
        console.error('Film silme hatası:', error);
        alert('Film silinirken hata oluştu');
      }
    }
  };

  const handleEditMovie = (movie) => {
    setEditingMovie(movie);
    setMovieForm({
      baslik: movie.baslik,
      aciklama: movie.aciklama,
      tur: movie.tur,
      yil: movie.yil,
      puan: movie.puan,
      sure: movie.sure || 120,
      yonetmen: movie.yonetmen || '',
      oyuncular: movie.oyuncular || '',
      ulke: movie.ulke || 'Türkiye',
      dil: movie.dil || 'Türkçe',
      video_url: movie.video_url || '',
      youtube_url: movie.youtube_url || '',
      imdb_url: movie.imdb_url || '',
      fragman_url: movie.fragman_url || '',
      ozel: movie.ozel,
      premium: movie.premium,
      yaş_siniri: movie.yaş_siniri || 'Genel İzleyici'
    });
    setShowMovieDialog(true);
  };

  const handleSettingsUpdate = async () => {
    try {
      await api.put('/api/admin/ayarlar', settings);
      alert('Ayarlar başarıyla güncellendi');
    } catch (error) {
      alert('Ayarlar güncellenirken hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="text-red-600" size={40} />
              <h1 className="text-3xl font-black">Admin Panel</h1>
            </div>
            <Button onClick={logout} variant="outline" className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white">
              <LogOut className="mr-2" size={20} />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="filmler" className="space-y-8">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="filmler" className="text-white data-[state=active]:bg-red-600">
              <Film className="mr-2" size={20} />
              Filmler
            </TabsTrigger>
            <TabsTrigger value="ayarlar" className="text-white data-[state=active]:bg-red-600">
              <Settings className="mr-2" size={20} />
              Ayarlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="filmler" className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-black">Film Yönetimi</h2>
              <Button 
                onClick={() => {
                  resetMovieForm();
                  setShowMovieDialog(true);
                }} 
                className="bg-red-600 hover:bg-red-700 text-lg px-6 py-3"
              >
                <Plus className="mr-2" size={20} />
                Yeni Film Ekle
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isAdmin={true}
                  onEdit={handleEditMovie}
                  onDelete={handleDeleteMovie}
                  onPlay={() => {}}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ayarlar" className="space-y-8">
            <h2 className="text-4xl font-black">Site Ayarları</h2>
            {settings && (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-white text-lg">Site Adı</Label>
                      <Input
                        value={settings.site_adi}
                        onChange={(e) => setSettings({...settings, site_adi: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-lg">Site Açıklaması</Label>
                      <Input
                        value={settings.site_aciklamasi}
                        onChange={(e) => setSettings({...settings, site_aciklamasi: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-lg">Tema Rengi</Label>
                      <Input
                        type="color"
                        value={settings.tema_rengi}
                        onChange={(e) => setSettings({...settings, tema_rengi: e.target.value})}
                        className="bg-gray-800 border-gray-600 h-12"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-lg">Vurgu Rengi</Label>
                      <Input
                        type="color"
                        value={settings.vurgu_rengi}
                        onChange={(e) => setSettings({...settings, vurgu_rengi: e.target.value})}
                        className="bg-gray-800 border-gray-600 h-12"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSettingsUpdate}
                    className="bg-red-600 hover:bg-red-700 text-lg px-8 py-3"
                  >
                    Ayarları Kaydet
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Movie Dialog */}
      <Dialog open={showMovieDialog} onOpenChange={setShowMovieDialog}>
        <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingMovie ? 'Film Düzenle' : 'Yeni Film Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMovieSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white text-lg">Film Başlığı *</Label>
                <Input
                  value={movieForm.baslik}
                  onChange={(e) => setMovieForm({...movieForm, baslik: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  required
                />
              </div>
              <div>
                <Label className="text-white text-lg">Tür</Label>
                <Select 
                  value={movieForm.tur} 
                  onValueChange={(value) => setMovieForm({...movieForm, tur: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-lg py-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {TURLER.map((tur) => (
                      <SelectItem key={tur} value={tur} className="text-white">
                        {tur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-lg">Yıl</Label>
                <Input
                  type="number"
                  value={movieForm.yil}
                  onChange={(e) => setMovieForm({...movieForm, yil: parseInt(e.target.value)})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  min="1900"
                  max="2030"
                  required
                />
              </div>
              <div>
                <Label className="text-white text-lg">Puan (0-10)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={movieForm.puan}
                  onChange={(e) => setMovieForm({...movieForm, puan: parseFloat(e.target.value)})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  required
                />
              </div>
              <div>
                <Label className="text-white text-lg">Süre (dakika)</Label>
                <Input
                  type="number"
                  value={movieForm.sure}
                  onChange={(e) => setMovieForm({...movieForm, sure: parseInt(e.target.value)})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                />
              </div>
              <div>
                <Label className="text-white text-lg">Yaş Sınırı</Label>
                <Select 
                  value={movieForm.yaş_siniri} 
                  onValueChange={(value) => setMovieForm({...movieForm, yaş_siniri: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-lg py-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {YAS_SINIRLARI.map((sinir) => (
                      <SelectItem key={sinir} value={sinir} className="text-white">
                        {sinir}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-lg">Yönetmen</Label>
                <Input
                  value={movieForm.yonetmen}
                  onChange={(e) => setMovieForm({...movieForm, yonetmen: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                />
              </div>
              <div>
                <Label className="text-white text-lg">Oyuncular</Label>
                <Input
                  value={movieForm.oyuncular}
                  onChange={(e) => setMovieForm({...movieForm, oyuncular: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  placeholder="Virgülle ayırın"
                />
              </div>
              <div>
                <Label className="text-white text-lg">Ülke</Label>
                <Select 
                  value={movieForm.ulke} 
                  onValueChange={(value) => setMovieForm({...movieForm, ulke: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-lg py-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {ULKELER.map((ulke) => (
                      <SelectItem key={ulke} value={ulke} className="text-white">
                        {ulke}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-lg">Dil</Label>
                <Select 
                  value={movieForm.dil} 
                  onValueChange={(value) => setMovieForm({...movieForm, dil: value})}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-lg py-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {DILLER.map((dil) => (
                      <SelectItem key={dil} value={dil} className="text-white">
                        {dil}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-white text-lg">Açıklama *</Label>
              <Textarea
                value={movieForm.aciklama}
                onChange={(e) => setMovieForm({...movieForm, aciklama: e.target.value})}
                className="bg-gray-800 border-gray-600 text-white text-lg min-h-[100px]"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white text-lg">Video URL (Film siteleri)</Label>
                <Input
                  value={movieForm.video_url}
                  onChange={(e) => setMovieForm({...movieForm, video_url: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  placeholder="https://example.com/video.mp4"
                />
              </div>
              <div>
                <Label className="text-white text-lg">YouTube URL</Label>
                <Input
                  value={movieForm.youtube_url}
                  onChange={(e) => setMovieForm({...movieForm, youtube_url: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div>
                <Label className="text-white text-lg">IMDB URL</Label>
                <Input
                  value={movieForm.imdb_url}
                  onChange={(e) => setMovieForm({...movieForm, imdb_url: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  placeholder="https://imdb.com/title/..."
                />
              </div>
              <div>
                <Label className="text-white text-lg">Fragman URL</Label>
                <Input
                  value={movieForm.fragman_url}
                  onChange={(e) => setMovieForm({...movieForm, fragman_url: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white text-lg py-3"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={movieForm.ozel}
                    onCheckedChange={(checked) => setMovieForm({...movieForm, ozel: checked})}
                  />
                  <Label className="text-white text-lg">Öne Çıkan Film</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={movieForm.premium}
                    onCheckedChange={(checked) => setMovieForm({...movieForm, premium: checked})}
                  />
                  <Label className="text-white text-lg">Premium İçerik</Label>
                </div>
              </div>
            </div>

            {editingMovie && (
              <FileUploadSection 
                movieId={editingMovie.id} 
                onUploadComplete={fetchMovies}
              />
            )}

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowMovieDialog(false)}
                className="border-gray-600 text-gray-300 hover:border-red-500 hover:text-white px-8 py-3"
              >
                İptal
              </Button>
              <Button 
                type="submit" 
                className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg font-bold"
              >
                {editingMovie ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { token } = React.useContext(AuthContext);
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }
  
  return children;
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route 
              path="/admin/panel" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;