import { Heading, Section, Text } from "@react-email/components";
import { EmailButton } from "../components/EmailButton";
import { EmailFooter } from "../components/EmailFooter";
import { EmailHeader } from "../components/EmailHeader";
import { EmailLayout } from "../components/EmailLayout";

interface ButtonColors {
	bgColor: string;
	textColor: string;
}

interface PasswordResetEmailProps {
	customerName: string;
	resetUrl: string;
	shopName: string;
	shopLogo?: string;
	shopUrl: string;
	buttonColors?: ButtonColors;
}

export function PasswordResetEmail({
	customerName,
	resetUrl,
	shopName,
	shopLogo,
	shopUrl,
	buttonColors,
}: PasswordResetEmailProps) {
	return (
		<EmailLayout preview={`Resetujte lozinku za ${shopName}`}>
			<EmailHeader shopName={shopName} shopLogo={shopLogo} />

			<Section className="px-8 py-8">
				<Heading className="m-0 text-2xl font-bold text-slate-900">
					Resetovanje lozinke
				</Heading>

				<Text className="mt-4 text-base leading-relaxed text-slate-600">
					Pozdrav {customerName},
				</Text>

				<Text className="mt-4 text-base leading-relaxed text-slate-600">
					Primili smo zahtjev za resetovanje lozinke vašeg računa na {shopName}.
					Kliknite na dugme ispod da biste postavili novu lozinku.
				</Text>

				<Section className="mt-8 text-center">
					<EmailButton
						href={resetUrl}
						bgColor={buttonColors?.bgColor}
						textColor={buttonColors?.textColor}
					>
						Resetuj lozinku
					</EmailButton>
				</Section>

				<Text className="mt-8 text-sm text-slate-500">
					Ovaj link za resetovanje lozinke će isteći za 1 sat.
				</Text>

				<Text className="mt-4 text-sm text-slate-500">
					Ako niste vi zatražili resetovanje lozinke, možete ignorisati ovaj
					email. Vaša lozinka neće biti promijenjena.
				</Text>

				<Text className="mt-8 text-xs text-slate-400">
					Ako dugme ne radi, kopirajte i zalijepite ovaj link u vaš pretraživač:
				</Text>
				<Text className="mt-2 text-xs text-slate-400 break-all">
					{resetUrl}
				</Text>
			</Section>

			<EmailFooter shopName={shopName} />
		</EmailLayout>
	);
}

export default PasswordResetEmail;
