import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavLink } from "@/components/NavLink";

const renderNavLink = (to: string, path: string, props?: object) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavLink
        to={to}
        className="base"
        activeClassName="active"
        pendingClassName="pending"
        {...props}
      >
        Link Text
      </NavLink>
    </MemoryRouter>,
  );

describe("NavLink", () => {
  it("renders an anchor with base className", () => {
    renderNavLink("/home", "/about");
    const link = screen.getByText("Link Text");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveClass("base");
  });

  it("applies activeClassName when route matches", () => {
    renderNavLink("/home", "/home");
    const link = screen.getByText("Link Text");
    expect(link).toHaveClass("active");
  });

  it("does not apply activeClassName when route does not match", () => {
    renderNavLink("/home", "/about");
    const link = screen.getByText("Link Text");
    expect(link).not.toHaveClass("active");
  });

  it("renders children", () => {
    renderNavLink("/", "/");
    expect(screen.getByText("Link Text")).toBeInTheDocument();
  });
});
