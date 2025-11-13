// frontend/src/App.jsx
import React, {useState, useEffect, useMemo} from 'react';
import { socket } from './socket';

// [MUI] MUI 컴포넌트 import
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';

// [MUI] 화면 컴포넌트 import
import ChatRoom from './ChatRoom';
import WaitingRoom from "./WaitingRoom.jsx";
import LoginScreen from "./LoginScreen.jsx";
import {IconButton} from "@mui/material";
import Brightness4Icon from '@mui/icons-material/Brightness4'; // 다크 모드 아이콘
import Brightness7Icon from '@mui/icons-material/Brightness7';
// [MUI] 앱 전체에 적용할 다크 테마 생성
const darkTheme = createTheme({
    palette: {
        mode: 'light',
    },
});

function App() {
    const [currentRoom, setCurrentRoom] = useState(null);
    const [username, setUsername] = useState(null);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('light');

    //테마 모드 변경 함수
    const toggleTheme = () => {
        setMode((prevMode) => (
            prevMode === 'light' ? 'dark' : 'light'
        ));
    }

    const theme = useMemo(
        () => createTheme({
            palette : {
                mode,
            },
        }),
        [mode],
    )

    const handleLogin = (name) => {
        if (name) {
            setUsername(name);
            socket.emit('set_username', name);
            setError(null);
        }
    };

    // --- 소켓 이벤트 리스너 (기존과 동일) ---
    useEffect(() => {
        const onJoinSuccess = (roomName) => {
            setCurrentRoom(roomName);
            setError(null);
        };
        const onCreateFail = (errorMessage) => setError(errorMessage);
        const onJoinFail = (errorMessage) => setError(errorMessage);

        socket.on('join_room_success', onJoinSuccess);
        socket.on('create_room_fail', onCreateFail);
        socket.on('join_room_fail', onJoinFail);

        return () => {
            socket.off('join_room_success', onJoinSuccess);
            socket.off('create_room_fail', onCreateFail);
            socket.off('join_room_fail', onJoinFail);
        };
    }, []);

    // --- 로비로 돌아가기 (기존과 동일, 서버 이벤트 전송) ---
    const leaveRoom = () => {
        socket.emit('leave_room', currentRoom);
        setCurrentRoom(null);
        setError(null);
    };

    // [MUI] 앱 전체를 ThemeProvider와 CssBaseline으로 감쌉니다.
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            {!username ? (
                // 1. 로그인 화면
                <LoginScreen onLogin={handleLogin} />
            ) : (
                // 2. 메인 앱 화면
                <>
                    {/* 상단 헤더 */}
                    <AppBar position="static">
                        <Toolbar>

                            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                실시간 채팅
                            </Typography>
                            <Typography>내 닉네임: {username}</Typography>
                            <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
                                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                            </IconButton>
                        </Toolbar>
                    </AppBar>

                    {/* 메인 콘텐츠 영역 */}
                    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>

                        {/* 에러 메시지 표시 (MUI Alert 사용) */}
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {/* 조건부 렌더링 */}
                        {currentRoom ? (
                            <ChatRoom roomName={currentRoom} username={username} onLeave={leaveRoom} />
                        ) : (
                            <WaitingRoom username={username}/>
                        )}
                    </Container>
                </>
            )}
        </ThemeProvider>
    );
}

export default App;