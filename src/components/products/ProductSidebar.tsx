"use client";

import { StatusSection } from "./sections/StatusSection";
import { OrganizationSection } from "./sections/OrganizationSection";
import { ShippingSection } from "./sections/ShippingSection";
import { InternalSection } from "./sections/InternalSection";

interface ProductSidebarProps {
	form: any;
	variantCount?: number;
	mediaCount?: number;
}

export function ProductSidebar({
	form,
	variantCount = 0,
	mediaCount = 0,
}: ProductSidebarProps) {
	return (
		<div className="flex flex-col gap-4">
			<StatusSection
				form={form}
				variantCount={variantCount}
				mediaCount={mediaCount}
			/>
			<OrganizationSection form={form} />
			<ShippingSection form={form} />
			<InternalSection form={form} />
		</div>
	);
}
