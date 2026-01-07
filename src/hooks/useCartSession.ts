import { useState, useEffect } from "react";

const CART_SESSION_KEY = "cart_session_id";

export function useCartSession() {
	const [sessionId, setSessionId] = useState<string | null>(null);

	useEffect(() => {
		// Get or create session ID from localStorage
		let storedSessionId = localStorage.getItem(CART_SESSION_KEY);

		if (!storedSessionId) {
			// Generate new session ID
			storedSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
			localStorage.setItem(CART_SESSION_KEY, storedSessionId);
		}

		setSessionId(storedSessionId);
	}, []);

	const clearSession = () => {
		localStorage.removeItem(CART_SESSION_KEY);
		setSessionId(null);
	};

	return { sessionId, clearSession };
}

