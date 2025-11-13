// backend/server.js
import express from 'express';
import http from 'http';
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);


const clientPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(clientPath));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const PORT = 4000;

// ----- 상태 관리 -----
let rooms = {}; // { roomName: { password: '...', users: [socketId, ...] } }
let users = {}; // { socketId: 'username' }

// ----- Helper 함수: 공개 방 목록 (유저 수 포함) -----
function getPublicRooms() {
    const publicRooms = {};
    for (const roomName in rooms) {
        publicRooms[roomName] = {
            userCount: rooms[roomName].users.length,
            hasPassword: rooms[roomName].password !== null
        };
    }
    return publicRooms;
}

// [추가] Helper 함수: 방 사용자 목록 (닉네임)
function getRoomUsers(roomName) {
    if (!rooms[roomName]) return [];
    return rooms[roomName].users.map(id => users[id]).filter(Boolean); // id로 닉네임 찾기
}

// [추가] Helper 함수: 대기실 사용자 목록 (닉네임)
function getWaitingRoomUsers() {
    const usersInRooms = new Set();
    Object.values(rooms).forEach(room => {
        room.users.forEach(socketId => usersInRooms.add(socketId));
    });

    const waitingRoomSocketIds = Object.keys(users).filter(socketId => !usersInRooms.has(socketId));
    return waitingRoomSocketIds.map(id => users[id]).filter(Boolean);
}

// [추가] Helper 함수: 대기실 사용자 목록 브로드캐스트
function broadcastWaitingRoomUsers() {
    const waitingRoomUsernames = getWaitingRoomUsers();
    // 대기실에 있는 사용자들에게만 보낼 수도 있지만,
    // 간단하게 io.emit으로 모두에게 보내고 클라이언트가 알아서 처리하게 합니다.
    io.emit('update_waiting_room_users', waitingRoomUsernames);
}

// [추가] Helper 함수: 특정 방 사용자 목록 브로드캐스트
function broadcastRoomUsers(roomName) {
    if (rooms[roomName]) {
        const roomUsernames = getRoomUsers(roomName);
        io.to(roomName).emit('update_room_users', roomUsernames);
    }
}

// [추가] Helper 함수: 방 나가기 공통 로직
function handleLeaveRoom(socket, roomName, reason = 'left') {
    if (!rooms[roomName] || !rooms[roomName].users.includes(socket.id)) {
        return false; // 나갈 방이 없거나, 방에 속해있지 않음
    }

    // 1. 방 목록에서 사용자 제거
    rooms[roomName].users = rooms[roomName].users.filter(id => id !== socket.id);
    socket.leave(roomName);

    const username = users[socket.id];
    console.log(`[${roomName}] 에서 ${username} 나감 (이유: ${reason})`);

    if (username) {
        // 2. 방에 남아있는 사람들에게 퇴장 메시지 전송
        socket.to(roomName).emit('receive_message', {
            type: 'system',
            message: `${username}님이 방을 나갔습니다.`
        });
        // 3. 방에 남아있는 사람들에게 사용자 목록 업데이트
        broadcastRoomUsers(roomName);
    }

    // 4. 방이 비었으면 방 삭제
    if (rooms[roomName].users.length === 0) {
        delete rooms[roomName];
        console.log(`[방 삭제됨] ${roomName}`);
        io.emit('room_list', getPublicRooms()); // 방 목록 (전체) 업데이트
    } else {
        // 5. 방이 비지 않았으면 인원수 업데이트
        io.emit('room_list', getPublicRooms());
    }

    return true; // 성공적으로 나감
}


