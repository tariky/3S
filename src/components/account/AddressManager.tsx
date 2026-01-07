"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getUserAddressesQueryOptions,
	createUserAddressMutationOptions,
	updateUserAddressMutationOptions,
	deleteUserAddressMutationOptions,
	ADDRESSES_QUERY_KEY,
} from "@/queries/addresses";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, MapPin, Loader2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";

type Address = {
	id: string;
	type: "billing" | "shipping";
	firstName: string | null;
	lastName: string | null;
	company: string | null;
	address1: string;
	address2: string | null;
	city: string;
	state: string | null;
	zip: string | null;
	country: string;
	phone: string | null;
	isDefault: boolean;
};

export function AddressManager() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [editingAddress, setEditingAddress] = useState<Address | null>(null);
	const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const { data: addresses = [], isLoading } = useQuery(getUserAddressesQueryOptions());

	const createMutation = useMutation(createUserAddressMutationOptions({} as any));
	const updateMutation = useMutation(updateUserAddressMutationOptions({} as any));
	const deleteMutation = useMutation(deleteUserAddressMutationOptions(""));

	const handleCreate = () => {
		setEditingAddress(null);
		setIsDialogOpen(true);
	};

	const handleEdit = (address: Address) => {
		setEditingAddress(address);
		setIsDialogOpen(true);
	};

	const handleDelete = async (address: Address) => {
		try {
			await deleteMutation.mutateAsync(address.id);
			queryClient.invalidateQueries({ queryKey: [ADDRESSES_QUERY_KEY] });
			toast({
				title: "Adresa obrisana",
				description: "Adresa je uspješno obrisana.",
			});
			setDeletingAddress(null);
		} catch (error) {
			toast({
				title: "Greška",
				description: "Nije moguće obrisati adresu.",
				variant: "destructive",
			});
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="size-6 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-gray-900">Adrese</h3>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button onClick={handleCreate} size="sm">
							<Plus className="size-4 mr-2" />
							Dodaj adresu
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>
								{editingAddress ? "Uredi adresu" : "Dodaj novu adresu"}
							</DialogTitle>
							<DialogDescription>
								{editingAddress
									? "Ažurirajte informacije o adresi."
									: "Dodajte novu adresu za naplatu ili dostavu."}
							</DialogDescription>
						</DialogHeader>
						<AddressForm
							address={editingAddress}
							onSubmit={async (data) => {
								try {
									if (editingAddress) {
										await updateMutation.mutateAsync({
											addressId: editingAddress.id,
											...data,
										});
										toast({
											title: "Adresa ažurirana",
											description: "Adresa je uspješno ažurirana.",
										});
									} else {
										await createMutation.mutateAsync(data);
										toast({
											title: "Adresa dodana",
											description: "Adresa je uspješno dodana.",
										});
									}
									queryClient.invalidateQueries({ queryKey: [ADDRESSES_QUERY_KEY] });
									setIsDialogOpen(false);
									setEditingAddress(null);
								} catch (error) {
									toast({
										title: "Greška",
										description: "Nije moguće sačuvati adresu.",
										variant: "destructive",
									});
								}
							}}
							onCancel={() => {
								setIsDialogOpen(false);
								setEditingAddress(null);
							}}
							isSubmitting={createMutation.isPending || updateMutation.isPending}
						/>
					</DialogContent>
				</Dialog>
			</div>

			{addresses.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					<MapPin className="size-12 mx-auto mb-4 text-gray-400" />
					<p>Nemate dodanih adresa.</p>
				</div>
			) : (
				<div className="grid md:grid-cols-2 gap-4">
					{addresses.map((address) => (
						<div
							key={address.id}
							className="bg-white border border-gray-200 rounded-lg p-4 relative"
						>
							<div className="flex items-start justify-between mb-2">
								<div className="flex items-center gap-2">
									<MapPin className="size-4 text-gray-400" />
									<span className="font-semibold text-sm text-gray-900 capitalize">
										{address.type === "billing" ? "Naplata" : "Dostava"}
									</span>
									{address.isDefault && (
										<span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
											Zadana
										</span>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleEdit(address)}
										className="h-8 w-8 p-0"
									>
										<Edit className="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setDeletingAddress(address)}
										className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							</div>
							<div className="text-sm text-gray-600 space-y-1">
								{(address.firstName || address.lastName) && (
									<p className="font-medium text-gray-900">
										{[address.firstName, address.lastName].filter(Boolean).join(" ")}
									</p>
								)}
								{address.company && <p>{address.company}</p>}
								<p>{address.address1}</p>
								{address.address2 && <p>{address.address2}</p>}
								<p>
									{address.zip && `${address.zip} `}
									{address.city}
									{address.state && `, ${address.state}`}
								</p>
								<p>{address.country}</p>
								{address.phone && <p className="mt-2">Tel: {address.phone}</p>}
							</div>
						</div>
					))}
				</div>
			)}

			<AlertDialog
				open={!!deletingAddress}
				onOpenChange={(open) => !open && setDeletingAddress(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Obriši adresu?</AlertDialogTitle>
						<AlertDialogDescription>
							Jeste li sigurni da želite obrisati ovu adresu? Ova akcija se ne može poništiti.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Odustani</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deletingAddress && handleDelete(deletingAddress)}
							className="bg-red-600 hover:bg-red-700"
						>
							Obriši
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function AddressForm({
	address,
	onSubmit,
	onCancel,
	isSubmitting,
}: {
	address: Address | null;
	onSubmit: (data: any) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
}) {
	const [formData, setFormData] = useState({
		type: (address?.type || "billing") as "billing" | "shipping",
		firstName: address?.firstName || "",
		lastName: address?.lastName || "",
		company: address?.company || "",
		address1: address?.address1 || "",
		address2: address?.address2 || "",
		city: address?.city || "",
		state: address?.state || "",
		zip: address?.zip || "",
		country: address?.country || "Bosna i Hercegovina",
		phone: address?.phone || "",
		isDefault: address?.isDefault || false,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(formData);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="type">Tip adrese</Label>
					<Select
						value={formData.type}
						onValueChange={(value: "billing" | "shipping") =>
							setFormData({ ...formData, type: value })
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="billing">Naplata</SelectItem>
							<SelectItem value="shipping">Dostava</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-end">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="isDefault"
							checked={formData.isDefault}
							onCheckedChange={(checked) =>
								setFormData({ ...formData, isDefault: !!checked })
							}
						/>
						<Label htmlFor="isDefault" className="cursor-pointer">
							Postavi kao zadanu
						</Label>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="firstName">Ime</Label>
					<Input
						id="firstName"
						value={formData.firstName}
						onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
					/>
				</div>
				<div>
					<Label htmlFor="lastName">Prezime</Label>
					<Input
						id="lastName"
						value={formData.lastName}
						onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
					/>
				</div>
			</div>

			<div>
				<Label htmlFor="company">Kompanija (opcionalno)</Label>
				<Input
					id="company"
					value={formData.company}
					onChange={(e) => setFormData({ ...formData, company: e.target.value })}
				/>
			</div>

			<div>
				<Label htmlFor="address1">Adresa 1 *</Label>
				<Input
					id="address1"
					value={formData.address1}
					onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
					required
				/>
			</div>

			<div>
				<Label htmlFor="address2">Adresa 2 (opcionalno)</Label>
				<Input
					id="address2"
					value={formData.address2}
					onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="city">Grad *</Label>
					<Input
						id="city"
						value={formData.city}
						onChange={(e) => setFormData({ ...formData, city: e.target.value })}
						required
					/>
				</div>
				<div>
					<Label htmlFor="zip">Poštanski broj</Label>
					<Input
						id="zip"
						value={formData.zip}
						onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
					/>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="state">Regija/Pokrajina</Label>
					<Input
						id="state"
						value={formData.state}
						onChange={(e) => setFormData({ ...formData, state: e.target.value })}
					/>
				</div>
				<div>
					<Label htmlFor="country">Država *</Label>
					<Input
						id="country"
						value={formData.country}
						onChange={(e) => setFormData({ ...formData, country: e.target.value })}
						required
					/>
				</div>
			</div>

			<div>
				<Label htmlFor="phone">Telefon</Label>
				<Input
					id="phone"
					value={formData.phone}
					onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
				/>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
					Odustani
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<Loader2 className="size-4 mr-2 animate-spin" />
							Čuvanje...
						</>
					) : (
						"Sačuvaj"
					)}
				</Button>
			</DialogFooter>
		</form>
	);
}

