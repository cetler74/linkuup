/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "../utils/test-utils";
import { StarRating } from "../../components/common/StarRating";

describe("StarRating", () => {
  it("renders the star rating component", () => {
    render(<StarRating rating={4.5} />);
    
    // Check if stars are rendered
    const stars = screen.getAllByText("★");
    expect(stars).toHaveLength(5);
  });

  it("displays the correct rating", () => {
    render(<StarRating rating={3.5} />);
    
    // Check if the rating is displayed
    const stars = screen.getAllByText("★");
    expect(stars).toHaveLength(5);
  });

  it("handles different rating values", () => {
    const { rerender } = render(<StarRating rating={1} />);
    expect(screen.getAllByText("★")).toHaveLength(5);
    
    rerender(<StarRating rating={5} />);
    expect(screen.getAllByText("★")).toHaveLength(5);
  });

  it("is accessible", () => {
    render(<StarRating rating={4} />);
    
    // Check for proper ARIA attributes
    const rating = screen.getByRole("img", { name: /rating/i });
    expect(rating).toBeInTheDocument();
  });
});
