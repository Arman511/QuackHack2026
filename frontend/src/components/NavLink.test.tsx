import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { NavLink as NavLinkComponent } from "./NavLink";

const renderNavLink = (props: React.ComponentProps<typeof NavLinkComponent>) =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <NavLinkComponent {...props} />
    </MemoryRouter>,
  );

describe("NavLink", () => {
  it("renders an anchor with the correct href", () => {
    renderNavLink({ to: "/goals", children: "Goals" });
    expect(screen.getByRole("link", { name: "Goals" })).toBeInTheDocument();
  });

  it("applies base className", () => {
    renderNavLink({ to: "/goals", className: "my-class", children: "Goals" });
    expect(screen.getByRole("link")).toHaveClass("my-class");
  });

  it("applies activeClassName when the route is active", () => {
    render(
      <MemoryRouter initialEntries={["/goals"]}>
        <NavLinkComponent to="/goals" activeClassName="active-link">
          Goals
        </NavLinkComponent>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveClass("active-link");
  });

  it("does not apply activeClassName when the route is not active", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NavLinkComponent to="/goals" activeClassName="active-link">
          Goals
        </NavLinkComponent>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).not.toHaveClass("active-link");
  });

  it("renders children correctly", () => {
    renderNavLink({ to: "/", children: <span>Home</span> });
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
