import { useEffect, useMemo, useState } from "react";

import LockIcon from "@mui/icons-material/Lock";
import { Avatar, Box, Button, Card, CardActions, CircularProgress, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Form,
  Notification,
  PasswordInput,
  TextInput,
  required,
  useLogin,
  useNotify,
  useTranslate,
} from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";

import type { DiscoveryResult } from "@shared/matrix";

import storage from "../storage";
import { discoverHomeserver, getWellKnownUrl, isValidBaseUrl, splitMxid } from "../synapse/synapse";

const FormBox = styled(Box)(({ theme }) => ({
  alignItems: "center",
  background: "url(/images/floating-cogs.svg)",
  backgroundColor: "#f9f9f9",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  minHeight: "calc(100vh - 1rem)",
  [`& .actions`]: {
    padding: "0 1rem 1rem 1rem",
  },
  [`& .avatar`]: {
    display: "flex",
    justifyContent: "center",
    margin: "1rem",
  },
  [`& .card`]: {
    marginBottom: "6rem",
    marginTop: "6rem",
    width: "32rem",
  },
  [`& .hint`]: {
    color: theme.palette.grey[600],
    display: "flex",
    justifyContent: "center",
    marginBottom: "1em",
    marginTop: "1em",
  },
  [`& .icon`]: {
    backgroundColor: theme.palette.grey[500],
  },
  [`& .meta`]: {
    color: theme.palette.grey[500],
    marginBottom: "0.5rem",
  },
  [`& .form`]: {
    padding: "0 1rem 1rem 1rem",
  },
}));

const preferredBaseUrlKey = "preferred_base_url";

const LoginMetadata = ({ onDiscovery }: { onDiscovery: (result: DiscoveryResult | null) => void }) => {
  const form = useFormContext();
  const translate = useTranslate();
  const username = useWatch({ control: form.control, name: "username" });
  const baseUrl = useWatch({ control: form.control, name: "base_url" });
  const [discoveryError, setDiscoveryError] = useState<string>("");

  useEffect(() => {
    let active = true;

    const runDiscovery = async () => {
      try {
        setDiscoveryError("");

        if (!isValidBaseUrl(baseUrl)) {
          onDiscovery(null);
          return;
        }

        const result = await discoverHomeserver({ baseUrl });
        if (active) {
          onDiscovery(result);
        }
      } catch (error) {
        if (active) {
          onDiscovery(null);
          setDiscoveryError(error instanceof Error ? error.message : "Failed to inspect homeserver.");
        }
      }
    };

    void runDiscovery();

    return () => {
      active = false;
    };
  }, [baseUrl, onDiscovery]);

  useEffect(() => {
    let active = true;

    const fillBaseUrlFromMxid = async () => {
      if (baseUrl) {
        return;
      }

      const domain = splitMxid(username)?.domain;
      if (!domain) {
        return;
      }

      try {
        const discoveredBaseUrl = await getWellKnownUrl(domain);
        if (active) {
          form.setValue("base_url", discoveredBaseUrl, { shouldTouch: true });
        }
      } catch {
        return;
      }
    };

    void fillBaseUrlFromMxid();

    return () => {
      active = false;
    };
  }, [baseUrl, form, username]);

  return (
    <>
      <TextInput autoFocus label="ra.auth.username" resettable source="username" validate={required()} />
      <PasswordInput label="ra.auth.password" resettable source="password" validate={required()} />
      <TextInput label="synapseadmin.auth.base_url" resettable source="base_url" validate={required()} />
      {discoveryError ? (
        <Typography className="meta" color="error">
          {discoveryError}
        </Typography>
      ) : null}
      {baseUrl && isValidBaseUrl(baseUrl) ? (
        <Typography className="meta">{translate("synapseadmin.auth.base_url")}: {baseUrl}</Typography>
      ) : null}
    </>
  );
};

const LoginPage = () => {
  const login = useLogin();
  const notify = useNotify();
  const translate = useTranslate();
  const [loading, setLoading] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const defaultValues = useMemo(
    () => ({
      base_url: storage.getItem(preferredBaseUrlKey) ?? "",
    }),
    []
  );

  const handleSubmit = (values: Record<string, string>) => {
    setLoading(true);
    storage.setItem(preferredBaseUrlKey, values.base_url ?? "");

    login({
      baseUrl: values.base_url ?? "",
      password: values.password ?? "",
      username: values.username ?? "",
    }).catch(error => {
      setLoading(false);
      notify(error instanceof Error ? error.message : "Login failed.", { type: "warning" });
    });
  };

  const handleSso = () => {
    if (!discovery?.baseUrl) {
      return;
    }

    storage.setItem(preferredBaseUrlKey, discovery.baseUrl);
    window.location.href = `/api/auth/sso/start?baseUrl=${encodeURIComponent(discovery.baseUrl)}`;
  };

  return (
    <Form defaultValues={defaultValues} mode="onTouched" onSubmit={handleSubmit}>
      <FormBox>
        <Card className="card">
          <Box className="avatar">
            {loading ? (
              <CircularProgress size={25} thickness={2} />
            ) : (
              <Avatar className="icon">
                <LockIcon />
              </Avatar>
            )}
          </Box>
          <Box className="hint">{translate("synapseadmin.auth.welcome")}</Box>
          <Box className="form">
            <LoginMetadata onDiscovery={setDiscovery} />
            <Typography className="meta">Server version: {discovery?.serverVersion ?? "-"}</Typography>
            <Typography className="meta">Matrix specs: {discovery?.matrixVersions.join(", ") || "-"}</Typography>
            <CardActions className="actions">
              <Button disabled={loading || discovery?.supportsPassword === false} fullWidth type="submit" variant="contained">
                {translate("ra.auth.sign_in")}
              </Button>
              <Button
                color="secondary"
                disabled={loading || !discovery?.supportsSso}
                fullWidth
                onClick={handleSso}
                variant="contained"
              >
                {translate("synapseadmin.auth.sso_sign_in")}
              </Button>
            </CardActions>
          </Box>
        </Card>
      </FormBox>
      <Notification />
    </Form>
  );
};

export default LoginPage;
