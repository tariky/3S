import { Heading, Hr, Section, Text } from "@react-email/components";
import { EmailButton } from "../components/EmailButton";
import { EmailFooter } from "../components/EmailFooter";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";

interface ButtonColors {
	bgColor: string;
	textColor: string;
}

interface OrderCancelledEmailProps {
	order: {
		id: string;
		orderNumber: string;
		total: number;
	};
	customerName: string;
	shopName: string;
	shopLogo?: string;
	shopUrl: string;
	buttonColors?: ButtonColors;
}

export function OrderCancelledEmail({
	order,
	customerName,
	shopName,
	shopLogo,
	shopUrl,
	buttonColors,
}: OrderCancelledEmailProps) {
	const formatPrice = (price: number) => {
		return `${price.toFixed(2)} KM`;
	};

	return (
		<EmailLayout preview={`Narudžba #${order.orderNumber} je otkazana`}>
			<EmailHeader shopName={shopName} shopLogo={shopLogo} />

			<Section className="px-8 py-8">
				<Section className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-center">
					<Text className="m-0 text-sm font-medium text-red-700">
						Narudžba #<strong>{order.orderNumber}</strong> - Otkazano
					</Text>
				</Section>

				<Heading className="m-0 text-2xl font-bold text-slate-900">
					Vaša narudžba je otkazana
				</Heading>

				<Text className="mt-4 text-base leading-relaxed text-slate-600">
					Pozdrav {customerName}, obavještavamo vas da je vaša narudžba #{order.orderNumber}
					uspješno otkazana.
				</Text>

				<Hr className="my-6 border-slate-200" />

				<Section className="rounded-lg bg-slate-50 p-4">
					<Text className="m-0 text-sm font-medium text-slate-700">
						Informacije o povratu
					</Text>
					<Text className="m-0 mt-2 text-sm text-slate-600">
						Iznos od <strong>{formatPrice(order.total)}</strong> bit će vraćen
						na vaš originalni način plaćanja u roku od 5-10 radnih dana.
					</Text>
				</Section>

				<Text className="mt-6 text-sm text-slate-500">
					Ako imate pitanja o povratu ili želite ponovno naručiti, slobodno nas
					kontaktirajte ili posjetite našu web stranicu.
				</Text>

				<Section className="mt-8 text-center">
					<EmailButton
						href={shopUrl}
						bgColor={buttonColors?.bgColor}
						textColor={buttonColors?.textColor}
					>
						Nastavi kupovinu
					</EmailButton>
				</Section>
			</Section>

			<EmailFooter shopName={shopName} />
		</EmailLayout>
	);
}

export default OrderCancelledEmail;
