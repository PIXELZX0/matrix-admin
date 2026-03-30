import polyglotI18nProvider from "ra-i18n-polyglot";

import { QueryClient } from "@tanstack/react-query";
import { Admin, Authenticated, CustomRoutes, Resource, reactRouterProvider } from "react-admin";
import { Route as ReactRouterDomRoute } from "react-router-dom";

import { ImportFeature } from "./components/ImportFeature";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import englishMessages from "./i18n/en";
import destinations from "./resources/destinations";
import registrationTokens from "./resources/registration_tokens";
import reports from "./resources/reports";
import roomDirectory from "./resources/room_directory";
import rooms from "./resources/rooms";
import userMediaStats from "./resources/user_media_statistics";
import users from "./resources/users";
import authProvider from "./synapse/authProvider";
import dataProvider from "./synapse/dataProvider";

const Route = import.meta.env.MODE === "test" ? reactRouterProvider.Route : ReactRouterDomRoute;
const queryClient = new QueryClient();

const i18nProvider = polyglotI18nProvider(() => englishMessages, "en", [{ locale: "en", name: "English" }]);

const App = () => (
  <Admin
    authProvider={authProvider}
    dashboard={DashboardPage}
    dataProvider={dataProvider}
    disableTelemetry
    i18nProvider={i18nProvider}
    loginPage={LoginPage}
    queryClient={queryClient}
    requireAuth
  >
    <CustomRoutes>
      <Route
        element={
          <Authenticated>
            <ImportFeature />
          </Authenticated>
        }
        path="/import_users"
      />
    </CustomRoutes>
    <Resource {...users} />
    <Resource {...rooms} />
    <Resource {...userMediaStats} />
    <Resource {...reports} />
    <Resource {...roomDirectory} />
    <Resource {...destinations} />
    <Resource {...registrationTokens} />
    <Resource name="connections" />
    <Resource name="devices" />
    <Resource name="room_members" />
    <Resource name="users_media" />
    <Resource name="joined_rooms" />
    <Resource name="pushers" />
    <Resource name="servernotices" />
    <Resource name="forward_extremities" />
    <Resource name="room_state" />
    <Resource name="destination_rooms" />
    <Resource name="protect_media" />
    <Resource name="quarantine_media" />
  </Admin>
);

export default App;
