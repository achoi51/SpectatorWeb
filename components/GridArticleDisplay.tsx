import { ReceivedArticle, ReceivedStaff } from "../ts_types/db_types";
import Link from "next/link";
import Image from "next/image";
import styles from "../styles/GridArticleDisplay.module.css";
import groupByImageExists from "../utils/groupArticles";
import generate_contributors_jsx from "./GenerateContributorsJSX";

export default function GridArticleDisplay(props: {
	articles: ReceivedArticle[];
}) {
	const grouping = groupByImageExists(props.articles);
	const articlesWithPhotos: ReceivedArticle[] = grouping["withPhotos"];
	const articlesWithoutPhotos: ReceivedArticle[] = grouping["withoutPhotos"];
	return (
		<section>
			<div>
				{articlesWithPhotos.length > 0 ? (
					<div className={styles.grid}>
						{articlesWithPhotos.map((article) => (
							<div
								className={styles.item}
								key={article._id as any}
							>
								<div className={styles.item_text}>
									<Link
										href={"/article/" + article.slug}
										passHref
									>
										<div className={styles.image_container}>
											<Image
												id={styles.image}
												alt={
													article.cover_image_summary ||
													`Image for ${article.title} article`
												}
												src={article.cover_image}
												fill
												sizes="(min-width: 66em) 33vw,
												(min-width: 44em) 50vw,
												100vw"
											/>
										</div>
									</Link>
									<Link
										href={"/article/" + article.slug}
										passHref
									>
										<h2 className="discrete-link">
											{article.title}
										</h2>
									</Link>
									<div className={styles.authors}>
										{generate_contributors_jsx(
											article.contributors
										)}
									</div>
									<Link
										href={"/article/" + article.slug}
										passHref
									>
										<p
											className={
												styles.summary +
												" discrete-link"
											}
										>
											{article.summary}
										</p>
									</Link>
									<p className={styles.article_volume_issue}>
										<Link
											href={`/volume/${article.volume}/issue/${article.issue}`}
										>
											Issue {article.issue}, Volume{" "}
											{article.volume}
										</Link>
									</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<div>
						<h2>No articles were found with a photo.</h2>
					</div>
				)}
			</div>

			<div>
				{articlesWithoutPhotos.length > 0 ? (
					<div className={styles.grid}>
						{articlesWithoutPhotos.map((article) => (
							<div
								className={styles.item}
								key={article._id as any}
								style={{ gridColumn: "span 2" }}
							>
								<div className={styles.item_text}>
									<Link
										href={"/article/" + article.slug}
										passHref
									>
										<h2>{article.title}</h2>
									</Link>
									<div className={styles.authors}>
										{generate_contributors_jsx(
											article.contributors
										)}
									</div>
									<Link
										href={"/article/" + article.slug}
										passHref
									>
										<p className={styles.summary}>
											{article.summary}
										</p>
									</Link>
									<p className={styles.article_volume_issue}>
										{"Volume " +
											article.volume +
											" Issue " +
											article.issue}
									</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<div>
						<h2>No articles were found without a photo.</h2>
					</div>
				)}
			</div>
		</section>
	);
}
