import { Outlet } from "@tanstack/react-router";
import { ShopNavigation } from "./ShopNavigation";

export function ShopLayout() {
	return (
		<div className="min-h-screen bg-gray-50">
			<ShopNavigation />
			<main>
				<Outlet />
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

