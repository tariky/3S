import { createFileRoute } from "@tanstack/react-router";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import { ShoppingBag, Truck, Shield, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const features = [
		{
			icon: <Truck className="w-8 h-8 text-primary" />,
			title: "Brza dostava",
			description: "Besplatna dostava za narudžbe preko 50 KM",
		},
		{
			icon: <Shield className="w-8 h-8 text-primary" />,
			title: "Sigurna kupovina",
			description: "Zaštićena plaćanja i povrat novca",
		},
		{
			icon: <Heart className="w-8 h-8 text-primary" />,
			title: "Kvalitet proizvoda",
			description: "Samo najbolji proizvodi za naše kupce",
		},
	];

	return (
		<div className="min-h-screen bg-gray-50">
			<ShopNavigation />
			<main>
				{/* Hero Section */}
				<section className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-20 px-4">
					<div className="container mx-auto text-center">
						<h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
							Dobrodošli u Lunatik
						</h1>
						<p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
							Pronađite najbolje proizvode po najboljim cijenama
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							to="/products"
							className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
						>
							<ShoppingBag className="w-5 h-5 mr-2" />
							Pregledaj proizvode
						</Link>
							<Link
								to="/shop/about"
								className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 border-2 border-gray-300 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
							>
								Saznaj više
							</Link>
						</div>
					</div>
				</section>

				{/* Features Section */}
				<section className="py-16 px-4">
					<div className="container mx-auto">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{features.map((feature, index) => (
								<div
									key={index}
									className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow"
								>
									<div className="flex justify-center mb-4">{feature.icon}</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										{feature.title}
									</h3>
									<p className="text-gray-600">{feature.description}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="bg-gray-900 text-white py-16 px-4">
					<div className="container mx-auto text-center">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">
							Spremni za kupovinu?
						</h2>
						<p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
							Pregledajte našu kolekciju proizvoda i pronađite ono što tražite
						</p>
					<Link
						to="/products"
						className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
					>
						Pregledaj proizvode
					</Link>
					</div>
				</section>
			</main>
			<footer className="bg-gray-900 text-white mt-16">
				<div className="container mx-auto px-4 py-12">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						<div>
							<h3 className="text-lg font-semibold mb-4">Lunatik</h3>
							<p className="text-gray-400 text-sm">
								Vaš pouzdani partner za online shopping
							</p>
						</div>
						<div>
							<h4 className="font-semibold mb-4">Kupovina</h4>
							<ul className="space-y-2 text-sm text-gray-400">
								<li>
									<a href="#" className="hover:text-white">
										Kako naručiti
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Dostava
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Plaćanje
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold mb-4">Informacije</h4>
							<ul className="space-y-2 text-sm text-gray-400">
								<li>
									<a href="#" className="hover:text-white">
										O nama
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Kontakt
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										FAQ
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold mb-4">Pravno</h4>
							<ul className="space-y-2 text-sm text-gray-400">
								<li>
									<a href="#" className="hover:text-white">
										Politika privatnosti
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white">
										Uslovi korištenja
									</a>
								</li>
							</ul>
						</div>
					</div>
					<div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
						<p>&copy; {new Date().getFullYear()} Lunatik. Sva prava zadržana.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
