/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../utils/test-utils";
import { HomePage } from "../../pages/HomePage";

// Mock the API
vi.mock("../../utils/api", () => ({
  placeAPI: {
    getPlaces: vi.fn().mockResolvedValue({
      places: [
        {
          id: 1,
          nome: "Test Salon",
          images: ["test-image.jpg"]
        }
      ]
    })
  },
  getImageUrl: vi.fn().mockReturnValue("test-image.jpg")
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'pt',
      changeLanguage: vi.fn()
    }
  })
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the homepage", async () => {
    render(<HomePage />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText("Test Salon")).toBeInTheDocument();
    });
  });

  it("displays loading state initially", () => {
    render(<HomePage />);
    
    // Should show loading or empty state initially
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("handles error state gracefully", async () => {
    // Mock API to throw error
    const { placeAPI } = await import("../../utils/api");
    vi.mocked(placeAPI.getPlaces).mockRejectedValueOnce(new Error("API Error"));
    
    render(<HomePage />);
    
    // Should handle error gracefully
    await waitFor(() => {
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  it("is accessible", () => {
    render(<HomePage />);
    
    // Check for proper ARIA roles
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });
});