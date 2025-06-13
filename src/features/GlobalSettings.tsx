import { Box, Typography, Paper } from '@mui/material';

export default function GlobalSettings() {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Global Settings
            </Typography>
            <Paper sx={{ p: 3, mt: 2 }}>
                <Typography variant="body1" color="text.secondary">
                    System-wide YARN scheduler configuration settings will be managed here.
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Features to include:
                </Typography>
                <ul>
                    <li>Legacy mode toggle (prominent)</li>
                    <li>Categorized settings</li>
                    <li>Queue mappings UI</li>
                    <li>Custom properties section</li>
                </ul>
            </Paper>
        </Box>
    );
}
