// frontend/src/ChatRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

// [MUI] MUI 컴포넌트 import
import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    TextField,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

// [MUI] 재사용할 UserList 컴포넌트 import
import UserList from './UserList';

function ChatRoom({ roomName, username, onLeave }) {
    const [message, setMessage] = useState('');
    const [chatLog, setChatLog] = useState([]);
    const [roomUsers, setRoomUsers] = useState([]); // [추가] 방 사용자 목록
    const chatLogRef = useRef(null);

    // [수정] 소켓 로직 (방 사용자 목록 로직 추가)
    useEffect(() => {
        // 1. 메시지 받기
        const onReceiveMessage = (data) => {
            setChatLog((prevLog) => [...prevLog, data]);
        };
        socket.on('receive_message', onReceiveMessage);

        // 2. 방 사용자 목록 업데이트 받기
        const onUpdateRoomUsers = (users) => {
            setRoomUsers(users);
        };
        socket.on('update_room_users', onUpdateRoomUsers);

        // 3. 방 입장 시, 현재 방의 사용자 목록 요청 (서버에 구현됨)
        socket.emit('request_room_users', roomName);

        // 4. 클린업
        return () => {
            socket.off('receive_message', onReceiveMessage);
            socket.off('update_room_users', onUpdateRoomUsers);
        };
    }, [roomName]); // roomName이 바뀔 때마다 이 effect가 재실행

    // 스크롤 자동 내리기 (기존과 동일)
    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }
    }, [chatLog]);

    // 메시지 전송 핸들러 (기존과 동일)
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('send_message', { roomName, username, message });
            setMessage('');
        }
    };

    return (
        // [MUI] Grid: 12컬럼 기반 레이아웃
        <Grid container spacing={3}>

            {/* 1. 왼쪽 사이드바 (방 사용자 목록) */}
            <Grid item xs={12} md={4}>
                <UserList
                    title="채팅방 이용자"
                    users={roomUsers}
                    currentUser={username}
                />
            </Grid>

            {/* 2. 오른쪽 메인 채팅방 */}
            <Grid item xs={12} md={8}>
                <Paper
                    elevation={3}
                    // [MUI] flex-direction: column으로 헤더/채팅로그/입력창 수직 정렬
                    sx={{ height: '75vh', display: 'flex', flexDirection: 'column' }}
                >
                    {/* 채팅방 헤더 */}
                    <Box
                        sx={{
                            p: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <Typography variant="h5">{roomName}</Typography>
                        <Button variant="outlined" color="error" size="small" onClick={onLeave}>
                            대기실로 나가기
                        </Button>
                    </Box>

                    {/* 채팅 로그 (GlobalChat과 동일한 로직) */}
                    <Box ref={chatLogRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                        {chatLog.map((chat, index) => (
                            <Box
                                key={index}
                                sx={{
                                    mb: 1,
                                    textAlign: chat.type === 'system' ? 'center' : (chat.username === username ? 'right' : 'left')
                                }}
                            >
                                {chat.type === 'system' ? (
                                    <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                        {chat.message}
                                    </Typography>
                                ) : (
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 1,
                                            display: 'inline-block',
                                            bgcolor: chat.username === username ? 'primary.main'
                                                : (theme) =>
                                                    theme.palette.mode === 'light' ? 'gray[200]' : 'gray[800]',
                                            color : chat.username === username ? 'primary.contrastText' : 'text.primary'
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ display: 'block', color : chat.username === username ? 'primary.contrastText' : 'text.primary' }}>
                                            {chat.username}
                                        </Typography>
                                        <Typography variant="body1">{chat.message}</Typography>
                                    </Paper>
                                )}
                            </Box>
                        ))}
                    </Box>

                    {/* 메시지 입력 폼 */}
                    <Box
                        component="form"
                        onSubmit={handleSendMessage}
                        sx={{ display: 'flex', p: 2, borderTop: 1, borderColor: 'divider' }}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="메시지를 입력하세요..."
                        />
                        <Button type="submit" variant="contained" sx={{ ml: 1 }}>
                            <SendIcon />
                        </Button>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
}

export default ChatRoom;