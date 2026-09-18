import { ToastOptions } from './types';
export interface NotificationSystem {
    notify(options: ToastOptions): string;
    dismiss(toastId: string): void;
    destroy(): void;
}
export declare function createNotificationSystem(rootEl: HTMLElement): NotificationSystem;
