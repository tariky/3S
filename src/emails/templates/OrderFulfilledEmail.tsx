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

interface PaymentInfo {
	isCashOnDelivery: boolean;
	total: number;
	paymentMethod?: string;
}

interface PickupLocation {
	address?: string;
	mapsUrl?: string;
}

interface ButtonColors {
	bgColor: string;
	textColor: string;
}

interface OrderFulfilledEmailProps {
	order: {
		id: string;
		orderNumber: string;
		items: OrderItem[];
		subtotal: number;
		shipping: number;
		discount: number;
		total: number;
	};
	trackingNumber?: string;
	shippingCompany?: string;
	trackingUrl?: string;
	payment?: PaymentInfo;
	isLocalPickup?: boolean;
	pickupLocation?: PickupLocation;
	customerName: string;
	shopName: string;
	shopLogo?: string;
	shopUrl: string;
	buttonColors?: ButtonColors;
}

export function OrderFulfilledEmail({
	order,
	trackingNumber,
	shippingCompany,
	trackingUrl,
	payment,
	isLocalPickup,
	pickupLocation,
	customerName,
	shopName,
	shopLogo,
	shopUrl,
	buttonColors,
}: OrderFulfilledEmailProps) {
	const previewText = isLocalPickup
		? `Vaša narudžba #${order.orderNumber} je spremna za preuzimanje!`
		: `Vaša narudžba #${order.orderNumber} je poslana!`;

	const formatPrice = (price: number) => {
		return `${price.toFixed(2)} KM`;
	};

	return (
		<EmailLayout preview={previewText}>
			<EmailHeader shopName={shopName} shopLogo={shopLogo} />

			<Section className="px-8 py-8">
				<Section className="mb-6 rounded-lg bg-blue-50 px-4 py-3 text-center">
					<Text className="m-0 text-2xl">{isLocalPickup ? "🏪" : "📦"}</Text>
					<Text className="m-0 mt-1 text-sm font-medium text-blue-700">
						Narudžba #<strong>{order.orderNumber}</strong>
					</Text>
				</Section>

				{isLocalPickup ? (
					<>
						<Heading className="m-0 text-2xl font-bold text-slate-900">
							Vaša narudžba je spremna za preuzimanje!
						</Heading>

						<Text className="mt-4 text-base leading-relaxed text-slate-600">
							Pozdrav {customerName}, imamo sjajne vijesti! Vaša narudžba je spremna
							i možete je preuzeti u našoj poslovnici.
						</Text>

						<Section className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
							<Text className="m-0 text-base font-semibold text-emerald-800">
								🏪 Informacije o preuzimanju
							</Text>
							<Text className="m-0 mt-3 text-sm text-slate-600">
								Vaša narudžba je spremna i čeka Vas. Molimo Vas da prilikom preuzimanja
								navedete broj narudžbe:
							</Text>
							<Text className="m-0 mt-2 font-mono text-lg font-bold text-slate-900">
								#{order.orderNumber}
							</Text>

							{pickupLocation?.address && (
								<>
									<Text className="m-0 mt-4 text-sm text-slate-600">
										Adresa za preuzimanje:
									</Text>
									<Text className="m-0 mt-1 text-base font-semibold text-slate-900">
										📍 {pickupLocation.address}
									</Text>
								</>
							)}

							{pickupLocation?.mapsUrl && (
								<Section className="mt-4">
									<EmailButton
										href={pickupLocation.mapsUrl}
										bgColor={buttonColors?.bgColor}
										textColor={buttonColors?.textColor}
									>
										📍 Otvori u Google Maps
									</EmailButton>
								</Section>
							)}

							<Text className="m-0 mt-4 text-sm text-slate-500">
								Narudžbu možete preuzeti tokom radnog vremena. Za dodatne informacije
								kontaktirajte nas.
							</Text>
						</Section>
					</>
				) : (
					<>
						<Heading className="m-0 text-2xl font-bold text-slate-900">
							Vaša narudžba je na putu!
						</Heading>

						<Text className="mt-4 text-base leading-relaxed text-slate-600">
							Pozdrav {customerName}, imamo sjajne vijesti! Vaša narudžba je poslana
							i uskoro će stići na vašu adresu.
						</Text>

						{(trackingNumber || shippingCompany) && (
							<Section className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
								<Text className="m-0 text-base font-semibold text-emerald-800">
									🚚 Informacije o dostavi
								</Text>

								{shippingCompany && (
									<>
										<Text className="m-0 mt-3 text-sm text-slate-600">
											Kurirska služba:
										</Text>
										<Text className="m-0 mt-1 text-base font-semibold text-slate-900">
											{shippingCompany}
										</Text>
									</>
								)}

								{trackingNumber && (
									<>
										<Text className="m-0 mt-3 text-sm text-slate-600">
											Broj za praćenje pošiljke:
										</Text>
										<Text className="m-0 mt-1 font-mono text-lg font-bold text-slate-900">
											{trackingNumber}
										</Text>
										<Text className="m-0 mt-2 text-sm text-slate-500">
											Koristite ovaj broj na web stranici {shippingCompany ? `kurirske službe ${shippingCompany}` : "kurirske službe"} kako biste pratili vašu pošiljku u realnom vremenu.
										</Text>
									</>
								)}

								{trackingUrl && (
									<Section className="mt-4">
										<EmailButton
											href={trackingUrl}
											bgColor={buttonColors?.bgColor}
											textColor={buttonColors?.textColor}
										>
											Prati pošiljku
										</EmailButton>
									</Section>
								)}
							</Section>
						)}
					</>
				)}

				{payment?.isCashOnDelivery && (
					<Section className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
						<Text className="m-0 text-base font-semibold text-amber-800">
							💰 {isLocalPickup ? "Plaćanje prilikom preuzimanja" : "Plaćanje pouzećem"}
						</Text>
						<Text className="m-0 mt-3 text-sm text-slate-600">
							Iznos za plaćanje{isLocalPickup ? " prilikom preuzimanja" : " kuriru"}:
						</Text>
						<Text className="m-0 mt-1 text-2xl font-bold text-slate-900">
							{payment.total.toFixed(2)} KM
						</Text>
						<Text className="m-0 mt-3 text-sm text-slate-500">
							{isLocalPickup
								? "Molimo Vas da pripremite tačan iznos za plaćanje prilikom preuzimanja narudžbe."
								: "Molimo Vas da pripremite tačan iznos za kurira prilikom preuzimanja pošiljke."}
						</Text>
					</Section>
				)}

				<Hr className="my-6 border-slate-200" />

				<Heading as="h2" className="m-0 mb-4 text-lg font-semibold text-slate-900">
					{isLocalPickup ? "Stavke za preuzimanje" : "Poslane stavke"}
				</Heading>

				<Section>
					{order.items.map((item, index) => (
						<OrderItemRow key={index} item={item} />
					))}
				</Section>

				<Hr className="my-6 border-slate-200" />

				{/* Order Totals */}
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
							Ukupno za plaćanje
						</Column>
						<Column className="text-right text-lg font-bold text-slate-900">
							{formatPrice(order.total)}
						</Column>
					</Row>
				</Section>

				<Section className="mt-8 text-center">
					<EmailButton
						href={`${shopUrl}/account/orders/${order.id}`}
						bgColor={buttonColors?.bgColor}
						textColor={buttonColors?.textColor}
					>
						Pogledaj narudžbu
					</EmailButton>
				</Section>

				<Text className="mt-8 text-sm text-slate-500">
					{isLocalPickup
						? "Ako imate bilo kakvih pitanja o vašoj narudžbi, slobodno nas kontaktirajte."
						: "Očekivano vrijeme dostave je 2-5 radnih dana. Ako imate bilo kakvih pitanja o vašoj narudžbi, slobodno nas kontaktirajte."}
				</Text>
			</Section>

			<EmailFooter shopName={shopName} />
		</EmailLayout>
	);
}

export default OrderFulfilledEmail;
