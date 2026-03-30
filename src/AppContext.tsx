import { createContext, useContext } from "react";

interface AppContextType {
  restrictBaseUrl?: string | string[];
}

export const AppContext = createContext<AppContextType>({});

export const useAppContext = () => useContext(AppContext);
