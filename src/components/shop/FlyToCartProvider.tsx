"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { ProxyImage } from "@/components/ui/proxy-image";

interface FlyingItem {
	id: string;
	imageUrl: string;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	color: "white" | "red";
}

interface FlyToCartContextType {
	cartRef: React.RefObject<HTMLButtonElement | null>;
	wishlistRef: React.RefObject<HTMLButtonElement | null>;
	triggerFly: (imageUrl: string, startElement: HTMLElement) => void;
	triggerFlyToWishlist: (imageUrl: string, startElement: HTMLElement) => void;
	triggerCartBounce: () => void;
	triggerWishlistBounce: () => void;
	isCartBouncing: boolean;
	isWishlistBouncing: boolean;
}

const FlyToCartContext = createContext<FlyToCartContextType | null>(null);

export function useFlyToCart() {
	const context = useContext(FlyToCartContext);
	if (!context) {
		throw new Error("useFlyToCart must be used within FlyToCartProvider");
	}
	return context;
}

// Safe version that returns null if not in provider
export function useFlyToCartSafe() {
	return useContext(FlyToCartContext);
}

export function FlyToCartProvider({ children }: { children: React.ReactNode }) {
	const cartRef = useRef<HTMLButtonElement | null>(null);
	const wishlistRef = useRef<HTMLButtonElement | null>(null);
	const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
	const [isCartBouncing, setIsCartBouncing] = useState(false);
	const [isWishlistBouncing, setIsWishlistBouncing] = useState(false);

	const triggerCartBounce = useCallback(() => {
		setIsCartBouncing(true);
		setTimeout(() => setIsCartBouncing(false), 300);
	}, []);

	const triggerWishlistBounce = useCallback(() => {
		setIsWishlistBouncing(true);
		setTimeout(() => setIsWishlistBouncing(false), 300);
	}, []);

	const triggerFly = useCallback((imageUrl: string, startElement: HTMLElement) => {
		if (!cartRef.current) {
			return;
		}

		const startRect = startElement.getBoundingClientRect();
		const endRect = cartRef.current.getBoundingClientRect();

		const id = `fly-${Date.now()}`;
		const newItem: FlyingItem = {
			id,
			imageUrl,
			startX: startRect.left + startRect.width / 2,
			startY: startRect.top + startRect.height / 2,
			endX: endRect.left + endRect.width / 2,
			endY: endRect.top + endRect.height / 2,
			color: "white",
		};

		setFlyingItems((prev) => [...prev, newItem]);

		// Trigger bounce when item is about to reach cart
		setTimeout(() => {
			triggerCartBounce();
		}, 500);

		// Remove flying item after animation completes
		setTimeout(() => {
			setFlyingItems((prev) => prev.filter((item) => item.id !== id));
		}, 750);
	}, [triggerCartBounce]);

	const triggerFlyToWishlist = useCallback((imageUrl: string, startElement: HTMLElement) => {
		if (!wishlistRef.current) return;

		const startRect = startElement.getBoundingClientRect();
		const endRect = wishlistRef.current.getBoundingClientRect();

		const id = `fly-wishlist-${Date.now()}`;
		const newItem: FlyingItem = {
			id,
			imageUrl,
			startX: startRect.left + startRect.width / 2,
			startY: startRect.top + startRect.height / 2,
			endX: endRect.left + endRect.width / 2,
			endY: endRect.top + endRect.height / 2,
			color: "red",
		};

		setFlyingItems((prev) => [...prev, newItem]);

		// Trigger bounce when item is about to reach wishlist
		setTimeout(() => {
			triggerWishlistBounce();
		}, 500);

		// Remove flying item after animation completes
		setTimeout(() => {
			setFlyingItems((prev) => prev.filter((item) => item.id !== id));
		}, 750);
	}, [triggerWishlistBounce]);

	return (
		<FlyToCartContext.Provider value={{
			cartRef,
			wishlistRef,
			triggerFly,
			triggerFlyToWishlist,
			triggerCartBounce,
			triggerWishlistBounce,
			isCartBouncing,
			isWishlistBouncing
		}}>
			{children}

			{/* Flying items container */}
			{flyingItems.map((item) => (
				<FlyingImage key={item.id} item={item} />
			))}
		</FlyToCartContext.Provider>
	);
}

function FlyingImage({ item }: { item: FlyingItem }) {
	const [isAnimating, setIsAnimating] = useState(false);

	React.useEffect(() => {
		// Start animation after a small delay to ensure initial position is set
		const timer = setTimeout(() => {
			setIsAnimating(true);
		}, 50);
		return () => clearTimeout(timer);
	}, []);

	const deltaX = item.endX - item.startX;
	const deltaY = item.endY - item.startY;

	const isRed = item.color === "red";
	const haloColor = isRed
		? "rgba(239, 68, 68, 1)" // red-500
		: "rgba(255, 255, 255, 1)";
	const haloColorMid = isRed
		? "rgba(239, 68, 68, 0.6)"
		: "rgba(255, 255, 255, 0.6)";
	const ringColor = isRed ? "ring-red-500" : "ring-white";

	return (
		<div
			className="fixed pointer-events-none z-[9999]"
			style={{
				left: item.startX,
				top: item.startY,
				transform: `translate(-50%, -50%)`,
			}}
		>
			<div
				className="relative"
				style={{
					transform: isAnimating
						? `translate(${deltaX}px, ${deltaY}px) scale(0.15) rotate(360deg)`
						: "translate(0, 0) scale(1) rotate(0deg)",
					opacity: isAnimating ? 0.2 : 1,
					transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				{/* Outer halo glow */}
				<div
					className="absolute -inset-6 rounded-full"
					style={{
						background: `radial-gradient(circle, ${haloColor} 0%, ${haloColorMid} 30%, transparent 70%)`,
						filter: "blur(10px)",
					}}
				/>
				{/* Inner halo glow */}
				<div
					className="absolute -inset-3 rounded-full"
					style={{
						background: `radial-gradient(circle, ${haloColor} 0%, ${haloColorMid} 50%, transparent 100%)`,
						filter: "blur(6px)",
					}}
				/>
				<div className="relative overflow-hidden rounded-full">
					<ProxyImage
						src={item.imageUrl}
						alt=""
						width={80}
						height={80}
						resizingType="fill"
						className={`w-20 h-20 object-cover rounded-full shadow-2xl ring-4 ${ringColor}`}
					/>
				</div>
			</div>
		</div>
	);
}
