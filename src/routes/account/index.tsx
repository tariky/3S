import { createFileRoute, Link } from "@tanstack/react-router";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import { AddressManager } from "@/components/account/AddressManager";
import { Button } from "@/components/ui/button";
import { Package, MapPin, User } from "lucide-react";
import { ToastProvider } from "@/components/ui/toast";

export const Route = createFileRoute("/account/")({
	component: AccountPage,
});

function AccountPage() {
	return (
		<ToastProvider>
			<div className="min-h-screen bg-gray-50">
				<ShopNavigation />
				<main className="container mx-auto px-4 py-8">
					<div className="max-w-4xl mx-auto">
						<div className="mb-8">
							<h1 className="text-3xl font-bold text-gray-900 mb-2">Moj profil</h1>
							<p className="text-gray-600">
								Upravljajte svojim nalogom, adresama i narudžbama
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-6 mb-8">
							<Link
								to="/account/orders"
								className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
							>
								<div className="flex items-center gap-3 mb-2">
									<Package className="size-6 text-primary" />
									<h3 className="font-semibold text-gray-900">Moje narudžbe</h3>
								</div>
								<p className="text-sm text-gray-600">
									Pregled svih vaših narudžbi i njihovih statusa
								</p>
							</Link>

							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<div className="flex items-center gap-3 mb-2">
									<User className="size-6 text-primary" />
									<h3 className="font-semibold text-gray-900">Lični podaci</h3>
								</div>
								<p className="text-sm text-gray-600 mb-4">
									Upravljajte svojim ličnim informacijama
								</p>
								<Button variant="outline" size="sm" disabled>
									Uskoro
								</Button>
							</div>

							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<div className="flex items-center gap-3 mb-2">
									<MapPin className="size-6 text-primary" />
									<h3 className="font-semibold text-gray-900">Adrese</h3>
								</div>
								<p className="text-sm text-gray-600">
									Upravljajte adresama za naplatu i dostavu
								</p>
							</div>
						</div>

						<div className="bg-white rounded-lg border border-gray-200 p-6">
							<AddressManager />
						</div>
					</div>
				</main>
			</div>
		</ToastProvider>
	);
}

