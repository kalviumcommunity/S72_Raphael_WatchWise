import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Button, TextField, Typography, Container, CircularProgress, Divider } from '@mui/material';
import Navbar from '../components/navbar';

const Login = ({ setIsAuthenticated }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();

    // Check for Google OAuth callback on component mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const googleError = urlParams.get('error');

        if (token) {
            // Google OAuth success
            localStorage.setItem("token", token);
            setIsAuthenticated(true);
            // Clean the URL and navigate to home
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate("/home");
        } else if (googleError) {
            // Google OAuth error
            setError(decodeURIComponent(googleError));
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [navigate, setIsAuthenticated]);

    // Regular email/password login
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await axios.post("https://s72-raphael-watchwise.onrender.com/api/auth/login", {
                email,
                password
            });
            
            if (response.data && response.data.token) {
                localStorage.setItem("token", response.data.token);
                setIsAuthenticated(true);
                navigate("/home");
            } else {
                setError("Invalid response from server");
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.response?.status === 401) {
                setError("Invalid email or password");
            } else if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else if (!error.response) {
                setError("Cannot connect to server. Please check if the server is running.");
            } else {
                setError("An error occurred during login. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Google OAuth redirect handler
    const handleGoogleLogin = () => {
        setError("");
        setIsGoogleLoading(true);
        window.location.href = "https://s72-raphael-watchwise.onrender.com/auth/google";
    };

    return (
        <>
            <Navbar />
            <Container component="main" maxWidth="xs">
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                        Sign in
                    </Typography>
                    
                    {error && (
                        <Typography color="error" sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
                            {error}
                        </Typography>
                    )}

                    {/* Google Sign-In Button */}
                    <Box sx={{ width: '100%', mb: 2 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={handleGoogleLogin}
                            disabled={isGoogleLoading || isLoading}
                            sx={{ 
                                py: 1.5,
                                borderColor: '#dadce0',
                                color: '#3c4043',
                                '&:hover': {
                                    borderColor: '#d2e3fc',
                                    backgroundColor: '#f8f9fa'
                                }
                            }}
                        >
                            {isGoogleLoading ? (
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                            ) : null}
                            Sign in with Google
                        </Button>
                    </Box>

                    {/* Divider */}
                    <Divider sx={{ width: '100%', my: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                            OR
                        </Typography>
                    </Divider>

                    {/* Regular Login Form */}
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading || isGoogleLoading}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading || isGoogleLoading}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={isLoading || isGoogleLoading}
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/signup')}
                            sx={{ mt: 1 }}
                            disabled={isLoading || isGoogleLoading}
                        >
                            Don't have an account? Sign up
                        </Button>
                    </Box>
                </Box>
            </Container>
        </>
    );
};

export default Login;