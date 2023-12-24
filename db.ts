import clientPromise from "./db_conn";

import {
	ReceivedArticle,
	ReceivedStaff,
	DepartmentsArray,
	mongoObjectId,
} from "./ts_types/db_types";
import { ObjectId } from "mongodb";

function fixArticleCoverImage(v: any) {
	// $lookup ALWAYS creates an array into the specified "as" field, even if the "localField" is a singular element
	v.cover_image_contributor = v.cover_image_contributor[0];
	return v;
}
// articles

async function get_articles_by_department(
	department: string,
	num?: number,
	fetch_text?: boolean
): Promise<[ReceivedArticle]> {
	const db = (await clientPromise).db();
	let articles_collection = await db.collection("articles");

	const limit = num || 10;
	const projection = fetch_text ? {} : { text: 0 };
	const department_id = DepartmentsArray.findIndex((a) => a == department);

	let articles = (
		await articles_collection
			.aggregate([
				{
					$match: { section_id: department_id },
				},
				{ $sort: { volume: -1, issue: -1, rank: -1 } },
				{
					$lookup: {
						from: "staffs",
						localField: "contributors",
						foreignField: "_id",
						as: "contributors",
					},
				},
				{
					$lookup: {
						from: "staffs",
						localField: "cover_image_contributor",
						foreignField: "_id",
						as: "cover_image_contributor",
					},
				},
				{
					$project: {
						contributors: { password: 0 },
						cover_image_contributor: { password: 0 },
						...projection,
					},
				},
			])
			.limit(limit)
			.toArray()
	) as [ReceivedArticle];
	return articles;
}

async function get_article_by_id(article_id: string): Promise<ReceivedArticle> {
	const db = (await clientPromise).db();
	let articles_collection = db.collection("articles");

	const article = (
		await articles_collection
			.aggregate([
				{
					$match: { _id: new ObjectId(article_id) },
				},

				{
					$lookup: {
						from: "staffs",
						localField: "contributors",
						foreignField: "_id",
						as: "contributors",
					},
				},
				{
					$lookup: {
						from: "staffs",
						localField: "cover_image_contributor",
						foreignField: "_id",
						as: "cover_image_contributor",
					},
				},
				{
					$project: {
						contributors: { password: 0 },
						cover_image_contributor: { password: 0 },
					},
				},
			])
			.toArray()
	)[0] as ReceivedArticle;

	return article;
}

async function get_article_by_slug(
	article_slug: string
): Promise<ReceivedArticle> {
	const db = (await clientPromise).db();
	let articles_collection = await db.collection("articles");
	let article = (
		await articles_collection
			.aggregate([
				{
					$match: { slug: article_slug },
				},

				{
					$lookup: {
						from: "staffs",
						localField: "contributors",
						foreignField: "_id",
						as: "contributors",
					},
				},
				{
					$lookup: {
						from: "staffs",
						localField: "cover_image_contributor",
						foreignField: "_id",
						as: "cover_image_contributor",
					},
				},
				{
					$project: {
						contributors: { password: 0 },
						cover_image_contributor: { password: 0 },
					},
				},
			])
			.toArray()
	)[0] as ReceivedArticle;
	return article;
}

async function get_articles_by_author(
	author_id: mongoObjectId,
	num?: number
): Promise<[ReceivedArticle]> {
	let articles = await get_articles_by_query(
		{
			contributors: new ObjectId(String(author_id)),
		},
		num
	);

	return articles;
}

async function get_articles_by_query(
	query: any,
	num?: number,
	skip_num?: number,
	fetch_text: boolean = true
): Promise<[ReceivedArticle]> {
	const db = (await clientPromise).db();
	let articles_collection = await db.collection("articles");

	const limit = num || 10;
	const skip = skip_num || 0;
	const projection: any = fetch_text ? {} : { text: 0 };

	let articles = (
		await articles_collection
			.aggregate([
				{ $match: query },
				{ $sort: { volume: -1, issue: -1, rank: -1 } },
				{
					$lookup: {
						from: "staffs",
						localField: "contributors",
						foreignField: "_id",
						as: "contributors",
					},
				},
				{
					$lookup: {
						from: "staffs",
						localField: "cover_image_contributor",
						foreignField: "_id",
						as: "cover_image_contributor",
					},
				},
				{
					$project: {
						contributors: { password: 0 },
						cover_image_contributor: { password: 0 },
						...projection,
					},
				},
			])
			.skip(skip)
			.limit(limit)
			.toArray()
	) as [ReceivedArticle];
	return articles;
}


