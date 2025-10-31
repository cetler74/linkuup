/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../utils/test-utils";
import { Header } from "../../components/common/Header";

describe("Header", () => {
  it("renders the header component", () => {
    render(<Header />);
    
    // Check if header is rendered
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
  });

  it("contains navigation elements", () => {
    render(<Header />);
    
    // Check for common navigation elements
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  it("is accessible", () => {
    render(<Header />);
    
    // Check for proper ARIA roles
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
  });
});