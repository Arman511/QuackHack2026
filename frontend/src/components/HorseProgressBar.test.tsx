import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import HorseProgressBar from "./HorseProgressBar";
import { AppProvider, useApp } from "@/context/AppContext";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

const renderAtStep = (step: number) => {
  const Wrapper = () => {
    const { setOnboardingStep } = useApp();
    React.useEffect(() => {
      setOnboardingStep(step);
    }, []);
    return <HorseProgressBar totalSteps={5} />;
  };
  return render(
    <AppProvider>
      <Wrapper />
    </AppProvider>,
  );
};

describe("HorseProgressBar", () => {
  it("renders the step counter text", () => {
    renderAtStep(1);
    expect(screen.getByText(/Step \d+ of 5/i)).toBeInTheDocument();
  });

  it("shows 'Step 2 of 5' at step 1", () => {
    renderAtStep(1);
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
  });

  it("shows 'Step 4 of 5' at step 3", () => {
    renderAtStep(3);
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
  });

  it("shows 'Step 5 of 5' at the final step", () => {
    renderAtStep(4);
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
  });

  it("renders the horse image", () => {
    renderAtStep(1);
    expect(screen.getByAltText("Horse")).toBeInTheDocument();
  });

  it("progress fill width increases with each step", () => {
    const { container: c1 } = renderAtStep(1);
    const width1 = parseFloat((c1.querySelector(".transition-all") as HTMLElement).style.width);

    const { container: c3 } = renderAtStep(3);
    const width3 = parseFloat((c3.querySelector(".transition-all") as HTMLElement).style.width);

    expect(width3).toBeGreaterThan(width1);
  });
});
