import * as v from "valibot";

// Define Valibot schema
export const InputSchema = v.pipe(
	v.object({
		email: v.string(),
		api_token: v.string(),
		subdomain: v.string(),
		jira_project: v.string(),
		release_name: v.string(),
		operation: v.picklist(["create_or_update", "delete"]),
		tickets: v.string(),
		dry_run: v.boolean(),
		release_description: v.string(),
		release_released: v.boolean(),
		release_release_date: v.string(),
		release_archived: v.boolean(),
	}),
	v.check((input) => {
		if (input.release_release_date.trim() !== "") {
			const date = new Date(input.release_release_date);
			return !Number.isNaN(date.getTime());
		}
		return true;
	}, "Release date must be a valid date."),
);
