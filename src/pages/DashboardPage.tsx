import { useEffect, useState } from "react";

import { Alert, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { useTranslate } from "react-admin";

import type { DashboardSummary } from "@shared/matrix";

import { ApiError, apiRequest } from "../lib/api";

const MetricCard = ({ label, value }: { label: string; value: number | string | undefined }) => (
  <Card>
    <CardContent>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, mt: 1 }} variant="h4">
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
    <Stack spacing={3} sx={{ p: 3 }}>
      <div>
        <Typography variant="h4">Matrix Homeserver Overview</Typography>
        <Typography color="text.secondary" variant="body1">
          Lightweight operational summary for the active Synapse session.
        </Typography>
      </div>
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
      <Card>
        <CardContent>
          <Typography gutterBottom variant="h6">
            Server details
          </Typography>
          <Typography variant="body2">Server version: {summary?.serverVersion ?? "-"}</Typography>
          <Typography sx={{ mt: 1 }} variant="body2">
            Matrix specs: {summary?.matrixVersions?.join(", ") || "-"}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default DashboardPage;
