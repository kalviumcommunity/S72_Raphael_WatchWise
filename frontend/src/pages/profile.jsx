import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/navbar';
import { TextField } from '@mui/material';

const StatCard = ({ title, stats }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-gray-600">Watched</span>
                    <span className="font-semibold">{stats.watched}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">In Progress</span>
                    <span className="font-semibold">{stats.inProgress}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Plan to Watch</span>
                    <span className="font-semibold">{stats.planToWatch}</span>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">Delete Account</h2>
                <p className="mb-6 text-gray-600">Are you sure you want to delete your account? This action cannot be undone.</p>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
};

const PasswordModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    currentPassword, 
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError
}) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Change Password</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>
                
                {passwordError && (
                    <div className="mb-4 text-red-500">{passwordError}</div>
                )}
                
                <form onSubmit={onSubmit} className="space-y-4">
                    <TextField
                        fullWidth
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        margin="normal"
                    />
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
};

const EditModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    name,
    setName,
    email,
    setEmail,
    onImageChange,
    onPasswordClick,
    onDeleteClick,
    updateError 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Edit Profile</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>
                
                {updateError && (
                    <div className="mb-4 text-red-500">{updateError}</div>
                )}
                
                <form onSubmit={onSubmit} className="space-y-4">
                    <TextField
                        fullWidth
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        margin="normal"
                    />
                    <div>
                        <label className="block text-gray-700 mb-2">Profile Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onImageChange}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <div className="flex justify-between pt-4">
                        <div>
                            <button
                                type="button"
                                onClick={onPasswordClick}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
                            >
                                Change Password
                            </button>
                            <button
                                type="button"
                                onClick={onDeleteClick}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                                Delete Account
                            </button>
                        </div>
                        <button
                            type="submit"
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    //eslint-disable-next-line
    const [stats, setStats] = useState({
        movies: {
            watched: 0,
            inProgress: 0,
            planToWatch: 0
        },
        tvShows: {
            watched: 0,
            inProgress: 0,
            planToWatch: 0
        },
        anime: {
            watched: 0,
            inProgress: 0,
            planToWatch: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editImage, setEditImage] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updateError, setUpdateError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    //eslint-disable-next-line
    const [showPasswordChange, setShowPasswordChange] = useState(false);

    useEffect(() => {
        if (user) {
            setEditName(user.name || '');
            setEditEmail(user.email || '');
        }
    }, [user]);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                navigate('/login');
                return;
            }

            console.log("Fetching profile with token:", token.substring(0, 10) + '...');
            
            const response = await axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log("Profile response:", response.data);
            console.log("Profile image path from server:", response.data.image);
            
            if (response.data) {
                setUser(response.data);
                setStats(response.data.stats || {
                    movies: { watched: 0, inProgress: 0, planToWatch: 0 },
                    tvShows: { watched: 0, inProgress: 0, planToWatch: 0 },
                    anime: { watched: 0, inProgress: 0, planToWatch: 0 }
                });
            }
            setLoading(false);
        } catch (err) {
            console.error('Profile fetch error:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.error || 'Failed to fetch profile');
            setLoading(false);
            if (err.response?.status === 401) {
                localStorage.removeItem('token'); // Clear invalid token
                navigate('/login');
            }
        }
    };

    useEffect(() => {
        fetchUserProfile();
    }, [navigate]);

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            console.log("Image selected:", e.target.files[0].name);
            setEditImage(e.target.files[0]);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setUpdateError('');
        
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('name', editName);
            formData.append('email', editEmail);
            if (editImage) {
                console.log("Appending image to form data:", editImage.name);
                formData.append('image', editImage);
            } else {
                console.log("No image selected for upload");
            }

            // Log FormData entries (for debugging)
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }

            await axios.put('https://s72-raphael-watchwise.onrender.com/api/profile/me', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            await fetchUserProfile();
            setIsEditModalOpen(false);
            // Reset the image state after successful update
            setEditImage(null);
        } catch (err) {
            console.error('Profile update error:', err);
            setUpdateError(err.response?.data?.error || 'Failed to update profile');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put('https://s72-raphael-watchwise.onrender.com/api/profile/me/password', {
                currentPassword: currentPassword,
                newPassword: newPassword
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Reset form and show success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsPasswordModalOpen(false);
            alert('Password updated successfully');
        } catch (err) {
            console.error('Password update error:', err);
            setPasswordError(err.response?.data?.error || 'Failed to update password');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete('https://s72-raphael-watchwise.onrender.com/api/profile/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            localStorage.removeItem('token');
            navigate('/login');
        } catch (err) {
            console.error('Account deletion error:', err);
            setUpdateError(err.response?.data?.error || 'Failed to delete account');
        }
    };

    const handleSignOut = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleClosePasswordModal = () => {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
    };

    const getImageUrl = (imagePath) => {
        // Default image if no path is provided
        if (!imagePath) return 'https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png';
        
        // Handle File object (when user has just selected an image but not uploaded yet)
        if (typeof imagePath === 'object') {
            return URL.createObjectURL(imagePath);
        }
        
        // Handle full URLs (already including http/https)
        if (imagePath.startsWith('http')) return imagePath;
        
        // Convert backslashes to forward slashes for URLs
        const normalizedPath = imagePath.replace(/\\/g, '/');
        
        // Handle relative paths from the server
        // Make sure the path doesn't have any leading slashes that might cause issues
        const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.substring(1) : normalizedPath;
        return `https://s72-raphael-watchwise.onrender.com/${cleanPath}`;
    };

    const updateStats = (mediaType, oldStatus, newStatus) => {
        setStats(prevStats => {
            const stats = { ...prevStats };
            const mediaTypeKey = mediaType === 'movie' ? 'movies' : 
                               mediaType === 'tv' ? 'tvShows' : 'anime';
            
            // Decrement old status count if it exists
            if (oldStatus) {
                switch (oldStatus) {
                    case 'COMPLETED':
                        stats[mediaTypeKey].watched = Math.max(0, stats[mediaTypeKey].watched - 1);
                        break;
                    case 'IN_PROGRESS':
                        stats[mediaTypeKey].inProgress = Math.max(0, stats[mediaTypeKey].inProgress - 1);
                        break;
                    case 'PLAN_TO_WATCH':
                        stats[mediaTypeKey].planToWatch = Math.max(0, stats[mediaTypeKey].planToWatch - 1);
                        break;
                    default:
                        break;
                }
            }

            // Increment new status count
            switch (newStatus) {
                case 'COMPLETED':
                    stats[mediaTypeKey].watched += 1;
                    break;
                case 'IN_PROGRESS':
                    stats[mediaTypeKey].inProgress += 1;
                    break;
                case 'PLAN_TO_WATCH':
                    stats[mediaTypeKey].planToWatch += 1;
                    break;
                default:
                    break;
            }

            return stats;
        });
    };

    // Add event listeners for status updates
    useEffect(() => {
        const handleStatusUpdate = (event) => {
            const { mediaType, oldStatus, newStatus } = event.detail;
            console.log('Status update received:', { mediaType, oldStatus, newStatus });
            updateStats(mediaType, oldStatus, newStatus);
        };

        // Initial fetch of stats
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.data && response.data.stats) {
                    setStats(response.data.stats);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchStats();
        window.addEventListener('watchStatusUpdated', handleStatusUpdate);

        return () => {
            window.removeEventListener('watchStatusUpdated', handleStatusUpdate);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-red-500">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-6">
                            <img
                                src={getImageUrl(user?.image)}
                                
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png';
                                }}
                            />
                            <div>
                                <h1 className="text-3xl font-bold">{user?.name}</h1>
                                <p className="text-gray-600">{user?.email}</p>
                                <p className="text-sm text-gray-500">Member since {new Date(user?.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Movies" stats={stats.movies} />
                    <StatCard title="TV Shows" stats={stats.tvShows} />
                    <StatCard title="Anime" stats={stats.anime} />
                </div>

                {/* Additional Stats or Recent Activity could go here */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
                    <p className="text-gray-600">Coming soon...</p>
                </div>
            </div>

            <EditModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleEditSubmit}
                name={editName}
                setName={setEditName}
                email={editEmail}
                setEmail={setEditEmail}
                onImageChange={handleImageChange}
                onPasswordClick={() => setIsPasswordModalOpen(true)}
                onDeleteClick={() => setIsDeleteConfirmOpen(true)}
                updateError={updateError}
            />
            <PasswordModal 
                isOpen={isPasswordModalOpen}
                onClose={handleClosePasswordModal}
                onSubmit={handlePasswordChange}
                currentPassword={currentPassword}
                setCurrentPassword={setCurrentPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                passwordError={passwordError}
            />
            <DeleteConfirmationModal 
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteAccount}
            />
        </div>
    );
};

export default Profile;