// frontend/src/socket.js
import { io } from 'socket.io-client';

// 백엔드 서버 주소 (http://localhost:4000)
const URL = 'http://localhost:4000';

// 서버에 연결하는 socket 객체를 생성하고 export 합니다.
export const socket = io(URL);