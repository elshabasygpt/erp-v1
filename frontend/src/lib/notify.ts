import toast from 'react-hot-toast';

/**
 * Unified toast helper. Wraps react-hot-toast so the whole app uses one API with
 * consistent icons and four levels. `success`/`error` use the native styled
 * toasts (icon theme set globally in the root <Toaster>); `info`/`warning` are
 * added here since react-hot-toast has no native variant for them.
 *
 * Positioning, theming (token colors), and RTL direction are configured once on
 * the <Toaster> in the root layout — callers don't need to pass options.
 *
 * Usage: `import { notify } from '@/lib/notify'; notify.info('Saved as draft');`
 */
export const notify = {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    loading: (message: string) => toast.loading(message),
    info: (message: string) => toast(message, { icon: 'ℹ️' }),
    warning: (message: string) =>
        toast(message, {
            icon: '⚠️',
            style: { borderColor: 'rgba(245,158,11,0.4)' },
        }),
    /** Dismiss a specific toast (e.g. a loading toast) or all toasts. */
    dismiss: (id?: string) => toast.dismiss(id),
    /** Promise helper: shows loading → success/error automatically. */
    promise: <T>(
        promise: Promise<T>,
        msgs: { loading: string; success: string; error: string }
    ) => toast.promise(promise, msgs),
};

export default notify;
