//eslint-disable-next-line
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/navbar'
import { Box, Button, TextField, Typography, Container } from '@mui/material';

function Signup({ setIsAuthenticated }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        try {
            const response = await axios.post('https://s72-raphael-watchwise.onrender.com/api/auth/register', {
                name,
                email,
                password
            });
            
            localStorage.setItem('token', response.data.token);
            setIsAuthenticated(true);
            navigate('/home');
        } catch (error) {
            setError(error.response?.data?.error);
        }
    };

    return (
        <>
        <Navbar/>
        <Box sx={{ backgroundColor: '#151a24', minHeight: '100vh' }}>
            <Container component="main" maxWidth="xs">
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Typography component="h1" variant="h5" sx={{ mb: 3, mt: 5, color: '#fff' }}>
                        Sign up
                    </Typography>
                    {error && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Full Name"
                            name="name"
                            autoComplete="name"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#666',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: '#999',
                                    opacity: 1,
                                },
                                '& .MuiFormLabel-root': {
                                    color: '#bbb',
                                },
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#666',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: '#999',
                                    opacity: 1,
                                },
                                '& .MuiFormLabel-root': {
                                    color: '#bbb',
                                },
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#666',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: '#999',
                                    opacity: 1,
                                },
                                '& .MuiFormLabel-root': {
                                    color: '#bbb',
                                },
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Sign Up
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/login')}
                            sx={{ mt: 1, color: '#fff' }}
                        >
                            Already have an account? Log in
                        </Button>
                    </Box>
                </Box>
            </Container>
        </Box>
        </>
    );
}

export default Signup;