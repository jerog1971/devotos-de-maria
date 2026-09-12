import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }),
	schema: z.object({
		title: z.string(),
		date: z.union([z.string(), z.date()]).optional(),
		pubDate: z.union([z.string(), z.date()]).optional(),
		description: z.string().optional(),
		heroImage: z.string().optional(),
	}),
});

export const collections = { blog };
