import { Tabs, Tab, Box } from '@mui/material';

interface TabNavigationProps {
    activeTab: number;
    onTabChange: (tab: number) => void;
}

const TABS = [
    { label: 'Queues', id: 0 },
    { label: 'Global Settings', id: 1 },
    { label: 'Node Labels', id: 2 },
    { label: 'Diagnostics', id: 3 },
];

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        onTabChange(newValue);
    };

    return (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleChange} aria-label="navigation tabs">
                {TABS.map((tab) => (
                    <Tab key={tab.id} label={tab.label} id={`tab-${tab.id}`} aria-controls={`tabpanel-${tab.id}`} />
                ))}
            </Tabs>
        </Box>
    );
}
