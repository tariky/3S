import * as React from "react";

export interface Toast {
	id: string;
	title?: string;
	description?: string;
	variant?: "default" | "destructive";
}

const ToastContext = React.createContext<{
	toasts: Toast[];
	addToast: (toast: Omit<Toast, "id">) => void;
}>({
	toasts: [],
	addToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = React.useState<Toast[]>([]);

	const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
		const id = Math.random().toString(36).substring(2, 9);
		setToasts((prev) => [...prev, { ...toast, id }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 5000);
	}, []);

	return (
		<ToastContext.Provider value={{ toasts, addToast }}>
			{children}
			<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`rounded-lg border p-4 shadow-lg ${
							toast.variant === "destructive"
								? "bg-red-50 border-red-200 text-red-900"
								: "bg-white border-gray-200 text-gray-900"
						}`}
					>
						{toast.title && <div className="font-semibold">{toast.title}</div>}
						{toast.description && <div className="text-sm">{toast.description}</div>}
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = React.useContext(ToastContext);
	if (!context) {
		return {
			toasts: [],
			toast: (options: Omit<Toast, "id">) => {
				console.log("Toast:", options);
			},
		};
	}
	return {
		toasts: context.toasts,
		toast: context.addToast,
	};
}

