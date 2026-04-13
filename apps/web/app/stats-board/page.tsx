import { redirect } from "next/navigation";

/**
 * Route: /stats-board — enters simulator STATS surface (same canvas as `/simulator`).
 */
export default function StatsBoardPage() {
  redirect("/simulator?mode=stats");
}
