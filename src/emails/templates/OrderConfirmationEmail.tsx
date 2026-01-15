import { Column, Heading, Hr, Row, Section, Text } from "@react-email/components";
import { EmailButton } from "../components/EmailButton";
import { EmailFooter } from "../components/EmailFooter";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";
import { OrderItemRow } from "../components/OrderItemRow";

interface OrderItem {
	name: string;
	image?: string;
	quantity: number;
	price: number;
	variant?: string;
}

interface Address {
	firstName: string;
	lastName: string;
	address: string;
	city: string;
	postalCode: string;
	country: string;
}

interface ButtonColors {
	bgColor: string;
	textColor: string;
}

interface OrderConfirmationEmailProps {
	order: {
		id: string;
		orderNumber: string;
		items: OrderItem[];
		subtotal: number;
		shipping: number;
		discount: number;
		total: number;
		shippingAddress: Address;
	};
	customerName: string;
	shopName: string;
	shopLogo?: string;
	shopUrl: string;
	buttonColors?: ButtonColors;
}

export function OrderConfirmationEmail({
	order,
	customerName,
	shopName,
	shopLogo,
	shopUrl,
	buttonColors,
}: OrderConfirmationEmailProps) {
	const formatPrice = (price: number) => {
		return `${price.toFixed(2)} KM`;
	};

	return (
		<EmailLayout preview={`Potvrda narudžbe #${order.orderNumber}`}>
			<EmailHeader shopName={shopName} shopLogo={shopLogo} />

			<Section className="px-8 py-8">
				<Section className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-center">
					<Text className="m-0 text-sm font-medium text-emerald-700">
						Narudžba #<strong>{order.orderNumber}</strong>
					</Text>
				</Section>

				<Heading className="m-0 text-2xl font-bold text-slate-900">
					Hvala na narudžbi!
				</Heading>

				<Text className="mt-4 text-base leading-relaxed text-slate-600">
					Pozdrav {customerName}, vaša narudžba je uspješno zaprimljena i uskoro
					će biti obrađena.
				</Text>

				<Hr className="my-6 border-slate-200" />

				<Heading as="h2" className="m-0 mb-4 text-lg font-semibold text-slate-900">
					Stavke narudžbe
				</Heading>

				<Section>
					{order.items.map((item, index) => (
						<OrderItemRow key={index} item={item} />
					))}
				</Section>

				<Hr className="my-6 border-slate-200" />

				<Section>
					<Row className="mb-2">
						<Column className="text-sm text-slate-600">Međuzbroj</Column>
						<Column className="text-right text-sm text-slate-900">
							{formatPrice(order.subtotal)}
						</Column>
					</Row>
					<Row className="mb-2">
						<Column className="text-sm text-slate-600">Dostava</Column>
						<Column className="text-right text-sm text-slate-900">
							{order.shipping === 0 ? "Besplatno" : formatPrice(order.shipping)}
						</Column>
					</Row>
					{order.discount > 0 && (
						<Row className="mb-2">
							<Column className="text-sm text-emerald-600">Popust</Column>
							<Column className="text-right text-sm text-emerald-600">
								-{formatPrice(order.discount)}
							</Column>
						</Row>
					)}
					<Hr className="my-2 border-slate-200" />
					<Row>
						<Column className="text-base font-semibold text-slate-900">
							Ukupno
						</Column>
						<Column className="text-right text-lg font-bold text-slate-900">
							{formatPrice(order.total)}
						</Column>
					</Row>
				</Section>

				<Hr className="my-6 border-slate-200" />

				<Heading as="h2" className="m-0 mb-4 text-lg font-semibold text-slate-900">
					Adresa dostave
				</Heading>

				<Text className="m-0 text-sm text-slate-600">
					{order.shippingAddress.firstName} {order.shippingAddress.lastName}
					<br />
					{order.shippingAddress.address}
					<br />
					{order.shippingAddress.postalCode} {order.shippingAddress.city}
					<br />
					{order.shippingAddress.country}
				</Text>

				<Section className="mt-8 text-center">
					<EmailButton
						href={`${shopUrl}/account/orders/${order.id}`}
						bgColor={buttonColors?.bgColor}
						textColor={buttonColors?.textColor}
					>
						Pogledaj narudžbu
					</EmailButton>
				</Section>
			</Section>

			<EmailFooter shopName={shopName} />
		</EmailLayout>
	);
}

export default OrderConfirmationEmail;
