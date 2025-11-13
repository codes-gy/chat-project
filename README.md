# React와 node.js를 활용한 채팅프로그램

https://chat-project-di8a.onrender.com/

## 개발시 발생한 문제점
- ### Socket.IO 이벤트 이름 불일치
    
### 문제
클라이언트(React)와 서버 간의 connection, disconnect 이벤트는 정상 작동했으나, 유독 sendMessage 이벤트만 서버에서 수신하지 못했습니다.

### 원인
서버 코드는 socket.on('sendMessage', ...)로 이벤트를 수신 대기하고 있었으나, 클라이언트 코드에서는 socket.emit('send_message', ...)로 잘못된 이벤트 이름을 사용하고 있었습니다.

### 해결
클라이언트와 서버가 사용하는 이벤트 이름을 'sendMessage'로 통일하여 데이터가 정상적으로 교환되도록 수정했습니다.

- ### 사용자 중복 및 데이터 불일치 발생

### 문제
getRoomUsers 헬퍼 함수가 반환하는 특정 방의 사용자 닉네임 목록에, 동일한 사용자가 중복으로 포함될 수 있는 잠재적 버그가 발견되었습니다.

### 원인
handleJoinRoom 함수가 rooms[...].users 배열에 socket.id를 push할 때, 해당 사용자가 이미 방에 존재하는지 확인하는 방어 로직이 누락되었습니다. 만약 클라이언트가 join_room 이벤트를 중복 전송 시, 한 사용자가 배열에 여러 번 추가될 수 있었습니다.

### 해결
handleJoinRoom 함수에 rooms[roomName].users.includes(socket.id) 검증 로직을 추가하여, 이미 방에 있는 사용자는 push를 실행하지 않고 즉시 return 하도록 수정했습니다.

getRoomUsers 함수가 최종 닉네임 배열을 반환할 때, [...new Set(usernames)]를 사용해 Set으로 중복을 제거함으로써, 데이터가 일시적으로 꼬이더라도 클라이언트는 항상 고유한 목록을 받도록 보장했습니다.

- ### 복잡한 상태 동기화 (방 나가기 / 연결 끊김)
### 문제
사용자가 방을 나가거나(leave_room), 브라우저를 닫아 연결이 끊겼을 때(disconnect), 또는 다른 방으로 이동(join_room)할 때, 관련된 모든 클라이언트(로비, 이전 방, 새 방)에게 상태가 실시간으로 동기화되어야 했습니다.

### 원인
이 로직이 on('leave_room'), on('disconnect'), on('join_room') 등 여러 이벤트 핸들러에 흩어져 있으면 버그가 발생하기 쉽고, 로직(예: 방이 비었을 때 삭제)이 누락되기 쉬웠습니다.

### 해결
handleLeaveRoom이라는 중앙 집중식 헬퍼(Helper) 함수를 구현했습니다. 이 함수는 다음의 모든 책임을 가집니다.

- rooms 객체에서 사용자 socket.id 제거

- Socket.IO의 socket.leave(roomName) 호출

- 방이 비었는지 확인 후, 비었으면 rooms 객체에서 방 자체를 삭제

- 방이 삭제되거나 인원수가 변경되었으므로, 로비에 있는 모든 유저에게 io.emit('room_list', ...)로 방 목록 업데이트 전송

- 방에 남아있는 유저들에게 io.to(roomName).emit('update_room_users', ...)로 방 사용자 목록 업데이트 전송

- 대기실 사용자 목록 업데이트(broadcastWaitingRoomUsers)

이 헬퍼 함수를 on('leave_room'), on('disconnect'), handleJoinRoom(방 전환 시)에서 일관되게 호출하여 상태 동기화 문제를 해결했습니다.
