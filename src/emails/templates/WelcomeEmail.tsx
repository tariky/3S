import { Heading, Section, Text } from "@react-email/components";
import { EmailButton } from "../components/EmailButton";
import { EmailFooter } from "../components/EmailFooter";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";

interface ButtonColors {
	bgColor: string;
	textColor: string;
}

interface WelcomeEmailProps {
	customerName: string;
	shopName: string;
	shopLogo?: string;
	shopUrl: string;
	buttonColors?: ButtonColors;
}

export function WelcomeEmail({
	customerName,
	shopName,
	shopLogo,
	shopUrl,
	buttonColors,
}: WelcomeEmailProps) {
	return (
		<EmailLayout preview={`Dobrodošli u ${shopName}!`}>
			<EmailHeader shopName={shopName} shopLogo={shopLogo} />

			<Section className="px-8 py-8">
				<Heading className="m-0 text-2xl font-bold text-slate-900">
					Dobrodošli, {customerName}!
				</Heading>

				<Text className="mt-4 text-base leading-relaxed text-slate-600">
					Hvala vam što ste se registrirali na {shopName}. Vaš račun je uspješno
					kreiran i spremni ste za kupovinu.
				</Text>

				<Text className="mt-4 text-base leading-relaxed text-slate-600">
					Istražite našu kolekciju i pronađite savršene proizvode za vas.
				</Text>

				<Section className="mt-8 text-center">
					<EmailButton
						href={shopUrl}
						bgColor={buttonColors?.bgColor}
						textColor={buttonColors?.textColor}
					>
						Pregledaj ponudu
					</EmailButton>
				</Section>

				<Text className="mt-8 text-sm text-slate-500">
					Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte. Uvijek smo
					tu da vam pomognemo!
				</Text>
			</Section>

			<EmailFooter shopName={shopName} />
		</EmailLayout>
	);
}

export default WelcomeEmail;
