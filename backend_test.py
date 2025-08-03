import requests
import sys
import json
from datetime import datetime

class UltraCinemaAPITester:
    def __init__(self, base_url="https://93bd627b-8b21-4b4b-85ee-2fd802164bec.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_movie_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.text.strip() else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login with correct password"""
        success, response = self.run_test(
            "Admin Login (Correct Password)",
            "POST",
            "/api/admin/giris",
            200,
            data={"sifre": "1653"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_admin_login_invalid(self):
        """Test admin login with incorrect password"""
        success, _ = self.run_test(
            "Admin Login (Invalid Password)",
            "POST",
            "/api/admin/giris",
            401,
            data={"sifre": "wrong_password"}
        )
        return success

    def test_get_settings(self):
        """Test getting site settings"""
        success, response = self.run_test(
            "Get Site Settings",
            "GET",
            "/api/ayarlar",
            200
        )
        return success

    def test_get_movies_empty(self):
        """Test getting movies when database might be empty"""
        success, response = self.run_test(
            "Get Movies (Initial)",
            "GET",
            "/api/filmler",
            200
        )
        return success

    def test_create_movie(self):
        """Test creating a new movie with cover image URLs"""
        movie_data = {
            "baslik": "Inception",
            "aciklama": "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.",
            "tur": "Bilim Kurgu",
            "yil": 2010,
            "puan": 8.8,
            "video_url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
            "kapak_resmi_url": "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg",
            "arkaplan_resmi_url": "https://images.hdqwalls.com/download/inception-movie-4k-2020-5k-1920x1080.jpg",
            "ozel": True
        }
        
        success, response = self.run_test(
            "Create Movie with Cover Images (Inception)",
            "POST",
            "/api/admin/filmler",
            200,
            data=movie_data
        )
        
        if success and 'id' in response:
            self.created_movie_id = response['id']
            print(f"   Created movie ID: {self.created_movie_id}")
            # Verify cover image URLs are saved
            if 'kapak_resmi_url' in response and 'arkaplan_resmi_url' in response:
                print(f"   ✅ Cover image URLs saved correctly")
                print(f"   Kapak Resmi URL: {response['kapak_resmi_url']}")
                print(f"   Arkaplan Resmi URL: {response['arkaplan_resmi_url']}")
            else:
                print(f"   ⚠️ Cover image URLs not found in response")
            return True
        return False

    def test_create_second_movie(self):
        """Test creating a second movie without cover image URLs"""
        movie_data = {
            "baslik": "The Matrix",
            "aciklama": "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
            "tur": "Aksiyon",
            "yil": 1999,
            "puan": 8.7,
            "video_url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
            "ozel": False
        }
        
        success, response = self.run_test(
            "Create Movie without Cover Images (The Matrix)",
            "POST",
            "/api/admin/filmler",
            200,
            data=movie_data
        )
        return success

    def test_get_movies_with_data(self):
        """Test getting movies after creating some"""
        success, response = self.run_test(
            "Get Movies (After Creation)",
            "GET",
            "/api/filmler",
            200
        )
        
        # Verify cover image URLs are returned in the list
        if success and isinstance(response, list) and len(response) > 0:
            for movie in response:
                if movie.get('baslik') == 'Inception':
                    if 'kapak_resmi_url' in movie and 'arkaplan_resmi_url' in movie:
                        print(f"   ✅ Cover image URLs found in movie list for Inception")
                    else:
                        print(f"   ⚠️ Cover image URLs missing in movie list for Inception")
                    break
        
        return success

    def test_get_featured_movies(self):
        """Test getting only featured movies"""
        success, response = self.run_test(
            "Get Featured Movies",
            "GET",
            "/api/filmler?ozel_sadece=true",
            200
        )
        return success

    def test_get_single_movie(self):
        """Test getting a single movie by ID and verify cover image URLs"""
        if not self.created_movie_id:
            print("⚠️  Skipping single movie test - no movie ID available")
            return True
            
        success, response = self.run_test(
            "Get Single Movie with Cover Images",
            "GET",
            f"/api/filmler/{self.created_movie_id}",
            200
        )
        
        # Verify cover image URLs are returned for individual movie
        if success and isinstance(response, dict):
            if 'kapak_resmi_url' in response and 'arkaplan_resmi_url' in response:
                print(f"   ✅ Cover image URLs found in single movie response")
                print(f"   Kapak Resmi URL: {response['kapak_resmi_url']}")
                print(f"   Arkaplan Resmi URL: {response['arkaplan_resmi_url']}")
            else:
                print(f"   ⚠️ Cover image URLs missing in single movie response")
        
        return success

    def test_search_movies(self):
        """Test movie search functionality"""
        success, response = self.run_test(
            "Search Movies (inception)",
            "GET",
            "/api/ara?q=inception",
            200
        )
        return success

    def test_search_movies_genre(self):
        """Test movie search by genre"""
        success, response = self.run_test(
            "Search Movies (bilim kurgu)",
            "GET",
            "/api/ara?q=bilim%20kurgu",
            200
        )
        return success

    def test_update_movie(self):
        """Test updating a movie with new cover image URLs"""
        if not self.created_movie_id:
            print("⚠️  Skipping movie update test - no movie ID available")
            return True
            
        update_data = {
            "puan": 9.0,
            "ozel": False,
            "kapak_resmi_url": "https://m.media-amazon.com/images/M/MV5BNDc0YjM0MjUtZDRhYy00NGM4LWJmMjAtZTJmMzY2OWQ5NDZkXkEyXkFqcGdeQXVyNzI1NzMxNzM@._V1_SX300.jpg",
            "arkaplan_resmi_url": "https://wallpaperaccess.com/full/1131217.jpg"
        }
        
        success, response = self.run_test(
            "Update Movie with New Cover Images",
            "PUT",
            f"/api/admin/filmler/{self.created_movie_id}",
            200,
            data=update_data
        )
        
        # Verify updated cover image URLs are returned
        if success and isinstance(response, dict):
            if response.get('kapak_resmi_url') == update_data['kapak_resmi_url']:
                print(f"   ✅ Cover image URL updated successfully")
            else:
                print(f"   ⚠️ Cover image URL not updated correctly")
            
            if response.get('arkaplan_resmi_url') == update_data['arkaplan_resmi_url']:
                print(f"   ✅ Background image URL updated successfully")
            else:
                print(f"   ⚠️ Background image URL not updated correctly")
        
        return success

    def test_unauthorized_access(self):
        """Test accessing admin endpoints without token"""
        # Temporarily remove token
        temp_token = self.admin_token
        self.admin_token = None
        
        success, response = self.run_test(
            "Unauthorized Movie Creation",
            "POST",
            "/api/admin/filmler",
            401,
            data={"baslik": "Test", "aciklama": "Test", "tur": "Test", "yil": 2024, "puan": 5.0}
        )
        
        # Restore token
        self.admin_token = temp_token
        return success

    def test_delete_movie(self):
        """Test deleting a movie"""
        if not self.created_movie_id:
            print("⚠️  Skipping movie deletion test - no movie ID available")
            return True
            
        success, response = self.run_test(
            "Delete Movie",
            "DELETE",
            f"/api/admin/filmler/{self.created_movie_id}",
            200
        )
        return success

    def test_create_movie_with_partial_images(self):
        """Test creating a movie with only one cover image URL"""
        movie_data = {
            "baslik": "Interstellar",
            "aciklama": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
            "tur": "Bilim Kurgu",
            "yil": 2014,
            "puan": 8.6,
            "kapak_resmi_url": "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg",
            # Note: arkaplan_resmi_url is intentionally omitted
            "ozel": False
        }
        
        success, response = self.run_test(
            "Create Movie with Partial Cover Images (Interstellar)",
            "POST",
            "/api/admin/filmler",
            200,
            data=movie_data
        )
        
        if success and isinstance(response, dict):
            if 'kapak_resmi_url' in response and response['kapak_resmi_url']:
                print(f"   ✅ Cover image URL saved: {response['kapak_resmi_url']}")
            if 'arkaplan_resmi_url' not in response or not response.get('arkaplan_resmi_url'):
                print(f"   ✅ Background image URL correctly omitted")
        
        return success

    def test_update_movie_remove_images(self):
        """Test updating a movie to remove cover image URLs"""
        if not self.created_movie_id:
            print("⚠️  Skipping movie update test - no movie ID available")
            return True
            
        update_data = {
            "kapak_resmi_url": None,
            "arkaplan_resmi_url": None
        }
        
        success, response = self.run_test(
            "Update Movie to Remove Cover Images",
            "PUT",
            f"/api/admin/filmler/{self.created_movie_id}",
            200,
            data=update_data
        )
        return success

def main():
    print("🎬 Ultra Cinema API Testing Suite")
    print("=" * 50)
    
    tester = UltraCinemaAPITester()
    
    # Test sequence
    test_functions = [
        tester.test_admin_login_invalid,
        tester.test_admin_login,
        tester.test_get_settings,
        tester.test_get_movies_empty,
        tester.test_unauthorized_access,
        tester.test_create_movie,
        tester.test_create_second_movie,
        tester.test_get_movies_with_data,
        tester.test_get_featured_movies,
        tester.test_get_single_movie,
        tester.test_search_movies,
        tester.test_search_movies_genre,
        tester.test_update_movie,
        tester.test_delete_movie,
    ]
    
    # Run all tests
    for test_func in test_functions:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test {test_func.__name__} failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())