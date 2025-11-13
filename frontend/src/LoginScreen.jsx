// frontend/src/LoginScreen.jsx
import React, { useState } from 'react';

// [MUI] MUI 컴포넌트 import
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import ChatIcon from '@mui/icons-material/Chat'; // 아이콘

function LoginScreen({ onLogin }) {
    const [nameInput, setNameInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (nameInput.trim()) {
            onLogin(nameInput.trim());
        }
    };

    return (
        // [MUI] Container: 콘텐츠를 중앙에 적절한 너비로 배치
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    //flexDirection: 'column',
                    minHeight: '100vh',
                    alignItems: 'center',
                    justifyContent : 'center',
                }}
            >
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <ChatIcon />
                </Avatar>
                <Typography component="h1" variant="h6">
                    닉네임 입력
                </Typography>

                {/* [MUI] Box를 form 태그처럼 사용 */}
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="닉네임"
                        name="username"
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained" // '채워진' 스타일 버튼
                        sx={{ mt: 3, mb: 2 }}
                    >
                        입장하기
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}

export default LoginScreen;