'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

export function Toaster() {
  return (
    <ToastProvider>
      <ToastViewport>
        <Toast>
          <ToastTitle>Notification</ToastTitle>
          <ToastDescription>This is a notification</ToastDescription>
          <ToastClose />
        </Toast>
      </ToastViewport>
    </ToastProvider>
  );
}