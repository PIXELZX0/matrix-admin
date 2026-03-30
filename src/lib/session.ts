import type { SessionView } from "@shared/matrix";

let sessionState: SessionView = {
  authenticated: false,
};

export const getSessionState = () => sessionState;

export const setSessionState = (nextState: SessionView) => {
  sessionState = nextState;
  return sessionState;
};

export const clearSessionState = () => {
  sessionState = {
    authenticated: false,
  };
};

export const requireSessionState = () => {
  if (!sessionState.authenticated || !sessionState.baseUrl || !sessionState.homeServer) {
    throw new Error("Session is not ready.");
  }

  return sessionState;
};
