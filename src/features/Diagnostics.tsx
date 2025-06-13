import { Box, Typography, Paper } from '@mui/material';

export default function Diagnostics() {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Diagnostics
            </Typography>
            <Paper sx={{ p: 3, mt: 2 }}>
                <Typography variant="body1" color="text.secondary">
                    Activity logging, performance monitoring, and diagnostic tools will be available here.
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Features to include:
                </Typography>
                <ul>
                    <li>Activity log viewer</li>
                    <li>API call history</li>
                    <li>Performance metrics</li>
                    <li>Export tools</li>
                </ul>
            </Paper>
        </Box>
    );
}
