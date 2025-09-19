import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    CircularProgress,
    Divider
} from '@mui/material';
import Navbar from '../components/navbar';

const Login = ({ setIsAuthenticated }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await axios.post("http://localhost:3000/api/auth/login", {
                email,
                password
            });

            if (response.data && response.data.token) {
                localStorage.setItem("token", response.data.token);
                setIsAuthenticated(true);
                navigate("/home");
            } else {
                setError("Invalid response from server. Please try again.");
            }
        } catch (error) {
            console.error("Login error:", error);

            if (error.response) {
                // Backend responded with an error
                if (error.response.status === 401) {
                    setError("Invalid email or password");
                } else if (error.response.status === 400) {
                    setError(error.response.data?.message || "Invalid request");
                } else {
                    setError("Server error. Please try again later.");
                }
            } else if (error.request) {
                // No response from server
                setError("Cannot connect to server. Please check if the backend is running.");
            } else {
                // Something else happened
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <>
            <Navbar />
            <Container component="main" maxWidth="xs">
                <Box
                    sx={{
                        marginTop: 20,
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
                            disabled={isLoading}
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
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/signup')}
                            sx={{ mt: 1 }}
                            disabled={isLoading}
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