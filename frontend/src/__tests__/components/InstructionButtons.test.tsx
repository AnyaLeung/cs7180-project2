import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstructionButtons, createInstructionButtonsElement } from '../../components/InstructionButtons';

describe('InstructionButtons (React component)', () => {
  it('renders three action buttons', () => {
    render(<InstructionButtons onAction={vi.fn()} loading={false} />);
    expect(screen.getByText(/Write Code/)).toBeInTheDocument();
    expect(screen.getByText(/Detail Plan/)).toBeInTheDocument();
    expect(screen.getByText(/Alternative/)).toBeInTheDocument();
  });

  it('calls onAction with correct action type', () => {
    const onAction = vi.fn();
    render(<InstructionButtons onAction={onAction} loading={false} />);
    fireEvent.click(screen.getByText(/Write Code/));
    expect(onAction).toHaveBeenCalledWith('write-code');
    fireEvent.click(screen.getByText(/Detail Plan/));
    expect(onAction).toHaveBeenCalledWith('detail-plan');
    fireEvent.click(screen.getByText(/Alternative/));
    expect(onAction).toHaveBeenCalledWith('alternative-plan');
  });

  it('disables buttons when loading', () => {
    render(<InstructionButtons onAction={vi.fn()} loading={true} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});

describe('createInstructionButtonsElement (DOM)', () => {
  it('creates a DOM element with three buttons', () => {
    const onAction = vi.fn();
    const el = createInstructionButtonsElement(onAction, false);
    expect(el.querySelectorAll('button')).toHaveLength(3);
  });

  it('buttons are disabled when loading', () => {
    const el = createInstructionButtonsElement(vi.fn(), true);
    const buttons = el.querySelectorAll('button');
    buttons.forEach((btn) => expect(btn.disabled).toBe(true));
  });
});
