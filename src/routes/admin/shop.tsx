import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUploadFiles } from "@better-upload/client";
import { checkAdminAccessServerFn } from "@/server/auth.server";
import {
	getShopSettingsServerFn,
	updateShopSettingsServerFn,
	SETTINGS_QUERY_KEY,
} from "@/queries/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ColorPicker, BG_COLORS, TEXT_COLORS } from "@/components/ui/color-picker";
import { IconPicker, renderIcon } from "@/components/ui/icon-picker";
import { Loader2, Upload, X, RefreshCw, CheckCircle2, XCircle, Database, Sparkles, Check, Eye } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ProxyImage } from "@/components/ui/proxy-image";
import {
	checkTypesenseStatusServerFn,
	fullTypesenseSyncServerFn,
} from "@/queries/typesense";
import {
	checkGorseStatusServerFn,
	syncAllItemsToGorseServerFn,
} from "@/queries/gorse";

export const Route = createFileRoute("/admin/shop")({
	component: ShopSettingsPage,
	beforeLoad: async () => {
		await checkAdminAccessServerFn();
	},
});

function ShopSettingsPage() {
	const queryClient = useQueryClient();

	const { data: settings, isLoading } = useQuery({
		queryKey: [SETTINGS_QUERY_KEY, "shop"],
		queryFn: async () => {
			return await getShopSettingsServerFn();
		},
	});

	const form = useForm({
		defaultValues: {
			shopTitle: "",
			shopDescription: "",
			shopLogo: "",
			shopLogoWidth: 120,
			shopFavicon: "",
			seoHomeTitle: "",
			seoHomeDescription: "",
			alertEnabled: false,
			alertText: "",
			alertLink: "",
			alertIcon: "Bell",
			alertBgColor: "bg-blue-500",
			alertTextColor: "text-white",
			productShippingInfo: "",
			productPaymentInfo: "",
			pickupLocationUrl: "",
			pickupLocationAddress: "",
			emailLogo: "",
			emailLogoWidth: 150,
			emailButtonBgColor: "#2563eb",
			emailButtonTextColor: "#ffffff",
		},
		onSubmit: async ({ value }) => {
			await updateMutation.mutateAsync(value);
		},
	});

	// Update form when settings load
	useEffect(() => {
		if (settings) {
			form.setFieldValue("shopTitle", settings.shopTitle);
			form.setFieldValue("shopDescription", settings.shopDescription);
			form.setFieldValue("shopLogo", settings.shopLogo);
			form.setFieldValue("shopLogoWidth", settings.shopLogoWidth);
			form.setFieldValue("shopFavicon", settings.shopFavicon);
			form.setFieldValue("seoHomeTitle", settings.seoHomeTitle);
			form.setFieldValue("seoHomeDescription", settings.seoHomeDescription);
			form.setFieldValue("alertEnabled", settings.alertEnabled);
			form.setFieldValue("alertText", settings.alertText);
			form.setFieldValue("alertLink", settings.alertLink);
			form.setFieldValue("alertIcon", settings.alertIcon);
			form.setFieldValue("alertBgColor", settings.alertBgColor);
			form.setFieldValue("alertTextColor", settings.alertTextColor);
			form.setFieldValue("productShippingInfo", settings.productShippingInfo);
			form.setFieldValue("productPaymentInfo", settings.productPaymentInfo);
			form.setFieldValue("pickupLocationUrl", settings.pickupLocationUrl);
			form.setFieldValue("pickupLocationAddress", settings.pickupLocationAddress);
			form.setFieldValue("emailLogo", settings.emailLogo);
			form.setFieldValue("emailLogoWidth", settings.emailLogoWidth);
			form.setFieldValue("emailButtonBgColor", settings.emailButtonBgColor);
			form.setFieldValue("emailButtonTextColor", settings.emailButtonTextColor);
		}
	}, [settings]);

	const updateMutation = useMutation({
		mutationFn: async (data: typeof form.state.values) => {
			return await updateShopSettingsServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, "shop"] });
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8 container mx-auto py-6 max-w-4xl">
			<div>
				<h1 className="text-2xl font-bold">Shop postavke</h1>
				<p className="text-muted-foreground">
					Upravljajte brendiranjem i izgledom vašeg shopa
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-6"
			>
				{/* Branding Section */}
				<Card>
					<CardHeader>
						<CardTitle>Brending</CardTitle>
						<CardDescription>
							Osnovne informacije o vašem shopu
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<form.Field name="shopTitle">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Naziv shopa</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Moj Shop"
										maxLength={255}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="shopDescription">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Opis shopa</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Kratki opis vašeg shopa..."
										rows={3}
										maxLength={1000}
									/>
									<span className="text-xs text-muted-foreground text-right">
										{field.state.value.length}/1000
									</span>
								</div>
							)}
						</form.Field>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex flex-col gap-4">
								<form.Field name="shopLogo">
									{(field) => (
										<div className="flex flex-col gap-2">
											<Label>Logo (PNG, JPG, SVG)</Label>
											<ImageUploadField
												value={field.state.value}
												onChange={(url) => field.handleChange(url)}
												placeholder="Logo shopa"
												acceptSvg
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="shopLogoWidth">
									{(field) => (
										<div className="flex flex-col gap-2">
											<Label htmlFor={field.name}>Širina loga (px)</Label>
											<div className="flex items-center gap-4">
												<Input
													id={field.name}
													type="number"
													min={20}
													max={500}
													value={field.state.value}
													onChange={(e) => field.handleChange(parseInt(e.target.value) || 120)}
													onBlur={field.handleBlur}
													className="w-24"
												/>
												<span className="text-sm text-muted-foreground">
													Visina se prilagođava proporcionalno
												</span>
											</div>
										</div>
									)}
								</form.Field>

								{/* Logo Preview */}
								{form.state.values.shopLogo && (
									<div className="flex flex-col gap-2">
										<Label>Pregled loga</Label>
										<div className="p-4 bg-gray-100 rounded-md inline-block">
											<LogoPreview
												url={form.state.values.shopLogo}
												width={form.state.values.shopLogoWidth}
											/>
										</div>
									</div>
								)}
							</div>

							<form.Field name="shopFavicon">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label>Favicon (32x32)</Label>
										<ImageUploadField
											value={field.state.value}
											onChange={(url) => field.handleChange(url)}
											placeholder="Favicon (32x32)"
										/>
									</div>
								)}
							</form.Field>
						</div>
					</CardContent>
				</Card>

				{/* SEO Section */}
				<Card>
					<CardHeader>
						<CardTitle>SEO za početnu stranicu</CardTitle>
						<CardDescription>
							Meta podaci za pretraživače
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<form.Field name="seoHomeTitle">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>SEO naslov</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Naslov za pretraživače"
										maxLength={70}
									/>
									<span className={cn(
										"text-xs text-right",
										field.state.value.length > 60
											? "text-orange-500"
											: "text-muted-foreground"
									)}>
										{field.state.value.length}/70 (preporučeno do 60)
									</span>
								</div>
							)}
						</form.Field>

						<form.Field name="seoHomeDescription">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>SEO opis</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Opis za pretraživače..."
										rows={3}
										maxLength={160}
									/>
									<span className={cn(
										"text-xs text-right",
										field.state.value.length > 155
											? "text-orange-500"
											: "text-muted-foreground"
									)}>
										{field.state.value.length}/160 (preporučeno do 155)
									</span>
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				{/* Alert Banner Section */}
				<Card>
					<CardHeader>
						<CardTitle>Top Page Alert</CardTitle>
						<CardDescription>
							Prikazuje se na vrhu svih stranica
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<form.Field name="alertEnabled">
							{(field) => (
								<div className="flex items-center justify-between">
									<div className="flex flex-col gap-1">
										<Label htmlFor={field.name}>Aktiviraj alert</Label>
										<span className="text-sm text-muted-foreground">
											Prikaži banner na vrhu stranice
										</span>
									</div>
									<Switch
										id={field.name}
										checked={field.state.value}
										onCheckedChange={field.handleChange}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="alertText">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Tekst alerta</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Besplatna dostava za narudžbe preko 50 KM!"
										maxLength={500}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="alertLink">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Link (opciono)</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="https://example.com/promocija"
										type="url"
									/>
									<span className="text-xs text-muted-foreground">
										Ostavite prazno ako alert ne treba biti klikabilan
									</span>
								</div>
							)}
						</form.Field>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<form.Field name="alertIcon">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label>Ikona</Label>
										<IconPicker
											value={field.state.value}
											onChange={field.handleChange}
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="alertBgColor">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label>Pozadina</Label>
										<ColorPicker
											value={field.state.value}
											onChange={field.handleChange}
											colors={BG_COLORS}
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="alertTextColor">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label>Boja teksta</Label>
										<ColorPicker
											value={field.state.value}
											onChange={field.handleChange}
											colors={TEXT_COLORS}
										/>
									</div>
								)}
							</form.Field>
						</div>

						{/* Alert Preview */}
						<div className="flex flex-col gap-2 mt-4">
							<Label>Pregled</Label>
							<div
								className={cn(
									"flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm",
									form.state.values.alertBgColor,
									form.state.values.alertTextColor
								)}
							>
								{renderIcon(form.state.values.alertIcon, "w-4 h-4")}
								<span>
									{form.state.values.alertText || "Tekst alerta..."}
								</span>
								{form.state.values.alertLink && (
									<span className="opacity-70 text-xs">(klikabilno)</span>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Product Page Info Section */}
				<Card>
					<CardHeader>
						<CardTitle>Informacije na stranici proizvoda</CardTitle>
						<CardDescription>
							Tekst koji se prikazuje u akordion sekcijama na svakoj stranici proizvoda
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<form.Field name="productShippingInfo">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Informacije o dostavi</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Besplatna dostava za narudžbe preko 100 KM.&#10;Standardna dostava: 2-4 radna dana.&#10;Express dostava: 1-2 radna dana (+15 KM)."
										rows={4}
										maxLength={2000}
									/>
									<span className="text-xs text-muted-foreground">
										Prikazuje se u sekciji "Dostava" na stranici proizvoda
									</span>
								</div>
							)}
						</form.Field>

						<form.Field name="productPaymentInfo">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Informacije o plaćanju</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Prihvaćamo sljedeće načine plaćanja:&#10;• Kartica (Visa, Mastercard)&#10;• Pouzeće&#10;• PayPal"
										rows={4}
										maxLength={2000}
									/>
									<span className="text-xs text-muted-foreground">
										Prikazuje se u sekciji "Plaćanje" na stranici proizvoda
									</span>
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				{/* Local Pickup Location Section */}
				<Card>
					<CardHeader>
						<CardTitle>Lokacija za osobno preuzimanje</CardTitle>
						<CardDescription>
							Adresa i Google Maps link za kupce koji biraju osobno preuzimanje
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<form.Field name="pickupLocationAddress">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Adresa za preuzimanje</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Ulica i broj, Grad, Poštanski broj"
										maxLength={500}
									/>
									<span className="text-xs text-muted-foreground">
										Ova adresa će se prikazati u email-u za osobno preuzimanje
									</span>
								</div>
							)}
						</form.Field>

						<form.Field name="pickupLocationUrl">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Google Maps link</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="https://maps.google.com/..."
										type="url"
									/>
									<span className="text-xs text-muted-foreground">
										Link na Google Maps lokaciju vaše poslovnice. Kopirajte iz Google Maps aplikacije.
									</span>
								</div>
							)}
						</form.Field>
					</CardContent>
				</Card>

				{/* Email Settings Section */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Postavke emailova</CardTitle>
								<CardDescription>
									Logo i izgled dugmadi u transakcijskim emailovima
								</CardDescription>
							</div>
							<EmailPreviewDialog
								logoUrl={form.state.values.emailLogo}
								logoWidth={form.state.values.emailLogoWidth}
								buttonBgColor={form.state.values.emailButtonBgColor}
								buttonTextColor={form.state.values.emailButtonTextColor}
								shopTitle={form.state.values.shopTitle}
							/>
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<form.Field name="emailLogo">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label>Logo za emailove (PNG ili JPG)</Label>
										<p className="text-sm text-muted-foreground">
											Email klijenti ne podržavaju SVG. Uploadajte PNG ili JPG verziju loga.
										</p>
										<ImageUploadField
											value={field.state.value}
											onChange={(url) => field.handleChange(url)}
											placeholder="Upload logo (PNG, JPG)"
											acceptSvg={false}
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="emailLogoWidth">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label htmlFor={field.name}>Širina loga u emailu (px)</Label>
										<div className="flex items-center gap-4">
											<Input
												id={field.name}
												type="number"
												min={50}
												max={400}
												value={field.state.value}
												onChange={(e) => field.handleChange(parseInt(e.target.value) || 150)}
												onBlur={field.handleBlur}
												className="w-24"
											/>
											<span className="text-sm text-muted-foreground">
												50 - 400 px
											</span>
										</div>
									</div>
								)}
							</form.Field>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<form.Field name="emailButtonBgColor">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label>Boja pozadine</Label>
										<EmailColorPicker
											value={field.state.value}
											onChange={field.handleChange}
											colors={EMAIL_BUTTON_COLORS}
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="emailButtonTextColor">
								{(field) => (
									<div className="flex flex-col gap-2">
										<Label>Boja teksta</Label>
										<EmailColorPicker
											value={field.state.value}
											onChange={field.handleChange}
											colors={EMAIL_TEXT_COLORS}
										/>
									</div>
								)}
							</form.Field>
						</div>

						{/* Email Button Preview */}
						<div className="flex flex-col gap-2 mt-4">
							<Label>Pregled dugmeta</Label>
							<div className="p-6 bg-gray-100 rounded-lg flex justify-center">
								<div
									className="px-6 py-3 rounded-lg text-sm font-semibold cursor-default"
									style={{
										backgroundColor: form.state.values.emailButtonBgColor,
										color: form.state.values.emailButtonTextColor,
									}}
								>
									Pogledaj narudžbu
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Submit Button */}
				<div className="flex justify-end">
					<Button
						type="submit"
						disabled={updateMutation.isPending}
						size="lg"
					>
						{updateMutation.isPending && (
							<Loader2 className="size-4 animate-spin mr-2" />
						)}
						Sačuvaj sve postavke
					</Button>
				</div>
			</form>

			{/* Typesense Search Section - Outside form */}
			<TypesenseSyncSection />

			{/* Gorse Recommendations Section - Outside form */}
			<GorseSyncSection />
		</div>
	);
}

