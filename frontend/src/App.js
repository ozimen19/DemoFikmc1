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
  X
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

// Video Player Component
function VideoPlayer({ movie, onClose }) {
  const videoSrc = movie.video_file 
    ? `${API_BASE}/api/files/${movie.video_file}`
    : movie.video_url;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
      >
        <X size={32} />
      </button>
      <div className="w-full h-full max-w-6xl max-h-full p-4">
        <video
          controls
          autoPlay
          className="w-full h-full object-contain"
          src={videoSrc}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

// Movie Card Component
function MovieCard({ movie, isAdmin = false, onEdit, onDelete, onPlay }) {
  const thumbnailSrc = movie.thumbnail 
    ? `${API_BASE}/api/files/${movie.thumbnail}`
    : 'https://via.placeholder.com/400x600/1a1a1a/ffffff?text=' + encodeURIComponent(movie.title);

  return (
    <Card className="group overflow-hidden bg-gray-900 border-gray-800 hover:border-red-600 transition-all duration-300 transform hover:scale-105">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={thumbnailSrc}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
          <Button
            onClick={() => onPlay(movie)}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 hover:bg-red-700"
            size="lg"
          >
            <Play className="mr-2" size={24} />
            Watch Now
          </Button>
        </div>
        {movie.featured && (
          <Badge className="absolute top-2 right-2 bg-red-600">Featured</Badge>
        )}
      </div>
      <CardContent className="p-4">
        <CardTitle className="text-white text-lg mb-2 truncate">{movie.title}</CardTitle>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">{movie.release_year}</span>
          <div className="flex items-center">
            <Star className="text-yellow-500 mr-1" size={16} />
            <span className="text-yellow-500">{movie.rating}</span>
          </div>
        </div>
        <Badge variant="outline" className="mb-2">{movie.genre}</Badge>
        <p className="text-gray-400 text-sm line-clamp-2">{movie.description}</p>
        {isAdmin && (
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => onEdit(movie)}>
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

// Home Page Component
function HomePage() {
  const [movies, setMovies] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchMovies();
    fetchFeaturedMovies();
    fetchSettings();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await api.get('/api/movies');
      setMovies(response.data);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const fetchFeaturedMovies = async () => {
    try {
      const response = await api.get('/api/movies?featured_only=true');
      setFeaturedMovies(response.data);
    } catch (error) {
      console.error('Error fetching featured movies:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMovies();
      return;
    }
    try {
      const response = await api.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      setMovies(response.data);
    } catch (error) {
      console.error('Error searching movies:', error);
    }
  };

  const filteredMovies = searchQuery 
    ? movies.filter(movie => 
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.genre.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : movies;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Film className="text-red-600" size={32} />
              <h1 className="text-2xl font-bold">{settings?.site_name || 'Ultra Cinema'}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search movies..."
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button onClick={handleSearch} className="bg-red-600 hover:bg-red-700">
                Search
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {featuredMovies.length > 0 && (
        <section className="relative h-96 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent z-10"></div>
          <img
            src={featuredMovies[0].thumbnail 
              ? `${API_BASE}/api/files/${featuredMovies[0].thumbnail}`
              : 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=' + encodeURIComponent(featuredMovies[0].title)
            }
            alt={featuredMovies[0].title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-20 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-xl">
                <h2 className="text-5xl font-bold mb-4">{featuredMovies[0].title}</h2>
                <p className="text-lg mb-6 text-gray-300">{featuredMovies[0].description}</p>
                <Button 
                  onClick={() => setSelectedMovie(featuredMovies[0])}
                  size="lg" 
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Play className="mr-2" size={24} />
                  Watch Now
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Movies */}
      {featuredMovies.length > 1 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Featured Movies</h2>
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

      {/* All Movies */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">
            {searchQuery ? `Search results for "${searchQuery}"` : 'All Movies'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {filteredMovies.map((movie) => (
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
      <footer className="bg-gray-900 border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">© 2025 {settings?.site_name || 'Ultra Cinema'}. All rights reserved.</p>
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
      const response = await api.post('/api/admin/login', { password });
      login(response.data.access_token, { role: 'admin' });
      navigate('/admin/dashboard');
    } catch (error) {
      alert('Invalid admin password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <Film className="mx-auto text-red-600 mb-4" size={48} />
          <CardTitle className="text-white text-2xl">Admin Login</CardTitle>
          <CardDescription>Enter admin password to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
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
    title: '',
    description: '',
    genre: '',
    release_year: new Date().getFullYear(),
    rating: 5.0,
    video_url: '',
    featured: false
  });
  const { logout } = React.useContext(AuthContext);

  useEffect(() => {
    fetchMovies();
    fetchSettings();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await api.get('/api/movies');
      setMovies(response.data);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleMovieSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingMovie) {
        await api.put(`/api/admin/movies/${editingMovie.id}`, movieForm);
      } else {
        await api.post('/api/admin/movies', movieForm);
      }
      
      setShowMovieDialog(false);
      setEditingMovie(null);
      setMovieForm({
        title: '',
        description: '',
        genre: '',
        release_year: new Date().getFullYear(),
        rating: 5.0,
        video_url: '',
        featured: false
      });
      fetchMovies();
    } catch (error) {
      console.error('Error saving movie:', error);
      alert('Error saving movie');
    }
  };

  const handleDeleteMovie = async (movieId) => {
    if (window.confirm('Are you sure you want to delete this movie?')) {
      try {
        await api.delete(`/api/admin/movies/${movieId}`);
        fetchMovies();
      } catch (error) {
        console.error('Error deleting movie:', error);
        alert('Error deleting movie');
      }
    }
  };

  const handleEditMovie = (movie) => {
    setEditingMovie(movie);
    setMovieForm({
      title: movie.title,
      description: movie.description,
      genre: movie.genre,
      release_year: movie.release_year,
      rating: movie.rating,
      video_url: movie.video_url || '',
      featured: movie.featured
    });
    setShowMovieDialog(true);
  };

  const handleFileUpload = async (movieId, file, type) => {
    const formData = new FormData();
    formData.append(type, file);
    
    try {
      await api.post(`/api/admin/movies/${movieId}/upload-${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchMovies();
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      alert(`Error uploading ${type}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="text-red-600" size={32} />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <Button onClick={logout} variant="outline">
              <LogOut className="mr-2" size={16} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="movies" className="space-y-6">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="movies" className="text-white">Movies</TabsTrigger>
            <TabsTrigger value="settings" className="text-white">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="movies" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold">Manage Movies</h2>
              <Button onClick={() => setShowMovieDialog(true)} className="bg-red-600 hover:bg-red-700">
                <Plus className="mr-2" size={16} />
                Add Movie
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

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-3xl font-bold">Site Settings</h2>
            {settings && (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-white">Site Name</Label>
                    <Input
                      value={settings.site_name}
                      onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Theme Color</Label>
                    <Input
                      type="color"
                      value={settings.theme_color}
                      onChange={(e) => setSettings({...settings, theme_color: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Accent Color</Label>
                    <Input
                      type="color"
                      value={settings.accent_color}
                      onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <Button 
                    onClick={async () => {
                      try {
                        await api.put('/api/admin/settings', settings);
                        alert('Settings updated successfully');
                      } catch (error) {
                        alert('Error updating settings');
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Movie Dialog */}
      <Dialog open={showMovieDialog} onOpenChange={setShowMovieDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMovie ? 'Edit Movie' : 'Add New Movie'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMovieSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={movieForm.title}
                  onChange={(e) => setMovieForm({...movieForm, title: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label>Genre</Label>
                <Input
                  value={movieForm.genre}
                  onChange={(e) => setMovieForm({...movieForm, genre: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label>Release Year</Label>
                <Input
                  type="number"
                  value={movieForm.release_year}
                  onChange={(e) => setMovieForm({...movieForm, release_year: parseInt(e.target.value)})}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <Label>Rating (0-10)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={movieForm.rating}
                  onChange={(e) => setMovieForm({...movieForm, rating: parseFloat(e.target.value)})}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={movieForm.description}
                onChange={(e) => setMovieForm({...movieForm, description: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
                rows={3}
                required
              />
            </div>
            <div>
              <Label>Video URL (optional)</Label>
              <Input
                value={movieForm.video_url}
                onChange={(e) => setMovieForm({...movieForm, video_url: e.target.value})}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="https://example.com/video.mp4"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={movieForm.featured}
                onCheckedChange={(checked) => setMovieForm({...movieForm, featured: checked})}
              />
              <Label>Featured Movie</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowMovieDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700">
                {editingMovie ? 'Update' : 'Create'} Movie
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
              path="/admin/dashboard" 
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