import { db } from "./src/db/db";
import { auth } from "@/lib/auth";
import { faker } from "@faker-js/faker";
import { nanoid } from "nanoid";

function generateId(): string {
	return nanoid(36);
}

const colors = [
	"Black",
	"White",
	"Navy",
	"Red",
	"Green",
	"Gray",
	"Beige",
	"Brown",
];
const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

async function seedAdmin() {
	console.log("Creating admin user...");
	try {
		const createdUser = await auth.api.signUpEmail({
			body: {
				name: process.env.ADMIN_NAME!,
				email: process.env.ADMIN_EMAIL!,
				password: process.env.ADMIN_PASSWORD!,
			},
		});

		await db.user.update({
			where: { id: createdUser.user.id },
			data: { role: "admin" },
		});

		console.log("Admin user created");
		console.log(`   Email: ${process.env.ADMIN_EMAIL!}`);
	} catch (error) {
		console.log("Admin user already exists or creation failed");
	}
}

async function seedProducts() {
	// Clean up existing data
	console.log("Cleaning up existing product data...");
	await db.inventory.deleteMany();
	await db.product_variant_options.deleteMany();
	await db.product_variant_media.deleteMany();
	await db.product_variants.deleteMany();
	await db.product_option_values.deleteMany();
	await db.product_options.deleteMany();
	await db.product_media.deleteMany();
	await db.product_metafields.deleteMany();
	await db.product_tags_to_products.deleteMany();
	await db.collection_products.deleteMany();
	await db.products.deleteMany();
	await db.product_categories.deleteMany();
	await db.vendors.deleteMany();
	await db.product_tags.deleteMany();
	await db.shipping_methods.deleteMany();
	await db.payment_methods.deleteMany();
	await db.discounts.deleteMany();

	// Create Vendors
	console.log("Creating vendors...");
	const vendorData = [
		{ name: "Nike", email: "contact@nike.com", website: "https://nike.com" },
		{
			name: "Adidas",
			email: "contact@adidas.com",
			website: "https://adidas.com",
		},
		{ name: "Puma", email: "contact@puma.com", website: "https://puma.com" },
		{
			name: "Under Armour",
			email: "contact@underarmour.com",
			website: "https://underarmour.com",
		},
		{ name: "Zara", email: "contact@zara.com", website: "https://zara.com" },
	];

	const vendors = await Promise.all(
		vendorData.map((vendor) =>
			db.vendors.create({
				data: {
					id: generateId(),
					name: vendor.name,
					email: vendor.email,
					website: vendor.website,
					active: true,
				},
			})
		)
	);
	console.log(`Created ${vendors.length} vendors`);

	// Create Categories
	console.log("Creating categories...");
	const parentCategories = [
		{ name: "Men", slug: "men" },
		{ name: "Women", slug: "women" },
		{ name: "Accessories", slug: "accessories" },
	];

	const createdParentCategories = await Promise.all(
		parentCategories.map((cat, index) =>
			db.product_categories.create({
				data: {
					id: generateId(),
					name: cat.name,
					slug: cat.slug,
					position: index,
					active: true,
				},
			})
		)
	);

	const menCategory = createdParentCategories[0];
	const womenCategory = createdParentCategories[1];

	const subCategories = [
		{ name: "T-Shirts", slug: "men-t-shirts", parentId: menCategory.id },
		{ name: "Hoodies", slug: "men-hoodies", parentId: menCategory.id },
		{ name: "Pants", slug: "men-pants", parentId: menCategory.id },
		{ name: "T-Shirts", slug: "women-t-shirts", parentId: womenCategory.id },
		{ name: "Dresses", slug: "women-dresses", parentId: womenCategory.id },
		{ name: "Pants", slug: "women-pants", parentId: womenCategory.id },
	];

	const createdSubCategories = await Promise.all(
		subCategories.map((cat, index) =>
			db.product_categories.create({
				data: {
					id: generateId(),
					name: cat.name,
					slug: cat.slug,
					parentId: cat.parentId,
					position: index,
					active: true,
				},
			})
		)
	);
	console.log(
		`Created ${createdParentCategories.length + createdSubCategories.length} categories`
	);

	// Create Product Tags
	console.log("Creating product tags...");
	const tagData = [
		{ name: "New Arrival", slug: "new-arrival" },
		{ name: "Best Seller", slug: "best-seller" },
		{ name: "Sale", slug: "sale" },
		{ name: "Limited Edition", slug: "limited-edition" },
		{ name: "Eco Friendly", slug: "eco-friendly" },
	];

	const tags = await Promise.all(
		tagData.map((tag) =>
			db.product_tags.create({
				data: {
					id: generateId(),
					name: tag.name,
					slug: tag.slug,
				},
			})
		)
	);
	console.log(`Created ${tags.length} tags`);

	// Create Products with Variants
	console.log("Creating products with variants...");
	const allCategories = [...createdSubCategories];

	const productTemplates = [
		{
			name: "Classic Cotton T-Shirt",
			basePrice: 29.99,
			description:
				"A comfortable classic cotton t-shirt perfect for everyday wear.",
		},
		{
			name: "Premium Hoodie",
			basePrice: 79.99,
			description:
				"Warm and cozy premium hoodie made with soft fleece material.",
		},
		{
			name: "Slim Fit Jeans",
			basePrice: 89.99,
			description: "Modern slim fit jeans with stretch comfort technology.",
		},
		{
			name: "Athletic Performance Tee",
			basePrice: 39.99,
			description:
				"Moisture-wicking athletic t-shirt for peak performance.",
		},
		{
			name: "Casual Chino Pants",
			basePrice: 69.99,
			description: "Versatile chino pants suitable for work or weekend.",
		},
		{
			name: "Vintage Logo Sweatshirt",
			basePrice: 59.99,
			description: "Retro-inspired sweatshirt with vintage logo design.",
		},
		{
			name: "Lightweight Running Shorts",
			basePrice: 34.99,
			description: "Breathable running shorts with built-in liner.",
		},
		{
			name: "Cozy Fleece Joggers",
			basePrice: 54.99,
			description: "Ultra-soft fleece joggers for maximum comfort.",
		},
		{
			name: "Button-Down Oxford Shirt",
			basePrice: 64.99,
			description: "Classic oxford shirt for a polished casual look.",
		},
		{
			name: "Graphic Print Tee",
			basePrice: 24.99,
			description: "Eye-catching graphic tee with unique artistic design.",
		},
	];

	for (let i = 0; i < productTemplates.length; i++) {
		const template = productTemplates[i];
		const vendor = vendors[Math.floor(Math.random() * vendors.length)];
		const category =
			allCategories[Math.floor(Math.random() * allCategories.length)];
		const productId = generateId();
		const slug = `${template.name.toLowerCase().replace(/\s+/g, "-")}-${nanoid(6)}`;
		const productSku = `SKU-${nanoid(8).toUpperCase()}`;

		// Select random colors and sizes for this product
		const productColors = faker.helpers.arrayElements(colors, {
			min: 2,
			max: 4,
		});
		const productSizes = faker.helpers.arrayElements(sizes, { min: 3, max: 5 });

		// Create the product
		const product = await db.products.create({
			data: {
				id: productId,
				name: template.name,
				slug: slug,
				description: template.description,
				sku: productSku,
				price: template.basePrice,
				compareAtPrice:
					Math.random() > 0.5 ? template.basePrice * 1.2 : null,
				cost: template.basePrice * 0.4,
				trackQuantity: true,
				status: "active",
				featured: Math.random() > 0.7,
				vendorId: vendor.id,
				categoryId: category.id,
				material: faker.helpers.arrayElement([
					"100% Cotton",
					"Cotton Blend",
					"Polyester",
					"Organic Cotton",
				]),
				weight: faker.number.float({ min: 0.2, max: 1.5, fractionDigits: 2 }),
				weightUnit: "kg",
				requiresShipping: true,
			},
		});

		// Create Color Option
		const colorOptionId = generateId();
		await db.product_options.create({
			data: {
				id: colorOptionId,
				productId: productId,
				name: "Color",
				position: 0,
			},
		});

		// Create Color Option Values
		const colorOptionValues = await Promise.all(
			productColors.map((color, index) =>
				db.product_option_values.create({
					data: {
						id: generateId(),
						optionId: colorOptionId,
						name: color,
						position: index,
					},
				})
			)
		);

		// Create Size Option
		const sizeOptionId = generateId();
		await db.product_options.create({
			data: {
				id: sizeOptionId,
				productId: productId,
				name: "Size",
				position: 1,
			},
		});

		// Create Size Option Values
		const sizeOptionValues = await Promise.all(
			productSizes.map((size, index) =>
				db.product_option_values.create({
					data: {
						id: generateId(),
						optionId: sizeOptionId,
						name: size,
						position: index,
					},
				})
			)
		);

		// Create Variants (Color x Size combinations)
		let variantPosition = 0;
		for (const colorValue of colorOptionValues) {
			for (const sizeValue of sizeOptionValues) {
				const variantId = generateId();
				const priceModifier = faker.number.float({
					min: -5,
					max: 10,
					fractionDigits: 2,
				});
				const variantPrice = Math.max(
					template.basePrice + priceModifier,
					template.basePrice * 0.8
				);

				// Create the variant
				await db.product_variants.create({
					data: {
						id: variantId,
						productId: productId,
						sku: `${productSku}-${colorValue.name.substring(0, 2).toUpperCase()}-${sizeValue.name}`,
						price: variantPrice,
						compareAtPrice:
							Math.random() > 0.6 ? variantPrice * 1.15 : null,
						cost: variantPrice * 0.4,
						weight: product.weight,
						position: variantPosition,
						isDefault: variantPosition === 0,
					},
				});

				// Create variant options (linking variant to color and size)
				await db.product_variant_options.create({
					data: {
						id: generateId(),
						variantId: variantId,
						optionId: colorOptionId,
						optionValueId: colorValue.id,
					},
				});

				await db.product_variant_options.create({
					data: {
						id: generateId(),
						variantId: variantId,
						optionId: sizeOptionId,
						optionValueId: sizeValue.id,
					},
				});

				// Create inventory for this variant
				await db.inventory.create({
					data: {
						id: generateId(),
						variantId: variantId,
						available: faker.number.int({ min: 5, max: 100 }),
						reserved: faker.number.int({ min: 0, max: 5 }),
						onHand: faker.number.int({ min: 10, max: 120 }),
						committed: 0,
					},
				});

				variantPosition++;
			}
		}

		// Assign random tags to product
		const productTags = faker.helpers.arrayElements(tags, { min: 1, max: 3 });
		await Promise.all(
			productTags.map((tag) =>
				db.product_tags_to_products.create({
					data: {
						productId: productId,
						tagId: tag.id,
					},
				})
			)
		);

		console.log(
			`  Created product: ${template.name} with ${productColors.length * productSizes.length} variants`
		);
	}

	// Create Shipping Methods
	console.log("Creating shipping methods...");
	const shippingMethods = [
		{
			name: "Standard Shipping",
			description: "Delivery in 5-7 business days",
			price: 5.99,
			isFreeShipping: false,
		},
		{
			name: "Express Shipping",
			description: "Delivery in 2-3 business days",
			price: 12.99,
			isFreeShipping: false,
		},
		{
			name: "Free Shipping",
			description: "Free delivery on orders over 50 BAM",
			price: 0,
			isFreeShipping: true,
			minimumOrderAmount: 50,
		},
		{
			name: "Next Day Delivery",
			description: "Delivery by next business day",
			price: 24.99,
			isFreeShipping: false,
		},
	];

	await Promise.all(
		shippingMethods.map((method, index) =>
			db.shipping_methods.create({
				data: {
					id: generateId(),
					name: method.name,
					description: method.description,
					price: method.price,
					isFreeShipping: method.isFreeShipping,
					minimumOrderAmount: method.minimumOrderAmount || null,
					active: true,
					position: index,
				},
			})
		)
	);
	console.log(`Created ${shippingMethods.length} shipping methods`);

	// Create Payment Methods
	console.log("Creating payment methods...");
	const paymentMethods = [
		{
			name: "Cash on Delivery",
			description: "Pay when you receive your order",
		},
		{
			name: "Credit Card",
			description: "Pay securely with your credit card",
		},
		{ name: "Bank Transfer", description: "Direct bank transfer" },
	];

	await Promise.all(
		paymentMethods.map((method, index) =>
			db.payment_methods.create({
				data: {
					id: generateId(),
					name: method.name,
					description: method.description,
					active: true,
					position: index,
				},
			})
		)
	);
	console.log(`Created ${paymentMethods.length} payment methods`);

	// Create Discounts
	console.log("Creating discount codes...");
	const discountCodes = [
		{ code: "WELCOME10", type: "percentage", value: 10, usageLimit: 100 },
		{
			code: "SAVE20",
			type: "percentage",
			value: 20,
			usageLimit: 50,
			minimumPurchase: 100,
		},
		{
			code: "FLAT15",
			type: "fixed",
			value: 15,
			usageLimit: 200,
			minimumPurchase: 50,
		},
		{ code: "FREESHIP", type: "fixed", value: 5.99, usageLimit: null },
	];

	await Promise.all(
		discountCodes.map((discount) =>
			db.discounts.create({
				data: {
					id: generateId(),
					code: discount.code,
					type: discount.type,
					value: discount.value,
					minimumPurchase: discount.minimumPurchase || null,
					usageLimit: discount.usageLimit,
					usageCount: 0,
					active: true,
				},
			})
		)
	);
	console.log(`Created ${discountCodes.length} discount codes`);
}

async function main() {
	console.log("Starting seed...\n");

	await seedAdmin();
	console.log("");
	await seedProducts();

	console.log("\nSeed completed successfully!");
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
