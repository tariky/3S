import { Column, Heading, Hr, Row, Section, Text } from "@react-email/components";
import { EmailButton } from "../components/EmailButton";
import { EmailFooter } from "../components/EmailFooter";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";
import { OrderItemRow } from "../components/OrderItemRow";

interface CartItem {
	name: string;
	image?: string;
	quantity: number;
	price: number;
	variant?: string;
}

interface ButtonColors {
	bgColor: string;
	textColor: string;
}

interface AbandonedCheckoutEmailProps {
	items: CartItem[];
	subtotal: number;
	customerName?: string;
	checkoutUrl?: string;
	shopName: string;
	shopLogo?: string;
	shopUrl: string;
	buttonColors?: ButtonColors;
}

export function AbandonedCheckoutEmail({
	items,
	subtotal,
	customerName,
	checkoutUrl,
	shopName,
	shopLogo,
	shopUrl,
	buttonColors,
}: AbandonedCheckoutEmailProps) {
	const formatPrice = (price: number) => {
		return `${price.toFixed(2)} KM`;
	};

	const greeting = customerName ? `Pozdrav ${customerName}` : "Pozdrav";
	const finalCheckoutUrl = checkoutUrl || `${shopUrl}/checkout`;

	return (
		<EmailLayout preview="Zaboravili ste nešto u korpi?">
			<EmailHeader shopName={shopName} shopLogo={shopLogo} />

			<Section className="px-8 py-8">
				<Heading className="m-0 text-2xl font-bold text-slate-900">
					Zaboravili ste nešto?
				</Heading>

				<Text className="mt-4 text-base leading-relaxed text-slate-600">
					{greeting}, primijetili smo da ste ostavili proizvode u korpi.
					Vaša korpa je još uvijek sačuvana i čeka vas.
				</Text>

				<Hr className="my-6 border-slate-200" />

				<Heading as="h2" className="m-0 mb-4 text-lg font-semibold text-slate-900">
					Proizvodi u korpi
				</Heading>

				<Section>
					{items.map((item, index) => (
						<OrderItemRow key={index} item={item} />
					))}
				</Section>

				<Hr className="my-6 border-slate-200" />

				<Section>
					<Row>
						<Column className="text-base font-semibold text-slate-900">
							Ukupno
						</Column>
						<Column className="text-right text-lg font-bold text-slate-900">
							{formatPrice(subtotal)}
						</Column>
					</Row>
					<Row>
						<Column colSpan={2}>
							<Text className="m-0 mt-1 text-xs text-slate-500">
								*Bez troškova dostave
							</Text>
						</Column>
					</Row>
				</Section>

				<Section className="mt-8 text-center">
					<EmailButton
						href={finalCheckoutUrl}
						bgColor={buttonColors?.bgColor}
						textColor={buttonColors?.textColor}
					>
						Dovrši narudžbu
					</EmailButton>
				</Section>

				<Text className="mt-6 text-center text-sm text-slate-500">
					Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte.
				</Text>
			</Section>

			<EmailFooter shopName={shopName} />
		</EmailLayout>
	);
}

export default AbandonedCheckoutEmail;
