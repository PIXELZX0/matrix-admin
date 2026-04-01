import { useEffect, useMemo, useState } from "react";

import LockIcon from "@mui/icons-material/Lock";
import { Avatar, Box, Button, Card, CircularProgress, Divider, Stack, Typography } from "@mui/material";
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

const LoginShell = styled(Box)(({ theme }) => ({
  alignItems: "center",
  display: "flex",
  justifyContent: "center",
  minHeight: "100vh",
  overflow: "hidden",
  padding: theme.spacing(2),
  position: "relative",
  width: "100%",
  "&::before": {
    background:
      "radial-gradient(circle at center, rgba(255,255,255,0.2), rgba(255,255,255,0) 68%)",
    content: '""',
    height: "26rem",
    left: "50%",
    pointerEvents: "none",
    position: "absolute",
    top: "-12rem",
    transform: "translateX(-50%)",
    width: "26rem",
  },
  "&::after": {
    background:
      "radial-gradient(circle at center, rgba(255,255,255,0.14), rgba(255,255,255,0) 70%)",
    bottom: "-10rem",
    content: '""',
    height: "20rem",
    pointerEvents: "none",
    position: "absolute",
    right: "-7rem",
    width: "20rem",
  },
}));

const LoginCard = styled(Card)(({ theme }) => ({
  "@keyframes loginCardRise": {
    from: {
      opacity: 0,
      transform: "translateY(18px) scale(0.98)",
    },
    to: {
      opacity: 1,
      transform: "translateY(0) scale(1)",
    },
  },
  animation: "loginCardRise 420ms ease-out",
  backdropFilter: "blur(14px)",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.45)",
  maxWidth: "30rem",
  width: "100%",
  zIndex: 1,
}));

const preferredBaseUrlKey = "preferred_base_url";
const inputSx = {
  mb: 1,
  "& .MuiInputBase-root": {
    transition: "all 140ms ease",
  },
};
const metaTextSx = {
  color: "text.secondary",
  fontSize: "0.83rem",
  lineHeight: 1.5,
};

const LoginMetadata = ({ onDiscovery }: { onDiscovery: (result: DiscoveryResult | null) => void }) => {
  const form = useFormContext();
  const translate = useTranslate();
  const userId = useWatch({ control: form.control, name: "user_id" });
  const baseUrl = useWatch({ control: form.control, name: "base_url" });
  const [discoveryError, setDiscoveryError] = useState<string>("");
  const validateBaseUrl = [
    required(),
    (value: unknown) => {
      if (typeof value !== "string" || value.length === 0) {
        return undefined;
      }

      return isValidBaseUrl(value) ? undefined : translate("synapseadmin.auth.url_error");
    },
  ];
  const validateUserId = [
    required(),
    (value: unknown) => {
      if (typeof value !== "string" || value.length === 0) {
        return undefined;
      }

      return splitMxid(value) ? undefined : translate("synapseadmin.auth.username_error");
    },
  ];

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

      const domain = splitMxid(userId)?.domain;
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
  }, [baseUrl, form, userId]);

  return (
    <>
      <TextInput
        autoComplete="url"
        autoFocus
        label="synapseadmin.auth.base_url"
        resettable
        source="base_url"
        sx={inputSx}
        validate={validateBaseUrl}
      />
      <TextInput
        autoComplete="username"
        label="synapseadmin.auth.user_id"
        resettable
        source="user_id"
        sx={inputSx}
        validate={validateUserId}
      />
      <PasswordInput
        autoComplete="current-password"
        label="ra.auth.password"
        resettable
        source="password"
        sx={inputSx}
        validate={required()}
      />
      {discoveryError ? (
        <Typography color="error" sx={metaTextSx}>
          {discoveryError}
        </Typography>
      ) : null}
      {baseUrl && isValidBaseUrl(baseUrl) ? (
        <Typography sx={metaTextSx}>
          {translate("synapseadmin.auth.base_url")}: {baseUrl}
        </Typography>
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
      username: values.user_id ?? "",
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
      <LoginShell>
        <LoginCard>
          <Box sx={{ p: { sm: 4, xs: 3 } }}>
            <Box sx={{ alignItems: "center", display: "flex", gap: 1.5, mb: 1.75 }}>
              <Avatar
                sx={{
                  bgcolor: "rgba(255,255,255,0.9)",
                  color: "black",
                  height: 42,
                  width: 42,
                }}
              >
                <LockIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="h5">Matrix Admin</Typography>
                <Typography color="text.secondary" variant="body2">
                  {translate("synapseadmin.auth.welcome")}
                </Typography>
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <CircularProgress size={24} thickness={3} />
              </Box>
            ) : null}

            <LoginMetadata onDiscovery={setDiscovery} />

            <Divider sx={{ my: 2 }} />

            <Stack spacing={0.35} sx={{ mb: 2 }}>
              <Typography sx={metaTextSx}>Server version: {discovery?.serverVersion ?? "-"}</Typography>
              <Typography sx={metaTextSx}>Matrix specs: {discovery?.matrixVersions.join(", ") || "-"}</Typography>
            </Stack>

            <Stack spacing={1.2}>
              <Button
                disabled={loading || discovery?.supportsPassword === false}
                fullWidth
                type="submit"
                variant="contained"
              >
                {translate("ra.auth.sign_in")}
              </Button>
              <Button
                disabled={loading || !discovery?.supportsSso}
                fullWidth
                onClick={handleSso}
                variant="outlined"
              >
                {translate("synapseadmin.auth.sso_sign_in")}
              </Button>
            </Stack>
          </Box>
        </LoginCard>
      </LoginShell>
      <Notification />
    </Form>
  );
};

export default LoginPage;
