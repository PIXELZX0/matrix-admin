import { useEffect, useState } from "react";

import { Alert, Box, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslate } from "react-admin";

import type { DashboardSummary } from "@shared/matrix";

import { ApiError, apiRequest } from "../lib/api";

const MetricCard = ({ label, value }: { label: string; value: number | string | undefined }) => (
  <Card
    sx={{
      borderRadius: 3,
      height: "100%",
      overflow: "hidden",
      position: "relative",
      "&::after": {
        background: "linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0))",
        content: '""',
        height: "80%",
        pointerEvents: "none",
        position: "absolute",
        right: "-35%",
        top: "-35%",
        transform: "rotate(20deg)",
        width: "70%",
      },
    }}
  >
    <CardContent>
      <Typography
        color="text.secondary"
        sx={{
          fontSize: "0.76rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
        variant="body2"
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, mt: 1.5 }} variant="h4">
        {value ?? "-"}
      </Typography>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const translate = useTranslate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const result = await apiRequest<DashboardSummary>("/api/admin/dashboard");
        if (!cancelled) {
          setSummary(result);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof ApiError ? caughtError.message : "Failed to load dashboard.");
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack spacing={3} sx={{ p: { md: 3, xs: 2 } }}>
      <Card
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <CardContent sx={{ p: { md: 3.5, xs: 2.5 } }}>
          <Box
            sx={{
              backgroundColor: alpha("#ffffff", 0.08),
              border: `1px solid ${alpha("#ffffff", 0.16)}`,
              borderRadius: 999,
              display: "inline-flex",
              mb: 1.5,
              px: 1.2,
              py: 0.45,
            }}
          >
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Operational Snapshot
            </Typography>
          </Box>
          <Typography sx={{ mb: 0.8 }} variant="h4">
            Matrix Homeserver Overview
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Lightweight operational summary for the active Synapse session.
          </Typography>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard label={translate("resources.users.name", { smart_count: 2 })} value={summary?.userCount} />
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard label={translate("resources.rooms.name", { smart_count: 2 })} value={summary?.roomCount} />
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard label={translate("resources.reports.name", { smart_count: 2 })} value={summary?.openReportCount} />
        </Grid>
        <Grid size={{ md: 6, xs: 12 }}>
          <MetricCard
            label={translate("resources.destinations.name", { smart_count: 2 })}
            value={summary?.destinationCount}
          />
        </Grid>
        <Grid size={{ md: 6, xs: 12 }}>
          <MetricCard label="Failing federation destinations" value={summary?.failingDestinationCount} />
        </Grid>
      </Grid>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { md: 3, xs: 2.5 } }}>
          <Typography gutterBottom sx={{ letterSpacing: "0.02em" }} variant="h6">
            Server details
          </Typography>
          <Stack spacing={0.8}>
            <Typography variant="body2">Server version: {summary?.serverVersion ?? "-"}</Typography>
            <Typography variant="body2">Matrix specs: {summary?.matrixVersions?.join(", ") || "-"}</Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default DashboardPage;
