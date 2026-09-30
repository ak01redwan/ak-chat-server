import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal', () => {
  it('focuses the cancel button and describes the action', () => {
    render(
      <ConfirmationModal
        title="Delete this message?"
        body="This cannot be undone."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Delete this message?' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('This cannot be undone.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('confirms the destructive action', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    render(
      <ConfirmationModal
        title="Delete this message?"
        body="This cannot be undone."
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels on button click, overlay click and Escape', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    const { unmount } = render(
      <ConfirmationModal title="Delete?" body="body" onConfirm={jest.fn()} onCancel={onCancel} />
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    unmount();

    const overlayCancel = jest.fn();
    const { unmount: unmountOverlay } = render(
      <ConfirmationModal
        title="Delete?"
        body="body"
        onConfirm={jest.fn()}
        onCancel={overlayCancel}
      />
    );
    await user.click(screen.getByRole('presentation'));
    expect(overlayCancel).toHaveBeenCalledTimes(1);
    unmountOverlay();

    const escapeCancel = jest.fn();
    render(
      <ConfirmationModal
        title="Delete?"
        body="body"
        onConfirm={jest.fn()}
        onCancel={escapeCancel}
      />
    );
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(escapeCancel).toHaveBeenCalledTimes(1);
  });
});
