import { Column, Img, Row, Text } from "@react-email/components";

interface OrderItemRowProps {
	item: {
		name: string;
		image?: string;
		quantity: number;
		price: number;
		variant?: string;
	};
}

export function OrderItemRow({ item }: OrderItemRowProps) {
	const formatPrice = (price: number) => {
		return `${price.toFixed(2)} KM`;
	};

	return (
		<Row className="border-b border-slate-100 py-3">
			<Column className="w-[60px] pr-4">
				{item.image ? (
					<Img
						src={item.image}
						alt={item.name}
						width="60"
						height="60"
						className="rounded-lg"
						style={{ objectFit: "cover" }}
					/>
				) : (
					<div
						className="rounded-lg bg-slate-200"
						style={{ width: 60, height: 60 }}
					/>
				)}
			</Column>
			<Column className="align-middle">
				<Text className="m-0 text-sm font-medium text-slate-900">
					{item.name}
				</Text>
				{item.variant && (
					<Text className="m-0 mt-1 text-xs text-slate-500">{item.variant}</Text>
				)}
				<Text className="m-0 mt-1 text-xs text-slate-500">
					Količina: {item.quantity}
				</Text>
			</Column>
			<Column className="w-[100px] text-right align-middle">
				<Text className="m-0 text-sm font-semibold text-slate-900">
					{formatPrice(item.price * item.quantity)}
				</Text>
			</Column>
		</Row>
	);
}