function TypesenseSyncSection() {
	const { data: status, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
		queryKey: ["typesense-status"],
		queryFn: async () => {
			return await checkTypesenseStatusServerFn();
		},
	});

	const syncMutation = useMutation({
		mutationFn: async () => {
			return await fullTypesenseSyncServerFn();
		},
		onSuccess: () => {
			refetchStatus();
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Database className="size-5" />
					Typesense Pretraga
				</CardTitle>
				<CardDescription>
					Sinkronizacija kataloga proizvoda sa Typesense pretraživačem
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{/* Status Display */}
				<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
					<div className="flex flex-col gap-1">
						<span className="text-sm font-medium">Status konekcije</span>
						{isLoadingStatus ? (
							<div className="flex items-center gap-2 text-muted-foreground">
								<Loader2 className="size-4 animate-spin" />
								<span className="text-sm">Provjera...</span>
							</div>
						) : status?.configured ? (
							<div className="flex items-center gap-2">
								{status.connected ? (
									<>
										<CheckCircle2 className="size-4 text-green-600" />
										<span className="text-sm text-green-600">Povezano</span>
									</>
								) : (
									<>
										<XCircle className="size-4 text-red-600" />
										<span className="text-sm text-red-600">Nije povezano</span>
									</>
								)}
							</div>
						) : (
							<div className="flex items-center gap-2 text-orange-600">
								<XCircle className="size-4" />
								<span className="text-sm">Nije konfigurisano</span>
							</div>
						)}
					</div>
					{status?.configured && status?.connected && (
						<div className="text-right">
							<span className="text-2xl font-bold">{status.documentCount || 0}</span>
							<span className="text-sm text-muted-foreground ml-1">proizvoda</span>
						</div>
					)}
				</div>

				{/* Configuration Notice */}
				{!status?.configured && (
					<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
						<p className="text-sm text-orange-800">
							Typesense nije konfigurisan. Dodajte <code className="bg-orange-100 px-1 rounded">TYPESENSE_URL</code> i{" "}
							<code className="bg-orange-100 px-1 rounded">TYPESENSE_TOKEN</code> u vaš .env fajl.
						</p>
					</div>
				)}

				{/* Sync Result */}
				{syncMutation.isSuccess && syncMutation.data && (
					<div className={cn(
						"p-4 border rounded-lg",
						syncMutation.data.failed > 0
							? "bg-orange-50 border-orange-200"
							: "bg-green-50 border-green-200"
					)}>
						<p className={cn(
							"text-sm font-medium",
							syncMutation.data.failed > 0 ? "text-orange-800" : "text-green-800"
						)}>
							{syncMutation.data.failed > 0 ? "Sinkronizacija djelomično uspješna" : "Sinkronizacija uspješna!"}
						</p>
						<p className="text-sm text-gray-700 mt-1">
							Sinhronizirano: {syncMutation.data.synced} / {syncMutation.data.total} proizvoda
							{syncMutation.data.failed > 0 && (
								<span className="text-orange-600 ml-2">
									(neuspješno: {syncMutation.data.failed})
								</span>
							)}
						</p>
						{syncMutation.data.errors && syncMutation.data.errors.length > 0 && (
							<div className="mt-2 p-2 bg-white rounded border border-orange-200">
								<p className="text-xs font-medium text-orange-800 mb-1">Greške:</p>
								<ul className="text-xs text-orange-700 space-y-0.5">
									{syncMutation.data.errors.map((err: string, idx: number) => (
										<li key={idx} className="font-mono truncate">{err}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}

				{/* Sync Error */}
				{syncMutation.isError && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
						<p className="text-sm text-red-800">
							Greška pri sinkronizaciji: {syncMutation.error?.message || "Nepoznata greška"}
						</p>
					</div>
				)}

				{/* Sync Button */}
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						Puna sinkronizacija će obrisati postojeći indeks i ponovo sinhronizovati sve aktivne proizvode.
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={() => syncMutation.mutate()}
						disabled={!status?.configured || syncMutation.isPending}
					>
						{syncMutation.isPending ? (
							<>
								<Loader2 className="size-4 animate-spin mr-2" />
								Sinkronizacija...
							</>
						) : (
							<>
								<RefreshCw className="size-4 mr-2" />
								Puna sinkronizacija
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function GorseSyncSection() {
	const { data: status, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
		queryKey: ["gorse-status"],
		queryFn: async () => {
			return await checkGorseStatusServerFn();
		},
	});

	const syncMutation = useMutation({
		mutationFn: async () => {
			return await syncAllItemsToGorseServerFn({ data: {} });
		},
		onSuccess: () => {
			refetchStatus();
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Sparkles className="size-5" />
					Gorse Preporuke
				</CardTitle>
				<CardDescription>
					Sinkronizacija proizvoda sa Gorse sistemom za preporuke
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{/* Status Display */}
				<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
					<div className="flex flex-col gap-1">
						<span className="text-sm font-medium">Status konekcije</span>
						{isLoadingStatus ? (
							<div className="flex items-center gap-2 text-muted-foreground">
								<Loader2 className="size-4 animate-spin" />
								<span className="text-sm">Provjera...</span>
							</div>
						) : status?.configured ? (
							<div className="flex items-center gap-2">
								{status.connected ? (
									<>
										<CheckCircle2 className="size-4 text-green-600" />
										<span className="text-sm text-green-600">Povezano</span>
									</>
								) : (
									<>
										<XCircle className="size-4 text-red-600" />
										<span className="text-sm text-red-600">Nije povezano</span>
									</>
								)}
							</div>
						) : (
							<div className="flex items-center gap-2 text-orange-600">
								<XCircle className="size-4" />
								<span className="text-sm">Nije konfigurisano</span>
							</div>
						)}
					</div>
					{status?.configured && status?.connected && (
						<div className="text-right">
							<span className="text-2xl font-bold">{status.itemCount || 0}</span>
							<span className="text-sm text-muted-foreground ml-1">proizvoda</span>
						</div>
					)}
				</div>

				{/* Configuration Notice */}
				{!status?.configured && (
					<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
						<p className="text-sm text-orange-800">
							Gorse nije konfigurisan. Dodajte <code className="bg-orange-100 px-1 rounded">GORSE_URL</code> i{" "}
							<code className="bg-orange-100 px-1 rounded">GORSE_TOKEN</code> u vaš .env fajl.
						</p>
					</div>
				)}

				{/* Sync Result */}
				{syncMutation.isSuccess && syncMutation.data && (
					<div className={cn(
						"p-4 border rounded-lg",
						syncMutation.data.failed > 0
							? "bg-orange-50 border-orange-200"
							: "bg-green-50 border-green-200"
					)}>
						<p className={cn(
							"text-sm font-medium",
							syncMutation.data.failed > 0 ? "text-orange-800" : "text-green-800"
						)}>
							{syncMutation.data.failed > 0 ? "Sinkronizacija djelomično uspješna" : "Sinkronizacija uspješna!"}
						</p>
						<p className="text-sm text-gray-700 mt-1">
							Sinhronizirano: {syncMutation.data.synced} / {syncMutation.data.total} proizvoda
							{syncMutation.data.failed > 0 && (
								<span className="text-orange-600 ml-2">
									(neuspješno: {syncMutation.data.failed})
								</span>
							)}
						</p>
						{syncMutation.data.errors && syncMutation.data.errors.length > 0 && (
							<div className="mt-2 p-2 bg-white rounded border border-orange-200">
								<p className="text-xs font-medium text-orange-800 mb-1">Greške:</p>
								<ul className="text-xs text-orange-700 space-y-0.5">
									{syncMutation.data.errors.map((err: string, idx: number) => (
										<li key={idx} className="font-mono truncate">{err}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}

				{/* Sync Error */}
				{syncMutation.isError && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
						<p className="text-sm text-red-800">
							Greška pri sinkronizaciji: {syncMutation.error?.message || "Nepoznata greška"}
						</p>
					</div>
				)}

				{/* Info about auto-sync */}
				<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
					<p className="text-sm text-blue-800">
						Proizvodi se automatski sinkroniziraju sa Gorse sistemom prilikom kreiranja, ažuriranja ili brisanja.
						Koristite punu sinkronizaciju samo za inicijalnu postavku ili oporavak.
					</p>
				</div>

				{/* Sync Button */}
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						Puna sinkronizacija će ponovo sinhronizovati sve aktivne proizvode.
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={() => syncMutation.mutate()}
						disabled={!status?.configured || syncMutation.isPending}
					>
						{syncMutation.isPending ? (
							<>
								<Loader2 className="size-4 animate-spin mr-2" />
								Sinkronizacija...
							</>
						) : (
							<>
								<RefreshCw className="size-4 mr-2" />
								Puna sinkronizacija
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// Logo preview component that handles SVG inline rendering
function LogoPreview({ url, width }: { url: string; width: number }) {
	const [svgContent, setSvgContent] = useState<string | null>(null);
	const isSvg = url.toLowerCase().endsWith(".svg");

	useEffect(() => {
		if (isSvg) {
			fetch(url)
				.then((res) => res.text())
				.then((text) => setSvgContent(text))
				.catch(() => setSvgContent(null));
		}
	}, [url, isSvg]);

	if (isSvg && svgContent) {
		return (
			<div
				style={{ width: `${width}px` }}
				className="[&>svg]:w-full [&>svg]:h-auto"
				dangerouslySetInnerHTML={{ __html: svgContent }}
			/>
		);
	}

	return (
		<ProxyImage
			src={url}
			alt="Logo preview"
			width={width}
			style={{ width: `${width}px`, height: "auto" }}
		/>
	);
}

// Simple image upload field component
function ImageUploadField({
	value,
	onChange,
	placeholder,
	acceptSvg = false,
}: {
	value: string;
	onChange: (url: string) => void;
	placeholder: string;
	acceptSvg?: boolean;
}) {
	const [isUploading, setIsUploading] = useState(false);

	const { control } = useUploadFiles({
		route: "images",
		onUploadComplete: (data) => {
			const publicUrls = data.metadata?.publicUrls as string[] | undefined;
			if (publicUrls && publicUrls.length > 0) {
				onChange(publicUrls[0]);
			}
			setIsUploading(false);
		},
	});

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploading(true);
		control.upload([file]);
	};

	const acceptTypes = acceptSvg ? "image/*,.svg" : "image/*";

	return (
		<div className="flex flex-col gap-2">
			{value ? (
				<div className="relative w-full h-32 border rounded-md overflow-hidden bg-gray-50">
					<ProxyImage
						src={value}
						alt={placeholder}
						width={300}
						height={128}
						className="w-full h-full object-contain"
					/>
					<button
						type="button"
						onClick={() => onChange("")}
						className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			) : (
				<label className={cn(
					"flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors",
					isUploading && "opacity-50 cursor-not-allowed"
				)}>
					{isUploading ? (
						<Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
					) : (
						<Upload className="w-8 h-8 text-gray-400" />
					)}
					<span className="text-sm text-gray-500 mt-2">
						{isUploading ? "Učitavanje..." : placeholder}
					</span>
					<input
						type="file"
						accept={acceptTypes}
						onChange={handleFileChange}
						className="hidden"
						disabled={isUploading}
					/>
				</label>
			)}
		</div>
	);
}

// Email button color presets (hex values for inline email styles)
const EMAIL_BUTTON_COLORS = [
	{ value: "#ef4444", label: "Red" },
	{ value: "#f97316", label: "Orange" },
	{ value: "#f59e0b", label: "Amber" },
	{ value: "#eab308", label: "Yellow" },
	{ value: "#84cc16", label: "Lime" },
	{ value: "#22c55e", label: "Green" },
	{ value: "#10b981", label: "Emerald" },
	{ value: "#14b8a6", label: "Teal" },
	{ value: "#06b6d4", label: "Cyan" },
	{ value: "#0ea5e9", label: "Sky" },
	{ value: "#3b82f6", label: "Blue" },
	{ value: "#2563eb", label: "Blue 600" },
	{ value: "#6366f1", label: "Indigo" },
	{ value: "#8b5cf6", label: "Violet" },
	{ value: "#a855f7", label: "Purple" },
	{ value: "#d946ef", label: "Fuchsia" },
	{ value: "#ec4899", label: "Pink" },
	{ value: "#f43f5e", label: "Rose" },
	{ value: "#64748b", label: "Slate" },
	{ value: "#1e293b", label: "Dark Slate" },
	{ value: "#18181b", label: "Black" },
];

const EMAIL_TEXT_COLORS = [
	{ value: "#ffffff", label: "White" },
	{ value: "#f8fafc", label: "Slate 50" },
	{ value: "#f1f5f9", label: "Slate 100" },
	{ value: "#1e293b", label: "Slate 800" },
	{ value: "#0f172a", label: "Slate 900" },
	{ value: "#000000", label: "Black" },
];

// Email color picker component
function EmailColorPicker({
	value,
	onChange,
	colors,
}: {
	value: string;
	onChange: (value: string) => void;
	colors: Array<{ value: string; label: string }>;
}) {
	const [open, setOpen] = useState(false);
	const selectedColor = colors.find((c) => c.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="w-full justify-start gap-2"
				>
					<div
						className="w-5 h-5 rounded border border-gray-300"
						style={{ backgroundColor: value }}
					/>
					<span className="truncate">
						{selectedColor?.label || value}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-3" align="start">
				<div className="grid grid-cols-5 gap-2">
					{colors.map((color) => (
						<button
							key={color.value}
							type="button"
							className={cn(
								"w-8 h-8 rounded-md border-2 transition-all flex items-center justify-center",
								value === color.value
									? "border-gray-900 scale-110"
									: "border-transparent hover:scale-105"
							)}
							style={{ backgroundColor: color.value }}
							onClick={() => {
								onChange(color.value);
								setOpen(false);
							}}
							title={color.label}
						>
							{value === color.value && (
								<Check
									className={cn(
										"w-4 h-4",
										color.value === "#ffffff" || color.value === "#f8fafc" || color.value === "#f1f5f9"
											? "text-gray-900"
											: "text-white"
									)}
								/>
							)}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

// Email preview dialog component
function EmailPreviewDialog({
	logoUrl,
	logoWidth,
	buttonBgColor,
	buttonTextColor,
	shopTitle,
}: {
	logoUrl: string;
	logoWidth: number;
	buttonBgColor: string;
	buttonTextColor: string;
	shopTitle: string;
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Eye className="size-4 mr-2" />
					Pregled emaila
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Pregled emaila</DialogTitle>
				</DialogHeader>
				<div className="mt-4">
					{/* Email Preview Container */}
					<div className="border rounded-lg overflow-hidden bg-gray-100">
						{/* Simulated Email Client */}
						<div className="bg-white">
							{/* Email Content */}
							<table
								style={{
									width: "100%",
									maxWidth: "600px",
									margin: "0 auto",
									backgroundColor: "#ffffff",
									fontFamily: "Arial, sans-serif",
								}}
								cellPadding="0"
								cellSpacing="0"
							>
								{/* Header with Logo */}
								<tbody>
									<tr>
										<td style={{ padding: "32px 24px", textAlign: "center", backgroundColor: "#f9fafb" }}>
											{logoUrl ? (
												<img
													src={logoUrl}
													alt={shopTitle || "Shop"}
													style={{ width: `${logoWidth}px`, height: "auto" }}
												/>
											) : (
												<div style={{ fontSize: "24px", fontWeight: "bold", color: "#111827" }}>
													{shopTitle || "Vaš Shop"}
												</div>
											)}
										</td>
									</tr>

									{/* Main Content */}
									<tr>
										<td style={{ padding: "32px 24px" }}>
											<h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", margin: "0 0 16px 0" }}>
												Hvala na narudžbi!
											</h1>
											<p style={{ fontSize: "16px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 24px 0" }}>
												Vaša narudžba <strong>#ORD-123456</strong> je uspješno primljena. Poslat ćemo vam obavijest kada bude spremna za slanje.
											</p>

											{/* Order Summary Box */}
											<div style={{ backgroundColor: "#f9fafb", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
												<h2 style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px 0" }}>
													Sažetak narudžbe
												</h2>

												{/* Sample Product */}
												<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
													<div style={{ width: "48px", height: "48px", backgroundColor: "#e5e7eb", borderRadius: "6px" }} />
													<div style={{ flex: 1 }}>
														<div style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>Primjer proizvoda</div>
														<div style={{ fontSize: "12px", color: "#6b7280" }}>Veličina: M</div>
													</div>
													<div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>49.99 KM</div>
												</div>

												<div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px", marginTop: "12px" }}>
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#4b5563", marginBottom: "4px" }}>
														<span>Međuzbir</span>
														<span>49.99 KM</span>
													</div>
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#4b5563", marginBottom: "8px" }}>
														<span>Dostava</span>
														<span>5.00 KM</span>
													</div>
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "bold", color: "#111827", paddingTop: "8px", borderTop: "1px solid #e5e7eb" }}>
														<span>Ukupno</span>
														<span>54.99 KM</span>
													</div>
												</div>
											</div>

											{/* CTA Button */}
											<div style={{ textAlign: "center" }}>
												<a
													href="#"
													style={{
														display: "inline-block",
														padding: "14px 32px",
														backgroundColor: buttonBgColor,
														color: buttonTextColor,
														textDecoration: "none",
														borderRadius: "8px",
														fontSize: "16px",
														fontWeight: "600",
													}}
												>
													Pogledaj narudžbu
												</a>
											</div>
										</td>
									</tr>

									{/* Footer */}
									<tr>
										<td style={{ padding: "24px", backgroundColor: "#f9fafb", textAlign: "center" }}>
											<p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px 0" }}>
												{shopTitle || "Vaš Shop"}
											</p>
											<p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
												© {new Date().getFullYear()} Sva prava zadržana.
											</p>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<p className="text-xs text-muted-foreground mt-4 text-center">
						Ovo je približan pregled kako će email izgledati. Stvarni izgled može varirati ovisno o email klijentu.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