async function get_articles_by_string_query(
	query: string,
	num?: number
): Promise<[ReceivedArticle]> {
	const db = (await clientPromise).db();
	let articles_collection = await db.collection("articles");

	const limit = num || 10;
	let articles = (
		await articles_collection
			.aggregate([
				{
					$search: {
						index: "articles_search_index",
						text: {
							query: query,
							path: {
								wildcard: "*",
							},
						},
					},
				},
				{
					$lookup: {
						from: "staffs",
						localField: "contributors",
						foreignField: "_id",
						as: "contributors",
					},
				},
				{
					$lookup: {
						from: "staffs",
						localField: "cover_image_contributor",
						foreignField: "_id",
						as: "cover_image_contributor",
					},
				},
				{
					$project: {
						contributors: { password: 0 },
						cover_image_contributor: { password: 0 },
					},
				},
			])
			.limit(limit)
			.toArray()
	) as [ReceivedArticle];
	return articles;
}

async function get_media_by_author(author_id: mongoObjectId, num?: number) {
	let articles = await get_articles_by_query(
		{
			$or: [
				{ cover_image_contributor: new ObjectId(String(author_id)) },
			],
		},
		num
	);

	const media: { cover_image: string; cover_image_summary: string; cover_image_source: string; article_slug: string; }[] = []

	articles.map((v) => {
		const images = getAllContributedImages(v.text, author_id, v.slug);
		for (const image of images) {
			media.push({
				cover_image: image.cover_image,
				cover_image_summary: v.cover_image_summary,
				cover_image_source: v.cover_image_source,
				article_slug: v.slug,
			});
		}

		if (v.cover_image_contributor[0]._id.toString() === author_id.toString()) {
			media.push({
				cover_image: v.cover_image,
				cover_image_summary: v.cover_image_summary,
				cover_image_source: v.cover_image_source,
				article_slug: v.slug,
			});
		}
	});

	return media;
}

function getAllContributedImages(text: string, author_id: mongoObjectId, slug: String) {
	const regex = /<img\s[^>]*data-contributor="([^"]*)"[^>]*>/g;
	const images = [];

	let match;
	while ((match = regex.exec(text)) !== null) {
		const contributorId = match[1];

		if (String(contributorId) === String(author_id)) {
			const imageTag = match[0];
			const imageSourceMatch = imageTag.match(/src="([^"]*)"/);
			const imageSource = imageSourceMatch ? imageSourceMatch[1] : null;

			if (imageSource) {
				images.push({
					cover_image: imageSource,
					articleslug: slug,
				});
			}
		}
	}

	return images
}

// staff
async function get_staff_by_id(_id: string): Promise<ReceivedStaff> {
	const db = (await clientPromise).db();
	let staff_collection = await db.collection("staffs");

	let staff = (
		await staff_collection
			.aggregate([
				{ $match: { _id: new ObjectId(_id) } },
				{
					$project: {
						password: 0,
					},
				},
			])
			.toArray()
	)[0] as ReceivedStaff;

	return staff;
}

async function get_staff_by_slug(slug: string): Promise<ReceivedStaff> {
	const db = (await clientPromise).db();
	let staff_collection = await db.collection("staffs");

	let staff = (
		await staff_collection
			.aggregate([
				{ $match: { slug: slug } },
				{
					$project: {
						password: 0,
					},
				},
			])
			.toArray()
	)[0] as ReceivedStaff;
	return staff;
}

async function get_staff_by_position(position: string): Promise<ReceivedStaff> {
	const db = (await clientPromise).db();
	let staff_collection = await db.collection("staffs");

	let staff = (
		await staff_collection
			.aggregate([
				{ $match: { position: position } },
				{
					$project: {
						password: 0,
					},
				},
			])
			.toArray()
	)[0] as ReceivedStaff;
	return staff;
}

async function get_staffs_by_query(query: any): Promise<ReceivedStaff[]> {
	const db = (await clientPromise).db();
	let staff_collection = await db.collection("staffs");

	let staff = (await staff_collection
		.aggregate([
			{ $match: query },
			{
				$project: {
					password: 0,
				},
			},
		])
		.toArray()) as ReceivedStaff[];
	return staff;
}

export {
	get_articles_by_department,
	get_article_by_id,
	get_article_by_slug,
	get_articles_by_author,
	get_articles_by_query,
	get_staff_by_id,
	get_staff_by_position,
	get_staff_by_slug,
	get_staffs_by_query,
	get_media_by_author,
	get_articles_by_string_query,
};
