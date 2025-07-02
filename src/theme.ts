import { createTheme } from '@mui/material/styles';

export const createAppTheme = () => createTheme({
    cssVariables: true,
    colorSchemes: {
        light: {
            palette: {
                primary: {
                    main: '#1976d2',
                    light: '#42a5f5',
                    dark: '#1565c0',
                    contrastText: '#ffffff',
                },
                secondary: {
                    main: '#dc004e',
                    light: '#e91e63',
                    dark: '#ad1457',
                    contrastText: '#ffffff',
                },
                background: {
                    default: '#f5f5f5',
                    paper: '#ffffff',
                },
                success: {
                    main: '#2e7d32',
                    light: '#4caf50',
                    dark: '#1b5e20',
                    contrastText: '#ffffff',
                },
                warning: {
                    main: '#ed6c02',
                    light: '#ff9800',
                    dark: '#e65100',
                    contrastText: '#ffffff',
                },
                error: {
                    main: '#d32f2f',
                    light: '#f44336',
                    dark: '#c62828',
                    contrastText: '#ffffff',
                },
                info: {
                    main: '#0288d1',
                    light: '#03a9f4',
                    dark: '#01579b',
                    contrastText: '#ffffff',
                },
            },
        },
        dark: {
            palette: {
                primary: {
                    main: '#42a5f5',
                    light: '#64b5f6',
                    dark: '#1976d2',
                    contrastText: '#ffffff',
                },
                secondary: {
                    main: '#e91e63',
                    light: '#f06292',
                    dark: '#c2185b',
                    contrastText: '#ffffff',
                },
                background: {
                    default: '#121212',
                    paper: '#1e1e1e',
                },
                success: {
                    main: '#4caf50',
                    light: '#66bb6a',
                    dark: '#2e7d32',
                    contrastText: '#ffffff',
                },
                warning: {
                    main: '#ff9800',
                    light: '#ffb74d',
                    dark: '#ed6c02',
                    contrastText: '#ffffff',
                },
                error: {
                    main: '#f44336',
                    light: '#ef5350',
                    dark: '#c62828',
                    contrastText: '#ffffff',
                },
                info: {
                    main: '#03a9f4',
                    light: '#29b6f6',
                    dark: '#0288d1',
                    contrastText: '#ffffff',
                },
            },
        },
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
        h1: {
            fontWeight: 600,
            fontSize: '2.5rem',
            lineHeight: 1.2,
        },
        h2: {
            fontWeight: 600,
            fontSize: '2rem',
            lineHeight: 1.3,
        },
        h3: {
            fontWeight: 600,
            fontSize: '1.75rem',
            lineHeight: 1.3,
        },
        h4: {
            fontWeight: 600,
            fontSize: '1.5rem',
            lineHeight: 1.4,
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.25rem',
            lineHeight: 1.4,
        },
        h6: {
            fontWeight: 600,
            fontSize: '1.125rem',
            lineHeight: 1.4,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.43,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    spacing: 8,
    breakpoints: {
        values: {
            xs: 0,
            sm: 600,
            md: 960,
            lg: 1280,
            xl: 1920,
        },
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(8px)',
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: 48,
                    '& .MuiTabs-indicator': {
                        borderRadius: '2px 2px 0 0',
                    },
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 48,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    },
                    '&.Mui-selected': {
                        fontWeight: 600,
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
                    borderRadius: 8,
                },
                elevation1: {
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
                },
                elevation4: {
                    boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 500,
                    padding: '8px 16px',
                },
                contained: {
                    boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
                    '&:hover': {
                        boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
                    },
                },
                outlined: {
                    borderWidth: '1.5px',
                    '&:hover': {
                        borderWidth: '1.5px',
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRadius: '8px 0 0 8px',
                    boxShadow: '0px 8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 6px 30px 5px rgba(0,0,0,0.12)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(25, 118, 210, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderWidth: '2px',
                        },
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontWeight: 500,
                },
                outlined: {
                    borderWidth: '1.5px',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
                },
            },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&.Mui-selected': {
                        fontWeight: 600,
                    },
                },
            },
        },
    },
});

// Create the app theme with CSS variables and color schemes enabled
export const theme = createAppTheme();
