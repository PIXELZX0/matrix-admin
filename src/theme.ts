import { alpha, createTheme } from "@mui/material/styles";

export const modernBlackTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      contrastText: "#0a0a0a",
      main: "#f5f5f5",
    },
    secondary: {
      main: "#b9b9b9",
    },
    background: {
      default: "#050505",
      paper: "#0f0f0f",
    },
    divider: alpha("#ffffff", 0.14),
    error: {
      main: "#ff7b7b",
    },
    info: {
      main: "#8db9ff",
    },
    success: {
      main: "#77d28b",
    },
    text: {
      disabled: "#6d6d6d",
      primary: "#f5f5f5",
      secondary: "#a6a6a6",
    },
    warning: {
      main: "#ffd27a",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
    button: {
      fontWeight: 600,
      letterSpacing: "0.01em",
      textTransform: "none",
    },
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.015em",
    },
    subtitle1: {
      letterSpacing: "0.01em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#050505",
          backgroundImage:
            "radial-gradient(circle at 12% 0%, rgba(255,255,255,0.16), transparent 33%), radial-gradient(circle at 92% 8%, rgba(255,255,255,0.1), transparent 30%)",
          color: "#f5f5f5",
          minHeight: "100vh",
        },
        "#root": {
          minHeight: "100vh",
        },
        ".RaLayout-appFrame, .RaLayout-content": {
          background: "transparent",
        },
        ".RaMenuItemLink-active": {
          backgroundColor: "rgba(255,255,255,0.12)",
          borderRadius: "10px",
        },
        ".RaMenuItemLink-root": {
          borderRadius: "10px",
          marginBottom: "0.2rem",
        },
        ".RaSidebar-drawerPaper": {
          backdropFilter: "blur(8px)",
        },
        "::selection": {
          backgroundColor: alpha("#ffffff", 0.24),
          color: "#ffffff",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(14px)",
          background: "rgba(8, 8, 8, 0.8)",
          borderBottom: `1px solid ${alpha("#ffffff", 0.14)}`,
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#d7d7d7",
          },
          backgroundColor: "#f5f5f5",
          color: "#0a0a0a",
        },
        outlined: {
          borderColor: alpha("#ffffff", 0.28),
          "&:hover": {
            borderColor: alpha("#ffffff", 0.5),
          },
        },
        root: {
          borderRadius: 10,
          minHeight: 40,
          paddingInline: "1rem",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
          border: `1px solid ${alpha("#ffffff", 0.14)}`,
          boxShadow: "0 22px 38px rgba(0, 0, 0, 0.4)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#090909",
          borderRight: `1px solid ${alpha("#ffffff", 0.14)}`,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: alpha("#ffffff", 0.03),
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: alpha("#ffffff", 0.24),
        },
        root: {
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#ffffff", 0.45),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#ffffff",
          },
          borderRadius: 10,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        body: {
          borderColor: alpha("#ffffff", 0.1),
        },
        head: {
          backgroundColor: alpha("#ffffff", 0.03),
          borderColor: alpha("#ffffff", 0.1),
          fontWeight: 700,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 68,
        },
      },
    },
  },
});
