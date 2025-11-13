// frontend/src/WaitingRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';

// [MUI] MUI 컴포넌트 import
import {
    Box,
    Grid,
    Stack,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    Button,
    TextField,
    Divider,
    ListItemIcon
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import LockIcon from '@mui/icons-material/Lock';

// [MUI] 재사용할 UserList 컴포넌트 import
import UserList from './UserList';

// --- 1. 글로벌 채팅 컴포넌트 (MUI 적용) ---
function GlobalChat({ username }) {
    const [message, setMessage] = useState('');
    const [chatLog, setChatLog] = useState([]);
    const chatLogRef = useRef(null);

    // 소켓 로직 (기존과 동일)
    useEffect(() => {
        const onReceiveMessage = (data) => {
            setChatLog((prevLog) => [...prevLog, data]);
        };
        socket.on('receive_global_message', onReceiveMessage);
        return () => {
            socket.off('receive_global_message', onReceiveMessage);
        };
    }, []);

    // 스크롤 자동 내리기 (기존과 동일)
    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }
    }, [chatLog]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('send_global_message', { username, message });
            setMessage('');
        }
    };

    return (
        // [MUI] Paper: 채팅창 전체 컨테이너
        <Paper elevation={3} sx={{
            height: '65vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                전체 채팅
            </Typography>

            {/* [MUI] Box: 채팅 로그 (스크롤 영역) */}
            <Box ref={chatLogRef} sx={{
                flexGrow: 1,
                overflowY: 'auto',
                p: 2,
                minHeight: 0,
            }}>
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

            {/* [MUI] Box: 메시지 입력 폼 */}
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
                    placeholder="메시지 보내기..."
                />
                <Button type="submit" variant="contained" sx={{ ml: 1 }}>
                    <SendIcon />
                </Button>
            </Box>
        </Paper>
    );
}

// --- 2. 방 관리 컴포넌트 (MUI 적용) ---
function RoomManager() {
    const [rooms, setRooms] = useState({});
    const [roomName, setRoomName] = useState('');
    const [password, setPassword] = useState('');

    // 소켓 로직 (기존과 동일 + 방 목록 요청 추가)
    useEffect(() => {
        const onRoomList = (publicRooms) => setRooms(publicRooms);
        socket.on('room_list', onRoomList);

        // [수정] 방 목록이 안보이던 버그 해결
        socket.emit('request_room_list');

        return () => {
            socket.off('room_list', onRoomList);
        };
    }, []);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (roomName.trim() === '') return;
        socket.emit('create_room', { roomName, password });
        setRoomName('');
        setPassword('');
    };

    const handleJoinRoom = (targetRoomName) => {
        const roomInfo = rooms[targetRoomName];
        let inputPassword = null;

        // [MUI] 비밀번호가 있으면 prompt 대신 안전하게 처리 (예시)
        if (roomInfo.hasPassword) {
            inputPassword = prompt(`'${targetRoomName}' 방은 비밀번호가 있습니다:`);
        }

        socket.emit('join_room', {
            roomName: targetRoomName,
            password: inputPassword
        });
    };

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                방 관리
            </Typography>
            {/* 방 생성 폼 */}
            <Box component="form" onSubmit={handleCreateRoom} sx={{ mb: 2 }}>
                <Stack spacing={2}>
                    <TextField
                        label="방 이름"
                        size="small"
                        fullWidth
                        required
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                    />
                    <TextField
                        label="비밀번호 (선택 사항)"
                        type="password"
                        size="small"
                        fullWidth
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" variant="contained" fullWidth>
                        새 방 만들기
                    </Button>
                </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 방 목록 */}
            <Typography variant="h6" component="h4" sx={{ mb: 1, fontSize: '1rem' }}>
                현재 방 목록
            </Typography>
            <List dense sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                {Object.keys(rooms).length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        개설된 방이 없습니다.
                    </Typography>
                ) : (
                    Object.entries(rooms).map(([name, info]) => (
                        <ListItem
                            key={name}
                            secondaryAction={
                                <Button size="small" variant="outlined" onClick={() => handleJoinRoom(name)}>
                                    참가
                                </Button>
                            }
                        >
                            <ListItemIcon>
                                {info.hasPassword ? <LockIcon fontSize="small" /> : <MeetingRoomIcon fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText
                                primary={name}
                                secondary={`${info.userCount} 명`}
                            />
                        </ListItem>
                    ))
                )}
            </List>
        </Paper>
    );
}


// --- 3. WaitingRoom 메인 컴포넌트 (레이아웃) ---
function WaitingRoom({ username }) {
    const [waitingRoomUsers, setWaitingRoomUsers] = useState([]);

    // 대기실 사용자 목록 소켓 (기존과 동일)
    useEffect(() => {
        const onUpdateUsers = (users) => setWaitingRoomUsers(users);
        socket.on('update_waiting_room_users', onUpdateUsers);

        // [추가] 입장 시 대기실 사용자 목록 즉시 요청 (서버 로직에 따라 필요)
        // socket.emit('request_waiting_room_users'); // (필요시 서버에 이벤트 추가)

        return () => {
            socket.off('update_waiting_room_users', onUpdateUsers);
        };
    }, []);

    return (
        // [MUI] Grid: 12컬럼 기반 레이아웃 시스템
        // container: Grid 아이템들을 감싸는 부모
        // spacing: 아이템 간의 간격
        <Grid container spacing={3}>

            <Grid item xs={12} md={3}>
                <RoomManager />
            </Grid>

            <Grid item xs={12} md={6}>
                <GlobalChat username={username} />
            </Grid>

            <Grid item xs={12} md={3}>
                <UserList
                    title="대기실 이용자"
                    users={waitingRoomUsers}
                    currentUser={username}
                />
            </Grid>

        </Grid>
    );
}

export default WaitingRoom;