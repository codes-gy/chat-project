// frontend/src/UserList.jsx
import React from 'react';

// [MUI] MUI 컴포넌트 import
import {
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import Box from "@mui/material/Box"; // 유저 아이콘

// [MUI] Paper: 둥근 모서리의 배경을 제공
function UserList({ title, users, currentUser }) {
    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="h3">
                    {title}
                </Typography>
                <Chip label={`${users.length} 명`} size="small" />
            </Box>
            <Divider />

            {/* [MUI] List: ul, ListItem: li 역할 */}
            <List dense sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                {users.map((user, index) => (
                    <ListItem key={index}>
                        <ListItemIcon>
                            <PersonIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary={user}
                            // [MUI] sx prop을 사용해 '나'를 강조
                            sx={{
                                color: user === currentUser ? 'primary.light' : 'text.primary',
                                fontWeight: user === currentUser ? 'bold' : 'normal'
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        </Paper>
    );
}

export default UserList;