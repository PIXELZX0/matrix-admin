import App from "./App";
import { AppContext } from "./AppContext";

export const Bootstrap = () => (
  <AppContext.Provider value={{ restrictBaseUrl: undefined }}>
    <App />
  </AppContext.Provider>
);