// ----- Socket.IO 연결 -----
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // --- 1. 로비 기능 ---
    socket.emit('room_list', getPublicRooms());

    socket.on('create_room', ({ roomName, password }) => {
        if (rooms[roomName]) {
            socket.emit('create_room_fail', '이미 존재하는 방입니다.');
            return;
        }

        rooms[roomName] = {
            password: password || null,
            users: []
        };
        console.log(`[방 생성됨] ${roomName}`);

        io.emit('room_list', getPublicRooms()); // 방 목록 업데이트 (빈 방)

        handleJoinRoom(roomName, password); // 생성 즉시 참가
    });

    socket.on('join_room', ({ roomName, password }) => {
        handleJoinRoom(roomName, password);
    });

    // [추가] 방 나가기 이벤트
    socket.on('leave_room', (roomName) => {
        const left = handleLeaveRoom(socket, roomName, 'left');
        if (left) {
            // 방에서 나와 대기실로 갔으므로, 대기실 목록 업데이트
            broadcastWaitingRoomUsers();
        }
    });

    // --- Helper 함수: 방 참가 처리 (수정됨) ---
    function handleJoinRoom(roomName, password) {
        if (!rooms[roomName]) {
            socket.emit('join_room_fail', '존재하지 않는 방입니다.');
            return;
        }
        if (rooms[roomName].password && rooms[roomName].password !== password) {
            socket.emit('join_room_fail', '비밀번호가 틀립니다.');
            return;
        }
        const username = users[socket.id];
        if (!username) {
            socket.emit('join_room_fail', '닉네임이 설정되지 않았습니다.');
            return;
        }

        // [수정] 다른 방에 있었다면 자동으로 나감
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                handleLeaveRoom(socket, room, 'switched room');
            }
        });

        // 방 참가
        socket.join(roomName);
        rooms[roomName].users.push(socket.id);

        socket.emit('join_room_success', roomName);
        console.log(`[${roomName}] 에 ${username} (${socket.id}) 참가`);

        // [추가] 참가자에게 시스템 메시지 전송
        io.to(roomName).emit('receive_message', {
            type: 'system',
            message: `${username}님이 방에 참가했습니다.`
        });

        // [추가] 방 목록 및 대기실 목록 업데이트
        io.emit('room_list', getPublicRooms()); // 인원수 업데이트
        broadcastRoomUsers(roomName); // 이 방의 사용자 목록 업데이트
        broadcastWaitingRoomUsers(); // 대기실 사용자 목록 업데이트 (한 명 줄었음)
    }

    // --- 2. 채팅방 기능 ---
    socket.on('send_message', ({ roomName, username, message }) => {
        // ... (기존 send_message 로직) ...
        if (!socket.rooms.has(roomName)) return;
        io.to(roomName).emit('receive_message', {
            senderId: socket.id,
            message: message,
            username : username,
            timestamp: new Date()
        });
    });

    socket.on('send_global_message', (data) => {
        // ... (기존 send_global_message 로직) ...
        io.emit('receive_global_message', {
            username : data.username,
            message : data.message,
            timestamp: new Date()
        })
    });

    // [추가] 클라이언트가 방 입장 시 사용자 목록을 요청하는 핸들러
    socket.on('request_room_users', (roomName) => {
        // 사용자가 해당 방에 실제로 있는지 확인 (보안/정확성)
        if (socket.rooms.has(roomName)) {
            // 요청한 클라이언트에게만 현재 목록을 보내줌
            socket.emit('update_room_users', getRoomUsers(roomName));
        }
    });

    // --- 3. 연결 종료 처리 (수정됨) ---
    socket.on('disconnect', () => {
        const username = users[socket.id];
        console.log(`연결종료 : ${username} ${socket.id}`);

        let wasInRoom = false;

        // [수정] 모든 방을 순회하며 handleLeaveRoom 헬퍼 사용
        for (const roomName in rooms) {
            if (handleLeaveRoom(socket, roomName, 'disconnected')) {
                wasInRoom = true;
                break; // 사용자는 한 방에만 있을 수 있음
            }
        }

        if (username) {
            delete users[socket.id]; // 사용자 목록에서 제거
        }

        // 방에 있지 않았고, 닉네임이 있었다면 대기실에 있었음
        if (!wasInRoom && username) {
            io.emit('receive_global_message', {
                type: 'system',
                message: `${username}님이 대기실을 나갔습니다.`
            });
        }

        // [추가] 사용자가 나갔으므로 대기실 목록을 항상 업데이트
        broadcastWaitingRoomUsers();
    });

    // --- 4. 닉네임 설정 (수정됨) ---
    socket.on('set_username', (username) => {
        users[socket.id] = username;
        console.log(`[${socket.id}] 닉네임 설정: ${username}`);

        io.emit('receive_global_message', {
            type: 'system',
            message : `${username}님이 대기실에 들어오셨습니다.`
        });

        // [추가] 새 사용자가 대기실에 입장했으므로 목록 업데이트
        broadcastWaitingRoomUsers();
    });
});

app.get("/*", (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
})

server.listen(PORT, () => {
    console.log(`🚀 채팅 서버가 포트 ${PORT}에서 실행 중입니다.`);
});