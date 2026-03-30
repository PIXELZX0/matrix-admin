import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardPage from "./DashboardPage";

vi.mock("../lib/api", () => ({
  apiRequest: vi.fn().mockResolvedValue({
    destinationCount: 12,
    failingDestinationCount: 2,
    matrixVersions: ["v1.11", "v1.12"],
    openReportCount: 3,
    roomCount: 24,
    serverVersion: "1.99.0",
    userCount: 42,
  }),
}));

vi.mock("react-admin", async () => {
  const actual = await vi.importActual<typeof import("react-admin")>("react-admin");

  return {
    ...actual,
    useTranslate: () => (key: string) => key,
  };
});

describe("DashboardPage", () => {
  it("renders the operational summary returned by the BFF", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("42")).toBeTruthy();
    });

    expect(screen.getByText(/1\.99\.0/)).toBeTruthy();
    expect(screen.getByText(/v1\.11, v1\.12/)).toBeTruthy();
  });
});
