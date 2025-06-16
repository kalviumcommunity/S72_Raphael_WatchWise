import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/navbar';
import { TextField } from '@mui/material';

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
    passwordError,
    isSubmitting
}) => {if (!isOpen) return null;

return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-200 scale-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
                <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                    <span className="text-xl font-light">✕</span>
                </button>
            </div>
            
            {/* Error Message */}
            {passwordError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {passwordError}
                </div>
            )}
            
            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-1">
                    <TextField
                        fullWidth
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="transition-all duration-200"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#3B82F6',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#3B82F6',
                                },
                            },
                        }}
                    />
                </div>
                
                <div className="space-y-1">
                    <TextField
                        fullWidth
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        helperText="Password must be at least 6 characters"
                        className="transition-all duration-200"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#3B82F6',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#3B82F6',
                                },
                            },
                        }}
                    />
                </div>
                
                <div className="space-y-1">
                    <TextField
                        fullWidth
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        error={confirmPassword !== newPassword && confirmPassword !== ''}
                        helperText={confirmPassword !== newPassword && confirmPassword !== '' ? "Passwords don't match" : ""}
                        className="transition-all duration-200"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: confirmPassword !== newPassword && confirmPassword !== '' ? '#EF4444' : '#3B82F6',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: confirmPassword !== newPassword && confirmPassword !== '' ? '#EF4444' : '#3B82F6',
                                },
                            },
                        }}
                    />
                </div>
                
                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200 shadow-lg hover:shadow-xl"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating...
                            </span>
                        ) : (
                            'Update Password'
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
)};

const EditModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    name,
    setName,
    email,
    setEmail,
    onImageChange,
    imagePreview,
    onPasswordClick,
    onDeleteClick,
    updateError,
    isUploading
}) => {if (!isOpen) return null;

return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-100 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-200 scale-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Edit Profile</h2>
                <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                    <span className="text-xl font-light">✕</span>
                </button>
            </div>
            
            {/* Error Message */}
            {updateError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {updateError}
                </div>
            )}
            
            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-1">
                    <TextField
                        fullWidth
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isUploading}
                        className="transition-all duration-200"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#3B82F6',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#3B82F6',
                                },
                            },
                        }}
                    />
                </div>
                
                <div className="space-y-1">
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isUploading}
                        className="transition-all duration-200"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&:hover fieldset': {
                                    borderColor: '#3B82F6',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#3B82F6',
                                },
                            },
                        }}
                    />
                </div>
                
                {/* Profile Image Section */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Profile Image</label>
                    
                    {imagePreview && (
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <img 
                                    src={imagePreview} 
                                    alt="Profile Preview" 
                                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shadow-md"
                                />
                                <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center cursor-pointer">
                                    <span className="text-white opacity-0 hover:opacity-100 text-xs">Change</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onImageChange}
                            disabled={isUploading}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:transition-all file:duration-200 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-2">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-evenly gap-4 pt-6 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            type="button"
                            onClick={onPasswordClick}
                            disabled={isUploading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200 shadow-md hover:shadow-lg"
                        >
                            Change Password
                        </button>
                        <button
                            type="button"
                            onClick={onDeleteClick}
                            disabled={isUploading}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-200 shadow-md hover:shadow-lg"
                        >
                            Delete Account
                        </button>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-200 shadow-md hover:shadow-lg"
                    >
                        {isUploading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </div>
    </div>
)};

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editImage, setEditImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updateError, setUpdateError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

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

            // console.log("Fetching profile with token:", token.substring(0, 10) + '...');
            
            const response = await axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // console.log("Profile response:", response.data);
            
            if (response.data) {
                setUser(response.data);
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
            const file = e.target.files[0];
            
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                setUpdateError('Image file is too large. Maximum size is 5MB.');
                return;
            }
            
            // console.log("Image selected:", file.name);
            setEditImage(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setUpdateError('');
        setIsUploading(true);
        
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('name', editName);
            formData.append('email', editEmail);
            
            if (editImage) {
                // console.log("Appending image to form data:", editImage.name);
                formData.append('image', editImage);
            } else {
                console.log("No image selected for upload");
            }

            // Log FormData entries (for debugging)
            // for (let pair of formData.entries()) {
            //     console.log(pair[0] + ': ' + pair[1]);
            // }

            const response = await axios.put('https://s72-raphael-watchwise.onrender.com/api/profile/me', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // console.log("Profile update response:", response.data);
            await fetchUserProfile();
            setIsEditModalOpen(false);
            // Reset the image state after successful update
            setEditImage(null);
            setImagePreview(null);
        } catch (err) {
            console.error('Profile update error:', err);
            setUpdateError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setIsSubmittingPassword(true);

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            setIsSubmittingPassword(false);
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            setIsSubmittingPassword(false);
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
        } finally {
            setIsSubmittingPassword(false);
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
        if (!imagePath) return 'https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png';
        if (imagePath.startsWith('http')) return imagePath;
        
        // Normalize path by replacing backslashes with forward slashes
        const normalizedPath = imagePath.replace(/\\/g, '/');
        return `https://s72-raphael-watchwise.onrender.com/${normalizedPath}`;
    };

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
                    <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-400 rounded-lg flex items-center justify-center">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-gray-300 rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-6">
                            <img
                                src={getImageUrl(user?.image)}
                                alt="Profile"
                                className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
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
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
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
                imagePreview={imagePreview}
                onPasswordClick={() => setIsPasswordModalOpen(true)}
                onDeleteClick={() => setIsDeleteConfirmOpen(true)}
                updateError={updateError}
                isUploading={isUploading}
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
                isSubmitting={isSubmittingPassword}
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